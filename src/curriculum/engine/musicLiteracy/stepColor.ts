/**
 * A Music Literacy step's key and color, by the house color rule from the
 * first lesson on: a minor key wears its relative major's color (C minor is
 * E♭'s purple), so the circle's highlight moves round the ring the moment a
 * figure flats its 3. The owner wants students used to the color coding
 * early.
 *
 * Part 2's steps are in the key the student chose: pass their choices, and
 * the mode is theirs (or, for a step playing a saved progression, the mode
 * it was made in). Part 1's mode is read off its figures, as before.
 */

import {
  isEchoStep,
  isMelodicEcho,
  type LiteracyFigure,
  type LiteracyMode,
  type LiteracyStep,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { colorForKeyMode } from '@/lib/modeColorShift';
import type { LiteracyChoices } from './choices';
import { responseOf, stepKey } from './literacy';
import { tonicMidi } from './pitch';

export type { LiteracyMode };

/** What the color rule needs of a lesson: its key, and Part 2's settings. */
export type ColorLesson = Pick<MusicLiteracyLesson, 'key'> &
  Partial<Pick<MusicLiteracyLesson, 'keyChoice' | 'numbering' | 'steps'>>;

const uses = (figure: LiteracyFigure, degree: string) =>
  figure.notes.some((note) => note.degree === degree);

/** The lesson's mode as this step is played: the student's, in Part 2. */
const keyOf = (
  lesson: ColorLesson,
  step: LiteracyStep,
  choices?: LiteracyChoices | null,
) => stepKey({ steps: [], ...lesson }, step, choices);

/**
 * In Part 1 (chromatic numbering, the lesson's key): minor when the step's
 * figure (the call or the response) uses ♭3, major when it uses 3, and
 * otherwise the lesson's own mode, since a figure of 1s and 5s belongs to
 * whichever key it's in. In a scale-numbered lesson, or one whose key the
 * student picks, the mode is the key's: the student's choice.
 */
export function stepMode(
  lesson: ColorLesson,
  step: LiteracyStep,
  choices?: LiteracyChoices | null,
): LiteracyMode {
  const key = keyOf(lesson, step, choices);
  if (lesson.numbering === 'scale' || lesson.keyChoice === 'student') {
    return key.mode;
  }
  if (!isEchoStep(step)) return key.mode;
  if (isMelodicEcho(step)) {
    const figures = [step.call, responseOf(step)];
    if (figures.some((figure) => uses(figure, 'b3'))) return 'minor';
    if (figures.some((figure) => uses(figure, '3'))) return 'major';
  }
  return key.mode;
}

/** Pitch class of the 1 the step plays in (C = 0). */
export function tonicPitchClass(
  lesson: ColorLesson,
  step?: LiteracyStep,
  choices?: LiteracyChoices | null,
): number {
  const tonic = step
    ? keyOf(lesson, step, choices).tonic
    : lesson.keyChoice === 'student' && choices?.tonic
      ? choices.tonic
      : lesson.key.tonic;
  return tonicMidi(tonic) % 12;
}

/** The step's color (KEY_OF_COLORS): C major's red, C minor's E♭ purple. */
export function stepKeyColor(
  lesson: ColorLesson,
  step: LiteracyStep,
  choices?: LiteracyChoices | null,
): string {
  return colorForKeyMode(
    keyOf(lesson, step, choices).tonic,
    stepMode(lesson, step, choices) === 'minor' ? 'aeolian' : 'ionian',
  );
}
