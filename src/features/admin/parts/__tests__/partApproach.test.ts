import { describe, expect, it } from 'vitest';
import type { PartNote } from '@/curriculum/engine/parts/part';
import {
  clearApproach,
  describeApproach,
  layApproach,
  markApproach,
} from '../partApproach';

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const chord = (tick: number, midis: number[], duration = 200): PartNote[] =>
  midis.map((midi) => ({ tick, duration, midi, velocity: 90, hand: 'rh' }));

// C9 and B9 shapes on the 8ths of beat 2, B♭9 on beat 3.
const bb9 = [58, 62, 68, 72];
const captured = [
  ...chord(
    480,
    bb9.map((m) => m + 2),
  ),
  ...chord(
    720,
    bb9.map((m) => m + 1),
  ),
  ...chord(960, bb9, 900),
];

describe('marking a captured part’s approaches', () => {
  it('reads each note’s steps from what was played', () => {
    const marked = markApproach(
      captured,
      [0, 1, 2, 3, 4, 5, 6, 7],
      'chromatic',
      'key',
      C_MAJOR,
    );
    expect(marked.slice(0, 4).every((n) => n.approach?.step === 2)).toBe(true);
    expect(marked.slice(4, 8).every((n) => n.approach?.step === 1)).toBe(true);
    expect(marked.slice(8).every((n) => !n.approach)).toBe(true);
    expect(describeApproach(marked, [0, 4])).toBe('+2 +1 chromatic');
  });

  it('counts scale steps for a diatonic mark: Em7 over Dm7 is one', () => {
    const notes = [
      ...chord(0, [64, 67, 71, 74]),
      ...chord(480, [62, 65, 69, 72]),
    ];
    const marked = markApproach(
      notes,
      [0, 1, 2, 3],
      'diatonic',
      'key',
      C_MAJOR,
    );
    expect(marked.slice(0, 4).map((n) => n.approach?.step)).toEqual([
      1, 1, 1, 1,
    ]);
  });

  it('takes the marks off again', () => {
    const marked = markApproach(
      captured,
      [0, 1, 2, 3],
      'chromatic',
      'key',
      C_MAJOR,
    );
    expect(clearApproach(marked, [0, 1, 2, 3]).every((n) => !n.approach)).toBe(
      true,
    );
  });
});

describe('laying an approach before a chord', () => {
  it('writes the goal’s voicing moved, each step a chord, ending on the goal', () => {
    const goal = chord(960, bb9, 900);
    const out = layApproach(
      goal,
      [0, 1, 2, 3],
      { pattern: '2A', motion: 'chromatic', scale: 'key' },
      240,
      1920,
      C_MAJOR,
    );
    const at = (tick: number) =>
      out
        .filter((n) => n.tick === tick)
        .map((n) => n.midi)
        .sort((a, b) => a - b);
    expect(at(480)).toEqual(bb9.map((m) => m + 2));
    expect(at(720)).toEqual(bb9.map((m) => m + 1));
    expect(
      out.filter((n) => n.tick === 480).every((n) => n.hand === 'rh'),
    ).toBe(true);
  });

  it('clears the hand’s notes in the way and ends one ringing in', () => {
    const notes = [...chord(0, [60, 64, 67], 1900), ...chord(960, bb9, 900)];
    const out = layApproach(
      notes,
      [3, 4, 5, 6],
      { pattern: '1B', motion: 'chromatic', scale: 'key' },
      240,
      1920,
      C_MAJOR,
    );
    expect(
      out.filter((n) => n.tick === 0).every((n) => n.duration === 720),
    ).toBe(true);
  });
});
