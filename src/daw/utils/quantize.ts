import type { MidiNoteEvent } from '@prism/engine';

// ── Grid values (ticks per grid unit) ─────────────────────────────────────

export const GRID_VALUES = {
  '1/1': 1920,
  '1/2': 960,
  '1/4': 480,
  '1/8': 240,
  '1/16': 120,
  '1/32': 60,
} as const;

export type GridSize = keyof typeof GRID_VALUES;

// ── Triplet grid values ──────────────────────────────────────────────────

export const TRIPLET_GRID_VALUES = {
  '1/2T': 640, // 960 * 2/3
  '1/4T': 320, // 480 * 2/3
  '1/8T': 160, // 240 * 2/3
  '1/16T': 80, // 120 * 2/3
  '1/32T': 40, // 60 * 2/3
} as const;

export const ALL_GRID_VALUES = {
  ...GRID_VALUES,
  ...TRIPLET_GRID_VALUES,
} as const;

export type TripletGridSize = keyof typeof TRIPLET_GRID_VALUES;
export type AllGridSize = keyof typeof ALL_GRID_VALUES;

// ── Quantize ──────────────────────────────────────────────────────────────
// Snaps each event's startTick to the nearest grid position: the clip
// menu's Quantize (milestone 2.12).

/**
 * Each note moved to start on the nearest grid line, its length and id
 * kept. `toGrid` snaps a song tick (the time model's snapTicks, counted from
 * the bar lines in the project's metre); `offsetTicks` is where the notes'
 * tick 0 sits in the song, a clip's start, so a clip that starts off the
 * grid still lands its notes on the song's grid. No note moves before the
 * clip's start. Notes already on the grid are the same objects.
 */
export function quantizeEvents(
  events: MidiNoteEvent[],
  toGrid: (songTick: number) => number,
  offsetTicks = 0,
): MidiNoteEvent[] {
  return events.map((ev) => {
    const startTick = Math.max(
      0,
      toGrid(offsetTicks + ev.startTick) - offsetTicks,
    );
    return startTick === ev.startTick ? ev : { ...ev, startTick };
  });
}

// Snap a single tick value to grid
export function snapToGrid(tick: number, gridSize: GridSize): number {
  const gridTicks = GRID_VALUES[gridSize];
  return Math.max(0, Math.round(tick / gridTicks) * gridTicks);
}

// Snap a tick value using raw tick interval (works with all grid types)
export function snapToGridTicks(tick: number, gridTicks: number): number {
  return Math.max(0, Math.round(tick / gridTicks) * gridTicks);
}
