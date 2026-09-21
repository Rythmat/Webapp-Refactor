// ── The 4 over a major chord ───────────────────────────────────────────────
//
// The 4th above a major chord sits a semitone above its major 3rd, and left
// sitting there it sours the chord. It is usable as motion, not as a resting
// place, so:
//
//   Over a chord with a major 3rd, the 4 may be used only when the next note
//   is that major 3.
//
// The same clash is what bars the ♭3 over a major chord — except as an
// ornament. A ♭3 (or a 2) may briefly precede the major 3: the grace note and
// the hammer-on, the blues and gospel move into the 3. "Briefly" means a 16th
// or shorter; anything longer is heard as a note in its own right, and a ♭3
// heard against a major 3 is the clash the rule exists to prevent.
//
// The 2 needs no permission — over a major chord it is the 9, a colour tone —
// so only the 4 and the ♭3 are constrained here.
//
// Nothing about this is specific to one generator: Learn's mode lessons,
// Learn's genre lessons and Studio's practice tracks all draw melodies over
// chords, so the rule lives here and they each apply it to their own notes.

/** Semitones above the chord root. */
const PERFECT_FOURTH = 5;
const MINOR_THIRD = 3;
const MAJOR_THIRD = 4;

/** A 16th at 480 PPQ — the longest a note can be and still ornament. */
export const ORNAMENT_MAX_TICKS = 120;

/** A melody note, as every generator can describe one. */
export interface RuleNote {
  midi: number;
  startTick: number;
  durationTicks: number;
}

/** The chord sounding under a stretch of the melody. */
export interface ChordWindow {
  /** Pitch class of the chord root, 0–11. */
  rootPc: number;
  /** Whether the chord has a major 3rd — the only chords this rule governs. */
  majorThird: boolean;
  /** Ticks the chord covers. `endTick` is exclusive. */
  startTick: number;
  endTick: number;
}

const pc = (n: number) => ((n % 12) + 12) % 12;

/**
 * Whether a chord's intervals contain a major 3rd and no minor 3rd.
 *
 * Covers the major triad, maj7, 6 and dominant 7 alike — the clash follows the
 * 3rd, not the chord's name. A sus4 has no 3rd at all, so the rule leaves it
 * alone, which is right: there the 4 is the chord.
 */
export function hasMajorThird(intervals: readonly number[]): boolean {
  const degrees = new Set(intervals.map(pc));
  return degrees.has(MAJOR_THIRD) && !degrees.has(MINOR_THIRD);
}

/** The chord sounding when a note begins, if any. */
function chordUnder(
  note: RuleNote,
  chords: readonly ChordWindow[],
): ChordWindow | undefined {
  return chords.find(
    (chord) =>
      note.startTick >= chord.startTick && note.startTick < chord.endTick,
  );
}

/**
 * Why a note breaks the rule, or null when it does not.
 *
 * `next` is the note that follows in the melody; a note with nothing after it
 * resolves to nothing, so an unresolved 4 at the end of a phrase is a
 * violation like any other.
 */
export function noteViolation(
  note: RuleNote,
  next: RuleNote | undefined,
  chords: readonly ChordWindow[],
): 'unresolved-fourth' | 'clashing-minor-third' | null {
  const chord = chordUnder(note, chords);
  if (!chord || !chord.majorThird) return null;

  const degree = pc(note.midi - chord.rootPc);
  if (degree !== PERFECT_FOURTH && degree !== MINOR_THIRD) return null;

  const resolves =
    next !== undefined && pc(next.midi - chord.rootPc) === MAJOR_THIRD;

  if (degree === PERFECT_FOURTH) {
    return resolves ? null : 'unresolved-fourth';
  }
  // A ♭3 is allowed only as the brief ornament into the 3.
  const brief = note.durationTicks <= ORNAMENT_MAX_TICKS;
  return resolves && brief ? null : 'clashing-minor-third';
}

/** Indices of the notes that break the rule, in order. */
export function majorChordViolations(
  notes: readonly RuleNote[],
  chords: readonly ChordWindow[],
): number[] {
  const offending: number[] = [];
  notes.forEach((note, i) => {
    if (noteViolation(note, notes[i + 1], chords)) offending.push(i);
  });
  return offending;
}

/** True when every note obeys the rule. */
export function obeysMajorChordRule(
  notes: readonly RuleNote[],
  chords: readonly ChordWindow[],
): boolean {
  return notes.every((note, i) => !noteViolation(note, notes[i + 1], chords));
}

/**
 * Move offending notes onto the major 3 of the chord they sound over — the
 * note the 4 wanted to resolve to, and the note the ♭3 was leaning on. The
 * nearest 3 is chosen, so a 4 falls a semitone and a ♭3 rises one, rather than
 * leaping an octave to make the point.
 *
 * A last resort: a melody that never needed repairing keeps its own shape, so
 * callers should prefer drawing a phrase that already obeys the rule.
 */
export function repairMajorChordRule<T extends RuleNote>(
  notes: readonly T[],
  chords: readonly ChordWindow[],
): T[] {
  const repaired = notes.map((note) => ({ ...note }));
  for (let i = 0; i < repaired.length; i += 1) {
    if (!noteViolation(repaired[i], repaired[i + 1], chords)) continue;
    const chord = chordUnder(repaired[i], chords);
    if (!chord) continue;
    repaired[i] = {
      ...repaired[i],
      midi: nearestWithPitchClass(
        repaired[i].midi,
        pc(chord.rootPc + MAJOR_THIRD),
      ),
    };
  }
  return repaired;
}

/** Nearest note of a pitch class, ties resolving downward. */
function nearestWithPitchClass(midi: number, pitchClass: number): number {
  for (let distance = 0; distance <= 6; distance += 1) {
    if (pc(midi - distance) === pitchClass) return midi - distance;
    if (pc(midi + distance) === pitchClass) return midi + distance;
  }
  return midi;
}

/** One chord for a whole melody — what a mode lesson has. */
export function singleChordWindow(
  rootPc: number,
  majorThird: boolean,
): ChordWindow[] {
  return [
    {
      rootPc: pc(rootPc),
      majorThird,
      startTick: Number.NEGATIVE_INFINITY,
      endTick: Number.POSITIVE_INFINITY,
    },
  ];
}
