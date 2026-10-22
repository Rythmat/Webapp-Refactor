/**
 * A recorded take on the pads (Peter, 2026-10-21): one time through the
 * groove, played on the finger kit, onto the grid. Each hit lands on the
 * cell nearest where it was played; a hit on a track that isn't armed isn't
 * recorded, and a take replaces only the armed tracks, so a player can lay
 * down the kick, then the hi-hat, then the snare, or any two at once.
 *
 * Pure, no React.
 */

import type { PlayedHit } from './grade';
import { LAB_LANES, type LabLane } from './labGroove';

/** The player's grid: each track's cells, and which of the hat's are open. */
export type GridCells = Record<LabLane, Set<number>> & { open: Set<number> };

export const emptyCells = (): GridCells => ({
  cymbal: new Set(),
  snare: new Set(),
  kick: new Set(),
  open: new Set(),
});

export type ArmedTracks = Record<LabLane, boolean>;

export const ALL_ARMED: ArmedTracks = { cymbal: true, snare: true, kick: true };

/**
 * The cells a take's hits make: each on the step nearest where it was
 * played, from `start` (a downbeat played a hair early is the downbeat), for
 * `steps` steps of `stepS` seconds. An open hat on a step wins over a closed
 * one there.
 */
export function cellsFromTake(
  hits: readonly PlayedHit[],
  start: number,
  stepS: number,
  steps: number,
  armed: ArmedTracks = ALL_ARMED,
): GridCells {
  const cells = emptyCells();
  for (const hit of hits) {
    if (!armed[hit.lane]) continue;
    const step = Math.round((hit.t - start) / stepS);
    if (step < 0 || step >= steps) continue;
    cells[hit.lane].add(step);
    if (hit.lane === 'cymbal' && hit.open) cells.open.add(step);
  }
  return cells;
}

/** The grid with a take's armed tracks laid over it. */
export function withTake(
  was: GridCells,
  take: GridCells,
  armed: ArmedTracks,
): GridCells {
  const next = emptyCells();
  for (const lane of LAB_LANES)
    next[lane] = new Set(armed[lane] ? take[lane] : was[lane]);
  next.open = new Set(armed.cymbal ? take.open : was.open);
  return next;
}
