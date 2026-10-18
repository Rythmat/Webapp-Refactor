/**
 * partInSong.ts — a Library part as the song will play it (milestone 2.14).
 *
 * A part is written in a key of its own. Added to a song with a key, it
 * moves into that key: by the move that keeps its tonic on the song's when
 * its notes then sit on the song's scale (a G major riff in a C major song
 * plays in C), and otherwise by the nearest move whose notes fit best. So a
 * D dorian vamp lands as D dorian in a C major song (ii7–V7 there), not as
 * C dorian against the song's chord lane, and a major part in a minor song
 * lands on its relative major. The old Parts list moved every part tonic to
 * tonic, which put minor and modal parts in the song's parallel mode.
 *
 * Its notes come as a clip's events: moved (transposePart keeps a bass or a
 * guitar in its register), with the part's swing and played feel in the
 * ticks, as a designed groove's are.
 *
 * No React and no store here.
 */

import { ALL_MODES, type MidiNoteEvent } from '@prism/engine';
import {
  playedTick,
  shiftBetween,
  transposePart,
  type InstrumentPart,
  type PartKey,
} from '@/curriculum/engine/parts/part';
import { swingOnset } from '@/curriculum/engine/genreGeneration/swing';

/** The key a part moves into: the song's (or one read from its notes). */
export interface SongKey {
  rootPc: number;
  mode: string;
}

/** The share of a part's weight on the song's scale that counts as fitting. */
export const SONG_SCALE_FIT = 0.9;

type WeighedNote = { midi: number; duration: number; velocity: number };

const pc = (n: number) => ((n % 12) + 12) % 12;

/**
 * How much of the notes' weight (duration × velocity, as the clip key
 * reads it) sits on `key`'s scale, 0–1; 0 with no notes or an unknown mode.
 */
export function scaleFit(notes: readonly WeighedNote[], key: SongKey): number {
  const intervals = ALL_MODES[key.mode];
  if (!intervals || notes.length === 0) return 0;
  const scale = new Set(intervals.map((i: number) => pc(i + key.rootPc)));
  let total = 0;
  let on = 0;
  for (const n of notes) {
    const w = Math.max(1, n.duration) * (n.velocity / 127);
    total += w;
    if (scale.has(pc(n.midi))) on += w;
  }
  return total > 0 ? on / total : 0;
}

/** The fit of `notes` moved by `shift` semitones. */
const fitAt = (notes: readonly WeighedNote[], shift: number, key: SongKey) =>
  scaleFit(
    notes.map((n) => ({ ...n, midi: n.midi + shift })),
    key,
  );

export interface PartMove {
  /** Semitones, −6…+5. */
  shift: number;
  /** The key the part lands in: its tonic moved, its mode kept. */
  key: PartKey;
  /** Whether the moved notes sit on the song's scale (always, with no key). */
  fits: boolean;
}

const moves = new WeakMap<InstrumentPart, Map<string, PartMove>>();

/**
 * How `part` moves into `song` (none without a song key): the tonic's move
 * when it fits, else the best-fitting move, ties to the smaller move and then
 * to the tonic's. Cached per part and key.
 */
export function moveForSong(
  part: InstrumentPart,
  song: SongKey | null,
): PartMove {
  if (!song) return { shift: 0, key: part.key, fits: true };
  const cacheKey = `${song.rootPc}:${song.mode}`;
  const kept = moves.get(part)?.get(cacheKey);
  if (kept) return kept;

  const tonicShift = shiftBetween(part.key.tonic, song.rootPc);
  let shift = tonicShift;
  let fit = fitAt(part.notes, tonicShift, song);
  if (fit < SONG_SCALE_FIT) {
    for (let s = -6; s <= 5; s++) {
      const f = fitAt(part.notes, s, song);
      const better =
        f > fit + 1e-9 ||
        (Math.abs(f - fit) <= 1e-9 &&
          (Math.abs(s) < Math.abs(shift) ||
            (Math.abs(s) === Math.abs(shift) && s === tonicShift)));
      if (better) {
        fit = f;
        shift = s;
      }
    }
  }
  const move: PartMove = {
    shift,
    key: { tonic: pc(part.key.tonic + shift), mode: part.key.mode },
    fits: fit >= SONG_SCALE_FIT,
  };
  const forPart = moves.get(part) ?? new Map<string, PartMove>();
  forPart.set(cacheKey, move);
  moves.set(part, forPart);
  return move;
}

/**
 * The part's notes as a clip's events after moving by `shift`: in register,
 * with its swing and played feel in the ticks, never before the clip's
 * start.
 */
export function preparedEvents(
  part: InstrumentPart,
  shift: number,
): MidiNoteEvent[] {
  const moved =
    shift === 0 ? part : transposePart(part, pc(part.key.tonic + shift));
  return moved.notes.map((n) => ({
    note: n.midi,
    velocity: n.velocity,
    startTick: Math.max(0, swingOnset(playedTick(n), part.swing)),
    durationTicks: n.duration,
    channel: 0,
  }));
}
