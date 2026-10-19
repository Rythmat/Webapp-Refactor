/**
 * A Music Literacy step's key and colour, by the house colour rule from the
 * first lesson on: a minor key wears its relative major's colour (C minor is
 * E♭'s purple), so the circle's highlight moves round the ring the moment a
 * figure flats its 3. The owner wants students used to the colour coding
 * early.
 */

import type {
  LiteracyFigure,
  LiteracyStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { responseOf, tonicMidi } from './literacy';

export type LiteracyMode = 'major' | 'minor';

const uses = (figure: LiteracyFigure, degree: string) =>
  figure.notes.some((note) => note.degree === degree);

/**
 * Minor when the step's figure (the call or the response) uses ♭3, major when
 * it uses 3, and otherwise the lesson's own mode: a figure of 1s and 5s
 * belongs to whichever key it's in.
 */
export function stepMode(
  lesson: Pick<MusicLiteracyLesson, 'key'>,
  step: LiteracyStep,
): LiteracyMode {
  const figures = [step.call, responseOf(step)];
  if (figures.some((figure) => uses(figure, 'b3'))) return 'minor';
  if (figures.some((figure) => uses(figure, '3'))) return 'major';
  return lesson.key.mode;
}

/** Pitch class of the lesson's 1 (C = 0). */
export function tonicPitchClass(
  lesson: Pick<MusicLiteracyLesson, 'key'>,
): number {
  return tonicMidi(lesson.key.tonic) % 12;
}

/** The step's colour (KEY_OF_COLORS): C major's red, C minor's E♭ purple. */
export function stepKeyColor(
  lesson: Pick<MusicLiteracyLesson, 'key'>,
  step: LiteracyStep,
): string {
  return colorForKeyMode(
    lesson.key.tonic,
    stepMode(lesson, step) === 'minor' ? 'aeolian' : 'ionian',
  );
}
