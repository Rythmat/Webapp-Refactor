import { shapeValue } from './ModCurves';
import { computeGainOffset, getModRange } from './modMath';
import type { ModRoute } from './types';

// ── Live modulation, read at control rate ──────────────────────────────────
//
// The modulation matrix moves AudioParams in the audio graph, where JS can't
// read the result. Two destinations aren't AudioParams at all: a wavetable's
// position (a crossfade between frames, set in JS) and unison blend. This
// module works out what the routes add to a destination right now, with
// the matrix's own maths (the route's curve, then computeGainOffset), from
// source values read at control rate: an LFO's last sample, a macro's or the
// mod wheel's value, and a voice's envelopes, velocity and key. The engine
// uses it to drive the two JS destinations per voice (WtPosModulator), and
// the dock's synth card to show every modulated control moving as notes
// play, as the floating frame's synth does.

/** A route's source value now (0..1, or -1..1 for an audio source), or null. */
export type ModSourceRead = (route: ModRoute) => number | null;

/** The params the matrix can't reach: the engine drives them in JS. */
export const CONTROL_RATE_PARAMS: ReadonlySet<string> = new Set([
  'wtPos',
  'blend',
]);

/** The key a destination's offset is summed under ('osc1:wtPos'). */
export const destinationKey = (route: ModRoute) =>
  `${route.target.source}:${route.target.param}`;

/**
 * What one route adds to its destination for a source value, in the
 * destination's native units (cutoff: cents; resonance: Q; wtPos: 0..1).
 */
export function routeOffset(route: ModRoute, source: number): number {
  const bipolar = route.source.type === 'audio';
  const legacyCutoff =
    route.target.param === 'cutoff' && route.polarity === 'unipolar';
  const { gain, offset } = computeGainOffset(
    route.polarity,
    bipolar,
    route.amount,
    getModRange(route.target.param),
    legacyCutoff,
  );
  return shapeValue(route.curve ?? 'linear', source) * gain + offset;
}

/**
 * The routes' summed offsets by destination, for those whose source reads
 * now. A transform route maps through a curve the matrix builds per voice
 * and is left out, as a non-finite contribution is.
 */
export function liveOffsets(
  routes: readonly ModRoute[],
  read: ModSourceRead,
  keep: (route: ModRoute) => boolean = () => true,
): Map<string, number> {
  const offsets = new Map<string, number>();
  for (const route of routes) {
    if (!route.enabled || route.transform || !keep(route)) continue;
    const source = read(route);
    if (source === null) continue;
    const contribution = routeOffset(route, source);
    if (!Number.isFinite(contribution)) continue;
    const key = destinationKey(route);
    offsets.set(key, (offsets.get(key) ?? 0) + contribution);
  }
  return offsets;
}
