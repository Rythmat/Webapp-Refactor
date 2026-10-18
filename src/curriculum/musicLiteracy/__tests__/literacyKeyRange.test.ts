import { describe, expect, it } from 'vitest';
import {
  isEchoStep,
  isMelodicEcho,
  type LiteracyStep,
  type LiteracyTonic,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import {
  PART2_FIXTURE,
  part2Step,
} from '@/curriculum/engine/musicLiteracy/__fixtures__/part2Fixture';
import {
  CIRCLE_OF_FIFTHS,
  emptyChoices,
  withMode,
  withTonic,
} from '@/curriculum/engine/musicLiteracy/choices';
import { stepNotes } from '@/curriculum/engine/musicLiteracy/literacy';
import {
  CHORD_KEY_RANGE,
  literacyBaseRange,
  literacyKeyRange,
  MELODY_KEY_RANGE,
} from '../literacyKeyRange';

/**
 * The lesson keyboard: two octaves, 25 keys, where the step's notes are. A
 * melody sits in the treble staff, so C4–C6; chords keep their register,
 * C3–C5. Either widens just enough (to a white key) for a note past it.
 */

const fiveSixFive: LiteracyStep = {
  tag: 'five-six-five',
  title: '5-6-5',
  call: {
    bars: 1,
    notes: [
      { tick: 0, duration: 480, degree: '5' },
      { tick: 480, duration: 480, degree: '6' },
      { tick: 960, duration: 480, degree: '5' },
    ],
  },
};
const lesson: MusicLiteracyLesson = {
  ...PART2_FIXTURE,
  steps: [...PART2_FIXTURE.steps, fiveSixFive],
};

const inKey = (tonic: LiteracyTonic, mode: 'major' | 'minor') =>
  withMode(withTonic(emptyChoices(), tonic), mode);

const rangeOf = (
  step: LiteracyStep,
  tonic: LiteracyTonic,
  mode: 'major' | 'minor' = 'major',
) => {
  const notes = stepNotes(lesson, step, inKey(tonic, mode));
  return literacyKeyRange(
    [...notes.words, ...notes.call, ...notes.response].map((n) => n.midi),
    notes.chords ? 'chords' : 'melody',
  );
};

describe('the lesson keyboard', () => {
  it('is two octaves: C4–C6 for a melody, C3–C5 for chords', () => {
    expect(MELODY_KEY_RANGE).toEqual({ low: 60, high: 84 });
    expect(CHORD_KEY_RANGE).toEqual({ low: 48, high: 72 });
    expect(literacyBaseRange('melody')).toBe(MELODY_KEY_RANGE);
    expect(literacyBaseRange('chords')).toBe(CHORD_KEY_RANGE);
    expect(literacyKeyRange([60, 72, 84])).toBe(MELODY_KEY_RANGE);
    expect(literacyKeyRange([48, 60, 72], 'chords')).toBe(CHORD_KEY_RANGE);
  });

  it('shows every melody of every key on C4–C6, the 6 above the upper 5 too', () => {
    const melodies = lesson.steps.filter(
      (step) => isEchoStep(step) && isMelodicEcho(step),
    );
    for (const mode of ['major', 'minor'] as const)
      for (const tonic of CIRCLE_OF_FIFTHS)
        for (const step of melodies)
          expect(rangeOf(step, tonic, mode), `${step.tag} in ${tonic}`).toBe(
            MELODY_KEY_RANGE,
          );
    // The figure is placed, not its 1: B major's 5-6-5 is F♯4–G♯4.
    const inB = stepNotes(lesson, fiveSixFive, inKey('B', 'major'));
    expect(inB.call.map((n) => n.midi)).toEqual([66, 68, 66]);
  });

  it('shows the chords on C3–C5, as they always were', () => {
    for (const tonic of CIRCLE_OF_FIFTHS)
      expect(rangeOf(part2Step('the-1-chord'), tonic), tonic).toBe(
        CHORD_KEY_RANGE,
      );
  });

  it('widens just enough for a note past its two octaves, ending on a white key', () => {
    expect(literacyKeyRange([60, 86])).toEqual({ low: 60, high: 86 });
    expect(literacyKeyRange([58, 70])).toEqual({ low: 57, high: 84 });
    expect(literacyKeyRange([46, 60], 'chords')).toEqual({
      low: 45,
      high: 72,
    });
  });
});
