import { describe, expect, it } from 'vitest';
import { activityPayoff } from '../activityPayoff';

const dorian = {
  modeSlug: 'dorian',
  modeTitle: 'Dorian',
  rootKey: 'D',
  steps: [0, 2, 3, 5, 7, 9, 10, 12],
};

describe('activityPayoff', () => {
  it('names the scale, its sound and its degrees', () => {
    expect(activityPayoff({ ...dorian, activityKey: 'asc-pa' })).toEqual({
      headline: "That's D Dorian. Minor with a bright raised 6th.",
      detail: 'Scale degrees: 1 2 ♭3 4 5 6 ♭7',
      fromSong: null,
    });
  });

  it('ties it back to the song it came from', () => {
    const payoff = activityPayoff({
      ...dorian,
      activityKey: 'asc-nh',
      origin: { song: 'Midnight Groove', chord: '2 min9' },
    });
    expect(payoff.fromSong).toBe(
      "It's the sound under the 2 min9 in Midnight Groove.",
    );
  });

  it('names a chord, skipping a symbol that only restates the degree', () => {
    const base = { ...dorian, activityKey: 'arpeggiate-4-pa' };
    expect(
      activityPayoff({ ...base, chordSymbols: [{ text: 'G' }] }).headline,
    ).toBe("That's the 4 chord of D Dorian: G.");
    expect(
      activityPayoff({ ...base, chordSymbols: [{ text: '4 maj' }] }).headline,
    ).toBe("That's the 4 chord of D Dorian.");
  });

  it('lists a progression once per chord', () => {
    const payoff = activityPayoff({
      ...dorian,
      activityKey: 'chords-2-pa',
      chordSymbols: [{ text: 'Dm' }, { text: 'G' }, { text: 'Dm' }],
    });
    expect(payoff.headline).toBe('Those are chords from D Dorian: Dm – G.');
  });

  it('falls back to the formula for modes without a line', () => {
    const payoff = activityPayoff({
      activityKey: 'asc-pa',
      modeSlug: 'harmonic-minor',
      modeTitle: 'Harmonic Minor',
      rootKey: 'A',
      steps: [0, 2, 3, 5, 7, 8, 11],
    });
    expect(payoff.headline).toBe("That's A Harmonic Minor.");
    expect(payoff.detail).toBe('Scale degrees: 1 2 ♭3 4 5 ♭6 7');
  });
});
