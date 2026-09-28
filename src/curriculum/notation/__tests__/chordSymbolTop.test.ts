import { describe, expect, it } from 'vitest';
import { chordSymbolTop } from '../ChordSymbolOverlay';

/**
 * Where a chord symbol sits vertically.
 *
 * The trap is that a measure box's `y` is the top of the stave's SPACE, not
 * its first line — `topLineDrop` (40px unscaled) is the rest of the way down.
 * Anchoring to `y` alone hung every symbol most of a stave clear of the music
 * it names, and once systems started wrapping that empty air landed on the
 * ledger lines of the system above.
 */

const FONT = 16;
const GAP = 6;
const TOP_LINE_DROP = 40;

/** A staff line to its neighbouring space, scaled — StaffView's `stepPx`. */
const STEP = 5;

/** Bottom edge of the drawn text, which is what must clear the music. */
const bottomOf = (top: number, scale = 1) => top + FONT * scale;

describe('placing a chord symbol', () => {
  it('sits just above the staff when nothing climbs over the top line', () => {
    const top = chordSymbolTop(100, TOP_LINE_DROP, [], 1);
    // Staff's top line is at 140; the symbol's foot clears it by the gap.
    expect(bottomOf(top)).toBe(140 - GAP);
  });

  it('does not hang from the top of the system, a whole stave too high', () => {
    // The old placement was `boxY - 24`, putting the foot at boxY - 8 = 92 —
    // 48px above the top staff line instead of 6.
    const top = chordSymbolTop(100, TOP_LINE_DROP, [], 1);
    expect(top).toBeGreaterThan(100 - 24);
    expect(140 - bottomOf(top)).toBeLessThan(12);
  });

  it('rises above a note that climbs over the top line', () => {
    // A notehead centred 3 steps above the top line, on a ledger line.
    const note = { y: 140 - 3 * STEP, space: STEP / 2 };
    const top = chordSymbolTop(100, TOP_LINE_DROP, [note], 1);
    expect(bottomOf(top)).toBeLessThan(note.y - note.space);
  });

  it('ignores notes that sit below the top line', () => {
    // A bass part living under the staff must not drag the symbol down onto
    // the stave — the staff top is the floor.
    const low = { y: 200, space: STEP / 2 };
    const empty = chordSymbolTop(100, TOP_LINE_DROP, [], 1);
    expect(chordSymbolTop(100, TOP_LINE_DROP, [low], 1)).toBe(empty);
  });

  it('clears the highest note when a chord spans the staff', () => {
    const chord = [
      { y: 190, space: STEP / 2 },
      { y: 120, space: STEP / 2 }, // above the top line
      { y: 160, space: STEP / 2 },
    ];
    const top = chordSymbolTop(100, TOP_LINE_DROP, chord, 1);
    expect(bottomOf(top)).toBeLessThan(120 - STEP / 2);
  });

  it('keeps its distances proportional when the staff is shrunk', () => {
    const scale = 0.7;
    const top = chordSymbolTop(70, TOP_LINE_DROP * scale, [], scale);
    // Same relationship to the staff, just smaller.
    const staffTop = 70 + TOP_LINE_DROP * scale;
    expect(bottomOf(top, scale)).toBeCloseTo(staffTop - GAP * scale, 6);
  });

  it('never returns a position that would overlap the staff it names', () => {
    for (const scale of [0.7, 0.85, 1]) {
      for (const notes of [
        [],
        [{ y: 60, space: 2.5 }],
        [{ y: 300, space: 2.5 }],
      ]) {
        const top = chordSymbolTop(100, TOP_LINE_DROP * scale, notes, scale);
        expect(bottomOf(top, scale)).toBeLessThanOrEqual(
          100 + TOP_LINE_DROP * scale,
        );
      }
    }
  });
});
