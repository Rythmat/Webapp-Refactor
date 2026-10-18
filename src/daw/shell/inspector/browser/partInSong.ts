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
  partTicks,
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

/** The pitch classes of `key`'s scale. */
function scaleOf(key: SongKey): Set<number> | null {
  const intervals = ALL_MODES[key.mode];
  return intervals
    ? new Set(intervals.map((i: number) => pc(i + key.rootPc)))
    : null;
}

/**
 * How `part` moves into `song` (none without a song key), read from the two
 * keys, never from the notes (a sparse bass line fits almost any move, and
 * parts written together must move together): the move that puts the most
 * of the part's scale on the song's, ties to the tonic's move and then the
 * smaller. A part already in the song's key stays; one in the song's mode
 * moves tonic to tonic; a D dorian part in C major stays D dorian. `fits`
 * says whether its notes then sit on the song's scale. Cached per part and
 * key.
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
  const songScale = scaleOf(song);
  const shared = (s: number) => {
    const own = scaleOf({
      rootPc: pc(part.key.tonic + s),
      mode: part.key.mode,
    });
    if (!own || !songScale) return 0;
    let n = 0;
    for (const p of own) if (songScale.has(p)) n++;
    return n;
  };
  // The tonic's move first, then the smaller moves: the first best wins.
  const order = [
    tonicShift,
    ...[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
      .filter((s) => s !== tonicShift)
      .sort((a, b) => Math.abs(a) - Math.abs(b) || b - a),
  ];
  let shift = tonicShift;
  let best = -1;
  for (const s of order) {
    const n = shared(s);
    if (n > best) {
      best = n;
      shift = s;
    }
  }
  const move: PartMove = {
    shift,
    key: { tonic: pc(part.key.tonic + shift), mode: part.key.mode },
    fits: fitAt(part.notes, shift, song) >= SONG_SCALE_FIT,
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
  // The written tick swings, then the played feel goes on top; nothing
  // sounds past the part's last bar (a few parts hold a stray note there).
  const end = partTicks(part);
  return moved.notes.flatMap((n) => {
    const startTick = Math.max(
      0,
      swingOnset(n.tick, part.swing) + (playedTick(n) - n.tick),
    );
    if (startTick >= end) return [];
    return [
      {
        note: n.midi,
        velocity: n.velocity,
        startTick,
        durationTicks: Math.max(1, Math.min(n.duration, end - startTick)),
        channel: 0,
      },
    ];
  });
}
