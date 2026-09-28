import { describe, it, expect } from 'vitest';
import { funkL2 } from '@/curriculum/data/activityFlows/funk_v2';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import { buildGenrePracticeTrack } from '../buildGenrePracticeTrack';
import { keyboardWindow, scaleTonicIn } from '../practiceKeyboard';

describe('keyboardWindow', () => {
  it('always draws three octaves', () => {
    for (const [low, high] of [
      [31, 48],
      [52, 81],
      [36, 71],
      [24, 108],
    ]) {
      const w = keyboardWindow(low, high);
      expect(w.endC - w.startC).toBe(2);
    }
  });

  it('sits at the home position for a part that fits there', () => {
    // C3-B5, as the Theory Practice Track shows. A narrow melody must not drag
    // the keyboard down to wherever it happens to be centred.
    expect(keyboardWindow(50, 62).startC).toBe(4);
    expect(keyboardWindow(64, 69).startC).toBe(4);
    expect(keyboardWindow(67, 79).startC).toBe(4);
  });

  it('takes the lowest window that fits a bass part', () => {
    // A bass line is played downwards from what is written, so it wants the room
    // underneath it, not above.
    expect(keyboardWindow(37, 43, { preferLow: true }).startC).toBe(2); // C1
    expect(keyboardWindow(43, 60, { preferLow: true }).startC).toBe(3); // C2
  });

  it('moves off the home position only when it has to', () => {
    // A right hand reaching D6 (86) cannot be shown from C3.
    expect(keyboardWindow(60, 86).startC).toBe(5); // C4
    // A left hand down on C2 cannot be shown from C3 either.
    expect(keyboardWindow(36, 65).startC).toBe(3); // C2
  });

  it('keeps the low end when a part is too wide to fit', () => {
    // The left hand is what a two-hand part is built on, so the top spills.
    const w = keyboardWindow(47, 76);
    expect(w.startC * 12).toBeLessThanOrEqual(47);
  });

  it('keeps the middle of a part wider than the keyboard', () => {
    const w = keyboardWindow(24, 108);
    expect(w.startC).toBeGreaterThanOrEqual(2);
    expect(w.endC).toBeLessThanOrEqual(8);
  });
});

describe('scaleTonicIn', () => {
  it('puts the whole scale inside the keyboard', () => {
    for (const pc of [0, 4, 9, 11]) {
      const window = keyboardWindow(52, 81);
      const tonic = scaleTonicIn(window, pc, 11);
      expect(tonic).toBeGreaterThanOrEqual(window.startC * 12);
      expect(tonic + 11).toBeLessThanOrEqual(window.endC * 12 + 11);
      expect(((tonic % 12) + 12) % 12).toBe(pc);
    }
  });

  it('centres the scale rather than hugging an end', () => {
    // C3-B5 with A: A3 (57) leaves an octave either side, A4 pushes to the top.
    expect(scaleTonicIn({ startC: 4, endC: 6 }, 9, 11)).toBe(57);
  });

  it('lights every section of a real level inside its own keyboard', () => {
    for (const section of ['A', 'B', 'C', 'D'] as ActivitySectionId[]) {
      const track = buildGenrePracticeTrack(funkL2, section)!;
      const window = keyboardWindow(
        track.studentRange.low,
        track.studentRange.high,
        { preferLow: track.studentParts.every((p) => p === 'bass') },
      );
      const widest = Math.max(
        ...track.scales.map((s) => s.intervals[s.intervals.length - 1]),
        11,
      );
      const tonic = scaleTonicIn(window, track.keyRootPc, widest);
      expect(tonic).toBeGreaterThanOrEqual(window.startC * 12);
      expect(tonic + widest).toBeLessThanOrEqual(window.endC * 12 + 11);
    }
  });
});
