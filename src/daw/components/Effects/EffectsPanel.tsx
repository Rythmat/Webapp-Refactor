import { useState, useMemo, useEffect } from 'react';
import { X, Maximize2, Zap } from 'lucide-react';
import { useStore } from '@/daw/store';
import type { TrackEffectState, EffectSlotType, ReverbType } from '@/daw/audio/EffectChain';
import { FX_COLOR, FX_CATEGORY, FX_LABEL } from '@/daw/data/libraryItems';
import { GraphicEQ } from './GraphicEQ';
import { RotaryKnob } from '@/daw/components/Controls/RotaryKnob';
import { CompressorCurve, ReverbDecay, DelayTaps, GateCurve } from './visualizers';
import { PopOutOverlay } from '@/daw/components/ChannelStrip/PopOutOverlay';
import { FxMeter } from './FxMeter';
import { useCompressorMeters } from '@/daw/hooks/useCompressorMeters';
import { getTrackAudioState } from '@/daw/hooks/usePlaybackEngine';
import { BAND_COLORS, AutoCheckbox, BandTab, CurveTypeSelector } from './FxShared';
import { FxBrowser } from './FxBrowser';

// Effects that have a visualizer component
export const HAS_VIZ = new Set<EffectSlotType>(['compressor', 'gate', 'eq', 'reverb', 'delay']);

// ── Block Icons (SVG, matching GuitarBassView pattern) ──────────────────

export function FxBlockIcon({ type, size = 28, color }: { type: EffectSlotType; size?: number; color: string }) {
  const s = size;
  const props = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'compressor':
      return <svg {...props}><polyline points="4,18 10,12 14,14 20,6" /><polyline points="16,6 20,6 20,10" /></svg>;
    case 'gate':
      return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2" /><line x1="9" y1="4" x2="9" y2="20" /><line x1="15" y1="4" x2="15" y2="20" /></svg>;
    case 'eq':
      return <svg {...props}><line x1="7" y1="4" x2="7" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /><line x1="17" y1="4" x2="17" y2="20" /><rect x="5" y="7" width="4" height="3" rx="1" fill={color} stroke="none" /><rect x="10" y="13" width="4" height="3" rx="1" fill={color} stroke="none" /><rect x="15" y="9" width="4" height="3" rx="1" fill={color} stroke="none" /></svg>;
    case 'reverb':
      return <svg {...props}><path d="M12,6 Q18,6 18,12 Q18,18 12,18" /><path d="M12,9 Q15,9 15,12 Q15,15 12,15" /><line x1="12" y1="10" x2="12" y2="14" /></svg>;
    case 'delay':
      return <svg {...props}><circle cx="6" cy="12" r="2.5" /><circle cx="13" cy="12" r="1.8" opacity="0.6" /><circle cx="19" cy="12" r="1.2" opacity="0.3" /></svg>;
    case 'presence':
      return <svg {...props}><path d="M4,16 Q8,16 12,8 Q16,16 20,16" /></svg>;
    case 'de-esser':
      return <svg {...props}><path d="M2,12 C5,4 8,20 12,12 C16,4 19,20 22,12" /></svg>;
    case 'saturator':
      return <svg {...props}><polyline points="2,16 6,16 9,8 12,18 15,6 18,16 22,16" /></svg>;
  }
}

// ── EffectsPanel (top-level) ────────────────────────────────────────────

export function EffectsPanel() {
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const tracks = useStore((s) => s.tracks);
  const updateTrackEffects = useStore((s) => s.updateTrackEffects);
  const addActiveEffect = useStore((s) => s.addActiveEffect);
  const removeActiveEffect = useStore((s) => s.removeActiveEffect);
  const track = tracks.find((t) => t.id === selectedTrackId);

  const effectChain = useMemo(() => {
    if (!selectedTrackId) return null;
    return getTrackAudioState(selectedTrackId)?.trackEngine.getEffectChain() ?? null;
  }, [selectedTrackId]);

  const { gr, inLevel, outLevel } = useCompressorMeters(effectChain);

  const [selectedEffect, setSelectedEffect] = useState<EffectSlotType | null>(null);
  const [popOutOpen, setPopOutOpen] = useState(false);

  // Auto-select first effect; deselect if removed
  useEffect(() => {
    if (!track) { setSelectedEffect(null); return; }
    if (selectedEffect && !track.activeEffects.includes(selectedEffect)) {
      setSelectedEffect(track.activeEffects[0] ?? null);
    }
    if (!selectedEffect && track.activeEffects.length > 0) {
      setSelectedEffect(track.activeEffects[0]);
    }
  }, [track?.activeEffects, selectedEffect, track]);

  return (
    <div className="flex overflow-hidden h-full">
      {track ? (
        <>
          <FxBrowser trackId={track.id} activeEffects={track.activeEffects} onAddEffect={addActiveEffect} hideMidi />
          <div className="flex-1 flex flex-col overflow-hidden">
            <FxChainRow
              activeEffects={track.activeEffects}
              effects={track.effects}
              selectedEffect={selectedEffect}
              onSelect={setSelectedEffect}
              onToggle={(slot) => {
                const key = slot === 'de-esser' ? 'de-esser' : slot;
                const current = track.effects[key as keyof TrackEffectState] as { enabled: boolean };
                updateTrackEffects(track.id, { [key]: { ...track.effects[key as keyof TrackEffectState], enabled: !current.enabled } });
              }}
            />
            {selectedEffect ? (
              <FxControlsPanel
                trackId={track.id}
                selectedEffect={selectedEffect}
                effects={track.effects}
                onUpdate={updateTrackEffects}
                onRemove={(slot) => { removeActiveEffect(track.id, slot); }}
                popOutOpen={popOutOpen}
                onTogglePopOut={() => setPopOutOpen((v) => !v)}
                gr={gr}
                inLevel={inLevel}
                outLevel={outLevel}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[11px]" style={{ color: 'var(--color-text-dim)' }}>
                {track.activeEffects.length === 0 ? 'Add effects from the list' : 'Select a block to edit'}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4 text-xs" style={{ color: 'var(--color-text-dim)' }}>
          Select a track to edit effects
        </div>
      )}
    </div>
  );
}

// ── Signal Chain Row ────────────────────────────────────────────────────

export function FxChainRow({
  activeEffects,
  effects,
  selectedEffect,
  onSelect,
  onToggle,
}: {
  activeEffects: EffectSlotType[];
  effects: TrackEffectState;
  selectedEffect: EffectSlotType | null;
  onSelect: (slot: EffectSlotType) => void;
  onToggle: (slot: EffectSlotType) => void;
}) {
  return (
    <div
      className="relative flex items-center shrink-0 border-b"
      style={{ borderColor: 'var(--color-border)', minHeight: 110 }}
    >
      {/* Connection line */}
      <div
        className="absolute"
        style={{ top: '50%', left: 16, right: 16, height: 1, backgroundColor: 'rgba(255,255,255,0.12)', zIndex: 0, transform: 'translateY(-8px)' }}
      />

      {/* Input */}
      <div className="flex flex-col items-center shrink-0 pl-4 relative" style={{ zIndex: 1 }}>
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 68, height: 68, backgroundColor: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.15)' }}
        >
          <Zap size={28} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--color-text-dim)' }}>In</span>
      </div>

      {/* Effect blocks */}
      <div className="flex-1 flex items-center justify-center gap-2 px-3 py-5 overflow-x-auto" style={{ zIndex: 1 }}>
        {activeEffects.length === 0 && (
          <span className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>Add effects from the list</span>
        )}
        {activeEffects.map((slot) => {
          const color = FX_COLOR[slot] ?? '#7ecfcf';
          const isSelected = slot === selectedEffect;
          const effectState = effects[slot as keyof TrackEffectState] as { enabled: boolean };
          const enabled = effectState?.enabled ?? false;
          return (
            <div key={slot} className="flex flex-col items-center shrink-0">
              <div
                onClick={() => onSelect(slot)}
                className="relative flex flex-col items-center justify-center shrink-0 cursor-pointer rounded-xl"
                style={{
                  width: 68,
                  height: 68,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: `2px solid ${color}`,
                  opacity: enabled ? 1 : 0.35,
                  boxShadow: isSelected ? `0 0 10px ${color}40` : 'none',
                  transition: 'opacity 150ms ease, box-shadow 150ms ease',
                }}
              >
                <FxBlockIcon type={slot} size={28} color={color} />
                {/* Enable dot */}
                <div
                  onClick={(e) => { e.stopPropagation(); onToggle(slot); }}
                  className="absolute cursor-pointer rounded-full"
                  style={{
                    bottom: 5,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 7,
                    height: 7,
                    backgroundColor: enabled ? '#22c55e' : 'rgba(255,255,255,0.12)',
                    boxShadow: enabled ? '0 0 4px #22c55e80' : 'none',
                  }}
                />
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider mt-1" style={{ color: isSelected ? color : 'var(--color-text-dim)' }}>
                {FX_LABEL[slot] ?? slot}
              </span>
            </div>
          );
        })}
      </div>

      {/* Output */}
      <div className="flex flex-col items-center shrink-0 pr-4 relative" style={{ zIndex: 1 }}>
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 68, height: 68, backgroundColor: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.15)' }}
        >
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2,12 Q6,2 12,12 Q18,22 22,12" />
          </svg>
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--color-text-dim)' }}>Out</span>
      </div>
    </div>
  );
}

// ── Controls Panel ──────────────────────────────────────────────────────

export function FxControlsPanel({
  trackId,
  selectedEffect,
  effects,
  onUpdate,
  onRemove,
  popOutOpen,
  onTogglePopOut,
  gr,
  inLevel,
  outLevel,
}: {
  trackId: string;
  selectedEffect: EffectSlotType;
  effects: TrackEffectState;
  onUpdate: (trackId: string, effects: Partial<TrackEffectState>) => void;
  onRemove: (slot: EffectSlotType) => void;
  popOutOpen: boolean;
  onTogglePopOut: () => void;
  gr: number;
  inLevel: number;
  outLevel: number;
}) {
  const color = FX_COLOR[selectedEffect] ?? '#7ecfcf';
  const category = FX_CATEGORY[selectedEffect] ?? '';
  const label = FX_LABEL[selectedEffect] ?? selectedEffect;
  const hasViz = HAS_VIZ.has(selectedEffect);

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--color-surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
          {category}
        </span>
        <span className="text-[13px] font-medium flex-1" style={{ color: 'var(--color-text)' }}>
          {label}
        </span>
        <button
          onClick={onTogglePopOut}
          className="p-1 cursor-pointer rounded-md"
          style={{ color: popOutOpen ? 'var(--color-accent)' : 'var(--color-text-dim)', background: 'none', border: 'none' }}
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={() => onRemove(selectedEffect)}
          className="p-1 cursor-pointer rounded-md"
          style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Knobs */}
      <div className="flex items-center justify-evenly flex-wrap px-4 py-3">
        <FxKnobs trackId={trackId} slot={selectedEffect} effects={effects} onUpdate={onUpdate} color={color} />
      </div>

      {/* Pop-out overlay */}
      <PopOutOverlay
        isOpen={popOutOpen}
        onClose={onTogglePopOut}
        title={`${category}  ${label}`}
        trackColor={color}
      >
        <div className="flex flex-col h-full p-4 gap-4">
          <div className="flex items-center justify-center flex-wrap gap-4 px-4 py-3">
            <FxKnobs trackId={trackId} slot={selectedEffect} effects={effects} onUpdate={onUpdate} color={color} popOut />
          </div>
          {hasViz && (
            <div className="flex-1 min-h-0 flex justify-center items-center p-3">
              <FxVisualizer
                slot={selectedEffect}
                effects={effects}
                trackId={trackId}
                onUpdate={onUpdate}
                gr={gr}
                inLevel={inLevel}
                outLevel={outLevel}
                large
              />
            </div>
          )}
        </div>
      </PopOutOverlay>
    </div>
  );
}

// ── Effect Knobs (per type) ─────────────────────────────────────────────

export function FxKnobs({
  trackId,
  slot,
  effects,
  onUpdate,
  color,
  popOut,
}: {
  trackId: string;
  slot: EffectSlotType;
  effects: TrackEffectState;
  onUpdate: (trackId: string, effects: Partial<TrackEffectState>) => void;
  color: string;
  popOut?: boolean;
}) {
  const ks = popOut ? 62 : 52; // knob size
  const eqKs = popOut ? 42 : 32; // EQ band knob size
  const eqQs = popOut ? 32 : 26; // EQ Q knob size
  const comp = effects.compressor;
  const gate = effects.gate;
  const pres = effects.presence;
  const deess = effects['de-esser'];
  const sat = effects.saturator;

  switch (slot) {
    case 'compressor':
      return (
        <>
          <RotaryKnob label="RATIO" value={comp.ratio} min={1} max={20} step={0.5} size={ks} arcColor={color}
            formatValue={(v) => `${v.toFixed(1)}:1`}
            onChange={(v) => onUpdate(trackId, { compressor: { ...comp, ratio: v } })} />
          <RotaryKnob label="THRESHOLD" value={comp.threshold} min={-60} max={0} step={1} size={ks} arcColor={color}
            formatValue={(v) => `${v}dB`}
            onChange={(v) => onUpdate(trackId, { compressor: { ...comp, threshold: v } })} />
          <RotaryKnob label="KNEE" value={comp.knee} min={0} max={40} step={1} size={ks} arcColor={color}
            formatValue={(v) => `${v}dB`}
            onChange={(v) => onUpdate(trackId, { compressor: { ...comp, knee: v } })} />
          <RotaryKnob label="ATTACK" value={comp.attack} min={0.001} max={1} step={0.001} size={ks} arcColor={color}
            formatValue={(v) => v < 0.1 ? `${(v * 1000).toFixed(0)}ms` : `${v.toFixed(2)}s`}
            onChange={(v) => onUpdate(trackId, { compressor: { ...comp, attack: v } })} />
          <RotaryKnob label="RELEASE" value={comp.release} min={0.01} max={1} step={0.01} size={ks} arcColor={color}
            formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
            onChange={(v) => onUpdate(trackId, { compressor: { ...comp, release: v } })} />
          <div className="flex flex-col items-center">
            <RotaryKnob label="MAKEUP" value={comp.makeup} min={0} max={24} step={0.5} size={ks} arcColor={color}
              formatValue={(v) => `${v.toFixed(1)}dB`}
              onChange={(v) => onUpdate(trackId, { compressor: { ...comp, makeup: v } })} />
            <AutoCheckbox checked={comp.auto} onChange={(v) => onUpdate(trackId, { compressor: { ...comp, auto: v } })} />
          </div>
          <RotaryKnob label="CRUSH" value={comp.crush} min={0} max={1} step={0.01} size={ks} arcColor={color}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => onUpdate(trackId, { compressor: { ...comp, crush: v } })} />
        </>
      );

    case 'gate':
      return (
        <>
          <RotaryKnob label="THRESHOLD" value={gate.threshold} min={-96} max={0} step={1} size={ks} arcColor={color}
            formatValue={(v) => `${v}dB`} onChange={(v) => onUpdate(trackId, { gate: { ...gate, threshold: v } })} />
          <RotaryKnob label="RANGE" value={gate.range} min={0} max={80} step={1} size={ks} arcColor={color}
            formatValue={(v) => `${v}dB`} onChange={(v) => onUpdate(trackId, { gate: { ...gate, range: v } })} />
          <RotaryKnob label="HOLD" value={gate.hold} min={0} max={0.5} step={0.001} size={ks} arcColor={color}
            formatValue={(v) => `${(v * 1000).toFixed(0)}ms`} onChange={(v) => onUpdate(trackId, { gate: { ...gate, hold: v } })} />
          <RotaryKnob label="ATTACK" value={gate.attack} min={0.001} max={0.5} step={0.001} size={ks} arcColor={color}
            formatValue={(v) => `${(v * 1000).toFixed(0)}ms`} onChange={(v) => onUpdate(trackId, { gate: { ...gate, attack: v } })} />
          <RotaryKnob label="RELEASE" value={gate.release} min={0.01} max={2} step={0.01} size={ks} arcColor={color}
            formatValue={(v) => `${(v * 1000).toFixed(0)}ms`} onChange={(v) => onUpdate(trackId, { gate: { ...gate, release: v } })} />
        </>
      );

    case 'eq': {
      const eq = effects.eq;
      return (
        <>
          {eq.bands.map((band, i) => (
            <div key={i} className="flex flex-col items-center" style={{ width: 70 }}>
              <div className="mb-1">
                <BandTab index={i + 1} color={BAND_COLORS[i]} active={band.enabled} onClick={() => {
                  const bands = eq.bands.map((b, j) => j === i ? { ...b, enabled: !b.enabled } : b);
                  onUpdate(trackId, { eq: { ...eq, bands } });
                }} />
              </div>
              <div className="flex gap-0.5">
                <RotaryKnob label="FREQ" value={band.freq} min={20} max={20000} step={1} size={eqKs} log
                  arcColor={band.enabled ? BAND_COLORS[i] : undefined}
                  formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`}
                  onChange={(v) => {
                    const bands = eq.bands.map((b, j) => j === i ? { ...b, freq: v } : b);
                    onUpdate(trackId, { eq: { ...eq, bands } });
                  }} />
                <RotaryKnob label="GAIN" value={band.gain} min={-12} max={12} step={0.5} size={eqKs}
                  arcColor={band.enabled ? BAND_COLORS[i] : undefined}
                  formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
                  onChange={(v) => {
                    const bands = eq.bands.map((b, j) => j === i ? { ...b, gain: v } : b);
                    onUpdate(trackId, { eq: { ...eq, bands } });
                  }} />
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <CurveTypeSelector type={band.type} color={band.enabled ? BAND_COLORS[i] : undefined}
                  onChange={(t) => {
                    const bands = eq.bands.map((b, j) => j === i ? { ...b, type: t } : b);
                    onUpdate(trackId, { eq: { ...eq, bands } });
                  }} />
                <RotaryKnob label="Q" value={band.Q} min={0.1} max={10} step={0.1} size={eqQs}
                  arcColor={band.enabled ? BAND_COLORS[i] : undefined}
                  formatValue={(v) => v.toFixed(1)}
                  onChange={(v) => {
                    const bands = eq.bands.map((b, j) => j === i ? { ...b, Q: v } : b);
                    onUpdate(trackId, { eq: { ...eq, bands } });
                  }} />
              </div>
            </div>
          ))}
          <RotaryKnob label="MAKEUP" value={eq.makeup} min={0} max={12} step={0.5} size={ks} arcColor={color}
            formatValue={(v) => `${v.toFixed(1)}dB`}
            onChange={(v) => onUpdate(trackId, { eq: { ...eq, makeup: v } })} />
        </>
      );
    }

    case 'reverb':
      return (
        <>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>TYPE</span>
            <select
              value={effects.reverb.type}
              onChange={(e) => onUpdate(trackId, { reverb: { ...effects.reverb, type: e.target.value as ReverbType } })}
              className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] outline-none cursor-pointer"
              style={{ color: 'var(--color-text)' }}
            >
              {(['hall', 'room', 'chamber', 'plate', 'spring'] as const).map((t) => (
                <option key={t} value={t} style={{ backgroundColor: 'var(--color-bg)' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <RotaryKnob label="DECAY" value={effects.reverb.decay} min={0.1} max={10} step={0.1} size={ks} arcColor={color}
            formatValue={(v) => `${v.toFixed(1)}s`}
            onChange={(v) => onUpdate(trackId, { reverb: { ...effects.reverb, decay: v } })} />
          <RotaryKnob label="PRE-DLY" value={effects.reverb.preDelay} min={0} max={200} step={1} size={ks} arcColor={color}
            formatValue={(v) => `${Math.round(v)}ms`}
            onChange={(v) => onUpdate(trackId, { reverb: { ...effects.reverb, preDelay: v } })} />
          <RotaryKnob label="HI PASS" value={effects.reverb.highPass} min={20} max={2000} step={10} size={ks} arcColor={color}
            formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}Hz`}
            onChange={(v) => onUpdate(trackId, { reverb: { ...effects.reverb, highPass: v } })} />
          <RotaryKnob label="LO PASS" value={effects.reverb.lowPass} min={1000} max={20000} step={100} size={ks} arcColor={color}
            formatValue={(v) => `${(v / 1000).toFixed(1)}k`}
            onChange={(v) => onUpdate(trackId, { reverb: { ...effects.reverb, lowPass: v } })} />
          <RotaryKnob label="WET" value={effects.reverb.wet} min={0} max={1} step={0.01} size={ks} arcColor={color}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => onUpdate(trackId, { reverb: { ...effects.reverb, wet: v } })} />
        </>
      );

    case 'delay':
      return (
        <>
          <RotaryKnob label="TIME" value={effects.delay.time} min={0.01} max={2} step={0.01} size={ks} arcColor={color}
            formatValue={(v) => v < 1 ? `${(v * 1000).toFixed(0)}ms` : `${v.toFixed(2)}s`}
            onChange={(v) => onUpdate(trackId, { delay: { ...effects.delay, time: v } })} />
          <RotaryKnob label="FEEDBACK" value={effects.delay.feedback} min={0} max={0.95} step={0.01} size={ks} arcColor={color}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => onUpdate(trackId, { delay: { ...effects.delay, feedback: v } })} />
          <RotaryKnob label="WET" value={effects.delay.wet} min={0} max={1} step={0.01} size={ks} arcColor={color}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => onUpdate(trackId, { delay: { ...effects.delay, wet: v } })} />
        </>
      );

    case 'presence':
      return (
        <>
          <RotaryKnob label="AMOUNT" value={pres.amount} min={0} max={100} step={1} size={ks} arcColor={color}
            formatValue={(v) => `${Math.round(v)}%`}
            onChange={(v) => onUpdate(trackId, { presence: { ...pres, amount: v } })} />
          <RotaryKnob label="FREQUENCY" value={pres.frequency} min={1000} max={12000} step={100} size={ks} arcColor={color}
            formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}kHz` : `${Math.round(v)}Hz`}
            onChange={(v) => onUpdate(trackId, { presence: { ...pres, frequency: v } })} />
          <RotaryKnob label="BANDWIDTH" value={pres.bandwidth} min={0.1} max={4} step={0.1} size={ks} arcColor={color}
            formatValue={(v) => `Q ${v.toFixed(1)}`}
            onChange={(v) => onUpdate(trackId, { presence: { ...pres, bandwidth: v } })} />
        </>
      );

    case 'de-esser':
      return (
        <>
          <RotaryKnob label="AMOUNT" value={deess.amount} min={0} max={100} step={1} size={ks} arcColor={color}
            formatValue={(v) => `${Math.round(v)}%`}
            onChange={(v) => onUpdate(trackId, { 'de-esser': { ...deess, amount: v } })} />
          <RotaryKnob label="FREQUENCY" value={deess.frequency} min={2000} max={16000} step={100} size={ks} arcColor={color}
            formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}kHz` : `${Math.round(v)}Hz`}
            onChange={(v) => onUpdate(trackId, { 'de-esser': { ...deess, frequency: v } })} />
          <RotaryKnob label="RANGE" value={deess.range} min={0} max={20} step={0.5} size={ks} arcColor={color}
            formatValue={(v) => `${v.toFixed(1)}dB`}
            onChange={(v) => onUpdate(trackId, { 'de-esser': { ...deess, range: v } })} />
        </>
      );

    case 'saturator':
      return (
        <>
          <RotaryKnob label="DRIVE" value={sat.drive} min={0} max={100} step={1} size={ks} arcColor={color}
            formatValue={(v) => `${Math.round(v)}%`}
            onChange={(v) => onUpdate(trackId, { saturator: { ...sat, drive: v } })} />
          <RotaryKnob label="MIX" value={sat.mix} min={0} max={100} step={1} size={ks} arcColor={color}
            formatValue={(v) => `${Math.round(v)}%`}
            onChange={(v) => onUpdate(trackId, { saturator: { ...sat, mix: v } })} />
          <RotaryKnob label="TONE" value={sat.tone} min={0} max={100} step={1} size={ks} arcColor={color}
            formatValue={(v) => `${Math.round(v)}%`}
            onChange={(v) => onUpdate(trackId, { saturator: { ...sat, tone: v } })} />
        </>
      );
  }
}

// ── Visualizer ──────────────────────────────────────────────────────────

export function FxVisualizer({
  slot,
  effects,
  trackId,
  onUpdate,
  gr,
  inLevel,
  outLevel,
  large,
}: {
  slot: EffectSlotType;
  effects: TrackEffectState;
  trackId: string;
  onUpdate: (trackId: string, effects: Partial<TrackEffectState>) => void;
  gr: number;
  inLevel: number;
  outLevel: number;
  large?: boolean;
}) {
  switch (slot) {
    case 'compressor': {
      const c = effects.compressor;
      return (
        <div className="flex items-center gap-4">
          <CompressorCurve threshold={c.threshold} ratio={c.ratio} knee={c.knee} width={large ? 400 : 200} height={large ? 240 : 120} />
          <div className="flex gap-1">
            <FxMeter level={gr} label="GR" color="var(--color-accent)" height={large ? 200 : 100} />
            <FxMeter level={inLevel} label="IN" color="#e8785a" height={large ? 200 : 100} />
            <FxMeter level={outLevel} label="OUT" color="#e8785a" height={large ? 200 : 100} />
          </div>
        </div>
      );
    }
    case 'gate':
      return <GateCurve threshold={effects.gate.threshold} range={effects.gate.range} width={large ? 400 : 200} height={large ? 200 : 100} />;
    case 'eq':
      return (
        <div className="flex gap-2.5 w-full">
          <div className="flex-1 min-w-0">
            <GraphicEQ bands={effects.eq.bands}
              onChange={(bands) => onUpdate(trackId, { eq: { ...effects.eq, bands } })} />
          </div>
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="flex gap-1">
              <FxMeter level={inLevel} label="IN" color="#e8785a" height={large ? 240 : 100} />
              <FxMeter level={outLevel} label="OUT" color="#e8785a" height={large ? 240 : 100} />
            </div>
          </div>
        </div>
      );
    case 'reverb':
      return <ReverbDecay decay={effects.reverb.decay} wet={effects.reverb.wet} type={effects.reverb.type} preDelay={effects.reverb.preDelay} highPass={effects.reverb.highPass} lowPass={effects.reverb.lowPass} width={large ? 400 : 200} height={large ? 120 : 60} />;
    case 'delay':
      return <DelayTaps time={effects.delay.time} feedback={effects.delay.feedback} wet={effects.delay.wet} width={large ? 400 : 200} height={large ? 120 : 60} />;
    default:
      return null;
  }
}

