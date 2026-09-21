/**
 * handSplit.ts — When a part is two hands, and what that means for the staff.
 *
 * THE RULE
 * Anywhere the piano roll is split into LH and RH, the notation is a grand
 * staff. The two are the same fact shown two ways: a part written for two hands
 * has a left hand and a right hand whether you are reading lanes or clefs, and
 * showing the roll split while the staff is on a single clef means the student
 * is looking at two different descriptions of one piece of music.
 *
 * It follows that the clef choice is not the student's to make on those steps.
 * A one-hand part can be read in either clef — worth practising, which is why
 * the toggle exists — but a two-hand part has no single-clef reading, so the
 * toggle is disabled rather than silently ignored.
 *
 * WHAT COUNTS AS SPLIT
 * A note tagged `hand` is the authored signal: the step said which hand plays
 * it. Steps whose `instrument_config` gives both hands a role are split too,
 * even before their notes are tagged, which is why the lesson container passes
 * its own answer in as well.
 */

/** The staves a part is written on. */
export type NotationStaves = 'grand' | 'treble' | 'bass';

/** Whether any note names the hand that plays it. */
export function isHandSplit(notes: readonly { hand?: 'lh' | 'rh' }[]): boolean {
  return notes.some((note) => note.hand === 'lh' || note.hand === 'rh');
}

/**
 * The staves to draw on, given what the caller asked for and what the notes say.
 *
 * A hand-split part is always a grand staff; `preferred` only decides the clef
 * for single-hand parts, where either clef is a legitimate reading.
 */
export function resolveStaves(
  notes: readonly { hand?: 'lh' | 'rh' }[],
  preferred?: NotationStaves,
): NotationStaves | undefined {
  return isHandSplit(notes) ? 'grand' : preferred;
}
