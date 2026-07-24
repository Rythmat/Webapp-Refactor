// ── Parameter automation (Phase 7) ─────────────────────────────────────────
// Time-indexed breakpoint lanes for track params (volume/pan/sends/FX). A lane
// is a list of { tick, value } points; the value between points is linearly
// interpolated. Lanes live on Track.automation (Record<paramId, points>) and are
// sampled both during live playback and in the offline bounce render.

/** A single automation breakpoint: a value at a musical tick (PPQ 480). */
export interface AutomationPoint {
  tick: number;
  value: number;
}

/** paramId → sorted breakpoint list. paramId is a member of the allow-list in
 *  automationParams.ts (e.g. 'volume', 'pan', 'send.A', 'effect.reverb.wet'). */
export type AutomationLanes = Record<string, AutomationPoint[]>;

/**
 * A resolved ramp destination: an AudioParam plus a map from the lane's value
 * to the param's actual value. `map` handles derived params — a wet/dry pair
 * automates two gains (v and 1−v), presence.amount is dB-scaled, etc. — so the
 * scheduler can ride one lane onto several params in lockstep.
 */
export interface AutomationTarget {
  param: AudioParam;
  map: (laneValue: number) => number;
}

/**
 * Linear-interpolate a lane's value at `tick`. Points are assumed sorted by tick
 * (keepSorted maintains that). Semantics:
 *   • empty lane           → null (caller falls back to the static store value)
 *   • tick at/before first → first point's value (hold)
 *   • tick at/after last   → last point's value (hold)
 *   • between two points   → linear interpolation
 *   • exact hit on a point  → that point's value
 * Runs in the audio hot path, so it is allocation-free.
 */
export function sampleAutomation(
  points: AutomationPoint[] | undefined,
  tick: number,
): number | null {
  if (!points || points.length === 0) return null;
  const first = points[0];
  if (tick <= first.tick) return first.value;
  const last = points[points.length - 1];
  if (tick >= last.tick) return last.value;

  // Binary search for the segment [lo, hi] with points[lo].tick <= tick < points[hi].tick.
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].tick <= tick) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  if (b.tick === a.tick) return b.value; // coincident ticks → later value wins
  const t = (tick - a.tick) / (b.tick - a.tick);
  return a.value + (b.value - a.value) * t;
}

/**
 * Insert a point keeping the lane sorted by tick. If a point already exists at
 * the exact tick it is REPLACED (a lane holds at most one value per tick).
 * Returns a new array (immutable update for the store).
 */
export function insertPoint(
  points: AutomationPoint[] | undefined,
  point: AutomationPoint,
): AutomationPoint[] {
  const next = (points ?? []).filter((p) => p.tick !== point.tick);
  let i = next.length;
  while (i > 0 && next[i - 1].tick > point.tick) i--;
  next.splice(i, 0, point);
  return next;
}

/** Remove the point at exactly `tick`. Returns a new array. */
export function removePoint(
  points: AutomationPoint[] | undefined,
  tick: number,
): AutomationPoint[] {
  return (points ?? []).filter((p) => p.tick !== tick);
}
