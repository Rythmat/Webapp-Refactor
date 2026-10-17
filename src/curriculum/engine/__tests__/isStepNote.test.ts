import { describe, expect, it } from 'vitest';
import type { FundamentalsMidiEval } from '../../types/fundamentalsEval';
import { isStepNote } from '../fundamentalsEvaluator';

// The keyboard lights a held key shiny when the step asks for it and grey
// when it doesn't, so each rule has to say yes to its own notes and no to
// the rest.

const C4 = 60;
const D4 = 62;
const E4 = 64;
const C5 = 72;

describe('isStepNote', () => {
  it('exact and simultaneous steps take only their keys', () => {
    expect(isStepNote({ type: 'exact_midi', midi: [C4, E4] }, C4)).toBe(true);
    expect(isStepNote({ type: 'exact_midi', midi: [C4, E4] }, C5)).toBe(false);
    const chord: FundamentalsMidiEval = {
      type: 'simultaneous',
      midi: [C4, E4],
      windowMs: 200,
    };
    expect(isStepNote(chord, E4)).toBe(true);
    expect(isStepNote(chord, D4)).toBe(false);
  });

  it('a sequence takes any of its notes, in any octave unless octave-aware', () => {
    const notes = [0, 2, 4]; // C D E
    expect(
      isStepNote({ type: 'sequence', notes, octaveAware: false }, C5),
    ).toBe(true);
    expect(
      isStepNote({ type: 'sequence', notes, octaveAware: false }, 65),
    ).toBe(false);
    const exact = [C4, D4, E4];
    expect(
      isStepNote({ type: 'sequence', notes: exact, octaveAware: true }, D4),
    ).toBe(true);
    expect(
      isStepNote({ type: 'sequence', notes: exact, octaveAware: true }, 74),
    ).toBe(false);
  });

  it('pitch-class and alternating steps match by pitch class', () => {
    expect(
      isStepNote({ type: 'pitch_class', notes: [0], minOctaves: 3 }, 36),
    ).toBe(true);
    expect(
      isStepNote({ type: 'pitch_class', notes: [0], minOctaves: 3 }, 37),
    ).toBe(false);
    const alt: FundamentalsMidiEval = {
      type: 'alternating',
      pitchClasses: [0, 7],
      minPairs: 2,
    };
    expect(isStepNote(alt, 67)).toBe(true);
    expect(isStepNote(alt, 69)).toBe(false);
  });

  it('range-shaped steps take any key inside one of their ranges', () => {
    expect(
      isStepNote({ type: 'range', min: 48, max: 59, minNotes: 4 }, 59),
    ).toBe(true);
    expect(
      isStepNote({ type: 'range', min: 48, max: 59, minNotes: 4 }, C4),
    ).toBe(false);
    const zones = [
      { min: 36, max: 47, minNotes: 1 },
      { min: 72, max: 83, minNotes: 1 },
    ];
    expect(isStepNote({ type: 'multi_zone', zones }, 80)).toBe(true);
    expect(isStepNote({ type: 'multi_zone', zones }, C4)).toBe(false);
    expect(isStepNote({ type: 'ordered_ranges', phases: zones }, 40)).toBe(
      true,
    );
    const twoRanges: FundamentalsMidiEval = {
      type: 'two_range_sequence',
      first: { min: 36, max: 47 },
      second: { min: 72, max: 83 },
    };
    expect(isStepNote(twoRanges, 75)).toBe(true);
    expect(isStepNote(twoRanges, C4)).toBe(false);
  });

  it('a quiz takes the question on screen, or its pool before it starts', () => {
    const quiz = {
      type: 'quiz' as const,
      notePool: [0, 4, 7],
      count: 5,
      passThreshold: 4,
    };
    expect(isStepNote(quiz, E4, 4)).toBe(true);
    expect(isStepNote(quiz, 67, 4)).toBe(false);
    expect(isStepNote(quiz, 67)).toBe(true);
    expect(isStepNote(quiz, D4)).toBe(false);
    const octaveAware = { ...quiz, notePool: [C4, E4], octaveAware: true };
    expect(isStepNote(octaveAware, C4, C4)).toBe(true);
    expect(isStepNote(octaveAware, C5, C4)).toBe(false);
  });

  it('a chromatic run takes every key', () => {
    expect(isStepNote({ type: 'chromatic_ascending' }, 61)).toBe(true);
  });
});
