import {
  gridStepTicks,
  isCompound,
  ticksPerBar,
  type TimeSignature,
} from '@/daw/time/timeModel';
import type { AllGridSize, GridSize } from '@/daw/utils/quantize';

// ── The timeline's grid (milestone 2.7) ────────────────────────────────────
//
// What the toolbar's Grid menu offers and how it names it. The grid was stuck
// at a quarter (timeline-14); the menu now picks Bar, 1/2, 1/4, 1/8 or 1/16,
// in triplets or not, and Snap on or off. Every gesture snaps to it through
// the time model (timeModel.snapTicks, in the project's metre and from each
// bar line); this file only says which grids fit the metre and what to call
// them. Turning snap on or off never moves the playhead (shell-18).

/** The grids the menu lists, coarsest first ('1/1' is a bar). */
export const GRID_BASES = ['1/1', '1/2', '1/4', '1/8', '1/16'] as const;
export type GridBase = (typeof GRID_BASES)[number];

/** A grid's triplet ('1/4' → '1/4T'); a bar has none. */
export function tripletOf(base: GridBase): AllGridSize | null {
  return base === '1/1' ? null : (`${base}T` as AllGridSize);
}

export function isTriplet(size: AllGridSize): boolean {
  return size.endsWith('T');
}

/** The straight grid a size belongs to ('1/8T' → '1/8'). */
export function baseOf(size: AllGridSize): GridSize {
  return (isTriplet(size) ? size.slice(0, -1) : size) as GridSize;
}

/** Whether a grid's lines fall on every bar line of the metre. */
export function fitsMetre(size: AllGridSize, ts: TimeSignature): boolean {
  return ticksPerBar(ts) % gridStepTicks(size, ts) === 0;
}

/**
 * The straight grids that fit the metre, plus `current` when it doesn't (a
 * project saved with a grid its new metre no longer fits keeps showing it).
 * In 3/4 a half note doesn't fill a bar evenly, so 1/2 isn't offered.
 */
export function gridChoices(
  ts: TimeSignature,
  current?: AllGridSize,
): GridBase[] {
  const currentBase = current ? baseOf(current) : null;
  return GRID_BASES.filter(
    (base) => fitsMetre(base, ts) || base === currentBase,
  );
}

/** What the menu calls a grid: 'Bar', '1/8', 'Dotted 1/4' in 6/8, '1/8 triplet'. */
export function gridLabel(size: AllGridSize, ts: TimeSignature): string {
  const base = baseOf(size);
  const name =
    base === '1/1'
      ? 'Bar'
      : base === '1/4' && isCompound(ts) && !isTriplet(size)
        ? 'Dotted 1/4'
        : base;
  return isTriplet(size) ? `${name} triplet` : name;
}

/**
 * The store fields for a grid picked in the menu: the size snapping uses,
 * and whether the timeline draws triplet lines. A bar has no triplet, so
 * picking Bar turns triplets off.
 */
export function gridChoice(
  base: GridBase,
  triplets: boolean,
): { timelineGridSize: AllGridSize; timelineTripletMode: boolean } {
  const triplet = triplets ? tripletOf(base) : null;
  return {
    timelineGridSize: triplet ?? base,
    timelineTripletMode: triplet !== null,
  };
}
