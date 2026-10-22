/**
 * Grading Groove Lab, both ways (Peter, 2026-10-21).
 *
 * THE GRID
 * Only the hits count (an open hi-hat where the groove's is closed, or the
 * other way round, is a hit missed): a groove's missing hits and the player's extra ones
 * are the mistakes, and an empty cell where the groove is empty is no
 * credit (the old grade counted every empty cell right, so a blank grid
 * scored 78% on Basic Rock). One slip a bar passes.
 *
 * THE PADS
 * Played in time, on one clock, as Foli is: every hit is kept with the
 * moment it was played, each of the groove's notes reaches both ways for
 * its hit, and notes and hits pair closest first, row by row, so a late
 * snare can't steal the next one's hit and a kick never answers for a hat
 * (nor a closed hat for an open one).
 * Every note must be played; one stray hit a bar passes.
 *
 * Pure, no React.
 */

import {
  LAB_LANES,
  laneSteps,
  type LabGroove,
  type LabLane,
} from './labGroove';

/** The cells on, each row, and which of the hat's are open. */
export type LaneCells = Record<LabLane, ReadonlySet<number>> & {
  open?: ReadonlySet<number>;
};

export interface GridGrade {
  /** Each row's steps: placed and right, the groove's missed, the extras. */
  right: Record<LabLane, number[]>;
  missing: Record<LabLane, number[]>;
  extra: Record<LabLane, number[]>;
  mistakes: number;
  /** Right hits as a share of the groove's hits plus the extras. */
  accuracy: number;
  passed: boolean;
}

/** Slips a bar a grid may have and pass. */
export const GRID_SLIPS_PER_BAR = 1;

export function gradeGrid(groove: LabGroove, answer: LaneCells): GridGrade {
  const target = laneSteps(groove);
  const right = { cymbal: [], snare: [], kick: [] } as Record<
    LabLane,
    number[]
  >;
  const missing = { cymbal: [], snare: [], kick: [] } as Record<
    LabLane,
    number[]
  >;
  const extra = { cymbal: [], snare: [], kick: [] } as Record<
    LabLane,
    number[]
  >;
  const sameState = (lane: LabLane, step: number) =>
    lane !== 'cymbal' ||
    target.open.has(step) === (answer.open?.has(step) ?? false);
  for (const lane of LAB_LANES) {
    for (const step of target[lane])
      (answer[lane].has(step) && sameState(lane, step) ? right : missing)[
        lane
      ].push(step);
    for (const step of answer[lane])
      if (!target[lane].has(step)) extra[lane].push(step);
  }
  const sum = (r: Record<LabLane, number[]>) =>
    LAB_LANES.reduce((n, lane) => n + r[lane].length, 0);
  const mistakes = sum(missing) + sum(extra);
  const hits = sum(right) + sum(missing);
  return {
    right,
    missing,
    extra,
    mistakes,
    accuracy: hits + sum(extra) > 0 ? sum(right) / (hits + sum(extra)) : 0,
    passed: mistakes <= GRID_SLIPS_PER_BAR * groove.bars,
  };
}

// ── In time ──────────────────────────────────────────────────────────────

export interface PlayedHit {
  /** When it was played, in audio-clock seconds, as heard. */
  t: number;
  lane: LabLane;
  /** An open hi-hat (U). */
  open?: boolean;
}

export interface TimedNote {
  lane: LabLane;
  open: boolean;
  /** Its cell in the grid. */
  step: number;
  /** When it sounds, in seconds from the groove's first downbeat. */
  at: number;
}

export interface PlayGrade {
  /** Each note matched, by index: how far off its hit was (+ late). */
  matched: Map<number, number>;
  extra: number;
  passed: boolean;
}

/** Stray hits a bar an answer may have and pass. */
export const EXTRA_PER_BAR = 1;

/** The groove's notes in seconds, at a tempo. */
export function timedNotes(groove: LabGroove, bpm: number): TimedNote[] {
  const tickS = 60 / (bpm * 480);
  return LAB_LANES.flatMap((lane) =>
    groove.lanes[lane].map((hit) => ({
      lane,
      open: hit.open,
      step: hit.step,
      at: hit.playedTick * tickS,
    })),
  ).sort((a, b) => a.at - b.at);
}

/**
 * How far either side of a note its hit may land: two fifths of the
 * shortest gap between two notes on the same row, from 40 to 120 ms.
 */
export function playTolerance(notes: readonly TimedNote[]): number {
  let gap = Infinity;
  for (const lane of LAB_LANES) {
    const times = notes.filter((n) => n.lane === lane).map((n) => n.at);
    for (let i = 1; i < times.length; i++)
      gap = Math.min(gap, times[i] - times[i - 1]);
  }
  if (!Number.isFinite(gap)) gap = 0.3;
  return Math.max(0.04, Math.min(0.12, gap * 0.4));
}

/** The answer's notes against the hits, row by row, closest pairs first. */
export function gradePlayed(
  notes: readonly TimedNote[],
  hits: readonly PlayedHit[],
  start: number,
  length: number,
  bars: number,
  tolerance: number,
): PlayGrade {
  const inWindow = hits
    .map((hit, j) => ({ hit, j }))
    .filter(
      ({ hit }) =>
        hit.t >= start - tolerance && hit.t <= start + length + tolerance,
    );
  const pairs: { i: number; j: number; d: number }[] = [];
  notes.forEach((note, i) => {
    for (const { hit, j } of inWindow) {
      const d = hit.t - (start + note.at);
      if (
        hit.lane === note.lane &&
        !!hit.open === note.open &&
        Math.abs(d) <= tolerance
      )
        pairs.push({ i, j, d });
    }
  });
  pairs.sort((a, b) => Math.abs(a.d) - Math.abs(b.d));
  const matched = new Map<number, number>();
  const used = new Set<number>();
  for (const { i, j, d } of pairs) {
    if (matched.has(i) || used.has(j)) continue;
    matched.set(i, d);
    used.add(j);
  }
  const extra = inWindow.filter(({ j }) => !used.has(j)).length;
  return {
    matched,
    extra,
    passed: matched.size === notes.length && extra <= EXTRA_PER_BAR * bars,
  };
}
