import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/daw/store';
import { useShallow } from 'zustand/react/shallow';
import type {
  TrackEffectState,
  EffectSlotType,
  ReverbType,
  DuckerParams,
} from '@/daw/audio/EffectChain';
import { RotaryKnob } from '@/daw/components/Controls/RotaryKnob';
import { FxMeter } from './FxMeter';
import { meterSource } from '@/daw/engine/meterBus';
import { getReverbManifest, getReverbIrMeta } from '@/daw/audio/reverbIR';
import {
  BAND_COLORS,
  AutoCheckbox,
  BandTab,
  CurveTypeSelector,
} from './FxShared';
import { FxBlockIcon } from './FxBlockIcon';

export { FxBlockIcon };

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

// ── Effect Knobs (per type) ─────────────────────────────────────────────

export function FxKnobs({
  trackId,
  slot,
  effects,
  onUpdate,
  color,
  roomy,
  knobSize,
  card = false,
}: {
  trackId: string;
  slot: EffectSlotType;
  effects: TrackEffectState;
  onUpdate: (trackId: string, effects: Partial<TrackEffectState>) => void;
  color: string;
  /** Larger knobs, in a maximized dock. */
  roomy?: boolean;
  /** The knobs' diameter, in px: an effect card sizes them to its height. */
  knobSize?: number;
  /**
   * In an effect card (FxCards): every control is its own cell of the
   * card's grid, and the selects take the card's look.
   */
  card?: boolean;
}) {
  const ks = knobSize ?? (roomy ? 62 : 52); // knob size
  const eqKs = roomy ? 42 : 32; // EQ band knob size
  const eqQs = roomy ? 32 : 26; // EQ Q knob size
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
          {card ? (
            <>
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
              <CardSwitch
                label="Auto makeup"
                on={comp.auto}
                onChange={(v) =>
                  onUpdate(trackId, { compressor: { ...comp, auto: v } })
                }
              />
            </>
          ) : (
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
          )}
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
          <div className="flex flex-col items-center gap-1">
            <span
              className={
                card ? CARD_SELECT_LABEL : 'text-[8px] uppercase tracking-wider'
              }
              style={card ? undefined : { color: 'var(--daw-text-3)' }}
            >
              {card ? 'Room' : 'TYPE'}
            </span>
            <select
              aria-label="Reverb room"
              value={effects.reverb.type}
              onChange={(e) =>
                onUpdate(trackId, {
                  reverb: {
                    ...effects.reverb,
                    type: e.target.value as ReverbType,
                  },
                })
              }
              className={
                card
                  ? CARD_SELECT
                  : 'cursor-pointer rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] outline-none'
              }
              style={card ? undefined : { color: 'var(--daw-text)' }}
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
          card={card}
        />
      );
  }
}

/** An effect card's select (FxCards): 30 px, white/4, as the frame's. */
const CARD_SELECT =
  'h-[30px] max-w-[132px] cursor-pointer rounded-lg border-0 bg-daw-device px-2 text-[length:var(--daw-font-label)] text-daw-text outline-none hover:bg-daw-hover focus-visible:ring-1 focus-visible:ring-daw-focus';
/** A select's name over it in an effect card: as a knob's name. */
export const CARD_SELECT_LABEL =
  'text-[length:var(--daw-font-label)] leading-4 text-daw-text-2';

/**
 * An on/off switch as an effect card's cell (the compressor's Auto
 * makeup): a pill toggle and its name, the height of a knob's cell.
 */
export function CardSwitch({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex flex-col items-center gap-1.5 rounded-[var(--daw-radius-sm)] px-1 py-0.5 outline-none hover:bg-daw-hover focus-visible:ring-1 focus-visible:ring-daw-focus"
    >
      <span
        aria-hidden
        className={`relative h-3.5 w-6 rounded-full transition-colors ${on ? 'bg-daw-text' : 'bg-daw-chip'}`}
      >
        <span
          className={`absolute top-0.5 size-2.5 rounded-full transition-[left] ${on ? 'left-3 bg-daw-bg' : 'left-0.5 bg-daw-text-3'}`}
        />
      </span>
      <span className={CARD_SELECT_LABEL}>{label}</span>
    </button>
  );
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
  card = false,
}: {
  trackId: string;
  ducker: DuckerParams;
  onUpdate: (trackId: string, effects: Partial<TrackEffectState>) => void;
  color: string;
  knobSize: number;
  /** In an effect card: each control a cell of the card's grid. */
  card?: boolean;
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

  const controls = (
    <>
      <div className="flex flex-col items-center gap-1">
        <span
          className={
            card ? CARD_SELECT_LABEL : 'text-[8px] uppercase tracking-wider'
          }
          style={card ? undefined : { color: 'var(--daw-text-3)' }}
        >
          Key
        </span>
        <select
          aria-label="Duck under"
          data-tutorial-id="ducker-key-select"
          // Fall back to "None" if the key points at a track that is gone (e.g.
          // deleted mid-session) so the control never renders blank/uncontrolled.
          value={
            keyTracks.some((t) => t.id === ducker.keyTrackId)
              ? ducker.keyTrackId!
              : ''
          }
          onChange={(e) => set({ keyTrackId: e.target.value || null })}
          className={
            card
              ? CARD_SELECT
              : 'cursor-pointer rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] outline-none'
          }
          style={card ? undefined : { color: 'var(--daw-text)', maxWidth: 110 }}
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
      <FxMeter
        source={duckSource(trackId)}
        label="GR"
        color="var(--daw-accent)"
        height={card ? knobSize + 20 : 72}
      />
    </>
  );
  return card ? (
    controls
  ) : (
    <div className="flex items-center gap-4">{controls}</div>
  );
}
