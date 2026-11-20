// Theory lessons on keyboard: where their scales and chords sit, and how a
// run of them moves (owner, 2026-11-19).
//
// 1. A scale, or the chords going up it, starts in the octave from C3 (C3–B3),
//    so that it climbs without getting high.
// 2. A run moves one way the whole time: the scale steps up (or down) note by
//    note, and the chords on degrees 1–7 each sit on the next scale note up.
//    No chord drops an octave partway through. If a run ever had to come
//    down to stay under C6, it moves down as one piece.
//
// Melodies (the contour phrases, the blues lines) keep the register they had,
// an octave above the scale, so a phrase reads in the treble as before.

/** C3: the bottom of the octave a Theory lesson's tonic sits in. */
export const THEORY_TONIC_LOW = 48;

/** C6: no note of a run of chords goes above it. */
export const THEORY_CHORD_CEILING = 84;

/** A lesson's melodies sit this far above its scale and chords. */
export const THEORY_MELODY_OCTAVE = 12;

const DEFAULT_STEPS = [0, 2, 4, 5, 7, 9, 11, 12];

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

/** The lesson's tonic, C3–B3, for a key's semitone above C. */
export const theoryTonicMidi = (semitone: number): number =>
  THEORY_TONIC_LOW + pitchClass(Math.round(semitone));

/**
 * The scale from the tonic up to its octave, each note above the last. Steps
 * that repeat or come out of order are cleaned up, and the tonic and octave
 * are always there.
 */
export function theoryScaleMidis(
  tonicMidi: number,
  steps?: readonly number[],
): number[] {
  if (!steps || steps.length === 0) {
    return DEFAULT_STEPS.map((step) => tonicMidi + step);
  }
  const unique = new Set<number>();
  steps.forEach((step) => {
    if (typeof step === 'number' && Number.isFinite(step)) {
      unique.add(Math.round(step));
    }
  });
  unique.add(0);
  if (![...unique].some((step) => step >= 12)) unique.add(12);
  return [...unique].sort((a, b) => a - b).map((step) => tonicMidi + step);
}

/**
 * A chord's notes in close root position on `root`: each note the next one
 * up with its pitch class. Null when the chord lacks that root.
 */
export function voiceOnRoot(
  root: number,
  notes: readonly number[],
): number[] | null {
  const intervals = [...new Set(notes.map((note) => pitchClass(note - root)))];
  if (!intervals.includes(0)) return null;
  return intervals.sort((a, b) => a - b).map((interval) => root + interval);
}

/**
 * Chords moved together, by whole octaves, until none is above the ceiling.
 * One shift for all of them, so that they keep their order.
 */
export function inChordRegister(
  chords: readonly (readonly number[])[],
  ceiling = THEORY_CHORD_CEILING,
): number[][] {
  const notes = chords.flat();
  const top = notes.length ? Math.max(...notes) : -Infinity;
  const shift = top > ceiling ? -12 * Math.ceil((top - ceiling) / 12) : 0;
  return chords.map((chord) => chord.map((note) => note + shift));
}

/**
 * The scale's chord on every degree, stacked in thirds (`size` notes), each in
 * root position on its own scale note: degree 1 on the tonic, degree 2 on the
 * next note up, and so on to 7. The chords climb with the scale.
 *
 * `given` are chords for the same degrees from elsewhere (the API's): they
 * decide which notes a chord has, and the ladder decides where they go. One
 * that's missing, or isn't built on its degree, is stacked from the scale.
 */
export function diatonicChordLadder(
  scale: readonly number[],
  size: number,
  given: readonly (readonly number[] | undefined)[] = [],
): number[][] {
  const seven = scale.slice(0, 7);
  if (seven.length < 7) return [];
  const at = (step: number) => seven[step % 7] + 12 * Math.floor(step / 7);
  const chords = seven.map((_, degree) => {
    const stacked = Array.from({ length: size }, (_, k) => at(degree + 2 * k));
    const notes = given[degree];
    const fromGiven =
      notes && notes.length > 0 ? voiceOnRoot(stacked[0], notes) : null;
    return fromGiven ?? stacked;
  });
  return inChordRegister(chords);
}
