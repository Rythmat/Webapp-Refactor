import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Maximize2, Zap } from 'lucide-react';
import { useStore } from '@/daw/store';
import { useShallow } from 'zustand/react/shallow';
import type {
  TrackEffectState,
  EffectSlotType,
  ReverbType,
  DuckerParams,
} from '@/daw/audio/EffectChain';
import { FX_COLOR, FX_CATEGORY, FX_LABEL } from '@/daw/data/libraryItems';
import { GraphicEQ } from './GraphicEQ';
import { RotaryKnob } from '@/daw/components/Controls/RotaryKnob';
import {
  CompressorCurve,
  ReverbDecay,
  DelayTaps,
  GateCurve,
} from './visualizers';
import { PopOutOverlay } from '@/daw/components/ChannelStrip/PopOutOverlay';
import { FxMeter } from './FxMeter';
import { meterSource } from '@/daw/engine/meterBus';
import { getReverbManifest, getReverbIrMeta } from '@/daw/audio/reverbIR';
import {
  BAND_COLORS,
  AutoCheckbox,
  BandTab,
  CurveTypeSelector,
  FxPowerButton,
} from './FxShared';
import { FxBlockIcon } from './FxBlockIcon';
import {
  ControlGestureContext,
  useContinuousControl,
} from '@/daw/hooks/useContinuousControl';
import { previewTrack } from '@/daw/engine/trackReconciler';
import { COLOR } from '@/daw/ui/tokens';
import { AddEffectSlot } from '@/daw/shell/dock/AddEffectSlot';

export { FxBlockIcon };

// Effects that have a visualizer component
// The ducker's GR meter is inline in its FxKnobs controls (DuckerControls), so
// it does not need a pop-out FxVisualizer entry here.
export const HAS_VIZ = new Set<EffectSlotType>([
  'compressor',
  'gate',
  'eq',
  'reverb',
  'delay',
]);

// ── EffectsPanel (top-level) ────────────────────────────────────────────
//
// The dock's Effects tab: the selected track's chain, then the Add effect
// slot, and the controls of the effect picked in the chain (dockEffect in
// the store, so the side rail's library can show one). Effects are added
// from the library only (milestone 2.8): Add effect arms the slot and opens
// it, and each pick there lands here.

export function EffectsPanel() {
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const track = useStore((s) => s.tracks.find((t) => t.id === selectedTrackId));
  const updateTrackEffects = useStore((s) => s.updateTrackEffects);
  const removeActiveEffect = useStore((s) => s.removeActiveEffect);
  const selectedEffect = useStore((s) => s.dockEffect);
  const setSelectedEffect = useStore((s) => s.setDockEffect);
  const [popOutOpen, setPopOutOpen] = useState(false);

  useShownEffect(track?.activeEffects, selectedEffect, setSelectedEffect);

  return (
    <div className="flex h-full overflow-hidden">
      {track ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <FxChainRow
            activeEffects={track.activeEffects}
            effects={track.effects}
            selectedEffect={selectedEffect}
            onSelect={setSelectedEffect}
            onToggle={(slot) => {
              const key = slot === 'de-esser' ? 'de-esser' : slot;
              const current = track.effects[key as keyof TrackEffectState] as {
                enabled: boolean;
              };
              updateTrackEffects(track.id, {
                [key]: {
                  ...track.effects[key as keyof TrackEffectState],
                  enabled: !current.enabled,
                },
              });
            }}
            addSlot={<AddEffectSlot count={track.activeEffects.length} />}
          />
          {selectedEffect && track.activeEffects.includes(selectedEffect) ? (
            <FxControlsPanel
              trackId={track.id}
              selectedEffect={selectedEffect}
              effects={track.effects}
              onUpdate={updateTrackEffects}
              onPreview={(effects) => previewTrack(track.id, { effects })}
              onRemove={(slot) => {
                removeActiveEffect(track.id, slot);
              }}
              popOutOpen={popOutOpen}
              onTogglePopOut={() => setPopOutOpen((v) => !v)}
              meterTarget={track.id}
            />
          ) : (
            <div
              className="flex flex-1 items-center justify-center text-[12px]"
              style={{ color: 'var(--daw-text-3)' }}
            >
              {track.activeEffects.length === 0
                ? 'Add effect opens the effects library'
                : 'Select an effect to change it'}
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex flex-1 items-center justify-center p-4 text-xs"
          style={{ color: 'var(--daw-text-3)' }}
        >
          Select a track to edit effects
        </div>
      )}
    </div>
  );
}

/**
 * Keeps the shown effect one of the chain's: the first when none is picked
 * or the picked one leaves, and a new one as it is added (a pick in the
 * library shows its controls).
 */
export function useShownEffect(
  chain: readonly EffectSlotType[] | undefined,
  shown: EffectSlotType | null,
  show: (effect: EffectSlotType | null) => void,
) {
  const last = useRef(chain);
  useEffect(() => {
    const before = last.current;
    last.current = chain;
    if (!chain) return;
    const added =
      before && chain.length > before.length
        ? chain.find((e) => !before.includes(e))
        : undefined;
    if (added) show(added);
    else if (!shown || !chain.includes(shown)) show(chain[0] ?? null);
  }, [chain, shown, show]);
}

// ── Signal Chain Row ────────────────────────────────────────────────────

export function FxChainRow({
  activeEffects,
  effects,
  selectedEffect,
  onSelect,
  onToggle,
  addSlot,
}: {
  activeEffects: EffectSlotType[];
  effects: TrackEffectState;
  selectedEffect: EffectSlotType | null;
  onSelect: (slot: EffectSlotType) => void;
  onToggle: (slot: EffectSlotType) => void;
  /** The card after the last effect (the dock's Add effect slot). */
  addSlot?: React.ReactNode;
}) {
  return (
    <div
      className="relative flex shrink-0 items-center border-b"
      style={{ borderColor: 'var(--daw-hairline)', minHeight: 110 }}
    >
      {/* Connection line */}
      <div
        className="absolute"
        style={{
          top: '50%',
          left: 16,
          right: 16,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.12)',
          zIndex: 0,
          transform: 'translateY(-8px)',
        }}
      />

      {/* Input */}
      <div
        className="relative flex shrink-0 flex-col items-center pl-4"
        style={{ zIndex: 1 }}
      >
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: 68,
            height: 68,
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '2px solid rgba(255,255,255,0.15)',
          }}
        >
          <Zap
            size={28}
            strokeWidth={1.5}
            style={{ color: 'rgba(255,255,255,0.5)' }}
          />
        </div>
        <span
          className="mt-1 text-[9px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--daw-text-3)' }}
        >
          In
        </span>
      </div>

      {/* Effect blocks */}
      <div
        className="flex flex-1 items-center justify-center gap-2 overflow-x-auto px-3 py-5"
        style={{ zIndex: 1 }}
      >
        {activeEffects.length === 0 && !addSlot && (
          <span className="text-[11px]" style={{ color: 'var(--daw-text-3)' }}>
            Add effects from the list
          </span>
        )}
        {activeEffects.map((slot) => {
          const color = FX_COLOR[slot] ?? COLOR.accent.value;
          const isSelected = slot === selectedEffect;
          const effectState = effects[slot as keyof TrackEffectState] as {
            enabled: boolean;
          };
          const enabled = effectState?.enabled ?? false;
          return (
            <div
              key={slot}
              data-tutorial-id={`fx-slot-${slot}`}
              className="flex shrink-0 flex-col items-center"
            >
              <div className="relative">
                <div
                  onClick={() => onSelect(slot)}
                  className="relative flex shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl"
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
                </div>
                {/* On/off — outside the dimmed block so it stays readable
                    (and clickable) while the effect is bypassed. */}
                <div className="absolute" style={{ top: -8, right: -8 }}>
                  <FxPowerButton
                    enabled={enabled}
                    onToggle={() => onToggle(slot)}
                    effectName={FX_LABEL[slot] ?? slot}
                    size={20}
                  />
                </div>
              </div>
              <span
                className="mt-1 text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: isSelected ? color : 'var(--daw-text-3)' }}
              >
                {FX_LABEL[slot] ?? slot}
              </span>
            </div>
          );
        })}
        {addSlot}
      </div>

      {/* Output */}
      <div
        className="relative flex shrink-0 flex-col items-center pr-4"
        style={{ zIndex: 1 }}
      >
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: 68,
            height: 68,
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '2px solid rgba(255,255,255,0.15)',
          }}
        >
          <svg
            width={28}
            height={28}
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2,12 Q6,2 12,12 Q18,22 22,12" />
          </svg>
        </div>
        <span
          className="mt-1 text-[9px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--daw-text-3)' }}
        >
          Out
        </span>
      </div>
    </div>
  );
}

// ── Controls Panel ──────────────────────────────────────────────────────

export function FxControlsPanel({
  trackId,
  selectedEffect,
  effects: storeEffects,
  onUpdate,
  onPreview,
  onRemove,
  popOutOpen,
  onTogglePopOut,
  meterTarget = null,
}: {
  trackId: string;
  selectedEffect: EffectSlotType;
  effects: TrackEffectState;
  onUpdate: (trackId: string, effects: Partial<TrackEffectState>) => void;
  /** Plays the rack's effects without writing the store, while a knob or an
   *  EQ band moves (the engine/preview.ts functions). */
  onPreview: (effects: TrackEffectState) => void;
  onRemove: (slot: EffectSlotType) => void;
  popOutOpen: boolean;
  onTogglePopOut: () => void;
  /** Whose effect chain the meters read on the meter bus (a track id or
   *  'master'); null when the rack has no live chain to meter. */
  meterTarget?: string | null;
}) {
  // One control for the whole rack: a knob or band drag previews and writes
  // the store once on release; a toggle or a list writes at once. A write
  // carries only the slots the gesture changed, so a collaborator's edit to
  // another slot meanwhile stands.
  const fx = useContinuousControl<TrackEffectState>({
    value: storeEffects,
    preview: onPreview,
    commit: (next, start) => {
      const changed: Partial<TrackEffectState> = {};
      for (const key of Object.keys(next) as (keyof TrackEffectState)[]) {
        if (next[key] !== start[key]) {
          (changed as Record<string, unknown>)[key] = next[key];
        }
      }
      onUpdate(trackId, changed);
    },
    label: 'Change effect',
  });
  const effects = fx.value;
  const latest = useRef(effects);
  latest.current = effects;
  const update = useCallback(
    (_trackId: string, partial: Partial<TrackEffectState>) => {
      const next = { ...latest.current, ...partial };
      latest.current = next;
      fx.change(next);
    },
    [fx],
  );
  const gesture = useMemo(
    () => ({ begin: fx.begin, end: fx.end }),
    [fx.begin, fx.end],
  );

  const color = FX_COLOR[selectedEffect] ?? COLOR.accent.value;
  const category = FX_CATEGORY[selectedEffect] ?? '';
  const label = FX_LABEL[selectedEffect] ?? selectedEffect;
  const hasViz = HAS_VIZ.has(selectedEffect);
  const slotState = effects[selectedEffect as keyof TrackEffectState] as {
    enabled: boolean;
  };
  const enabled = slotState?.enabled ?? false;
  const toggleEnabled = () =>
    update(trackId, {
      [selectedEffect]: { ...slotState, enabled: !enabled },
    });

  return (
    <ControlGestureContext.Provider value={gesture}>
      <div
        className="flex-1 overflow-y-auto"
        style={{ backgroundColor: 'var(--daw-surface-1)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 border-b px-4 py-1.5"
          style={{ borderColor: 'var(--daw-hairline)' }}
        >
          <FxPowerButton
            enabled={enabled}
            onToggle={toggleEnabled}
            effectName={label}
            size={22}
            withText
          />
          <div
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--daw-text-3)' }}
          >
            {category}
          </span>
          <span
            className="flex-1 text-[13px] font-medium"
            style={{ color: 'var(--daw-text)' }}
          >
            {label}
          </span>
          <button
            onClick={onTogglePopOut}
            className="cursor-pointer rounded-md p-1"
            style={{
              color: popOutOpen ? 'var(--daw-accent)' : 'var(--daw-text-3)',
              background: 'none',
              border: 'none',
            }}
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={() => onRemove(selectedEffect)}
            className="cursor-pointer rounded-md p-1"
            style={{
              color: 'var(--daw-text-3)',
              background: 'none',
              border: 'none',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Knobs */}
        <div className="flex flex-wrap items-center justify-evenly px-4 py-3">
          <FxKnobs
            trackId={trackId}
            slot={selectedEffect}
            effects={effects}
            onUpdate={update}
            color={color}
          />
        </div>

        {/* Pop-out overlay */}
        <PopOutOverlay
          isOpen={popOutOpen}
          onClose={onTogglePopOut}
          title={`${category}  ${label}`}
          trackColor={color}
        >
          <div className="flex h-full flex-col gap-4 p-4">
            <div className="flex flex-wrap items-center justify-center gap-4 px-4 py-3">
              <FxKnobs
                trackId={trackId}
                slot={selectedEffect}
                effects={effects}
                onUpdate={update}
                color={color}
                popOut
              />
            </div>
            {hasViz && (
              <div className="flex min-h-0 flex-1 items-center justify-center p-3">
                <FxVisualizer
                  slot={selectedEffect}
                  effects={effects}
                  trackId={trackId}
                  onUpdate={update}
                  meterTarget={meterTarget}
                  large
                />
              </div>
            )}
          </div>
        </PopOutOverlay>
      </div>
    </ControlGestureContext.Provider>
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
  const mb = effects.multiband;

  // Load the reverb IR manifest once so the DECAY knob can cap itself at the
  // active IR's native length (real IRs can only be shortened, not lengthened).
  const [irManifestReady, setIrManifestReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void getReverbManifest().then(() => {
      if (alive) setIrManifestReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  const reverbDecayMax =
    (irManifestReady && getReverbIrMeta(effects.reverb.type)?.decaySeconds) ||
    10;

  switch (slot) {
    case 'compressor':
      return (
        <>
          <RotaryKnob
            label="RATIO"
            value={comp.ratio}
            min={1}
            max={20}
            step={0.5}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${v.toFixed(1)}:1`}
            onChange={(v) =>
              onUpdate(trackId, { compressor: { ...comp, ratio: v } })
            }
          />
          <RotaryKnob
            label="THRESHOLD"
            value={comp.threshold}
            min={-60}
            max={0}
            step={1}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${v}dB`}
            onChange={(v) =>
              onUpdate(trackId, { compressor: { ...comp, threshold: v } })
            }
          />
          <RotaryKnob
            label="KNEE"
            value={comp.knee}
            min={0}
            max={40}
            step={1}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${v}dB`}
            onChange={(v) =>
              onUpdate(trackId, { compressor: { ...comp, knee: v } })
            }
          />
          <RotaryKnob
            label="ATTACK"
            value={comp.attack}
            min={0.001}
            max={1}
            step={0.001}
            size={ks}
            arcColor={color}
            formatValue={(v) =>
              v < 0.1 ? `${(v * 1000).toFixed(0)}ms` : `${v.toFixed(2)}s`
            }
            onChange={(v) =>
              onUpdate(trackId, { compressor: { ...comp, attack: v } })
            }
          />
          <RotaryKnob
            label="RELEASE"
            value={comp.release}
            min={0.01}
            max={1}
            step={0.01}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
            onChange={(v) =>
              onUpdate(trackId, { compressor: { ...comp, release: v } })
            }
          />
          <div className="flex flex-col items-center">
            <RotaryKnob
              label="MAKEUP"
              value={comp.makeup}
              min={0}
              max={24}
              step={0.5}
              size={ks}
              arcColor={color}
              formatValue={(v) => `${v.toFixed(1)}dB`}
              onChange={(v) =>
                onUpdate(trackId, { compressor: { ...comp, makeup: v } })
              }
            />
            <AutoCheckbox
              checked={comp.auto}
              onChange={(v) =>
                onUpdate(trackId, { compressor: { ...comp, auto: v } })
              }
            />
          </div>
          <RotaryKnob
            label="CRUSH"
            value={comp.crush}
            min={0}
            max={1}
            step={0.01}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) =>
              onUpdate(trackId, { compressor: { ...comp, crush: v } })
            }
          />
        </>
      );

    case 'gate':
      return (
        <>
          <RotaryKnob
            label="THRESHOLD"
            value={gate.threshold}
            min={-96}
            max={0}
            step={1}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${v}dB`}
            onChange={(v) =>
              onUpdate(trackId, { gate: { ...gate, threshold: v } })
            }
          />
          <RotaryKnob
            label="RANGE"
            value={gate.range}
            min={0}
            max={80}
            step={1}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${v}dB`}
            onChange={(v) => onUpdate(trackId, { gate: { ...gate, range: v } })}
          />
          <RotaryKnob
            label="HOLD"
            value={gate.hold}
            min={0}
            max={0.5}
            step={0.001}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
            onChange={(v) => onUpdate(trackId, { gate: { ...gate, hold: v } })}
          />
          <RotaryKnob
            label="ATTACK"
            value={gate.attack}
            min={0.001}
            max={0.5}
            step={0.001}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
            onChange={(v) =>
              onUpdate(trackId, { gate: { ...gate, attack: v } })
            }
          />
          <RotaryKnob
            label="RELEASE"
            value={gate.release}
            min={0.01}
            max={2}
            step={0.01}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${(v * 1000).toFixed(0)}ms`}
            onChange={(v) =>
              onUpdate(trackId, { gate: { ...gate, release: v } })
            }
          />
        </>
      );

    case 'eq': {
      const eq = effects.eq;
      return (
        <>
          {eq.bands.map((band, i) => (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{ width: 70 }}
            >
              <div className="mb-1">
                <BandTab
                  index={i + 1}
                  color={BAND_COLORS[i]}
                  active={band.enabled}
                  onClick={() => {
                    const bands = eq.bands.map((b, j) =>
                      j === i ? { ...b, enabled: !b.enabled } : b,
                    );
                    onUpdate(trackId, { eq: { ...eq, bands } });
                  }}
                />
              </div>
              <div className="flex gap-0.5">
                <RotaryKnob
                  label="FREQ"
                  value={band.freq}
                  min={20}
                  max={20000}
                  step={1}
                  size={eqKs}
                  log
                  arcColor={band.enabled ? BAND_COLORS[i] : undefined}
                  formatValue={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`
                  }
                  onChange={(v) => {
                    const bands = eq.bands.map((b, j) =>
                      j === i ? { ...b, freq: v } : b,
                    );
                    onUpdate(trackId, { eq: { ...eq, bands } });
                  }}
                />
                <RotaryKnob
                  label="GAIN"
                  value={band.gain}
                  min={-12}
                  max={12}
                  step={0.5}
                  size={eqKs}
                  arcColor={band.enabled ? BAND_COLORS[i] : undefined}
                  formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
                  onChange={(v) => {
                    const bands = eq.bands.map((b, j) =>
                      j === i ? { ...b, gain: v } : b,
                    );
                    onUpdate(trackId, { eq: { ...eq, bands } });
                  }}
                />
              </div>
              <div className="mt-0.5 flex items-center gap-1">
                <CurveTypeSelector
                  type={band.type}
                  color={band.enabled ? BAND_COLORS[i] : undefined}
                  onChange={(t) => {
                    const bands = eq.bands.map((b, j) =>
                      j === i ? { ...b, type: t } : b,
                    );
                    onUpdate(trackId, { eq: { ...eq, bands } });
                  }}
                />
                <RotaryKnob
                  label="Q"
                  value={band.Q}
                  min={0.1}
                  max={10}
                  step={0.1}
                  size={eqQs}
                  arcColor={band.enabled ? BAND_COLORS[i] : undefined}
                  formatValue={(v) => v.toFixed(1)}
                  onChange={(v) => {
                    const bands = eq.bands.map((b, j) =>
                      j === i ? { ...b, Q: v } : b,
                    );
                    onUpdate(trackId, { eq: { ...eq, bands } });
                  }}
                />
              </div>
            </div>
          ))}
          <RotaryKnob
            label="MAKEUP"
            value={eq.makeup}
            min={0}
            max={12}
            step={0.5}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${v.toFixed(1)}dB`}
            onChange={(v) => onUpdate(trackId, { eq: { ...eq, makeup: v } })}
          />
        </>
      );
    }

    case 'reverb':
      return (
        <>
          <div className="flex flex-col items-center gap-1">
            <span
              className="text-[8px] uppercase tracking-wider"
              style={{ color: 'var(--daw-text-3)' }}
            >
              TYPE
            </span>
            <select
              value={effects.reverb.type}
              onChange={(e) =>
                onUpdate(trackId, {
                  reverb: {
                    ...effects.reverb,
                    type: e.target.value as ReverbType,
                  },
                })
              }
              className="cursor-pointer rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] outline-none"
              style={{ color: 'var(--daw-text)' }}
            >
              {(['hall', 'room', 'chamber', 'plate', 'spring'] as const).map(
                (t) => (
                  <option
                    key={t}
                    value={t}
                    style={{ backgroundColor: 'var(--daw-bg)' }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ),
              )}
            </select>
          </div>
          <RotaryKnob
            label="DECAY"
            value={effects.reverb.decay}
            min={0.1}
            max={reverbDecayMax}
            step={0.1}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${v.toFixed(1)}s`}
            onChange={(v) =>
              onUpdate(trackId, { reverb: { ...effects.reverb, decay: v } })
            }
          />
          <RotaryKnob
            label="PRE-DLY"
            value={effects.reverb.preDelay}
            min={0}
            max={200}
            step={1}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v)}ms`}
            onChange={(v) =>
              onUpdate(trackId, { reverb: { ...effects.reverb, preDelay: v } })
            }
          />
          <RotaryKnob
            label="HI PASS"
            value={effects.reverb.highPass}
            min={20}
            max={2000}
            step={10}
            size={ks}
            arcColor={color}
            formatValue={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}Hz`
            }
            onChange={(v) =>
              onUpdate(trackId, { reverb: { ...effects.reverb, highPass: v } })
            }
          />
          <RotaryKnob
            label="LO PASS"
            value={effects.reverb.lowPass}
            min={1000}
            max={20000}
            step={100}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${(v / 1000).toFixed(1)}k`}
            onChange={(v) =>
              onUpdate(trackId, { reverb: { ...effects.reverb, lowPass: v } })
            }
          />
          <RotaryKnob
            label="WET"
            value={effects.reverb.wet}
            min={0}
            max={1}
            step={0.01}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) =>
              onUpdate(trackId, { reverb: { ...effects.reverb, wet: v } })
            }
          />
        </>
      );

    case 'delay':
      return (
        <>
          <RotaryKnob
            label="TIME"
            value={effects.delay.time}
            min={0.01}
            max={2}
            step={0.01}
            size={ks}
            arcColor={color}
            formatValue={(v) =>
              v < 1 ? `${(v * 1000).toFixed(0)}ms` : `${v.toFixed(2)}s`
            }
            onChange={(v) =>
              onUpdate(trackId, { delay: { ...effects.delay, time: v } })
            }
          />
          <RotaryKnob
            label="FEEDBACK"
            value={effects.delay.feedback}
            min={0}
            max={0.95}
            step={0.01}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) =>
              onUpdate(trackId, { delay: { ...effects.delay, feedback: v } })
            }
          />
          <RotaryKnob
            label="WET"
            value={effects.delay.wet}
            min={0}
            max={1}
            step={0.01}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) =>
              onUpdate(trackId, { delay: { ...effects.delay, wet: v } })
            }
          />
        </>
      );

    case 'presence':
      return (
        <>
          <RotaryKnob
            label="AMOUNT"
            value={pres.amount}
            min={0}
            max={100}
            step={1}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v)}%`}
            onChange={(v) =>
              onUpdate(trackId, { presence: { ...pres, amount: v } })
            }
          />
          <RotaryKnob
            label="FREQUENCY"
            value={pres.frequency}
            min={1000}
            max={12000}
            step={100}
            size={ks}
            arcColor={color}
            formatValue={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}kHz` : `${Math.round(v)}Hz`
            }
            onChange={(v) =>
              onUpdate(trackId, { presence: { ...pres, frequency: v } })
            }
          />
          <RotaryKnob
            label="BANDWIDTH"
            value={pres.bandwidth}
            min={0.1}
            max={4}
            step={0.1}
            size={ks}
            arcColor={color}
            formatValue={(v) => `Q ${v.toFixed(1)}`}
            onChange={(v) =>
              onUpdate(trackId, { presence: { ...pres, bandwidth: v } })
            }
          />
        </>
      );

    case 'de-esser':
      // No FREQUENCY knob until the de-esser's band filter is wired: the
      // engine sets deEsserFilter's frequency but never connects the filter,
      // so the compressor hears the whole vocal and the knob changed nothing.
      return (
        <>
          <RotaryKnob
            label="AMOUNT"
            value={deess.amount}
            min={0}
            max={100}
            step={1}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v)}%`}
            onChange={(v) =>
              onUpdate(trackId, { 'de-esser': { ...deess, amount: v } })
            }
          />
          <RotaryKnob
            label="RANGE"
            value={deess.range}
            min={0}
            max={20}
            step={0.5}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${v.toFixed(1)}dB`}
            onChange={(v) =>
              onUpdate(trackId, { 'de-esser': { ...deess, range: v } })
            }
          />
        </>
      );

    case 'saturator':
      return (
        <>
          <RotaryKnob
            label="DRIVE"
            value={sat.drive}
            min={0}
            max={100}
            step={1}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v)}%`}
            onChange={(v) =>
              onUpdate(trackId, { saturator: { ...sat, drive: v } })
            }
          />
          <RotaryKnob
            label="MIX"
            value={sat.mix}
            min={0}
            max={100}
            step={1}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v)}%`}
            onChange={(v) =>
              onUpdate(trackId, { saturator: { ...sat, mix: v } })
            }
          />
          <RotaryKnob
            label="TONE"
            value={sat.tone}
            min={0}
            max={100}
            step={1}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v)}%`}
            onChange={(v) =>
              onUpdate(trackId, { saturator: { ...sat, tone: v } })
            }
          />
        </>
      );

    case 'multiband':
      return (
        <>
          <RotaryKnob
            label="DEPTH"
            value={mb.depth}
            min={0}
            max={1}
            step={0.01}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) =>
              onUpdate(trackId, { multiband: { ...mb, depth: v } })
            }
          />
          <RotaryKnob
            label="TIME"
            value={mb.time}
            min={0}
            max={1}
            step={0.01}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) =>
              onUpdate(trackId, { multiband: { ...mb, time: v } })
            }
          />
          <RotaryKnob
            label="LOW"
            value={mb.lowGain}
            min={-12}
            max={12}
            step={0.5}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`}
            onChange={(v) =>
              onUpdate(trackId, { multiband: { ...mb, lowGain: v } })
            }
          />
          <RotaryKnob
            label="MID"
            value={mb.midGain}
            min={-12}
            max={12}
            step={0.5}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`}
            onChange={(v) =>
              onUpdate(trackId, { multiband: { ...mb, midGain: v } })
            }
          />
          <RotaryKnob
            label="HIGH"
            value={mb.highGain}
            min={-12}
            max={12}
            step={0.5}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`}
            onChange={(v) =>
              onUpdate(trackId, { multiband: { ...mb, highGain: v } })
            }
          />
          <RotaryKnob
            label="LO XOVER"
            value={mb.crossoverLow}
            min={40}
            max={500}
            step={5}
            size={ks}
            arcColor={color}
            formatValue={(v) => `${Math.round(v)}Hz`}
            onChange={(v) =>
              onUpdate(trackId, { multiband: { ...mb, crossoverLow: v } })
            }
          />
          <RotaryKnob
            label="HI XOVER"
            value={mb.crossoverHigh}
            min={800}
            max={8000}
            step={50}
            size={ks}
            arcColor={color}
            formatValue={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}kHz` : `${Math.round(v)}Hz`
            }
            onChange={(v) =>
              onUpdate(trackId, { multiband: { ...mb, crossoverHigh: v } })
            }
          />
        </>
      );

    case 'ducker':
      return (
        <DuckerControls
          trackId={trackId}
          ducker={effects.ducker}
          onUpdate={onUpdate}
          color={color}
          knobSize={ks}
        />
      );
  }
}

// ── Ducker (sidechain) controls: key-source dropdown + knobs + live GR meter ──

/** The ducker's live gain reduction on the meter bus (real tracks only:
 *  the mastering and return racks have no ducker to read). */
function duckSource(trackId: string) {
  if (trackId === 'master' || trackId.startsWith('return-')) return null;
  return meterSource(`duck:${trackId}`);
}

function DuckerControls({
  trackId,
  ducker,
  onUpdate,
  color,
  knobSize,
}: {
  trackId: string;
  ducker: DuckerParams;
  onUpdate: (trackId: string, effects: Partial<TrackEffectState>) => void;
  color: string;
  knobSize: number;
}) {
  // Candidate key tracks = every OTHER track (no self-sidechain). Select flat
  // PRIMITIVES (id, name interleaved) so useShallow stays stable — an array of
  // fresh {id,name} objects fails shallow equality every render and infinite-
  // loops.
  const keyMeta = useStore(
    useShallow((s) =>
      s.tracks.filter((t) => t.id !== trackId).flatMap((t) => [t.id, t.name]),
    ),
  );
  const keyTracks: Array<{ id: string; name: string }> = [];
  for (let i = 0; i < keyMeta.length; i += 2) {
    keyTracks.push({ id: keyMeta[i], name: keyMeta[i + 1] });
  }
  const set = (patch: Partial<DuckerParams>) =>
    onUpdate(trackId, { ducker: { ...ducker, ...patch } });

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <span
          className="text-[8px] uppercase tracking-wider"
          style={{ color: 'var(--daw-text-3)' }}
        >
          Key
        </span>
        <select
          data-tutorial-id="ducker-key-select"
          // Fall back to "None" if the key points at a track that is gone (e.g.
          // deleted mid-session) so the control never renders blank/uncontrolled.
          value={
            keyTracks.some((t) => t.id === ducker.keyTrackId)
              ? ducker.keyTrackId!
              : ''
          }
          onChange={(e) => set({ keyTrackId: e.target.value || null })}
          className="cursor-pointer rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] outline-none"
          style={{ color: 'var(--daw-text)', maxWidth: 110 }}
        >
          <option value="" style={{ backgroundColor: 'var(--daw-bg)' }}>
            None
          </option>
          {keyTracks.map((t) => (
            <option
              key={t.id}
              value={t.id}
              style={{ backgroundColor: 'var(--daw-bg)' }}
            >
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <RotaryKnob
        label="THRESHOLD"
        value={ducker.threshold}
        min={-60}
        max={0}
        step={1}
        size={knobSize}
        arcColor={color}
        formatValue={(v) => `${Math.round(v)}dB`}
        onChange={(v) => set({ threshold: v })}
      />
      <RotaryKnob
        label="AMOUNT"
        value={ducker.amount}
        min={0}
        max={1}
        step={0.01}
        size={knobSize}
        arcColor={color}
        formatValue={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => set({ amount: v })}
      />
      <RotaryKnob
        label="ATTACK"
        value={ducker.attack}
        min={0.001}
        max={0.2}
        step={0.001}
        size={knobSize}
        arcColor={color}
        formatValue={(v) => `${Math.round(v * 1000)}ms`}
        onChange={(v) => set({ attack: v })}
      />
      <RotaryKnob
        label="RELEASE"
        value={ducker.release}
        min={0.02}
        max={1}
        step={0.01}
        size={knobSize}
        arcColor={color}
        formatValue={(v) => `${Math.round(v * 1000)}ms`}
        onChange={(v) => set({ release: v })}
      />
      <FxMeter
        source={duckSource(trackId)}
        label="GR"
        color="var(--daw-accent)"
        height={72}
      />
    </div>
  );
}

// ── Visualizer ──────────────────────────────────────────────────────────

export function FxVisualizer({
  slot,
  effects,
  trackId,
  onUpdate,
  meterTarget = null,
  large,
}: {
  slot: EffectSlotType;
  effects: TrackEffectState;
  trackId: string;
  onUpdate: (trackId: string, effects: Partial<TrackEffectState>) => void;
  /** Whose effect chain the meters read (a track id or 'master'), or null. */
  meterTarget?: string | null;
  large?: boolean;
}) {
  // Stable meter bus sources: the meters paint themselves from them.
  const grSource = meterTarget ? meterSource(`gr:${meterTarget}`) : null;
  const inSource = meterTarget ? meterSource(`fx-pre:${meterTarget}`) : null;
  const outSource = meterTarget ? meterSource(`fx-post:${meterTarget}`) : null;
  switch (slot) {
    case 'compressor': {
      const c = effects.compressor;
      return (
        <div className="flex items-center gap-4">
          <CompressorCurve
            threshold={c.threshold}
            ratio={c.ratio}
            knee={c.knee}
            width={large ? 400 : 200}
            height={large ? 240 : 120}
          />
          <div className="flex gap-1">
            <FxMeter
              source={grSource}
              label="GR"
              color="var(--daw-accent)"
              height={large ? 200 : 100}
            />
            <FxMeter
              source={inSource}
              label="IN"
              color="#e8785a"
              height={large ? 200 : 100}
            />
            <FxMeter
              source={outSource}
              label="OUT"
              color="#e8785a"
              height={large ? 200 : 100}
            />
          </div>
        </div>
      );
    }
    case 'gate':
      return (
        <GateCurve
          threshold={effects.gate.threshold}
          range={effects.gate.range}
          width={large ? 400 : 200}
          height={large ? 200 : 100}
        />
      );
    case 'eq':
      return (
        <div className="flex w-full gap-2.5">
          <div className="min-w-0 flex-1">
            <GraphicEQ
              bands={effects.eq.bands}
              onChange={(bands) =>
                onUpdate(trackId, { eq: { ...effects.eq, bands } })
              }
              spectrumKey={meterTarget ? `fx-pre:${meterTarget}` : null}
            />
          </div>
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="flex gap-1">
              <FxMeter
                source={inSource}
                label="IN"
                color="#e8785a"
                height={large ? 240 : 100}
              />
              <FxMeter
                source={outSource}
                label="OUT"
                color="#e8785a"
                height={large ? 240 : 100}
              />
            </div>
          </div>
        </div>
      );
    case 'reverb':
      return (
        <ReverbDecay
          decay={effects.reverb.decay}
          wet={effects.reverb.wet}
          type={effects.reverb.type}
          preDelay={effects.reverb.preDelay}
          highPass={effects.reverb.highPass}
          lowPass={effects.reverb.lowPass}
          width={large ? 400 : 200}
          height={large ? 120 : 60}
        />
      );
    case 'delay':
      return (
        <DelayTaps
          time={effects.delay.time}
          feedback={effects.delay.feedback}
          wet={effects.delay.wet}
          width={large ? 400 : 200}
          height={large ? 120 : 60}
        />
      );
    default:
      return null;
  }
}
