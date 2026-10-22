/**
 * Chord strikes: the notes a student plays, heard as the chords they
 * struck. Echo's own reading, for its chord echoes (grading.ts) and its
 * chords takes (takes.ts), so chords can come a 16th apart.
 *
 * THE SPREAD (`strikeSpreadTicks`)
 * A note within a short spread of a strike's first note is part of it: a
 * rolled chord, uneven fingers. A note later than that starts the next
 * strike, even a 16th after. The spread follows the tempo: the smaller of
 * 60 ms and 40% of a 16th, in ticks.
 *
 *   BPM   a 16th   the spread
 *   80    188 ms   60 ms   38 ticks
 *   90    167 ms   60 ms   43 ticks
 *   100   150 ms   60 ms   48 ticks
 *   116   129 ms   52 ms   48 ticks
 *
 * So a 16th (120 ticks) is always two and a half spreads at least: the
 * next 16th's chord, even played 70 ticks early, is a strike of its own.
 * (Music Literacy's chord grader joins notes within 100 ticks, which would
 * run Echo's 16th chords together.)
 *
 * A SLOW ROLL
 * A chord rolled slower than the spread comes as strikes none of which is
 * a chord. Given what counts as one (`complete`), such strikes starting
 * within three quarters of a 16th of the first are joined when together
 * they make a chord: a beginner's slow roll is still a chord. A strike
 * that is a chord on its own is never joined, so two chords a 16th apart
 * stay two.
 *
 * HELD AND STRUCK AGAIN
 * Strikes are told apart by onset alone, never by what's still sounding:
 * a chord held while it's struck again is two strikes, the first ending at
 * the second. A key pressed twice within a strike's spread (a bounce) is
 * one note of it; a key let go and pressed again later strikes again.
 * Keys pressed in an earlier strike and still held once a new one is
 * complete are its `held`. Held under a re-struck note they sound with it,
 * so they can complete its chord: a root and fifth held, the third struck
 * again, is the chord struck again. They only ever complete one: a held
 * note outside the chord costs nothing.
 *
 * A note's duration is 0 while it's held (grading.ts PlayedNote); it ends
 * when its key is next pressed, if it hasn't before.
 *
 * Pure, no React.
 */

import type { StruckChord } from '../musicLiteracy/chordGrading';
import type { PlayedNote } from '../musicLiteracy/grading';
import { SIXTEENTH_TICKS } from './levels';
import { msToTicks } from './tempo';

/** The longest a strike spreads, in milliseconds (THE SPREAD above). */
export const STRIKE_SPREAD_MS = 60;

/** The longest a strike spreads, as a share of a 16th, whatever the tempo. */
export const STRIKE_SPREAD_SHARE = 0.4;

/** How far apart a slow roll's strikes may start, as a share of a 16th. */
export const SLOW_ROLL_SHARE = 0.75;

/** A strike's spread at a tempo, in ticks (THE SPREAD above). */
export function strikeSpreadTicks(tempo: number): number {
  return Math.min(
    msToTicks(STRIKE_SPREAD_MS, tempo),
    STRIKE_SPREAD_SHARE * SIXTEENTH_TICKS,
  );
}

/** A chord the student struck: Music Literacy's StruckChord, and more. */
export interface ChordStrike<T extends PlayedNote = PlayedNote>
  extends StruckChord<T> {
  /** Its first note's onset. */
  onset: number;
  /** The keys struck in it, each once (its first press), in order struck. */
  notes: T[];
  /** Keys struck before it and held through it, not struck in it. */
  held: T[];
  /** When the last of its notes is let go, in ticks; Infinity while held. */
  end: number;
}

export interface StrikeOptions {
  /** The tempo played at, BPM: it sets the spread. */
  tempo: number;
  /** The spread in ticks, instead of the tempo's. */
  spread?: number;
  /**
   * Whether notes make a chord, for joining a slow roll (A SLOW ROLL
   * above); no joining when left out.
   */
  complete?: (midis: readonly number[]) => boolean;
}

/** A key pressed, and when it's let go. */
interface Press<T> {
  note: T;
  release: number;
}

const keysOf = <T extends PlayedNote>(group: readonly Press<T>[]) =>
  group.map((press) => press.note.midi);

/** Strikes none of which is a chord, joined where together they are one. */
function joinSlowRolls<T extends PlayedNote>(
  groups: readonly Press<T>[][],
  complete: (midis: readonly number[]) => boolean,
  limit: number,
): Press<T>[][] {
  const joined: Press<T>[][] = [];
  for (let i = 0; i < groups.length; i++) {
    const first = groups[i];
    if (!complete(keysOf(first))) {
      let run = first;
      let last = i;
      for (let j = i + 1; j < groups.length; j++) {
        const next = groups[j];
        const start = next[0].note.onset - first[0].note.onset;
        if (start >= limit || complete(keysOf(next))) break;
        run = [...run, ...next];
        if (complete(keysOf(run))) {
          last = j;
          break;
        }
      }
      if (last > i) {
        joined.push(run);
        i = last;
        continue;
      }
    }
    joined.push(first);
  }
  return joined;
}

/** The student's notes as the chords they struck, in time order. */
export function chordStrikes<T extends PlayedNote>(
  played: readonly T[],
  { tempo, spread = strikeSpreadTicks(tempo), complete }: StrikeOptions,
): ChordStrike<T>[] {
  const notes = [...played].sort((a, b) => a.onset - b.onset);
  const presses: Press<T>[] = notes.map((note, i) => {
    const again = notes.find((n, j) => j > i && n.midi === note.midi);
    const own = note.duration > 0 ? note.onset + note.duration : Infinity;
    return { note, release: Math.min(own, again?.onset ?? Infinity) };
  });

  let groups: Press<T>[][] = [];
  for (const press of presses) {
    const last = groups.at(-1);
    if (last && press.note.onset - last[0].note.onset < spread) {
      last.push(press);
    } else groups.push([press]);
  }
  if (complete) {
    groups = joinSlowRolls(groups, complete, SLOW_ROLL_SHARE * SIXTEENTH_TICKS);
  }

  const strikes: ChordStrike<T>[] = [];
  const before: Press<T>[] = [];
  for (const group of groups) {
    const keys = new Map<number, T>();
    for (const { note } of group) {
      if (!keys.has(note.midi)) keys.set(note.midi, note);
    }
    const onset = group[0].note.onset;
    // Complete once its last note is struck, and its spread past.
    const through = Math.max(onset + spread, group.at(-1)!.note.onset);
    const held = new Map<number, T>();
    for (const press of before) {
      if (press.release >= through && !keys.has(press.note.midi)) {
        held.set(press.note.midi, press.note);
      }
    }
    strikes.push({
      onset,
      notes: [...keys.values()],
      held: [...held.values()],
      end: Math.max(...group.map((press) => press.release)),
    });
    before.push(...group);
  }
  return strikes;
}
