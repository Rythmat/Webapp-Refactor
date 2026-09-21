import type { NotationNoteInput, StaffId } from './types';

// ── Which staff each note is written on ────────────────────────────────────
// A chord of four notes or fewer inside a hand's reach is one hand playing, so
// it is written in one clef — never straddling the two. Only wider voicings
// (explicit two-hand parts) are split, with the bass notes going to the bass
// clef. Notes tagged with a hand always follow their tag.

/** Most notes one hand plays as a chord. */
const MAX_ONE_HAND_NOTES = 4;
/** A hand reaches about a tenth; wider means two hands. */
const MAX_HAND_SPAN = 14;
/** A gap this wide inside a voicing is where the hands part. */
const MIN_HAND_GAP = 7;
/** Chords centred this near the split point stay where the last one went. */
const HYSTERESIS = 3;
/** Notes closer together than this sound as one chord. */
const CHORD_WINDOW = 30;
/** Held against short: layered parts, not one hand's chord. */
const MAX_DURATION_RATIO = 2;

/** True when the notes last long enough alike to be one hand's chord. */
function oneChord(durations: number[]): boolean {
  const longest = Math.max(...durations);
  const shortest = Math.min(...durations);
  return shortest > 0 && longest / shortest <= MAX_DURATION_RATIO;
}

function oneStaff(
  mean: number,
  splitMidi: number,
  previous: StaffId | null,
): StaffId {
  if (previous && Math.abs(mean - splitMidi) <= HYSTERESIS) return previous;
  return mean >= splitMidi ? 'treble' : 'bass';
}

/**
 * Where the hands part in a two-hand voicing: the widest gap, when it is wide
 * enough to be one, else the split point.
 */
function handBoundary(sorted: number[], splitMidi: number): number {
  let widest = 0;
  let boundary = splitMidi;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > widest) {
      widest = gap;
      boundary = (sorted[i] + sorted[i - 1]) / 2;
    }
  }
  return widest >= MIN_HAND_GAP ? boundary : splitMidi;
}

/** Staff per note id. */
export function assignStaves(
  notes: ReadonlyArray<NotationNoteInput>,
  splitMidi: number,
): Map<string, StaffId> {
  const staves = new Map<string, StaffId>();
  const sorted = [...notes].sort((a, b) => a.startTick - b.startTick);
  let previous: StaffId | null = null;
  let index = 0;

  while (index < sorted.length) {
    const start = sorted[index].startTick;
    const chord: NotationNoteInput[] = [];
    while (
      index < sorted.length &&
      sorted[index].startTick - start <= CHORD_WINDOW
    ) {
      chord.push(sorted[index]);
      index++;
    }

    const free: NotationNoteInput[] = [];
    for (const note of chord) {
      if (note.staff) staves.set(note.id, note.staff);
      else free.push(note);
    }
    if (free.length === 0) continue;

    const pitches = free.map((n) => n.midi).sort((a, b) => a - b);
    const span = pitches[pitches.length - 1] - pitches[0];
    if (
      free.length <= MAX_ONE_HAND_NOTES &&
      span <= MAX_HAND_SPAN &&
      oneChord(free.map((n) => n.durationTicks))
    ) {
      const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
      const staff = oneStaff(mean, splitMidi, previous);
      previous = staff;
      for (const note of free) staves.set(note.id, staff);
    } else {
      // Two hands: the bass notes drop to the bass clef.
      const boundary = handBoundary(pitches, splitMidi);
      for (const note of free) {
        staves.set(note.id, note.midi >= boundary ? 'treble' : 'bass');
      }
    }
  }
  return staves;
}
