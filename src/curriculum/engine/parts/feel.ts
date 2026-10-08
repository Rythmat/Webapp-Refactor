/**
 * Feel profiles: how a style places each subdivision against the grid — a
 * timing offset (and an optional velocity scale) for every 16th position in
 * a cycle. Swing is the one-number special case (the off-beat 16th late);
 * samba's "1-e-+ early, a pulled back" in 2/4, Dilla-lazy 16ths and second
 * line are others.
 *
 * Profiles come from real players, not guesswork: capture a master, then
 * `extractFeel` averages how far each position sat from the grid. Any clean,
 * written part can then wear that profile.
 */

import { PPQ, type PartNote } from './part';

export interface FeelProfile {
  id: string;
  name: string;
  description?: string;
  /** Grid the positions are counted on, in ticks (120 = 16ths). */
  step: number;
  /** Positions per cycle: 4 = one beat of 16ths, 8 = a 2/4 bar of 16ths. */
  positions: number;
  /** Ticks to move a note at each position (negative = ahead). */
  offsets: number[];
  /** Velocity multiplier per position (accents); 1 when absent. */
  velocity?: number[];
  /** Where it came from: performer, part id, date. */
  source?: string;
}

/** A note's position in the profile's cycle, or null when it's between steps. */
function positionOf(tick: number, profile: FeelProfile): number | null {
  if (tick % profile.step !== 0) return null;
  return (tick / profile.step) % profile.positions;
}

/** Play written notes with a profile's feel. Notes with their own offset keep it. */
export function applyFeel(
  notes: readonly PartNote[],
  profile: FeelProfile | undefined,
): PartNote[] {
  if (!profile) return [...notes];
  return notes.map((n) => {
    if (n.offset !== undefined) return n;
    const pos = positionOf(n.tick, profile);
    if (pos === null) return n;
    const scale = profile.velocity?.[pos] ?? 1;
    return {
      ...n,
      offset: Math.round(profile.offsets[pos] ?? 0),
      velocity: Math.max(1, Math.min(127, Math.round(n.velocity * scale))),
    };
  });
}

/**
 * A profile from a played part: the average offset (and loudness relative to
 * the part's average) at each position. Positions with fewer than `minNotes`
 * examples read as on the grid.
 */
export function extractFeel(
  notes: readonly PartNote[],
  options: {
    id: string;
    name: string;
    step?: number;
    positions?: number;
    minNotes?: number;
    source?: string;
  },
): FeelProfile {
  const step = options.step ?? PPQ / 4;
  const positions = options.positions ?? 4;
  const minNotes = options.minNotes ?? 3;
  const sums = Array.from({ length: positions }, () => ({
    offset: 0,
    velocity: 0,
    count: 0,
  }));
  let velocityTotal = 0;
  let counted = 0;
  for (const n of notes) {
    if (n.grace || n.tick % step !== 0) continue;
    const pos = (n.tick / step) % positions;
    sums[pos].offset += n.offset ?? 0;
    sums[pos].velocity += n.velocity;
    sums[pos].count += 1;
    velocityTotal += n.velocity;
    counted += 1;
  }
  const meanVelocity = counted ? velocityTotal / counted : 1;
  return {
    id: options.id,
    name: options.name,
    step,
    positions,
    offsets: sums.map((s) =>
      s.count >= minNotes ? Math.round(s.offset / s.count) : 0,
    ),
    velocity: sums.map((s) =>
      s.count >= minNotes
        ? Math.round((s.velocity / s.count / meanVelocity) * 100) / 100
        : 1,
    ),
    ...(options.source ? { source: options.source } : {}),
  };
}

const files = import.meta.glob<FeelProfile>('../../data/feels/*.json', {
  eager: true,
  import: 'default',
});

/** Every saved feel profile (src/curriculum/data/feels/). */
export const FEEL_PROFILES: readonly FeelProfile[] = Object.values(files).sort(
  (a, b) => a.name.localeCompare(b.name),
);

export const getFeel = (id: string | undefined) =>
  id ? FEEL_PROFILES.find((f) => f.id === id) : undefined;
