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
  LOWER_KEY_RANGE,
  UPPER_KEY_RANGE,
  literacyKeyRange,
} from '../literacyKeyRange';

/**
 * The lesson keyboard: two octaves, 25 keys from a C, where the step's
 * notes are placed. Melodies and chords sit in the treble staff, so most
 * steps show C4–C6; notes all lower show C3–C5; notes past either widen the
 * nearer just enough (to a white key).
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

const midisOf = (
  step: LiteracyStep,
  tonic: LiteracyTonic,
  mode: 'major' | 'minor' = 'major',
) => {
  const notes = stepNotes(lesson, step, inKey(tonic, mode));
  return [...notes.words, ...notes.call, ...notes.response].map((n) => n.midi);
};
const rangeOf = (
  step: LiteracyStep,
  tonic: LiteracyTonic,
  mode: 'major' | 'minor' = 'major',
) => literacyKeyRange(midisOf(step, tonic, mode));

describe('the lesson keyboard', () => {
  it('is two octaves from a C: C4–C6 for most, C3–C5 for notes all lower', () => {
    expect(UPPER_KEY_RANGE).toEqual({ low: 60, high: 84 });
    expect(LOWER_KEY_RANGE).toEqual({ low: 48, high: 72 });
    expect(literacyKeyRange([])).toBe(UPPER_KEY_RANGE);
    expect(literacyKeyRange([60, 72, 84])).toBe(UPPER_KEY_RANGE);
    // In both: the upper.
    expect(literacyKeyRange([60, 64, 67])).toBe(UPPER_KEY_RANGE);
    expect(literacyKeyRange([48, 60, 72])).toBe(LOWER_KEY_RANGE);
    expect(literacyKeyRange([58, 70])).toBe(LOWER_KEY_RANGE);
  });

  it('shows every melody of every key on C4–C6, the 6 above the upper 5 too', () => {
    const melodies = lesson.steps.filter(
      (step) => isEchoStep(step) && isMelodicEcho(step),
    );
    for (const mode of ['major', 'minor'] as const)
      for (const tonic of CIRCLE_OF_FIFTHS)
        for (const step of melodies)
          expect(rangeOf(step, tonic, mode), `${step.tag} in ${tonic}`).toBe(
            UPPER_KEY_RANGE,
          );
    // The figure is placed, not its 1: B major's 5-6-5 is F♯4–G♯4.
    const inB = stepNotes(lesson, fiveSixFive, inKey('B', 'major'));
    expect(inB.call.map((n) => n.midi)).toEqual([66, 68, 66]);
  });

  it('follows a chord step’s chords to where they are voiced', () => {
    const chordSteps = lesson.steps.filter(
      (step) => isEchoStep(step) && !isMelodicEcho(step),
    );
    for (const mode of ['major', 'minor'] as const)
      for (const tonic of CIRCLE_OF_FIFTHS)
        for (const step of chordSteps) {
          const midis = midisOf(step, tonic, mode);
          const range = rangeOf(step, tonic, mode);
          const where = `${step.tag} in ${tonic} ${mode}`;
          // Every note on it, on one of the two octaves when they hold it.
          expect(Math.min(...midis), where).toBeGreaterThanOrEqual(range.low);
          expect(Math.max(...midis), where).toBeLessThanOrEqual(range.high);
          const holds = (r: typeof range) =>
            Math.min(...midis) >= r.low && Math.max(...midis) <= r.high;
          if (holds(UPPER_KEY_RANGE))
            expect(range, where).toBe(UPPER_KEY_RANGE);
          else if (holds(LOWER_KEY_RANGE))
            expect(range, where).toBe(LOWER_KEY_RANGE);
        }
    // C's 1 4: C4 E4 G4, then F4 A4 C5, on C4–C6.
    expect(rangeOf(part2Step('the-1-chord'), 'C')).toBe(UPPER_KEY_RANGE);
    // B's: B3 D♯4 F♯4, then E4 G♯4 B4, all on C3–C5.
    expect(midisOf(part2Step('the-1-chord'), 'B').slice(0, 3)).toEqual([
      59, 63, 66,
    ]);
    expect(rangeOf(part2Step('the-1-chord'), 'B')).toBe(LOWER_KEY_RANGE);
  });

  it('widens the nearer two octaves just enough for a note past them, ending on a white key', () => {
    expect(literacyKeyRange([60, 86])).toEqual({ low: 60, high: 86 });
    // B3 to G5: C4–C6 and a key below it.
    expect(literacyKeyRange([59, 64, 79])).toEqual({ low: 59, high: 84 });
    // B♭3 to C♯6: down to A3, up to D6.
    expect(literacyKeyRange([58, 85])).toEqual({ low: 57, high: 86 });
    expect(literacyKeyRange([46, 60])).toEqual({ low: 45, high: 72 });
  });
});
