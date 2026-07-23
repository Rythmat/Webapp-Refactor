import { ModPolarity, ModRoute, ModSourceRef } from './types';

/**
 * Pure math for the modulation matrix — extracted so it can be unit-tested
 * without an AudioContext.
 */

export interface GainOffset {
  /** Multiplier applied to the source signal (scaler GainNode gain). */
  gain: number;
  /** Constant added at the destination (offsetGain from the shared DC source). */
  offset: number;
}

/**
 * Computes the scaler gain and DC offset for one modulation connection.
 *
 * `amount` is the signed route depth (-1..1); `range` is the parameter's
 * native modulation range (e.g. 4800 cents for cutoff). A = amount * range.
 *
 * - unipolar route + unipolar source (0..1):  sweep base → base+A
 * - unipolar route + bipolar source (-1..1):  same span, source recentred
 * - bipolar route + unipolar source:          sweep base-A → base+A
 * - bipolar route + bipolar source:           sweep base-A → base+A
 *
 * Legacy cutoff case: v1 presets expect a unipolar LFO on cutoff to sweep
 * DOWN from the base cutoff (LFO=1 → at cutoff, LFO=0 → base-A). Pass
 * `legacyCutoffDownSweep` to reproduce that exactly.
 */
export function computeGainOffset(
  polarity: ModPolarity,
  sourceBipolar: boolean,
  amount: number,
  range: number,
  legacyCutoffDownSweep = false,
): GainOffset {
  const A = amount * range;

  if (legacyCutoffDownSweep && polarity === 'unipolar') {
    // source 0..1 → offset -A..0 (down-sweep ending at the base value)
    return sourceBipolar
      ? { gain: A / 2, offset: -A / 2 }
      : { gain: A, offset: -A };
  }

  if (polarity === 'unipolar') {
    return sourceBipolar
      ? { gain: A / 2, offset: A / 2 } // -1..1 → 0..A
      : { gain: A, offset: 0 }; // 0..1 → 0..A
  }

  // bipolar
  return sourceBipolar
    ? { gain: A, offset: 0 } // -1..1 → -A..A
    : { gain: 2 * A, offset: -A }; // 0..1 → -A..A
}

/** Modulation ranges in each parameter's native units (± at amount=1). */
export function getModRange(param: string): number {
  switch (param) {
    case 'cutoff':
      return 4800; // cents (4 octaves) via biquad.detune
    case 'resonance':
      return 15; // Q
    case 'level':
      return 0.5; // gain
    case 'gain':
      return 12; // dB
    case 'pan':
      return 1; // full L-R
    case 'detune':
      return 100; // cents
    case 'blend':
    case 'mix':
    case 'wtPos':
      return 0.5;
    default:
      return 1;
  }
}

/**
 * Targets the v1 engine actually modulated. Routes on any OTHER target
 * (osc pan/detune, sub, noise, …) existed in v1 data but were silent
 * no-ops — the old resolveTarget returned null for them.
 */
function wasAudibleInV1(route: ModRoute): boolean {
  const { source, param } = route.target;
  if (source === 'osc1' || source === 'osc2') return param === 'level';
  if (source === 'flt1' || source === 'flt2') {
    return param === 'cutoff' || param === 'resonance' || param === 'level';
  }
  return false;
}

/**
 * Migrates a v1 route ({lfoIndex, depthMin, depthMax}) to the v2 shape.
 * Idempotent: v2 routes pass through unchanged (with legacy fields stripped).
 *
 * v1 semantics: only depthMax was honored, unipolar, LFO source only —
 * so `amount = depthMax`, `polarity = 'unipolar'` preserves the audible
 * behavior exactly (the cutoff down-sweep is preserved engine-side).
 *
 * Routes on targets that were INERT in v1 (silent no-ops) are migrated
 * disabled: activating them at depthMax would make old presets/projects
 * suddenly sound different. Users can re-enable them deliberately.
 */
export function migrateModRoute(route: ModRoute): ModRoute {
  const isV1 = route.source === undefined;
  const source: ModSourceRef = route.source ?? {
    type: 'lfo',
    index: route.lfoIndex ?? 0,
  };
  const migrated: ModRoute = {
    id: route.id,
    source,
    target: route.target,
    amount: route.amount ?? route.depthMax ?? 0.5,
    polarity: route.polarity ?? 'unipolar',
    curve: route.curve ?? 'linear',
    enabled: isV1 && !wasAudibleInV1(route) ? false : route.enabled,
  };
  if (route.transform !== undefined) migrated.transform = route.transform;
  return migrated;
}
