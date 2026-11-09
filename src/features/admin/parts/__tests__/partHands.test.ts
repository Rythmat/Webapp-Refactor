import { describe, expect, it } from 'vitest';
import type { PartNote } from '@/curriculum/engine/parts/part';
import {
  carryHands,
  guessHands,
  handCounts,
  setHands,
  splitHands,
} from '../partHands';

const note = (tick: number, midi: number, extra: Partial<PartNote> = {}) =>
  ({ tick, duration: 480, midi, velocity: 90, ...extra }) as PartNote;

// A C2 root under a C7 3-7-9 shell (E3 B♭3 D4), then a G4 melody note.
const part = [
  note(0, 36),
  note(0, 52),
  note(0, 58),
  note(0, 62),
  note(480, 67),
];
const handsOf = (notes: readonly PartNote[]) => notes.map((n) => n.hand);

describe('giving notes a hand', () => {
  it('gives the selected notes to one hand and leaves the rest', () => {
    const notes = setHands(part, [1, 2, 3], 'lh');
    expect(handsOf(notes)).toEqual([undefined, 'lh', 'lh', 'lh', undefined]);
    expect(handsOf(setHands(notes, [2], null))).toEqual([
      undefined,
      'lh',
      undefined,
      'lh',
      undefined,
    ]);
  });

  it('lets a finger go when its note changes hands, and keeps it when not', () => {
    const fingered = [note(0, 60, { hand: 'rh', finger: 1 })];
    expect(setHands(fingered, [0], 'lh')[0]).toEqual(
      note(0, 60, { hand: 'lh' }),
    );
    expect(setHands(fingered, [0], 'rh')[0]).toBe(fingered[0]);
  });

  it('splits every note at a key: below it the left hand, from it up the right', () => {
    expect(handsOf(splitHands(part, 60))).toEqual([
      'lh',
      'lh',
      'lh',
      'rh',
      'rh',
    ]);
    // Only the selection, when there is one.
    expect(handsOf(splitHands(part, 60, [0, 3]))).toEqual([
      'lh',
      undefined,
      undefined,
      'rh',
      undefined,
    ]);
  });

  it('guesses as the grand staff splits them, whatever hands they had', () => {
    const wrong = part.map((n) => ({ ...n, hand: 'rh' as const }));
    const guessed = handsOf(guessHands(wrong));
    expect(guessed[0]).toBe('lh'); // C2
    expect(guessed[4]).toBe('rh'); // G4
  });

  it('counts each hand’s notes and those with none', () => {
    expect(handCounts(splitHands(part, 60, [0, 4]))).toEqual({
      lh: 1,
      rh: 1,
      none: 3,
    });
  });
});

describe('an edit in a part with hands', () => {
  const handed = splitHands(part, 60);

  it('gives a drawn note the hand nearest it in pitch', () => {
    const drawn = [...handed, note(960, 40), note(960, 72)];
    expect(handsOf(carryHands(drawn, handed)).slice(-2)).toEqual(['lh', 'rh']);
  });

  it('keeps a moved note in its hand', () => {
    // The left hand's D4 moved a beat later: still the left hand's.
    const moved = handed.map((n, i) =>
      i === 3 ? { ...n, tick: 480, hand: undefined } : n,
    );
    const lhD = setHands(handed, [3], 'lh');
    expect(carryHands(moved, lhD)[3].hand).toBe('lh');
  });

  it('leaves a note whose hand was taken off without one', () => {
    const cleared = setHands(handed, [4], null);
    expect(carryHands(cleared, cleared)[4].hand).toBeUndefined();
  });

  it('leaves a part without hands without them', () => {
    expect(handsOf(carryHands([...part, note(960, 40)], part))).toEqual(
      Array(6).fill(undefined),
    );
  });
});
