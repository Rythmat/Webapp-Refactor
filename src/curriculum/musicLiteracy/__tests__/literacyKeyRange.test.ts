import { describe, expect, it } from 'vitest';
import type {
  LiteracyStep,
  LiteracyTonic,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { PART2_FIXTURE } from '@/curriculum/engine/musicLiteracy/__fixtures__/part2Fixture';
import {
  emptyChoices,
  withMode,
  withTonic,
} from '@/curriculum/engine/musicLiteracy/choices';
import { stepNotes } from '@/curriculum/engine/musicLiteracy/literacy';
import { LITERACY_KEY_RANGE, literacyKeyRange } from '../literacyKeyRange';

/**
 * The lesson keyboard: 25 keys, C3–C5, widened just enough (to a white
 * key) when a step reaches past it, as Part 2's 6 above the upper 5 does in
 * E and F.
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

const rangeIn = (tonic: LiteracyTonic, mode: 'major' | 'minor' = 'major') => {
  const notes = stepNotes(
    lesson,
    fiveSixFive,
    withMode(withTonic(emptyChoices(), tonic), mode),
  );
  return literacyKeyRange(
    [...notes.call, ...notes.response].map((n) => n.midi),
  );
};

describe('the lesson keyboard', () => {
  it('is 25 keys, C3–C5, while every note fits', () => {
    expect(LITERACY_KEY_RANGE).toEqual({ low: 48, high: 72 });
    expect(literacyKeyRange([48, 60, 72])).toBe(LITERACY_KEY_RANGE);
    expect(rangeIn('C')).toBe(LITERACY_KEY_RANGE);
    expect(rangeIn('Eb')).toBe(LITERACY_KEY_RANGE); // its 6 is C5
  });

  it('widens just enough for the 6 above the upper 5, ending on a white key', () => {
    // E major's 6 is C♯5: up to D5.
    expect(rangeIn('E')).toEqual({ low: 48, high: 74 });
    // F major's 6 is D5.
    expect(rangeIn('F')).toEqual({ low: 48, high: 74 });
    // F minor's ♭6 is D♭5: up to D5 too.
    expect(rangeIn('F', 'minor')).toEqual({ low: 48, high: 74 });
  });

  it('widens below C3 too, if a step ever goes there', () => {
    expect(literacyKeyRange([46, 60])).toEqual({ low: 45, high: 72 });
  });
});
