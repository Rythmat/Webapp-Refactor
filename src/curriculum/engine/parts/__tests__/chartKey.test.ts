import { describe, expect, it } from 'vitest';
import {
  parseChart,
  progressionById,
  realizePreset,
} from '../../bassLines/harmony';
import { chartKey } from '../chartKey';

const typed = (chart: string) => chartKey(parseChart(chart).bars);

describe('chartKey', () => {
  it('reads a typed chart from its first chord, in the mode its chords fit', () => {
    expect(typed('| Cm7 | F7 |')).toEqual({ tonic: 0, mode: 'dorian' });
    expect(typed('| Em | Am | B7 | Em |')).toEqual({
      tonic: 4,
      mode: 'aeolian',
    });
    expect(typed('| C | G | Am | F |')).toEqual({ tonic: 0, mode: 'ionian' });
    expect(typed('| Cmin | G7 |')).toEqual({ tonic: 0, mode: 'aeolian' });
    // A sus chord on the tonic says neither: the next chord there does (and
    // Dm's F natural makes it aeolian).
    expect(typed('| Asus2 | Am | Dsus2 | Dm |')).toEqual({
      tonic: 9,
      mode: 'aeolian',
    });
    // A dominant tonic: the blues is mixolydian.
    expect(typed('| G7 | C7 | G7 | D7 |')).toEqual({
      tonic: 7,
      mode: 'mixolydian',
    });
  });

  it('keeps a preset in the key picked', () => {
    const twoFive = progressionById('two-five-one');
    expect(chartKey(realizePreset(twoFive, 2), 2, false)).toEqual({
      tonic: 2,
      mode: 'ionian',
    });
    // A minor preset stays minor whatever its first chord.
    const minor = progressionById('minor-two-five');
    expect(chartKey(realizePreset(minor, 9), 9, true).mode).toMatch(
      /aeolian|dorian|phrygian/,
    );
  });

  it('is C major for an empty chart', () => {
    expect(chartKey([])).toEqual({ tonic: 0, mode: 'ionian' });
  });
});
