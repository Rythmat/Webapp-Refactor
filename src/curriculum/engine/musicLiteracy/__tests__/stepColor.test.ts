import { describe, expect, it } from 'vitest';
import { KEY_OF_COLORS } from '@/constants/theme';
import { getLiveMusicLiteracy } from '../registry';
import { stepKeyColor, stepMode, tonicPitchClass } from '../stepColor';

const lesson = getLiveMusicLiteracy('music-literacy-part-1')!;
const step = (tag: string) => lesson.steps.find((s) => s.tag === tag)!;

describe('the house color rule, from the first lesson', () => {
  it('reads Part 1’s major steps in C’s red', () => {
    for (const tag of [
      'note-called-c',
      'add-the-3',
      'go-to-5',
      'major-triad',
    ]) {
      expect(stepMode(lesson, step(tag))).toBe('major');
      expect(stepKeyColor(lesson, step(tag))).toBe(KEY_OF_COLORS.C);
    }
  });

  it('makes a figure with ♭3 minor, in its relative major’s color (C minor: E♭)', () => {
    for (const tag of ['flat-the-3', 'minor-triad']) {
      expect(stepMode(lesson, step(tag))).toBe('minor');
      expect(stepKeyColor(lesson, step(tag))).toBe(KEY_OF_COLORS.Eb);
    }
  });

  it('goes by the figure, not the words', () => {
    // "A minor chord is 1 3 5 with a flatted 3": the words sing a natural 3,
    // the call flats it.
    const minorTriad = step('minor-triad');
    expect(minorTriad.words.notes.some((n) => n.degree === '3')).toBe(true);
    expect(stepMode(lesson, minorTriad)).toBe('minor');
  });

  it('leaves a figure of 1s and 5s in the lesson’s own mode', () => {
    const ones = step('go-to-5');
    expect(stepMode(lesson, ones)).toBe('major');
    const minorLesson = {
      key: { tonic: 'A' as const, mode: 'minor' as const },
    };
    expect(stepMode(minorLesson, ones)).toBe('minor');
    expect(stepKeyColor(minorLesson, ones)).toBe(KEY_OF_COLORS.C); // A minor is C's red
  });

  it('follows the response when it differs from the call', () => {
    const answeredMinor = {
      ...step('go-to-5'),
      response: {
        bars: 1,
        notes: [{ tick: 0, duration: 480, degree: 'b3' as const }],
      },
    };
    expect(stepMode(lesson, answeredMinor)).toBe('minor');
  });

  it('knows the 1’s pitch class', () => {
    expect(tonicPitchClass(lesson)).toBe(0);
    expect(tonicPitchClass({ key: { tonic: 'F#', mode: 'major' } })).toBe(6);
    expect(tonicPitchClass({ key: { tonic: 'Bb', mode: 'major' } })).toBe(10);
  });
});
