/**
 * Foli's calls: rhythms built a beat or two at a time from the owner's
 * Master Rhythm Library (data/masterRhythmLibrary.ts), each cell a real
 * figure (two 8ths, a triplet, a dotted 8th and a 16th), so a call is
 * music a drummer would play rather than hits at random.
 *
 * A BAR
 * Four beats of cells of the level's subdivisions, the first with a note on
 * beat 1 (the downbeat is where a call starts). Often its second half echoes
 * the first, as a figure repeated does; a two-bar call usually restates bar
 * 1's first half and answers it with a new ending. A level that adds a
 * subdivision always puts one of its figures in the call: 16ths at Level
 * 2, triplets at Level 10. A bar holds a triplet on one beat at most.
 *
 * THE DRUMS
 * On two drums the hands alternate, high bongo first (as Foli always has).
 * On four, the low bongo takes beats 1 and 3, the side stick beats 2 and 4,
 * the high bongo everything between, and the timbale accents the call's last
 * note.
 *
 * Pure, no React.
 */

import MASTER_RHYTHM_LIBRARY from '@/curriculum/data/masterRhythmLibrary';
import { pickWeighted, type EchoRandom } from '../echo/random';
import { MODE_DRUMS, type FoliDrum } from './drums';
import type { FoliLevel, FoliMode, Subdivision } from './levels';

export const TICKS_PER_BEAT = 480;
export const BAR_TICKS = 4 * TICKS_PER_BEAT;

/**
 * Where a call's last note may fall, in its last bar: the "and" of 4. A note
 * on the last 16th crowds the answer's downbeat (Peter, 2026-10-21); in a
 * two-bar call, bar 1's beat 4 may still lead into bar 2.
 */
export const CALL_END_TICK = 3 * TICKS_PER_BEAT + TICKS_PER_BEAT / 2;

export interface FoliNote {
  startTick: number;
  durationTick: number;
  drum: FoliDrum;
}

/** A cell of the library: a beat or two of rhythm. */
export interface RhythmCell {
  id: string;
  beats: 1 | 2;
  tier: number;
  subdivision: Subdivision;
  /** How many of its beats hold a triplet figure. */
  tripletBeats: number;
  hits: readonly { at: number; dur: number }[];
}

function subdivisionOf(ticks: readonly number[]): Subdivision {
  if (ticks.some((t) => t % 160 === 0 && t % 120 !== 0)) return 'triplets';
  if (ticks.some((t) => t % 240 !== 0)) return 'sixteenths';
  return 'eighths';
}

/**
 * Whether the staff writes a cell as it sounds. The Score editor's engraver
 * reads a beat as a triplet only when a note sits on its first triplet
 * partial; a long-short figure (a note on the beat and the third partial)
 * it writes as swung 8ths, as a lead sheet does. That's right for the
 * Studio, but in a rhythm game it would show straight 8ths for triplets, so
 * Foli leaves those cells out.
 */
function writtenAsHeard(hits: readonly { at: number }[]): boolean {
  return [...offsetsByBeat(hits).values()].every(
    (offsets) => !isTripletBeat(offsets) || offsets.includes(160),
  );
}

function offsetsByBeat(hits: readonly { at: number }[]): Map<number, number[]> {
  const byBeat = new Map<number, number[]>();
  for (const { at } of hits) {
    const beat = Math.floor(at / TICKS_PER_BEAT);
    byBeat.set(beat, [...(byBeat.get(beat) ?? []), at % TICKS_PER_BEAT]);
  }
  return byBeat;
}

const isTripletBeat = (offsets: readonly number[]) =>
  offsets.some((o) => o % 160 === 0 && o % 120 !== 0);

/** Every cell of the library the staff writes as it sounds, with its length and subdivision. */
export const RHYTHM_CELLS: readonly RhythmCell[] = MASTER_RHYTHM_LIBRARY.filter(
  (entry) => writtenAsHeard(entry.computerArray.map(([at]) => ({ at }))),
).map((entry) => {
  const hits = entry.computerArray.map(([at, dur]) => ({ at, dur }));
  return {
    id: entry.id,
    beats: /^[st]2_/.test(entry.id) ? 2 : 1,
    tier: entry.tier,
    // What's heard is where its notes start: a triplet-length rest after
    // a single note sounds as a plain quarter.
    subdivision: subdivisionOf(hits.map((h) => h.at)),
    tripletBeats: [...offsetsByBeat(hits).values()].filter(isTripletBeat)
      .length,
    hits,
  } as RhythmCell;
});

const TIER_WEIGHT: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 1 };

/** A bar holds a triplet figure on one beat at most (Peter, 2026-10-21). */
export const MAX_TRIPLET_BEATS_PER_BAR = 1;

/** Triplet beats a bar can still take. */
interface TripletBudget {
  left: number;
}

const tripletBeatsOf = (cells: readonly RhythmCell[]) =>
  cells.reduce((n, c) => n + c.tripletBeats, 0);

/** Whether a cell placed on a beat of the call's last bar ends in time. */
const endsInTime = (cell: RhythmCell, beat: number) =>
  cell.hits.every((h) => beat * TICKS_PER_BEAT + h.at <= CALL_END_TICK);

/**
 * Beats of cells, `beats` long from beat `fromBeat` of the bar, the first
 * with a note on its downbeat when it starts the bar; in the call's last bar
 * (`final`), nothing after the "and" of 4.
 */
function fillBeats(
  beats: number,
  pool: readonly RhythmCell[],
  rng: EchoRandom,
  level: FoliLevel,
  startsBar: boolean,
  budget: TripletBudget,
  fromBeat: number,
  final: boolean,
): RhythmCell[] {
  const cells: RhythmCell[] = [];
  let left = beats;
  while (left > 0) {
    const beat = fromBeat + beats - left;
    const fits = pool.filter(
      (c) =>
        c.beats <= left &&
        c.tripletBeats <= budget.left &&
        (!final || endsInTime(c, beat)) &&
        (!startsBar || cells.length > 0 || c.hits[0]?.at === 0) &&
        // Never two silent beats running.
        !(c.hits.length === 0 && cells[cells.length - 1]?.hits.length === 0),
    );
    const cell = pickWeighted(
      rng,
      fits,
      (c) =>
        (TIER_WEIGHT[c.tier] ?? 1) *
        // The level's new figure turns up more; triplets, once they're
        // in, now and then.
        (c.subdivision === level.introduces
          ? 2
          : c.subdivision === 'triplets'
            ? 0.5
            : 1) *
        (c.hits.length === 0 ? 0.3 : 1),
    );
    cells.push(cell);
    budget.left -= cell.tripletBeats;
    left -= cell.beats;
  }
  return cells;
}

const cellHits = (cells: readonly RhythmCell[], fromBeat: number) => {
  const out: { at: number; dur: number }[] = [];
  let beat = fromBeat;
  for (const cell of cells) {
    for (const h of cell.hits)
      out.push({ at: beat * TICKS_PER_BEAT + h.at, dur: h.dur });
    beat += cell.beats;
  }
  return out;
};

/** A bar: two halves, the second often the first again. */
function buildBar(
  level: FoliLevel,
  pool: readonly RhythmCell[],
  rng: EchoRandom,
  final: boolean,
  first?: readonly RhythmCell[],
): RhythmCell[] {
  const budget: TripletBudget = { left: MAX_TRIPLET_BEATS_PER_BAR };
  const opening =
    first ?? fillBeats(2, pool, rng, level, true, budget, 0, final);
  if (first) budget.left -= tripletBeatsOf(first);
  const openingBeats = opening.reduce((n, c) => n + c.beats, 0);
  // The second half echoes the first, unless that would put a second
  // triplet in the bar or, in the last bar, a note past the "and" of 4.
  let beat = openingBeats;
  const echoEndsInTime = opening.every((c) => {
    const ok = endsInTime(c, beat);
    beat += c.beats;
    return ok;
  });
  const echo =
    !first &&
    rng() < 0.4 &&
    tripletBeatsOf(opening) <= budget.left &&
    (!final || echoEndsInTime);
  const closing = echo
    ? opening
    : fillBeats(
        4 - openingBeats,
        pool,
        rng,
        level,
        false,
        budget,
        openingBeats,
        final,
      );
  return [...opening, ...closing];
}

/** Whether a call reads as the level means it to. */
function playable(
  cells: readonly RhythmCell[],
  level: FoliLevel,
  bars: number,
): boolean {
  const hits = cells.reduce((n, c) => n + c.hits.length, 0);
  const lastHit = cellHits(cells, 0).reduce((end, h) => Math.max(end, h.at), 0);
  return (
    hits >= 3 * bars &&
    hits <= 9 * bars &&
    lastHit <= (bars - 1) * BAR_TICKS + CALL_END_TICK &&
    (!level.introduces || cells.some((c) => c.subdivision === level.introduces))
  );
}

/** The drum each of a call's notes is played on. */
function assignDrums(
  hits: readonly { at: number; dur: number }[],
  mode: FoliMode,
): FoliDrum[] {
  if (mode === 'two') {
    const [high, low] = MODE_DRUMS.two;
    return hits.map((_, i) => (i % 2 === 0 ? high : low));
  }
  return hits.map((h, i) => {
    if (i === hits.length - 1 && hits.length > 2) return 'timbale';
    const inBar = h.at % BAR_TICKS;
    if (inBar % (2 * TICKS_PER_BEAT) === 0) return 'bongoLow';
    if (inBar % TICKS_PER_BEAT === 0) return 'sidestick';
    return 'bongoHigh';
  });
}

/** A call for a level: one or two bars, on the mode's drums. */
export function buildCall(
  level: FoliLevel,
  mode: FoliMode,
  rng: EchoRandom,
): FoliNote[] {
  const pool = RHYTHM_CELLS.filter((c) =>
    level.subdivisions.includes(c.subdivision),
  );
  let cells: RhythmCell[] = [];
  for (let attempt = 0; attempt < 60; attempt++) {
    const bar1 = buildBar(level, pool, rng, level.bars === 1);
    cells =
      level.bars === 1
        ? bar1
        : [
            ...bar1,
            ...(rng() < 0.6
              ? buildBar(level, pool, rng, true, bar1.slice(0, firstHalf(bar1)))
              : buildBar(level, pool, rng, true)),
          ];
    if (playable(cells, level, level.bars)) break;
  }
  const hits = cellHits(cells, 0);
  const drums = assignDrums(hits, mode);
  return hits.map((h, i) => ({
    startTick: h.at,
    durationTick: h.dur,
    drum: drums[i],
  }));
}

/** How many of a bar's cells make its first two beats. */
function firstHalf(bar: readonly RhythmCell[]): number {
  let beats = 0;
  for (let i = 0; i < bar.length; i++) {
    beats += bar[i].beats;
    if (beats >= 2) return i + 1;
  }
  return bar.length;
}
