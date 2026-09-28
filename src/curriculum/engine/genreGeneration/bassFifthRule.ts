/**
 * bassFifthRule.ts — Which note a bass line may play as "the 5".
 *
 * THE RULE
 * A bass line's 5 is the fifth of the CHORD, never a fifth measured up from
 * the note the bass happens to be sitting on. Under a slash chord those are
 * two different notes, and only one of them is in the harmony.
 *
 *   Bb/D — the chord is Bb, the bass note is D. The bass line plays D, and its
 *   5 is F, the fifth of Bb. It is never A, the fifth above D. A is not in
 *   the chord: it turns Bb major into something else underneath the band.
 *
 * When the chord has no fifth to give — an altered dominant, where the fifth is
 * whatever the voicing says it is — the bass repeats its own note instead.
 * Repeating the bass note is always allowed; inventing a fifth is not.
 *
 * WHY IT LIVES IN ITS OWN MODULE
 * `root + 7` is the kind of thing every bass generator writes for itself, and
 * it is right up until a chord is inverted, which is exactly when nobody is
 * looking. Stated once here, the generators ask for the note instead of
 * computing it, and a new one has something to call.
 *
 * WHAT IT DOES NOT DECIDE
 * Whether the line plays a 5 at all — that is the pattern's business, per genre
 * and level. This only answers which note the 5 is, and where it sits.
 */

/**
 * C3. A bass line stays under this, so the 5 drops an octave rather than
 * climbing out of the bass register. Matches the octave cap in
 * backingPatterns.ts.
 */
export const BASS_LINE_CEILING = 48;

/**
 * What the rule needs to know about the chord sounding under the bass line.
 *
 * Note what is NOT here: where the bass note is. The rule reads the chord, and
 * the bass note comes in separately as the note it actually is — a bass line
 * that has walked off the root is still under the same chord.
 */
export interface BassFifthChord {
  /** Pitch class of the chord's real root — Bb in Bb/D, not the D. */
  rootPc: number;
  /**
   * The chord's fifth in semitones above its root: 7 normally, 6 on a
   * diminished or ♭5 chord, 8 on an augmented one. Absent when the chord has
   * no fifth of its own, which is when the bass repeats its note instead.
   */
  fifth?: number;
}

const pc = (n: number) => ((n % 12) + 12) % 12;

/**
 * The pitch class a bass line may play as this chord's 5, or null when the
 * chord has none and the bass should repeat its own note.
 */
export function bassFifthPc(chord: BassFifthChord): number | null {
  return chord.fifth === undefined ? null : pc(chord.rootPc + chord.fifth);
}

/**
 * Where that 5 goes, given the note the bass line is playing.
 *
 * The nearest one at or above that note, so the line keeps the shape it has
 * always had: under a plain chord this is the fifth above the root, exactly as
 * `root + 7` used to give. Under Bb/D it is F above the D, three semitones up
 * rather than seven.
 *
 * Returns `bassMidi` itself when the chord has no fifth, or when its fifth IS
 * the note the bass is already on (Bb/F) — in both cases the rule's answer is
 * to repeat the bass note.
 */
export function bassFifthMidi(
  chord: BassFifthChord,
  bassMidi: number,
  ceiling: number = BASS_LINE_CEILING,
): number {
  const fifth = bassFifthPc(chord);
  if (fifth === null) return bassMidi;
  const note = bassMidi + pc(fifth - bassMidi);
  return note > ceiling ? note - 12 : note;
}
