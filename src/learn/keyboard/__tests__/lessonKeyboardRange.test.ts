import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LESSON_KEY_RANGE,
  followPlayedNote,
  includeTargets,
  keyBox,
  normalizeKeyRange,
  outOfRangeDirection,
  whiteKeysIn,
} from '../lessonKeyboardRange';

describe('lessonKeyboardRange', () => {
  it('defaults to 73 keys, E1–E7', () => {
    const { low, high } = DEFAULT_LESSON_KEY_RANGE;
    expect(high - low + 1).toBe(73);
    expect(whiteKeysIn(DEFAULT_LESSON_KEY_RANGE)).toHaveLength(43);
  });

  it('never starts or ends on a black key', () => {
    expect(normalizeKeyRange({ low: 37, high: 82 })).toEqual({
      low: 36,
      high: 83,
    });
    expect(normalizeKeyRange({ low: 84, high: 36 })).toEqual({
      low: 36,
      high: 84,
    });
  });

  describe('followPlayedNote', () => {
    const c2c7 = { low: 36, high: 96 };

    it('ignores notes inside the window', () => {
      expect(followPlayedNote(c2c7, 60, true)).toBeNull();
    });

    it('shifts a mapped keyboard by whole octaves (octave buttons)', () => {
      expect(followPlayedNote(c2c7, 100, true)).toEqual({ shift: 12 });
      expect(followPlayedNote(c2c7, 110, true)).toEqual({ shift: 24 });
      expect(followPlayedNote(c2c7, 30, true)).toEqual({ shift: -12 });
    });

    it('widens the unmapped default instead of shifting', () => {
      expect(followPlayedNote(DEFAULT_LESSON_KEY_RANGE, 21, false)).toEqual({
        grow: { low: 21, high: 100 },
      });
    });
  });

  it('says which way lesson notes leave the keyboard', () => {
    const c2c6 = { low: 36, high: 84 };
    expect(outOfRangeDirection(c2c6, [60, 72])).toBeNull();
    expect(outOfRangeDirection(c2c6, [60, 96])).toBe('above');
    expect(outOfRangeDirection(c2c6, [30, 60])).toBe('below');
    expect(outOfRangeDirection(c2c6, [30, 96])).toBe('both');
  });

  it('places keys the way the fill keyboard draws them', () => {
    const c4c5 = { low: 60, high: 72 }; // 8 white keys
    expect(keyBox(c4c5, 60)).toEqual({ left: 0, width: 1 / 8, black: false });
    expect(keyBox(c4c5, 72)).toEqual({
      left: 7 / 8,
      width: 1 / 8,
      black: false,
    });
    // C♯ straddles the C|D line.
    const cs = keyBox(c4c5, 61)!;
    expect(cs.black).toBe(true);
    expect(cs.left + cs.width / 2).toBeCloseTo(1 / 8);
    expect(keyBox(c4c5, 73)).toBeNull();
  });

  it('widens to show every target note, with a margin', () => {
    const c3c6 = { low: 48, high: 84 };
    expect(includeTargets(c3c6, [60, 72])).toBe(c3c6);
    // LH bass down to G2 (43): two keys below, on a white key.
    expect(includeTargets(c3c6, [43, 60])).toEqual({ low: 41, high: 84 });
    expect(includeTargets(c3c6, [96])).toEqual({ low: 48, high: 98 });
  });
});
