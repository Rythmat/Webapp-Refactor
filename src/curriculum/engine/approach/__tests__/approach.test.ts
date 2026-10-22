import { describe, expect, it } from 'vitest';
import {
  APPROACH_PATTERNS,
  chordScale,
  approachPitch,
  approachVoicing,
  goalsOf,
  MAX_APPROACH,
  patternLabel,
  patternSteps,
  resolveApproaches,
  stepsPattern,
  type ApproachStep,
} from '../approach';

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const A_MINOR = [9, 11, 0, 2, 4, 5, 7];
const NAMES = 'C C# D Eb E F F# G Ab A Bb B'.split(' ');
const name = (m: number) => NAMES[((m % 12) + 12) % 12];

describe('the patterns', () => {
  it('are the sixteen of the menu, none longer than four', () => {
    expect(APPROACH_PATTERNS).toHaveLength(16);
    for (const p of APPROACH_PATTERNS)
      expect(patternSteps(p).length).toBeLessThanOrEqual(MAX_APPROACH);
  });

  it('step in toward the goal, farthest first', () => {
    expect(patternSteps('1A')).toEqual([1]);
    expect(patternSteps('1B1A')).toEqual([-1, 1]);
    expect(patternSteps('2A1B')).toEqual([2, 1, -1]);
    expect(patternSteps('1B2A')).toEqual([-1, 2, 1]);
    expect(patternSteps('2B2A')).toEqual([-2, -1, 2, 1]);
    expect(patternSteps('4B')).toEqual([-4, -3, -2, -1]);
    // Longer than the menu's, as chains will write them.
    expect(patternSteps('1B2A1B')).toEqual([-1, 2, 1, -1]);
  });

  it('read back from their steps, and print as Peter writes them', () => {
    expect(stepsPattern([2, 1, -1])).toBe('2A1B');
    expect(stepsPattern([1, 2])).toBeNull();
    expect(patternLabel('2A1B')).toBe('2A 1B');
    expect(patternLabel('2B2A')).toBe('2B 2A');
  });
});

describe('a note from its goal', () => {
  it('chromatic: three from below into F is D E♭ E', () => {
    expect(
      [-3, -2, -1].map((s) => name(approachPitch(65, s, 'chromatic'))),
    ).toEqual(['D', 'Eb', 'E']);
  });

  it('diatonic to the key: three from below into F, in C, is C D E', () => {
    expect(
      [-3, -2, -1].map((s) => name(approachPitch(65, s, 'diatonic', C_MAJOR))),
    ).toEqual(['C', 'D', 'E']);
  });

  it('diatonic in A minor: D natural below E, F above it', () => {
    expect(name(approachPitch(64, -1, 'diatonic', A_MINOR))).toBe('D');
    expect(name(approachPitch(64, 1, 'diatonic', A_MINOR))).toBe('F');
    // In A melodic minor, D and F♯.
    const melodic = [9, 11, 0, 2, 4, 6, 8];
    expect(name(approachPitch(64, 1, 'diatonic', melodic))).toBe('F#');
  });

  it('from a goal outside the scale, the first scale note is one step', () => {
    // G♯ (the E7's third) in A natural minor: G below, A above.
    expect(name(approachPitch(68, -1, 'diatonic', A_MINOR))).toBe('G');
    expect(name(approachPitch(68, 1, 'diatonic', A_MINOR))).toBe('A');
  });
});

describe('a chord from its goal', () => {
  // B♭9: B♭ D F A♭ C.
  const bb9 = [58, 62, 65, 68, 72];

  it('chromatic keeps the shape exactly: C9 and B9 into B♭9', () => {
    expect(approachVoicing(bb9, 2, 'chromatic')).toEqual(bb9.map((m) => m + 2));
    expect(approachVoicing(bb9, 1, 'chromatic')).toEqual(bb9.map((m) => m + 1));
  });

  it('diatonic planes through the key: Cmaj7 from above is Dm7', () => {
    expect(approachVoicing([60, 64, 67, 71], 1, 'diatonic', C_MAJOR)).toEqual([
      62, 65, 69, 72,
    ]);
  });
});

describe('goals and chains', () => {
  const chromatic = (step: number): ApproachStep => ({
    step,
    motion: 'chromatic',
  });

  it('leads each approach into the next goal, looping round the end', () => {
    const items = [
      { approach: undefined },
      { approach: chromatic(-1) },
      { approach: undefined },
      { approach: chromatic(2) },
      { approach: chromatic(1) },
    ];
    expect(goalsOf(items)).toEqual([0, 2, 2, 0, 0]);
  });

  it('plays Peter’s line: C♯ E E♭ C♯ D F E D into E♭', () => {
    // 1B 2A 1B into D, that D the first of 1B 2A 1B into E♭.
    const steps = [-1, 2, 1, -1, -1, 2, 1, -1];
    const items = [
      ...steps.map((step, i) => ({
        approach: chromatic(step),
        goal: i === 4,
      })),
      { approach: undefined },
    ];
    const pitches = resolveApproaches(
      items,
      () => 63, // E♭, the line's last goal
      (i, goal) => goal + steps[i],
    );
    expect(pitches.map((m) => name(m!))).toEqual([
      'C#',
      'E',
      'Eb',
      'C#',
      'D',
      'F',
      'E',
      'D',
      'Eb',
    ]);
  });

  it('moves a whole chain with its goal', () => {
    const items = [
      { approach: chromatic(-1) },
      { approach: chromatic(-1), goal: true },
      { approach: undefined },
    ];
    const at = (goal: number) =>
      resolveApproaches(
        items,
        () => goal,
        (i, g) => g - 1,
      );
    expect(at(63)).toEqual([61, 62, 63]);
    expect(at(67)).toEqual([65, 66, 67]);
  });
});

describe('a chord’s own scale', () => {
  const names = (pcs: number[]) => pcs.map(name).join(' ');
  it('is its family’s mode, its own tones in place', () => {
    // E7: E mixolydian.
    expect(names(chordScale({ rootPc: 4, intervals: [0, 4, 7, 10] }))).toBe(
      'C# D E F# Ab A B',
    );
    // Dm7: D dorian.
    expect(names(chordScale({ rootPc: 2, intervals: [0, 3, 7, 10] }))).toBe(
      'C D E F G A B',
    );
    // Cmaj7: C ionian.
    expect(names(chordScale({ rootPc: 0, intervals: [0, 4, 7, 11] }))).toBe(
      'C D E F G A B',
    );
    // G7♭9: the A♭ in place of A.
    expect(names(chordScale({ rootPc: 7, intervals: [0, 4, 7, 10, 13] }))).toBe(
      'C D E F G Ab B',
    );
    // Bø7: B locrian.
    expect(names(chordScale({ rootPc: 11, intervals: [0, 3, 6, 10] }))).toBe(
      'C D E F G A B',
    );
  });
});
