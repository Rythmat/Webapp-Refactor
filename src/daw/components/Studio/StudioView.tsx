import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Sliders } from 'lucide-react';
import { useStore, useTrackIds, useTrack, useTrackCount } from '@/daw/store';
import type { EffectSlotType, TrackEffectState } from '@/daw/audio/EffectChain';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { getTrackAudioState } from '@/daw/hooks/usePlaybackEngine';
import { useMeterLevel } from '@/daw/hooks/useMeterLevel';
import { useCompressorMeters } from '@/daw/hooks/useCompressorMeters';
import {
  FxChainRow,
  FxControlsPanel,
} from '@/daw/components/Effects/EffectsPanel';
import { FxBrowser } from '@/daw/components/Effects/FxBrowser';

// ═══════════════════════════════════════════════════════════════════════════
// MASTERING SECTION — Matches reference: Mastering View.png
// ═══════════════════════════════════════════════════════════════════════════

// ── Frequency labels for spectrum ────────────────────────────────────────

const FREQ_LABELS = [
  { freq: 20, label: '20' },
  { freq: 50, label: '50' },
  { freq: 100, label: '100' },
  { freq: 200, label: '200' },
  { freq: 500, label: '500' },
  { freq: 1000, label: '1k' },
  { freq: 2000, label: '2k' },
  { freq: 5000, label: '5k' },
  { freq: 10000, label: '10k' },
  { freq: 20000, label: '20k' },
];

const DB_GRID = [-48, -36, -24, -12];

// ── Spectrum Analyzer (Phase 2 — full width, taller, dual gradient) ─────

function SpectrumAnalyzer({ isReady }: { isReady: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isReady) return;

    const [analyserL] = audioEngine.getMasterAnalysers();
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!analyserL || !canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    analyserL.fftSize = 2048;
    analyserL.smoothingTimeConstant = 0.85;
    const bufferLength = analyserL.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const sampleRate = analyserL.context.sampleRate;
    const w = rect.width;
    const h = rect.height;
    const padBottom = 18;
    const graphH = h - padBottom;

    function freqToX(freq: number): number {
      const minLog = Math.log10(20);
      const maxLog = Math.log10(sampleRate / 2);
      return ((Math.log10(freq) - minLog) / (maxLog - minLog)) * w;
    }

    function buildPath(): [number, number][] {
      const pts: [number, number][] = [];
      for (let i = 0; i < bufferLength; i++) {
        const freq = (i / bufferLength) * (sampleRate / 2);
        if (freq < 20) continue;
        const x = freqToX(freq);
        const v = dataArray[i] / 255;
        const y = graphH - v * graphH;
        pts.push([x, y]);
      }
      return pts;
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      analyserL.getByteFrequencyData(dataArray);
      ctx!.clearRect(0, 0, w, h);

      // dB grid lines
      ctx!.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx!.lineWidth = 1;
      for (const db of DB_GRID) {
        const y = graphH * (1 - (db + 60) / 60);
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(w, y);
        ctx!.stroke();
      }

      const pts = buildPath();
      if (pts.length === 0) return;

      // Dark background fill (deeper layer)
      const darkGrad = ctx!.createLinearGradient(0, graphH, 0, 0);
      darkGrad.addColorStop(0, 'rgba(40, 60, 100, 0.02)');
      darkGrad.addColorStop(0.5, 'rgba(40, 60, 100, 0.08)');
      darkGrad.addColorStop(1, 'rgba(40, 60, 100, 0.18)');
      ctx!.beginPath();
      ctx!.moveTo(pts[0][0], graphH);
      for (const [x, y] of pts) ctx!.lineTo(x, y);
      ctx!.lineTo(pts[pts.length - 1][0], graphH);
      ctx!.closePath();
      ctx!.fillStyle = darkGrad;
      ctx!.fill();

      // Bright accent fill (top layer)
      const brightGrad = ctx!.createLinearGradient(0, graphH, 0, 0);
      brightGrad.addColorStop(0, 'rgba(126, 207, 207, 0.03)');
      brightGrad.addColorStop(0.5, 'rgba(126, 207, 207, 0.12)');
      brightGrad.addColorStop(1, 'rgba(126, 207, 207, 0.25)');
      ctx!.beginPath();
      ctx!.moveTo(pts[0][0], graphH);
      for (const [x, y] of pts) ctx!.lineTo(x, y);
      ctx!.lineTo(pts[pts.length - 1][0], graphH);
      ctx!.closePath();
      ctx!.fillStyle = brightGrad;
      ctx!.fill();

      // Spectrum stroke
      ctx!.beginPath();
      ctx!.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx!.lineTo(pts[i][0], pts[i][1]);
      ctx!.strokeStyle = 'rgba(126, 207, 207, 0.6)';
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      // Frequency tick marks & labels
      ctx!.font = '9px system-ui, sans-serif';
      ctx!.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx!.textAlign = 'center';
      for (const { freq, label } of FREQ_LABELS) {
        const x = freqToX(freq);
        if (x > 8 && x < w - 8) {
          ctx!.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(x, 0);
          ctx!.lineTo(x, graphH);
          ctx!.stroke();
          ctx!.fillText(label, x, h - 4);
        }
      }
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isReady]);

  return (
    <div
      ref={containerRef}
      className="w-full shrink-0 rounded-lg"
      style={{
        height: 180,
        backgroundColor: 'rgba(15, 20, 35, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

// ── LUFS Meter ──────────────────────────────────────────────────────────

const LUFS_SEGMENTS = 20;

function LufsMeter({ isReady }: { isReady: boolean }) {
  const [analyserL, analyserR] = isReady
    ? audioEngine.getMasterAnalysers()
    : [null, null];
  const levelL = useMeterLevel(analyserL);
  const levelR = useMeterLevel(analyserR);
  const avg = (levelL + levelR) / 2;

  const lufs = avg > 0 ? -14 + (avg / 100) * 14 : -Infinity;
  const lufsText = lufs === -Infinity ? '-inf' : lufs.toFixed(2);
  const litCount = Math.round((avg / 100) * LUFS_SEGMENTS);

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Segmented meter */}
      <div
        className="flex flex-col-reverse gap-px"
        style={{ width: 12, height: 80 }}
      >
        {Array.from({ length: LUFS_SEGMENTS }, (_, i) => {
          const lit = i < litCount;
          const ratio = i / LUFS_SEGMENTS;
          const color =
            ratio > 0.85
              ? 'var(--color-meter-red)'
              : ratio > 0.6
                ? 'var(--color-meter-yellow)'
                : 'var(--color-meter-green)';
          return (
            <div
              key={i}
              className="rounded-[1px]"
              style={{
                flex: 1,
                backgroundColor: lit ? color : 'rgba(255, 255, 255, 0.04)',
                transition: 'background-color 60ms linear',
              }}
            />
          );
        })}
      </div>
      <span
        className="whitespace-nowrap font-mono text-[9px] font-bold"
        style={{ color: 'var(--color-text)' }}
      >
        {lufsText}
      </span>
      <span
        className="text-[7px] font-semibold uppercase"
        style={{ color: 'var(--color-text-dim)' }}
      >
        LUFS
      </span>
    </div>
  );
}

// ── MasteringSection ────────────────────────────────────────────────────

function MasteringSection({ isReady }: { isReady: boolean }) {
  const bypass = useStore((s) => s.masteringBypass);
  const toggleBypass = useStore((s) => s.toggleMasteringBypass);
  const fxChain = useStore((s) => s.masteringFxChain);
  const addMasteringFx = useStore((s) => s.addMasteringFx);
  const removeMasteringFx = useStore((s) => s.removeMasteringFx);
  const mfx = useStore((s) => s.masteringEffects);
  const updateMfx = useStore((s) => s.updateMasteringEffects);

  const [selectedEffect, setSelectedEffect] = useState<EffectSlotType | null>(
    null,
  );
  const [popOutOpen, setPopOutOpen] = useState(false);

  // Compressor meters from mastering chain
  const masteringChain = isReady ? audioEngine.getMasteringChain() : null;
  const { gr, inLevel, outLevel } = useCompressorMeters(masteringChain);

  // Auto-select first effect; deselect if removed
  useEffect(() => {
    if (selectedEffect && !fxChain.includes(selectedEffect)) {
      setSelectedEffect(fxChain[0] ?? null);
    }
    if (!selectedEffect && fxChain.length > 0) {
      setSelectedEffect(fxChain[0]);
    }
  }, [fxChain, selectedEffect]);

  // Bridge mastering store API (no trackId) to component API (with trackId)
  const wrappedUpdate = useCallback(
    (_id: string, fx: Partial<TrackEffectState>) => updateMfx(fx),
    [updateMfx],
  );
  const wrappedAdd = useCallback(
    (_id: string, effectType: EffectSlotType) => addMasteringFx(effectType),
    [addMasteringFx],
  );

  return (
    <div
      className="flex shrink-0 flex-col"
      style={{
        borderBottom: '1px solid var(--color-border)',
        padding: '12px 16px',
      }}
    >
      {/* ── Header bar ─────────────────────────────────── */}
      <div className="flex items-center" style={{ marginBottom: 12 }}>
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text)' }}
        >
          Mastering
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="cursor-pointer text-[10px] font-medium transition-colors"
            style={{
              color: 'var(--color-text-dim)',
              background: 'none',
              border: 'none',
            }}
          >
            Gain Match
          </button>
          <button
            onClick={toggleBypass}
            className="cursor-pointer text-[10px] font-medium transition-colors"
            style={{
              color: bypass ? '#ef4444' : 'var(--color-text-dim)',
              background: 'none',
              border: 'none',
            }}
          >
            Bypass
          </button>
        </div>
      </div>

      {/* ── Spectrum Analyzer (full width) ──────────────────── */}
      <SpectrumAnalyzer isReady={isReady} />

      {/* ── Mastering Chain — signal chain layout ──────────── */}
      <div
        className="flex overflow-hidden rounded-lg"
        style={{
          marginTop: 12,
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Left: FxBrowser */}
        <FxBrowser
          trackId="master"
          activeEffects={fxChain}
          onAddEffect={wrappedAdd}
          hideMidi
        />

        {/* Right: chain + controls */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Signal chain row with LUFS meter pinned right */}
          <div className="flex items-start">
            <div className="flex-1">
              <FxChainRow
                activeEffects={fxChain}
                effects={mfx}
                selectedEffect={selectedEffect}
                onSelect={setSelectedEffect}
                onToggle={(slot) => {
                  const current = mfx[slot as keyof TrackEffectState] as {
                    enabled: boolean;
                  };
                  updateMfx({
                    [slot]: {
                      ...mfx[slot as keyof TrackEffectState],
                      enabled: !current.enabled,
                    },
                  });
                }}
              />
            </div>
            <div className="flex shrink-0 items-center p-3">
              <LufsMeter isReady={isReady} />
            </div>
          </div>

          {/* Controls panel */}
          {selectedEffect ? (
            <FxControlsPanel
              trackId="master"
              selectedEffect={selectedEffect}
              effects={mfx}
              onUpdate={wrappedUpdate}
              onRemove={(slot) => removeMasteringFx(slot)}
              popOutOpen={popOutOpen}
              onTogglePopOut={() => setPopOutOpen((v) => !v)}
              gr={gr}
              inLevel={inLevel}
              outLevel={outLevel}
              analyserNode={masteringChain?.getPreCompAnalyser() ?? null}
            />
          ) : (
            <div
              className="flex flex-1 items-center justify-center py-6 text-[11px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {fxChain.length === 0
                ? 'Add effects from the list'
                : 'Select a block to edit'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MIXING SECTION — Bottom half
// ═══════════════════════════════════════════════════════════════════════════

// ── Helpers ──────────────────────────────────────────────────────────────

function levelToDb(level: number): number {
  if (level <= 0) return -Infinity;
  return 20 * Math.log10(level / 100);
}

function dbColor(db: number): string {
  if (db > -3) return 'var(--color-meter-red)';
  if (db > -12) return 'var(--color-meter-yellow)';
  return 'var(--color-meter-green)';
}

function DbReadout({ level }: { level: number }) {
  const db = levelToDb(level);
  const text = db === -Infinity ? '-inf' : `${db.toFixed(1)} dB`;
  return (
    <span
      className="font-mono text-[11px] font-bold tabular-nums"
      style={{ color: dbColor(db) }}
    >
      {text}
    </span>
  );
}

// ── MeterBar with peak hold ─────────────────────────────────────────────

function MeterBar({ level }: { level: number }) {
  const pct = Math.min(100, Math.max(0, level));
  const peakRef = useRef(0);
  const peakDecayRef = useRef(0);
  const [peakPct, setPeakPct] = useState(0);

  useEffect(() => {
    if (pct > peakRef.current) {
      peakRef.current = pct;
      peakDecayRef.current = 120; // ~2s at 60fps
    }
    if (peakDecayRef.current > 0) {
      peakDecayRef.current--;
    } else if (peakRef.current > 0) {
      peakRef.current = Math.max(0, peakRef.current - 1.5);
    }
    setPeakPct(peakRef.current);
  }, [pct]);

  return (
    <div
      className="relative w-2.5 overflow-hidden rounded-sm"
      style={{ height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
    >
      <div
        className="absolute inset-x-0 bottom-0 rounded-sm"
        style={{
          height: `${pct}%`,
          background:
            pct > 85
              ? 'linear-gradient(to top, var(--color-meter-green), var(--color-meter-yellow) 60%, var(--color-meter-red))'
              : pct > 50
                ? 'linear-gradient(to top, var(--color-meter-green), var(--color-meter-yellow))'
                : 'var(--color-meter-green)',
          transition: 'height 60ms linear',
        }}
      />
      {/* Peak hold indicator */}
      {peakPct > 2 && (
        <div
          className="absolute inset-x-0"
          style={{
            bottom: `${peakPct}%`,
            height: 2,
            backgroundColor:
              peakPct > 85
                ? 'var(--color-meter-red)'
                : peakPct > 50
                  ? 'var(--color-meter-yellow)'
                  : 'var(--color-meter-green)',
          }}
        />
      )}
    </div>
  );
}

// ── PanKnob with center detent ──────────────────────────────────────────

function PanKnob({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const startY = useRef(0);
  const startVal = useRef(0);

  const angle = 270 + value * 45;
  const rad = (angle * Math.PI) / 180;
  const cx = 16,
    cy = 16,
    r = 10;
  const ix = cx + Math.cos(rad) * r;
  const iy = cy + Math.sin(rad) * r;

  // Center tick mark at 12 o'clock
  const centerRad = (270 * Math.PI) / 180;
  const tickInner = r + 2;
  const tickOuter = r + 4;
  const tx1 = cx + Math.cos(centerRad) * tickInner;
  const ty1 = cy + Math.sin(centerRad) * tickInner;
  const tx2 = cx + Math.cos(centerRad) * tickOuter;
  const ty2 = cy + Math.sin(centerRad) * tickOuter;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      startY.current = e.clientY;
      startVal.current = value;
    },
    [value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!(e.target as HTMLElement).hasPointerCapture(e.pointerId)) return;
      const dy = startY.current - e.clientY;
      let next = Math.max(-1, Math.min(1, startVal.current + dy / 80));
      // Center detent: snap to 0 when within 3%
      if (Math.abs(next) < 0.03) next = 0;
      onChange(Math.round(next * 100) / 100);
    },
    [onChange],
  );

  const onDoubleClick = useCallback(() => onChange(0), [onChange]);

  return (
    <div
      className="cursor-grab select-none active:cursor-grabbing"
      style={{ width: 32, height: 32 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onDoubleClick={onDoubleClick}
    >
      <svg width={32} height={32} viewBox="0 0 32 32">
        <circle
          cx={cx}
          cy={cy}
          r={13}
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
        />
        {/* Center detent tick */}
        <line
          x1={tx1}
          y1={ty1}
          x2={tx2}
          y2={ty2}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={2} fill="rgba(255,255,255,0.2)" />
        <line
          x1={cx}
          y1={cy}
          x2={ix}
          y2={iy}
          stroke="var(--color-text)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// ── MixingStrip ─────────────────────────────────────────────────────────

const STRIP_WIDTH = 90;

const MixingStrip = React.memo(function MixingStrip({
  trackId,
}: {
  trackId: string;
}) {
  const track = useTrack(trackId);
  const toggleMute = useStore((s) => s.toggleMute);
  const toggleSolo = useStore((s) => s.toggleSolo);
  const updateTrack = useStore((s) => s.updateTrack);

  const analyser =
    getTrackAudioState(trackId)?.trackEngine.getAnalyserNode() ?? null;
  const liveLevel = useMeterLevel(analyser);

  if (!track) return null;

  const volumePct = Math.round(track.volume * 100);

  return (
    <div
      className="relative flex shrink-0 flex-col items-center gap-2 px-2 py-3"
      style={{
        width: STRIP_WIDTH,
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
      }}
    >
      <DbReadout level={liveLevel} />

      <div className="flex gap-1">
        <button
          className="h-6 cursor-pointer rounded px-2 text-[9px] font-bold uppercase transition-colors"
          style={{
            backgroundColor: track.mute
              ? 'var(--color-record)'
              : 'rgba(255, 255, 255, 0.06)',
            color: track.mute ? '#fff' : 'var(--color-text-dim)',
            border: 'none',
          }}
          onClick={() => toggleMute(track.id)}
        >
          Mute
        </button>
        <button
          className="h-6 cursor-pointer rounded px-2 text-[9px] font-bold uppercase transition-colors"
          style={{
            backgroundColor: track.solo
              ? '#eab308'
              : 'rgba(255, 255, 255, 0.06)',
            color: track.solo ? '#000' : 'var(--color-text-dim)',
            border: 'none',
          }}
          onClick={() => toggleSolo(track.id)}
        >
          Solo
        </button>
      </div>

      <div className="flex w-full flex-1 items-center justify-center gap-2">
        <div className="flex gap-0.5" style={{ height: '100%' }}>
          <MeterBar level={liveLevel} />
        </div>

        <Slider.Root
          className="relative flex w-4 touch-none select-none flex-col items-center"
          style={{ height: '100%' }}
          orientation="vertical"
          min={0}
          max={100}
          step={1}
          value={[volumePct]}
          onValueChange={([v]) => updateTrack(track.id, { volume: v / 100 })}
        >
          <Slider.Track
            className="relative h-full w-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <Slider.Range
              className="absolute w-full rounded-full"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
            />
          </Slider.Track>
          <Slider.Thumb
            className="block h-4 w-5 rounded-sm shadow-sm focus:outline-none focus:ring-1"
            style={
              {
                backgroundColor: '#e8e8f0',
                '--tw-ring-color': 'var(--color-accent)',
              } as React.CSSProperties
            }
            aria-label="Volume"
          />
        </Slider.Root>

        <div className="flex gap-0.5" style={{ height: '100%' }}>
          <MeterBar level={liveLevel} />
        </div>
      </div>

      <PanKnob
        value={track.pan}
        onChange={(v) => updateTrack(track.id, { pan: v })}
      />

      <div className="flex w-full items-center justify-center gap-1">
        <div
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: track.color }}
        />
        <span
          className="truncate text-center text-[10px] font-medium"
          style={{ color: 'var(--color-text)' }}
        >
          {track.name}
        </span>
      </div>

      {/* Track color bar at bottom */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: 3, backgroundColor: track.color, opacity: 0.6 }}
      />
    </div>
  );
});

// ── MasterStrip ─────────────────────────────────────────────────────────

const MASTER_WIDTH = 100;

function MasterStrip({ isReady }: { isReady: boolean }) {
  const [analyserL, analyserR] = isReady
    ? audioEngine.getMasterAnalysers()
    : [null, null];
  const masterLevelL = useMeterLevel(analyserL);
  const masterLevelR = useMeterLevel(analyserR);

  const tracks = useStore((s) => s.tracks);
  const toggleMute = useStore((s) => s.toggleMute);
  const [masterVolume, setMasterVolume] = useState(80);

  const handleMuteAll = useCallback(() => {
    for (const t of tracks) {
      if (!t.mute) toggleMute(t.id);
    }
  }, [tracks, toggleMute]);

  const avgLevel = (masterLevelL + masterLevelR) / 2;

  return (
    <div
      className="flex shrink-0 flex-col items-center gap-2 px-2 py-3"
      style={{
        width: MASTER_WIDTH,
        borderLeft: '2px solid rgba(255, 255, 255, 0.12)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
      }}
    >
      <DbReadout level={avgLevel} />

      <button
        className="h-6 cursor-pointer rounded px-2 text-[9px] font-bold uppercase transition-colors"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          color: 'var(--color-text-dim)',
          border: 'none',
        }}
        onClick={handleMuteAll}
      >
        Mute All
      </button>

      <div className="flex w-full flex-1 items-center justify-center gap-1.5">
        <div className="flex gap-0.5" style={{ height: '100%' }}>
          <MeterBar level={masterLevelL} />
          <MeterBar level={masterLevelR} />
        </div>

        {/* Master volume fader */}
        <Slider.Root
          className="relative flex w-4 touch-none select-none flex-col items-center"
          style={{ height: '100%' }}
          orientation="vertical"
          min={0}
          max={100}
          step={1}
          value={[masterVolume]}
          onValueChange={([v]) => setMasterVolume(v)}
        >
          <Slider.Track
            className="relative h-full w-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <Slider.Range
              className="absolute w-full rounded-full"
              style={{ backgroundColor: 'rgba(126, 207, 207, 0.4)' }}
            />
          </Slider.Track>
          <Slider.Thumb
            className="block h-4 w-5 rounded-sm shadow-sm focus:outline-none focus:ring-1"
            style={
              {
                backgroundColor: 'var(--color-accent)',
                '--tw-ring-color': 'var(--color-accent)',
              } as React.CSSProperties
            }
            aria-label="Master Volume"
          />
        </Slider.Root>
      </div>

      <span
        className="font-mono text-[10px] font-medium"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {masterVolume === 80
          ? '0 dB'
          : `${(levelToDb(masterVolume) + 1.9).toFixed(1)} dB`}
      </span>

      <span
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color: 'var(--color-text)' }}
      >
        Master
      </span>
    </div>
  );
}

// ── MixingSection ───────────────────────────────────────────────────────

function MixingSection({ isReady }: { isReady: boolean }) {
  const trackIds = useTrackIds();
  const trackCount = useTrackCount();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Section header */}
      <div className="flex shrink-0 items-center gap-2 px-3 py-1.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text)' }}
        >
          Mixer
        </span>
        <div
          className="flex-1"
          style={{ height: 1, backgroundColor: 'var(--color-border)' }}
        />
      </div>

      {/* Mixer content */}
      <div className="flex flex-1 overflow-hidden">
        {trackCount === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Sliders
              size={28}
              strokeWidth={1.5}
              style={{ color: 'var(--color-text-dim)', opacity: 0.4 }}
            />
            <span
              className="text-[12px]"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Add tracks to see the mixer
            </span>
          </div>
        ) : (
          <div className="flex flex-1 overflow-x-auto">
            {trackIds.map((id) => (
              <MixingStrip key={id} trackId={id} />
            ))}
            <MasterStrip isReady={isReady} />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDIO VIEW — Combined
// ═══════════════════════════════════════════════════════════════════════════

export function StudioView({ isReady }: { isReady: boolean }) {
  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Top: Mastering */}
      <MasteringSection isReady={isReady} />

      {/* Bottom: Mixing */}
      <MixingSection isReady={isReady} />
    </div>
  );
}
