import {
  DEFAULT_EFFECTS,
  type EffectSlotType,
  type TrackEffectState,
} from '@/daw/audio/EffectChain';

// ── The effect picker's preview motion (after Suno's plugin cards, s40) ────
//
// Each card in the Add effect picker shows the effect's real device, small,
// and while the card is hovered it plays that effect's main control so the
// student sees what it does: the compressor's threshold walks down its
// curve, the EQ's mid band lifts and dips, the delay's time and feedback
// sweep. One slow cycle, in a sine, from the effect's own default and back,
// so a card never jumps as its demo starts or ends.
// The motion only draws: the preview's state never reaches the store or the
// engine.

/** One cycle of a card's demo, in ms. */
export const DEMO_PERIOD_MS = 2600;

const lerp = (a: number, b: number, s: number) => a + (b - a) * s;
/** `v` to a knob's `step`, so its readout stays short and the card still. */
const snap = (v: number, step: number) =>
  Number((Math.round(v / step) * step).toFixed(4));

/** The swing of the cycle at `phase` (0..1): 0 at the ends, 1 halfway. */
export const swing = (phase: number) => (1 - Math.cos(2 * Math.PI * phase)) / 2;

/** The effects a preview draws: the defaults, with `slot` switched on. */
export function previewEffects(slot: EffectSlotType): TrackEffectState {
  return {
    ...DEFAULT_EFFECTS,
    [slot]: { ...DEFAULT_EFFECTS[slot], enabled: true },
  };
}

/** `base` with `slot`'s main controls where the demo has them at `phase`. */
export function demoEffects(
  slot: EffectSlotType,
  base: TrackEffectState,
  phase: number,
): TrackEffectState {
  const s = swing(phase);
  switch (slot) {
    case 'compressor': {
      const c = base.compressor;
      return {
        ...base,
        compressor: {
          ...c,
          threshold: snap(lerp(c.threshold, -42, s), 1),
          ratio: snap(lerp(c.ratio, 10, s), 0.1),
        },
      };
    }
    case 'gate': {
      const g = base.gate;
      return {
        ...base,
        gate: { ...g, threshold: snap(lerp(g.threshold, -16, s), 1) },
      };
    }
    case 'eq': {
      const eq = base.eq;
      // The 1 kHz bell: up, then down past flat, as a hand on its handle.
      const gain = snap(9 * Math.sin(2 * Math.PI * phase), 0.1);
      const freq = snap(1000 * Math.pow(2, 0.8 * Math.sin(Math.PI * phase)), 1);
      const bands = eq.bands.map((band, i) =>
        i === 4 ? { ...band, gain, freq } : band,
      );
      return { ...base, eq: { ...eq, bands } };
    }
    case 'reverb': {
      const r = base.reverb;
      return {
        ...base,
        reverb: {
          ...r,
          decay: snap(lerp(r.decay, 5.5, s), 0.1),
          wet: snap(lerp(r.wet, 0.6, s), 0.01),
        },
      };
    }
    case 'delay': {
      const d = base.delay;
      return {
        ...base,
        delay: {
          ...d,
          time: snap(lerp(d.time, 0.75, s), 0.005),
          feedback: snap(lerp(d.feedback, 0.7, s), 0.01),
        },
      };
    }
    case 'presence': {
      const p = base.presence;
      return {
        ...base,
        presence: { ...p, amount: snap(lerp(p.amount, 95, s), 1) },
      };
    }
    case 'de-esser': {
      const d = base['de-esser'];
      return {
        ...base,
        'de-esser': { ...d, amount: snap(lerp(d.amount, 80, s), 1) },
      };
    }
    case 'saturator': {
      const sat = base.saturator;
      return {
        ...base,
        saturator: { ...sat, drive: snap(lerp(sat.drive, 80, s), 1) },
      };
    }
    case 'multiband': {
      const m = base.multiband;
      return {
        ...base,
        multiband: { ...m, depth: snap(lerp(m.depth, 0.95, s), 0.01) },
      };
    }
    case 'ducker': {
      const d = base.ducker;
      return {
        ...base,
        ducker: { ...d, amount: snap(lerp(d.amount, 0.85, s), 0.01) },
      };
    }
    default:
      return { ...base, [slot]: sweepFirstKnob(base[slot], s) };
  }
}

/**
 * An effect with no demo of its own (the guitar pedals, each knob 0–1):
 * its first knob sweeps up from where it sits, or down from near the top,
 * so any effect a rack can take moves when hovered.
 */
function sweepFirstKnob<T>(state: T, s: number): T {
  const entry = Object.entries(state as Record<string, unknown>).find(
    ([key, v]) => key !== 'enabled' && typeof v === 'number',
  );
  if (!entry) return state;
  const [key, value] = entry as [string, number];
  const to = value >= 0.7 ? 0.1 : 0.9;
  return { ...state, [key]: snap(lerp(value, to, s), 0.01) };
}
