import { describe, expect, it } from 'vitest';
import { laneHeightFor } from '../DualStaffPianoRoll';

/**
 * The lesson page pins the keyboard and gives the piano roll whatever is left.
 * These guard the rule that makes that safe: the roll adapts to the space it
 * is handed, and when it genuinely cannot fit it overflows its own box rather
 * than growing the page — because growing the page is what used to push the
 * keyboard off the bottom of the screen.
 */

const OVERHEAD = 48; // STAVE_SPACER (8) + TIMELINE_HEIGHT (40)
const TARGET = 18;
const FLOOR = 8;

/** A typical two-hand chord + melody step; the widest authored is 40. */
const TWO_HAND_LANES = 30;

describe('lane height for the dual-staff roll', () => {
  it('fills the box when there is room to spare, without oversizing', () => {
    // A tall window could afford 40px lanes; rows that big help no one.
    const h = laneHeightFor(2000, TWO_HAND_LANES);
    expect(h).toBe(TARGET);
  });

  it('shrinks to fit rather than overflowing', () => {
    // Room for exactly 15px lanes: take 15, not the 18 ceiling.
    const container = 15 * TWO_HAND_LANES + OVERHEAD;
    expect(laneHeightFor(container, TWO_HAND_LANES)).toBe(15);
  });

  it('keeps shrinking rather than pushing notes off the stave', () => {
    // Room for 9px lanes. Every note of both hands on screen beats thicker
    // rows, so it takes the 9 — it does NOT hold a floor here and overflow.
    // Holding a 13px floor is exactly what hid the bottom of the LH stave.
    const container = 9 * TWO_HAND_LANES + OVERHEAD;
    expect(laneHeightFor(container, TWO_HAND_LANES)).toBe(9);
  });

  it('only overflows once the window is past pathological', () => {
    // The floor is a last resort, not the normal outcome. Below it the rows
    // would be invisible anyway, so the roll viewport scrolls instead.
    const container = 4 * TWO_HAND_LANES + OVERHEAD;
    expect(laneHeightFor(container, TWO_HAND_LANES)).toBe(FLOOR);
    const needed = FLOOR * TWO_HAND_LANES;
    expect(needed).toBeGreaterThan(container - OVERHEAD);
  });

  it('never returns a height that would collapse or invert', () => {
    // Absurd inputs used to be reachable: the height was computed once at
    // mount from window.innerHeight, so a lesson opened in a tiny window kept
    // that measurement forever.
    for (const container of [0, 1, 40, 48, 60, 200]) {
      const h = laneHeightFor(container, TWO_HAND_LANES);
      expect(h).toBeGreaterThanOrEqual(FLOOR);
      expect(h).toBeLessThanOrEqual(TARGET);
    }
  });

  it('degrades sanely when there are no lanes to place', () => {
    expect(laneHeightFor(600, 0)).toBe(TARGET);
  });

  it('gives a single narrow hand its full target height', () => {
    // One octave plus padding in a normal box — plenty of room per lane.
    expect(laneHeightFor(600, 15)).toBe(TARGET);
  });
});
