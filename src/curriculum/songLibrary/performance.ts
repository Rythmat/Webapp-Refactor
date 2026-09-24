import { parseNoteName } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import type {
  ChordBar,
  Song,
  SongMode,
  SongSection,
} from '@/curriculum/types/songLibrary';
import { spelledPitchClass } from './hybridDegree';

/**
 * Reading a chart's roadmap.
 *
 * A song is written once, compactly — repeats, numbered endings, D.S. and
 * D.C. jumps, a coda — and played in a longer order. Everything that follows
 * the music in time (playback, the bar highlight, the Studio export) walks
 * `performedBars`; the chart itself draws the written bars.
 *
 * Conventions, as a band reads them:
 * - An end repeat goes back to the last start repeat, or to the top.
 * - A passage with endings is played as many times as its highest ending
 *   number; each pass plays only the endings that list it.
 * - After a D.S. or D.C. a passage already played through is not repeated
 *   again and plays its last ending; a repeat not yet played (a vamp in the
 *   coda) is taken as written.
 * - "To Coda" and Fine only count on the pass after an al Coda / al Fine jump.
 */

export interface WrittenBar {
  sectionIdx: number;
  barIdx: number;
  bar: ChordBar;
}

export interface PerformedBar extends WrittenBar {
  /** Index into the written bars. */
  writtenIdx: number;
}

/** A section's legacy `repeatCount` as the barlines it stands for. */
export function sectionBars(section: SongSection): ChordBar[] {
  const times = section.repeatCount ?? 1;
  if (times <= 1 || section.bars.length === 0) return section.bars;
  const bars = [...section.bars];
  const last = bars.length - 1;
  bars[0] = { ...bars[0], repeatStart: true };
  bars[last] = { ...bars[last], repeatEnd: true, repeatTimes: times };
  return bars;
}

/** Every bar in written order, repeatCount turned into repeat barlines. */
export function writtenBars(song: Song): WrittenBar[] {
  return song.sections.flatMap((section, sectionIdx) =>
    sectionBars(section).map((bar, barIdx) => ({ sectionIdx, barIdx, bar })),
  );
}

/** Written index of the start repeat that the end repeat at `end` returns to. */
function repeatStartFor(bars: WrittenBar[], end: number): number {
  for (let i = end; i >= 0; i--) {
    if (bars[i].bar.repeatStart) return i;
    // An earlier end repeat closes the passage before this one.
    if (i < end && bars[i].bar.repeatEnd && !bars[i].bar.ending) return i + 1;
  }
  return 0;
}

/** The passage an end repeat closes: its endings run on past `end`. */
function passageEndings(
  bars: WrittenBar[],
  start: number,
  end: number,
): number {
  let highest = 0;
  for (let i = start; i < bars.length; i++) {
    const ending = bars[i].bar.ending;
    if (i > end && !ending) break;
    if (ending) highest = Math.max(highest, ...ending);
  }
  return highest;
}

/** Guard against a malformed roadmap looping forever. */
const MAX_PERFORMED = 4000;

export function performedBars(song: Song): PerformedBar[] {
  const bars = writtenBars(song);
  const out: PerformedBar[] = [];
  const segno = bars.findIndex((b) => b.bar.segno);
  const coda = bars.findIndex((b) => b.bar.coda);

  // Passes played so far, keyed by the written index of the passage's start.
  const pass = new Map<number, number>();
  let passageStart = 0;
  let jumped: 'coda' | 'fine' | 'plain' | null = null;
  const jumpsTaken = new Set<number>();

  let i = 0;
  while (i < bars.length && out.length < MAX_PERFORMED) {
    const { bar } = bars[i];
    if (bar.repeatStart) passageStart = i;

    if (bar.ending) {
      // A passage already played through stays on its last pass.
      const current = Math.min(
        pass.get(passageStart) ?? 1,
        lastEndingFrom(bars, i),
      );
      if (!bar.ending.includes(current)) {
        i++;
        continue;
      }
    }

    out.push({ ...bars[i], writtenIdx: i });

    if (jumped === 'fine' && bar.fine) break;
    if (jumped === 'coda' && bar.toCoda && coda >= 0) {
      i = coda;
      jumped = 'plain';
      continue;
    }

    if (bar.repeatEnd) {
      const start = repeatStartFor(bars, i);
      const times =
        bar.repeatTimes ?? Math.max(2, passageEndings(bars, start, i));
      const played = pass.get(start) ?? 1;
      if (played < times) {
        pass.set(start, played + 1);
        passageStart = start;
        i = start;
        continue;
      }
      // A plain end repeat closes its passage; endings after it still count
      // passes from the passage's start.
      if (!bar.ending) passageStart = i + 1;
    }

    if (bar.jump && !jumpsTaken.has(i)) {
      jumpsTaken.add(i);
      jumped = bar.jump.endsWith('Coda')
        ? 'coda'
        : bar.jump.endsWith('Fine')
          ? 'fine'
          : 'plain';
      i = bar.jump.startsWith('D.S.') && segno >= 0 ? segno : 0;
      continue;
    }

    i++;
  }
  return out;
}

/** The highest ending number of the run of ending bars `i` belongs to. */
function lastEndingFrom(bars: WrittenBar[], i: number): number {
  let lo = i;
  while (lo > 0 && bars[lo - 1].bar.ending) lo--;
  let highest = 0;
  for (let j = lo; j < bars.length && bars[j].bar.ending; j++)
    highest = Math.max(highest, ...bars[j].bar.ending!);
  return highest;
}

/* ── Key changes ─────────────────────────────────────────────────────── */

export interface LocalKey {
  key: string;
  /** Pitch class 0–11 of the tonic. */
  tonicPc: number;
  mode: SongMode;
}

/** 'A♭ major' → { tonicPc: 8, mode: 'major' }. */
export function parseKeyName(key: string): LocalKey | null {
  const match = key.trim().match(/^([A-G](?:♯|♭)?)\s*(.*)$/);
  if (!match) return null;
  const note = parseNoteName(match[1]);
  if (!note) return null;
  const word = match[2].trim().toLowerCase();
  // A blues key ('B♭ blues') plays its dominant chords as Mixolydian.
  const mode = (
    word === '' ? 'major' : word === 'blues' ? 'mixolydian' : word
  ) as SongMode;
  return { key, tonicPc: spelledPitchClass(note), mode };
}

/**
 * The key each written bar is in, walking the chart from the home key and
 * switching at every `keyChange`. Indexed like `writtenBars`.
 */
export function writtenBarKeys(song: Song): LocalKey[] {
  let current: LocalKey = {
    key: song.key,
    tonicPc: ((song.keyRoot % 12) + 12) % 12,
    mode: song.mode,
  };
  return writtenBars(song).map(({ bar }) => {
    if (bar.keyChange) current = parseKeyName(bar.keyChange) ?? current;
    return current;
  });
}
