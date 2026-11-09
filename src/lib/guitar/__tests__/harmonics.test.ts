import { describe, expect, it } from 'vitest';
import {
  describeNodeFret,
  formatCents,
  fretAt,
  harmonicAt,
  harmonicNodes,
  midiToHz,
  nearestRatioStop,
  partialInfo,
  pitchOf,
  positionOfFret,
  RATIO_STOPS,
  ratioStopPosition,
  stoppedHz,
} from '../harmonics';

const A2 = 45; // open 5th string, 110 Hz: the reference sheets' string

describe('fret geometry', () => {
  it('places frets by 12-TET from the nut', () => {
    expect(fretAt(0.5)).toBeCloseTo(12, 9);
    expect(fretAt(0.75)).toBeCloseTo(24, 9);
    expect(positionOfFret(12)).toBeCloseTo(0.5, 9);
    expect(positionOfFret(7)).toBeCloseTo(0.3326, 4);
    for (const f of [1, 5, 9.3, 17]) {
      expect(fretAt(positionOfFret(f))).toBeCloseTo(f, 9);
    }
  });
});

describe('harmonic nodes', () => {
  // The node frets on the reference's to-scale map (sheet 2).
  it.each([
    [2, 12],
    [3, 7.02],
    [4, 4.98],
    [5, 3.86],
    [6, 3.16],
    [7, 2.67],
    [8, 2.31],
  ])('partial %i rings first at fret ≈ %f', (n, fret) => {
    expect(harmonicNodes(n)[0].fret).toBeCloseTo(fret, 2);
  });

  it('keeps only nodes in lowest terms (2/4 belongs to partial 2)', () => {
    expect(harmonicNodes(4).map((node) => node.k)).toEqual([1, 3]);
    expect(harmonicNodes(6).map((node) => node.k)).toEqual([1, 5]);
    expect(harmonicNodes(5).map((node) => node.k)).toEqual([1, 2, 3, 4]);
    expect(harmonicNodes(12).map((node) => node.k)).toEqual([1, 5, 7, 11]);
  });

  it('marks the nodes past the 24th fret as over the body', () => {
    const third = harmonicNodes(3);
    expect(third.map((node) => node.fret)).toEqual([
      expect.closeTo(7.02, 2),
      expect.closeTo(19.02, 2),
    ]);
    expect(third.every((node) => node.onNeck)).toBe(true);
    expect(harmonicNodes(4)[1].onNeck).toBe(true); // 3/4 = fret 24
    expect(harmonicNodes(5).map((node) => node.onNeck)).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });
});

describe('partialInfo', () => {
  it('matches the reference on A 110 Hz (sheet 4)', () => {
    const hz = [110, 220, 330, 440, 550, 660, 770, 880, 990, 1100, 1210, 1320];
    hz.forEach((value, i) => {
      expect(partialInfo(A2, i + 1).hz).toBeCloseTo(value, 6);
    });
    const fifth = partialInfo(A2, 5);
    expect(fifth.nearestMidi).toBe(A2 + 28); // C♯5
    expect(fifth.cents).toBeCloseTo(-13.686, 3);
    expect(fifth.interval).toBe('2 octaves + major 3rd');
    const eleventh = partialInfo(A2, 11);
    expect(eleventh.nearestMidi).toBe(A2 + 42); // D♯6
    expect(eleventh.cents).toBeCloseTo(-48.682, 3);
  });
});

describe('string-length ratios (sheet 3)', () => {
  it.each([
    [[1, 1], 110],
    [[1, 2], 220],
    [[2, 3], 165],
    [[3, 4], 146.67],
    [[4, 5], 137.5],
    [[5, 6], 132],
  ] as const)('a vibrating %j of the string sounds %f Hz', (fraction, hz) => {
    const stop = RATIO_STOPS.find(
      (s) => s.fraction[0] === fraction[0] && s.fraction[1] === fraction[1],
    )!;
    expect(stoppedHz(110, ratioStopPosition(stop))).toBeCloseTo(hz, 2);
  });

  it('snaps to a ratio near the finger, and to none between', () => {
    expect(nearestRatioStop(1 / 3 + 0.002)?.name).toBe('Perfect 5th');
    expect(nearestRatioStop(0.29)).toBeNull();
  });

  it('pressing and touching at a third of the string differ', () => {
    const f0 = midiToHz(A2);
    // Pressed: the 2/3 that vibrates sounds a 5th (3/2 · f0).
    expect(stoppedHz(f0, 1 / 3)).toBeCloseTo(165, 6);
    // Touched: partial 3, a 5th an octave higher (3 · f0).
    expect(harmonicAt(1 / 3)).toEqual({ partial: 3, k: 1 });
    expect(harmonicAt(0.5)).toEqual({ partial: 2, k: 1 });
    expect(harmonicAt(0.31)).toBeNull();
  });
});

describe('words', () => {
  it('says where to touch', () => {
    expect(describeNodeFret(12)).toBe('Over the 12th fret');
    expect(describeNodeFret(7.02)).toBe('Over the 7th fret');
    expect(describeNodeFret(3.86)).toBe('Just behind the 4th fret (≈ 3.9)');
    expect(describeNodeFret(3.16)).toBe('Just past the 3rd fret (≈ 3.2)');
    expect(describeNodeFret(27.86)).toBe('Over the body (≈ fret 27.9)');
  });

  it('formats cents with a sign', () => {
    expect(formatCents(1.955)).toBe('+2.0');
    expect(formatCents(-13.686)).toBe('−13.7');
    expect(formatCents(0)).toBe('±0.0');
    expect(pitchOf(440).cents).toBeCloseTo(0, 9);
  });
});
