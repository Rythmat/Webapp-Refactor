import { describe, expect, it } from 'vitest';
import {
  PIANO_ROLL_LANE_COLORS,
  isBlackKeyPitch,
  pianoRollLaneBackground,
} from '../pianoRollLanes';

describe('pianoRollLaneBackground', () => {
  it('shades black keys dark and white keys light in every octave', () => {
    for (let midi = 21; midi <= 108; midi++) {
      const black = [1, 3, 6, 8, 10].includes(midi % 12);
      expect(isBlackKeyPitch(midi)).toBe(black);
      expect(pianoRollLaneBackground(midi)).toBe(
        black
          ? PIANO_ROLL_LANE_COLORS.blackKey
          : PIANO_ROLL_LANE_COLORS.whiteKey,
      );
    }
  });

  it('tints the key center only when a key is given', () => {
    expect(pianoRollLaneBackground(62, 50, '#ff0000')).toBe('#ff00000d');
    expect(pianoRollLaneBackground(62)).toBe(PIANO_ROLL_LANE_COLORS.whiteKey);
  });
});
