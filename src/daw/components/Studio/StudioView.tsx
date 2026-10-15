import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Sliders } from 'lucide-react';
import {
  useStore,
  useTrackIds,
  useTrack,
  useTrackCount,
  type Track,
} from '@/daw/store';
import type { ReturnBus } from '@/daw/store/returnsSlice';
import { sliderGestureProps } from '@/daw/hooks/useContinuousControl';
import {
  previewMasteringEffects,
  previewReturnEffects,
} from '@/daw/engine/preview';
import {
  useMasterVolumeControl,
  useReturnVolumeControl,
  useTrackPanControl,
  useTrackSendControl,
  useTrackVolumeControl,
} from '@/daw/hooks/useMixControls';
import { useShallow } from 'zustand/react/shallow';
import type { EffectSlotType, TrackEffectState } from '@/daw/audio/EffectChain';
import { meterSource, type BusLevels } from '@/daw/engine/meterBus';
import { paintFixedDigits, useMeterPaint } from '@/daw/hooks/useMeterLevel';
import { useSpectrumCanvas } from '@/daw/hooks/useSpectrumCanvas';
import type { MeterSource } from '@/daw/ui/Meter';
import { formatDb, formatGain, gainToDb } from '@/daw/ui/format';
import { FixedDigits } from '@/components/common/FixedDigits';
import {
  FxChainRow,
  FxControlsPanel,
} from '@/daw/components/Effects/EffectsPanel';
import { FxBrowser } from '@/daw/components/Effects/FxBrowser';
import { RotaryKnob } from '@/daw/components/Controls/RotaryKnob';

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
// The master's left channel, from its own analyser tapped off the meter bus
// (the bus's analysers stay tuned for metering). It draws once per bus
// frame, so only while there is sound, follows its container's size, and
// works out the bin positions and gradients once per size.

interface SpectrumLayout {
  xs: Float32Array;
  first: number;
  darkGrad: CanvasGradient;
  brightGrad: CanvasGradient;
  sampleRate: number;
}

function SpectrumAnalyzer({ isReady }: { isReady: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<SpectrumLayout | null>(null);

  useSpectrumCanvas(isReady ? 'master' : null, canvasRef, containerRef, (f) => {
    const { ctx, width: w, height: h, data, sampleRate } = f;
    const padBottom = 18;
    const graphH = h - padBottom;
    const minLog = Math.log10(20);
    const maxLog = Math.log10(sampleRate / 2);
    const freqToX = (freq: number) =>
      ((Math.log10(freq) - minLog) / (maxLog - minLog)) * w;

    let layout = layoutRef.current;
    if (
      !layout ||
      f.resized ||
      layout.xs.length !== data.length ||
      layout.sampleRate !== sampleRate
    ) {
      const xs = new Float32Array(data.length);
      let first = -1;
      for (let i = 0; i < data.length; i++) {
        const freq = (i / data.length) * (sampleRate / 2);
        if (freq < 20) continue;
        if (first < 0) first = i;
        xs[i] = freqToX(freq);
      }
      // Dark background fill (deeper layer)
      const darkGrad = ctx.createLinearGradient(0, graphH, 0, 0);
      darkGrad.addColorStop(0, 'rgba(40, 60, 100, 0.02)');
      darkGrad.addColorStop(0.5, 'rgba(40, 60, 100, 0.08)');
      darkGrad.addColorStop(1, 'rgba(40, 60, 100, 0.18)');
      // Bright accent fill (top layer)
      const brightGrad = ctx.createLinearGradient(0, graphH, 0, 0);
      brightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
      brightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
      brightGrad.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
      layout = { xs, first, darkGrad, brightGrad, sampleRate };
      layoutRef.current = layout;
    }

    ctx.clearRect(0, 0, w, h);

    // dB grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (const db of DB_GRID) {
      const y = graphH * (1 - (db + 60) / 60);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const { xs, first } = layout;
    if (first < 0) return;
    const last = data.length - 1;
    const yAt = (i: number) => graphH - (data[i] / 255) * graphH;
    const outline = () => {
      ctx.beginPath();
      ctx.moveTo(xs[first], graphH);
      for (let i = first; i <= last; i++) ctx.lineTo(xs[i], yAt(i));
      ctx.lineTo(xs[last], graphH);
      ctx.closePath();
    };

    outline();
    ctx.fillStyle = layout.darkGrad;
    ctx.fill();
    outline();
    ctx.fillStyle = layout.brightGrad;
    ctx.fill();

    // Spectrum stroke
    ctx.beginPath();
    ctx.moveTo(xs[first], yAt(first));
    for (let i = first + 1; i <= last; i++) ctx.lineTo(xs[i], yAt(i));
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Frequency tick marks & labels
    ctx.font = "9px 'Glacial Indifference', system-ui, sans-serif";
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'center';
    for (const { freq, label } of FREQ_LABELS) {
      const x = freqToX(freq);
      if (x > 8 && x < w - 8) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, graphH);
        ctx.stroke();
        ctx.fillText(label, x, h - 4);
      }
    }
  });

  return (
    <div
      ref={containerRef}
      className="w-full shrink-0 rounded-lg"
      style={{
        height: 180,
        backgroundColor: 'var(--daw-surface-2)',
        border: '1px solid var(--daw-hairline)',
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

// ── Peak Meter ──────────────────────────────────────────────────────────
// The master's sample peak in dBFS. It used to read "LUFS", but that number
// was this same peak rescaled: real loudness needs K-weighting and gating.
// The meter bus reads float samples, so the peak is exact; the readout is
// the editor's one dB format (formatDb), nothing above 0 dBFS, and −∞ at or
// below the bus's −60 dBFS floor. The segments and the readout are painted
// from the bus through refs: the mastering section never re-renders for a
// level.

const PEAK_SEGMENTS = 20;

function peakSegmentColor(i: number): string {
  const ratio = i / PEAK_SEGMENTS;
  return ratio > 0.85
    ? 'var(--daw-meter-clip)'
    : ratio > 0.6
      ? 'var(--daw-meter-hot)'
      : 'var(--daw-meter-safe)';
}

const SEGMENT_OFF = 'rgba(255, 255, 255, 0.04)';

/** The readout for a peak (linear amplitude), in dBFS. */
function peakText(peak: number): string {
  return formatGain(Math.min(1, peak), { unit: 'dBFS', floor: -60 });
}

function PeakMeter() {
  const segmentsRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const litRef = useRef(-1);

  useMeterPaint(meterSource('master'), (levels) => {
    // A peak meter reads the louder channel.
    const peak = levels ? Math.max(levels.peak[0], levels.peak[1]) : 0;
    paintFixedDigits(readoutRef.current, peakText(peak));
    const lit = Math.round(Math.min(1, peak) * PEAK_SEGMENTS);
    const segments = segmentsRef.current?.children;
    if (!segments || lit === litRef.current) return;
    litRef.current = lit;
    for (let i = 0; i < segments.length; i++) {
      (segments[i] as HTMLElement).style.backgroundColor =
        i < lit ? peakSegmentColor(i) : SEGMENT_OFF;
    }
  });

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Segmented meter */}
      <div
        ref={segmentsRef}
        className="flex flex-col-reverse gap-px"
        style={{ width: 12, height: 80 }}
      >
        {Array.from({ length: PEAK_SEGMENTS }, (_, i) => (
          <div
            key={i}
            className="rounded-[1px]"
            style={{
              flex: 1,
              backgroundColor: SEGMENT_OFF,
              transition: 'background-color 60ms linear',
            }}
          />
        ))}
      </div>
      <span
        ref={readoutRef}
        className="whitespace-nowrap text-[12px] font-bold"
        style={{ color: 'var(--daw-text)' }}
      />
      <span
        className="text-[11px] font-semibold uppercase"
        style={{ color: 'var(--daw-text-3)' }}
      >
        Peak
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
      data-tutorial-id="mastering-section"
      className="flex shrink-0 flex-col"
      style={{
        borderBottom: '1px solid var(--daw-hairline)',
        padding: '12px 16px',
      }}
    >
      {/* ── Header bar ─────────────────────────────────── */}
      <div className="flex items-center" style={{ marginBottom: 12 }}>
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--daw-text)' }}
        >
          Mastering
        </span>
        {/* Gain Match is hidden until it does something (it had no handler). */}
        <div className="ml-auto flex items-center gap-2">
          {/* A real toggle: playback runs every mastering slot off while it
              is pressed, so students hear the mix without the chain. A
              listening A/B only: exports keep the mastering. */}
          <button
            type="button"
            onClick={toggleBypass}
            aria-pressed={bypass}
            title="Hear the mix without mastering (exports keep it)"
            className="flex h-6 cursor-pointer items-center rounded-full px-3 text-[12px] font-medium transition-colors"
            style={{
              color: bypass ? 'var(--daw-text)' : 'var(--daw-text-3)',
              backgroundColor: bypass
                ? 'rgba(255, 255, 255, 0.1)'
                : 'transparent',
              border: '1px solid var(--daw-hairline)',
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
          backgroundColor: 'var(--daw-surface-2)',
          border: '1px solid var(--daw-hairline)',
        }}
      >
        {/* Left: FxBrowser */}
        <FxBrowser
          trackId="master"
          activeEffects={fxChain}
          onAddEffect={wrappedAdd}
          onSelectEffect={setSelectedEffect}
          hideMidi
        />

        {/* Right: chain + controls */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Signal chain row with the peak meter pinned right */}
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
              <PeakMeter />
            </div>
          </div>

          {/* Controls panel */}
          {selectedEffect ? (
            <FxControlsPanel
              trackId="master"
              selectedEffect={selectedEffect}
              effects={mfx}
              onUpdate={wrappedUpdate}
              onPreview={previewMasteringEffects}
              onRemove={(slot) => removeMasteringFx(slot)}
              popOutOpen={popOutOpen}
              onTogglePopOut={() => setPopOutOpen((v) => !v)}
              meterTarget={isReady ? 'master' : null}
            />
          ) : (
            <div
              className="flex flex-1 items-center justify-center py-6 text-[11px]"
              style={{ color: 'var(--daw-text-3)' }}
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

function dbColor(db: number): string {
  if (db > -3) return 'var(--daw-meter-clip)';
  if (db > -12) return 'var(--daw-meter-hot)';
  return 'var(--daw-meter-safe)';
}

/** A reading's level: one channel, or the mean of all of them. */
function readingLevel(levels: BusLevels | null, channel: number | 'mean') {
  if (!levels) return 0;
  if (channel !== 'mean') return levels.peak[channel] ?? 0;
  let sum = 0;
  for (let ch = 0; ch < levels.peak.length; ch++) sum += levels.peak[ch];
  return sum / levels.peak.length;
}

/** A strip's live level in dB, painted from the meter bus through a ref. */
function DbReadout({
  source,
  channel = 'mean',
}: {
  source: MeterSource;
  channel?: number | 'mean';
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useMeterPaint(source, (levels) => {
    const el = ref.current;
    if (!el) return;
    const db = gainToDb(Math.min(1, readingLevel(levels, channel)));
    paintFixedDigits(el, formatDb(db));
    const color = dbColor(db);
    if (el.style.color !== color) el.style.color = color;
  });
  return (
    <span
      ref={ref}
      className="text-[11px] font-bold"
      style={{ color: dbColor(-Infinity) }}
    />
  );
}

// ── MeterBar with peak hold ─────────────────────────────────────────────
// Painted from the meter bus through refs. The hold marker is the bus's
// held peak: it holds for a second and then falls at a steady rate, in real
// time, so it comes to rest when the signal stops (it used to move only
// when the level changed, and froze once the level settled).

function barFill(pct: number): string {
  return pct > 85
    ? 'linear-gradient(to top, var(--daw-meter-safe), var(--daw-meter-hot) 60%, var(--daw-meter-clip))'
    : pct > 50
      ? 'linear-gradient(to top, var(--daw-meter-safe), var(--daw-meter-hot))'
      : 'var(--daw-meter-safe)';
}

function holdColor(pct: number): string {
  return pct > 85
    ? 'var(--daw-meter-clip)'
    : pct > 50
      ? 'var(--daw-meter-hot)'
      : 'var(--daw-meter-safe)';
}

function MeterBar({
  source,
  channel = 0,
}: {
  source: MeterSource;
  channel?: number;
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef<HTMLDivElement>(null);

  useMeterPaint(source, (levels) => {
    const fill = fillRef.current;
    const hold = holdRef.current;
    if (!fill || !hold) return;
    const pct = Math.min(100, Math.round((levels?.peak[channel] ?? 0) * 100));
    const holdPct = Math.min(100, (levels?.hold[channel] ?? 0) * 100);
    fill.style.height = `${pct}%`;
    fill.style.background = barFill(pct);
    if (holdPct > 2) {
      hold.style.display = 'block';
      hold.style.bottom = `${holdPct}%`;
      hold.style.backgroundColor = holdColor(holdPct);
    } else {
      hold.style.display = 'none';
    }
  });

  return (
    <div
      className="relative w-2.5 overflow-hidden rounded-sm"
      style={{ height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
    >
      <div
        ref={fillRef}
        className="absolute inset-x-0 bottom-0 rounded-sm"
        style={{
          height: '0%',
          background: barFill(0),
          transition: 'height 60ms linear',
        }}
      />
      {/* Peak hold indicator */}
      <div
        ref={holdRef}
        className="absolute inset-x-0"
        style={{ display: 'none', height: 2 }}
      />
    </div>
  );
}

// ── PanKnob with center detent ──────────────────────────────────────────

function PanKnob({
  value,
  onChange,
  onChangeStart,
  onChangeEnd,
}: {
  value: number;
  onChange: (v: number) => void;
  /** A drag starts and ends (useContinuousControl's begin and end). */
  onChangeStart?: () => void;
  onChangeEnd?: () => void;
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
      onChangeStart?.();
    },
    [value, onChangeStart],
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
      onPointerUp={onChangeEnd}
      onPointerCancel={onChangeEnd}
      onLostPointerCapture={onChangeEnd}
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
          stroke="var(--daw-text)"
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
  // Select only the stable send targets (id + label as flat primitives) so a
  // return fader/FX tweak — which rebuilds the returns array — doesn't
  // re-render every track strip and its send knobs.
  const returnMeta = useStore(
    useShallow((s) => s.returns.flatMap((r) => [r.id, r.label])),
  );
  const returns: Array<{ id: string; label: string }> = [];
  for (let i = 0; i < returnMeta.length; i += 2) {
    returns.push({ id: returnMeta[i], label: returnMeta[i + 1] });
  }

  // The live level comes from the meter bus by key: the bus finds this
  // track's analyser itself (again when a load replaces the engine), and
  // the readout and bars paint through refs, so the strip never re-renders
  // for a level.
  const level = meterSource(`track:${trackId}`);

  if (!track) return null;

  return (
    <div
      className="relative flex shrink-0 flex-col items-center gap-2 px-2 py-3"
      style={{
        width: STRIP_WIDTH,
        borderRight: '1px solid var(--daw-hairline)',
        backgroundColor: 'var(--daw-surface-2)',
      }}
    >
      <DbReadout source={level} />

      <div className="flex gap-1">
        <button
          className="h-6 cursor-pointer rounded px-2 text-[9px] font-bold uppercase transition-colors"
          style={{
            backgroundColor: track.mute
              ? 'var(--daw-record)'
              : 'rgba(255, 255, 255, 0.06)',
            color: track.mute ? '#fff' : 'var(--daw-text-3)',
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
              ? 'var(--daw-meter-hot)'
              : 'rgba(255, 255, 255, 0.06)',
            color: track.solo ? '#000' : 'var(--daw-text-3)',
            border: 'none',
          }}
          onClick={() => toggleSolo(track.id)}
        >
          Solo
        </button>
      </div>

      <div className="flex w-full flex-1 items-center justify-center gap-2">
        <div className="flex gap-0.5" style={{ height: '100%' }}>
          <MeterBar source={level} />
        </div>

        <StripVolume track={track} />

        <div className="flex gap-0.5" style={{ height: '100%' }}>
          <MeterBar source={level} />
        </div>
      </div>

      <StripPan track={track} />

      {/* Aux sends — one knob per return bus */}
      {returns.length > 0 && (
        <div className="flex w-full items-center justify-center gap-1.5">
          {returns.map((ret) => (
            <div
              key={ret.id}
              data-tutorial-id={`mixer-sends-${ret.id}`}
              className="flex flex-col items-center"
              title={`Send to ${ret.label}`}
            >
              <SendKnob track={track} returnId={ret.id} />
            </div>
          ))}
        </div>
      )}

      <div className="flex w-full items-center justify-center gap-1">
        <div
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: track.color }}
        />
        <span
          className="truncate text-center text-[10px] font-medium"
          style={{ color: 'var(--daw-text)' }}
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

// The strip's continuous controls: each previews while it moves and writes
// the store once on release (useMixControls).

function StripVolume({ track }: { track: Track }) {
  const volume = useTrackVolumeControl(track);
  return (
    <Slider.Root
      className="relative flex w-4 touch-none select-none flex-col items-center"
      style={{ height: '100%' }}
      orientation="vertical"
      min={0}
      max={100}
      step={1}
      value={[Math.round(volume.value * 100)]}
      onValueChange={([v]) => volume.change(v / 100)}
      {...sliderGestureProps(volume)}
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
            '--tw-ring-color': 'var(--daw-accent)',
          } as React.CSSProperties
        }
        aria-label="Volume"
      />
    </Slider.Root>
  );
}

function StripPan({ track }: { track: Track }) {
  const pan = useTrackPanControl(track);
  return (
    <PanKnob
      value={pan.value}
      onChange={pan.change}
      onChangeStart={pan.begin}
      onChangeEnd={pan.end}
    />
  );
}

function SendKnob({ track, returnId }: { track: Track; returnId: string }) {
  const send = useTrackSendControl(track, returnId);
  return (
    <RotaryKnob
      label={returnId}
      value={send.value}
      min={0}
      max={1}
      size={26}
      formatValue={(v) => `${Math.round(v * 100)}`}
      onChange={send.change}
      onChangeStart={send.begin}
      onChangeEnd={send.end}
    />
  );
}

// ── MasterStrip ─────────────────────────────────────────────────────────

const MASTER_WIDTH = 100;

function MasterStrip() {
  // Stereo master level from the meter bus, painted through refs.
  const level = meterSource('master');

  const tracks = useStore((s) => s.tracks);
  const toggleMute = useStore((s) => s.toggleMute);
  // Previews while it moves; one store write on release.
  const volume = useMasterVolumeControl();
  const masterVolume = Math.round(volume.value * 100);

  const handleMuteAll = useCallback(() => {
    for (const t of tracks) {
      if (!t.mute) toggleMute(t.id);
    }
  }, [tracks, toggleMute]);

  return (
    <div
      data-tutorial-id="master-strip"
      className="flex shrink-0 flex-col items-center gap-2 px-2 py-3"
      style={{
        width: MASTER_WIDTH,
        borderLeft: '2px solid rgba(255, 255, 255, 0.12)',
        backgroundColor: 'var(--daw-surface-2)',
      }}
    >
      <DbReadout source={level} />

      <button
        className="h-6 cursor-pointer rounded px-2 text-[9px] font-bold uppercase transition-colors"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          color: 'var(--daw-text-3)',
          border: 'none',
        }}
        onClick={handleMuteAll}
      >
        Mute All
      </button>

      <div className="flex w-full flex-1 items-center justify-center gap-1.5">
        <div className="flex gap-0.5" style={{ height: '100%' }}>
          <MeterBar source={level} channel={0} />
          <MeterBar source={level} channel={1} />
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
          onValueChange={([v]) => volume.change(v / 100)}
          {...sliderGestureProps(volume)}
        >
          <Slider.Track
            className="relative h-full w-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <Slider.Range
              className="absolute w-full rounded-full"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
            />
          </Slider.Track>
          <Slider.Thumb
            className="block h-4 w-5 rounded-sm shadow-sm focus:outline-none focus:ring-1"
            style={
              {
                backgroundColor: 'var(--daw-accent)',
                '--tw-ring-color': 'var(--daw-accent)',
              } as React.CSSProperties
            }
            aria-label="Master Volume"
          />
        </Slider.Root>
      </div>

      {/* The fader's gain as it is: the default 80 % is −1.9 dB, as the
          Create view's master header says (fx-mixer-13). */}
      <FixedDigits
        text={formatGain(volume.value)}
        className="text-[10px] font-medium"
        style={{ color: 'var(--daw-text-3)' }}
      />

      <span
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color: 'var(--daw-text)' }}
      >
        Master
      </span>
    </div>
  );
}

// ── ReturnStrip ─────────────────────────────────────────────────────────
// A non-track mixer strip for a global aux return bus (fader + label). Clicking
// selects it so its FX rack shows in the ReturnFxRack panel below the mixer.

const RETURN_WIDTH = 92;

function ReturnStrip({
  returnId,
  selected,
  onSelect,
}: {
  returnId: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const ret = useStore((s) => s.returns.find((r) => r.id === returnId));
  if (!ret) return null;

  return (
    <div
      data-tutorial-id={`return-strip-${returnId}`}
      onClick={onSelect}
      className="flex shrink-0 cursor-pointer flex-col items-center gap-2 px-2 py-3"
      style={{
        width: RETURN_WIDTH,
        borderRight: '1px solid var(--daw-hairline)',
        backgroundColor: selected ? 'var(--daw-hover)' : 'var(--daw-surface-2)',
        boxShadow: selected ? 'inset 0 0 0 1px var(--daw-accent)' : 'none',
      }}
    >
      <span
        className="text-[9px] font-bold uppercase tracking-wider"
        style={{ color: 'var(--daw-accent)' }}
      >
        Return {returnId}
      </span>

      <div
        className="flex w-full flex-1 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ReturnFader ret={ret} />
      </div>

      <div className="flex w-full items-center justify-center gap-1">
        <span
          className="truncate text-center text-[10px] font-medium"
          style={{ color: 'var(--daw-text)' }}
        >
          {ret.label}
        </span>
      </div>
      <span className="text-[9px]" style={{ color: 'var(--daw-text-3)' }}>
        {ret.fxChain.length} FX
      </span>
    </div>
  );
}

/** A return's fader: previews while it moves, one store write on release. */
function ReturnFader({ ret }: { ret: ReturnBus }) {
  const volume = useReturnVolumeControl(ret);
  return (
    <Slider.Root
      className="relative flex w-4 touch-none select-none flex-col items-center"
      style={{ height: '100%' }}
      orientation="vertical"
      min={0}
      max={100}
      step={1}
      value={[Math.round(volume.value * 100)]}
      onValueChange={([v]) => volume.change(v / 100)}
      {...sliderGestureProps(volume)}
    >
      <Slider.Track
        className="relative h-full w-1.5 rounded-full"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <Slider.Range
          className="absolute w-full rounded-full"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
        />
      </Slider.Track>
      <Slider.Thumb
        className="block h-4 w-5 rounded-sm shadow-sm focus:outline-none focus:ring-1"
        style={
          {
            backgroundColor: 'var(--daw-accent)',
            '--tw-ring-color': 'var(--daw-accent)',
          } as React.CSSProperties
        }
        aria-label={`Return ${ret.id} volume`}
      />
    </Slider.Root>
  );
}

// ── ReturnFxRack ────────────────────────────────────────────────────────
// The selected return's effect rack, reusing the mastering FX-rack pattern
// (FxBrowser + FxChainRow + FxControlsPanel) against the return's own state.
// The return chains aren't exposed to the meter bus, so its meters stay at
// rest (no meterTarget).

function ReturnFxRack({ returnId }: { returnId: string }) {
  const ret = useStore((s) => s.returns.find((r) => r.id === returnId));
  const addReturnFx = useStore((s) => s.addReturnFx);
  const removeReturnFx = useStore((s) => s.removeReturnFx);
  const updateReturnEffects = useStore((s) => s.updateReturnEffects);

  const [selectedEffect, setSelectedEffect] = useState<EffectSlotType | null>(
    null,
  );
  const [popOutOpen, setPopOutOpen] = useState(false);

  const fxChain = ret?.fxChain ?? [];
  useEffect(() => {
    if (selectedEffect && !fxChain.includes(selectedEffect)) {
      setSelectedEffect(fxChain[0] ?? null);
    }
    if (!selectedEffect && fxChain.length > 0) setSelectedEffect(fxChain[0]);
  }, [fxChain, selectedEffect]);

  const wrappedAdd = useCallback(
    (_id: string, effectType: EffectSlotType) =>
      addReturnFx(returnId, effectType),
    [addReturnFx, returnId],
  );
  const wrappedUpdate = useCallback(
    (_id: string, fx: Partial<TrackEffectState>) =>
      updateReturnEffects(returnId, fx),
    [updateReturnEffects, returnId],
  );

  if (!ret) return null;
  const rfx = ret.effects;

  return (
    <div
      data-tutorial-id={`return-fx-${returnId}`}
      className="flex shrink-0 flex-col"
      style={{
        borderTop: '1px solid var(--daw-hairline)',
        padding: '8px 16px',
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--daw-text)' }}
        >
          Return {returnId} — {ret.label}
        </span>
      </div>
      <div
        className="flex overflow-hidden rounded-lg"
        style={{
          backgroundColor: 'var(--daw-surface-2)',
          border: '1px solid var(--daw-hairline)',
        }}
      >
        <FxBrowser
          trackId={`return-${returnId}`}
          activeEffects={fxChain}
          onAddEffect={wrappedAdd}
          onSelectEffect={setSelectedEffect}
          hideMidi
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <FxChainRow
            activeEffects={fxChain}
            effects={rfx}
            selectedEffect={selectedEffect}
            onSelect={setSelectedEffect}
            onToggle={(slot) => {
              const current = rfx[slot as keyof TrackEffectState] as {
                enabled: boolean;
              };
              updateReturnEffects(returnId, {
                [slot]: {
                  ...rfx[slot as keyof TrackEffectState],
                  enabled: !current.enabled,
                },
              });
            }}
          />
          {selectedEffect ? (
            <FxControlsPanel
              trackId={`return-${returnId}`}
              selectedEffect={selectedEffect}
              effects={rfx}
              onUpdate={wrappedUpdate}
              onPreview={(effects) => previewReturnEffects(returnId, effects)}
              onRemove={(slot) => removeReturnFx(returnId, slot)}
              popOutOpen={popOutOpen}
              onTogglePopOut={() => setPopOutOpen((v) => !v)}
            />
          ) : (
            <div
              className="flex flex-1 items-center justify-center py-5 text-[11px]"
              style={{ color: 'var(--daw-text-3)' }}
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

// ── MixingSection ───────────────────────────────────────────────────────

function MixingSection() {
  const trackIds = useTrackIds();
  const trackCount = useTrackCount();
  const returnIds = useStore(useShallow((s) => s.returns.map((r) => r.id)));
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);

  return (
    <div
      data-tutorial-id="mixer-section"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {/* Section header */}
      <div className="flex shrink-0 items-center gap-2 px-3 py-1.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--daw-text)' }}
        >
          Mixer
        </span>
        <div
          className="flex-1"
          style={{ height: 1, backgroundColor: 'var(--daw-hairline)' }}
        />
      </div>

      {/* Mixer content */}
      <div className="flex flex-1 overflow-hidden">
        {trackCount === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Sliders
              size={28}
              strokeWidth={1.5}
              style={{ color: 'var(--daw-text-3)', opacity: 0.4 }}
            />
            <span
              className="text-[12px]"
              style={{ color: 'var(--daw-text-3)' }}
            >
              Add tracks to see the mixer
            </span>
          </div>
        ) : (
          <div className="flex flex-1 overflow-x-auto">
            {trackIds.map((id) => (
              <MixingStrip key={id} trackId={id} />
            ))}
            {returnIds.map((id) => (
              <ReturnStrip
                key={id}
                returnId={id}
                selected={selectedReturnId === id}
                onSelect={() =>
                  setSelectedReturnId((cur) => (cur === id ? null : id))
                }
              />
            ))}
            <MasterStrip />
          </div>
        )}
      </div>

      {/* Selected return's FX rack. key remounts it on a return switch so its
          local effect selection never bleeds across returns; hidden with the
          strips when there are no tracks. */}
      {trackCount > 0 && selectedReturnId && (
        <ReturnFxRack key={selectedReturnId} returnId={selectedReturnId} />
      )}
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
      style={{ backgroundColor: 'var(--daw-bg)' }}
    >
      {/* Top: Mastering */}
      <MasteringSection isReady={isReady} />

      {/* Bottom: Mixing */}
      <MixingSection />
    </div>
  );
}
