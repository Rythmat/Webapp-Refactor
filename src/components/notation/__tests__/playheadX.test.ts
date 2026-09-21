import { describe, expect, it } from 'vitest';
import { playheadX } from '../StaffView';

/**
 * Anchors as a real system produces them: measure edges, spaced by ENGRAVED
 * width rather than by time. Bar 1 holds a whole note in 90px; bar 2 holds four
 * sixteenths and a rest in 220px. Both are 1920 ticks of music.
 */
const UNEVEN = [
  { tick: 0, x: 60 },
  { tick: 1920, x: 150 },
  { tick: 3840, x: 370 },
];

describe('playheadX', () => {
  it('moves at a constant speed however the notes are spaced', () => {
    // Equal slices of time must cover equal distance, even though the two bars
    // are drawn 90px and 220px wide.
    const steps = 8;
    const span = 3840;
    const xs = Array.from(
      { length: steps + 1 },
      (_, i) => playheadX(UNEVEN, (span / steps) * i)!,
    );
    const deltas = xs.slice(1).map((x, i) => x - xs[i]);
    const first = deltas[0];
    for (const d of deltas) expect(d).toBeCloseTo(first, 9);
  });

  it('is the mapping the old note-following one was not', () => {
    // Halfway through the music lands halfway across the drawn span...
    expect(playheadX(UNEVEN, 1920)).toBeCloseTo(60 + (370 - 60) / 2, 9);
    // ...which is NOT the barline at x=150, and that difference is the fix:
    // the barline sits where the engraver put it, the clock stays even.
    expect(playheadX(UNEVEN, 1920)).not.toBeCloseTo(150, 1);
  });

  it('starts at the system’s musical left edge and ends at its right', () => {
    expect(playheadX(UNEVEN, 0)).toBe(60);
    expect(playheadX(UNEVEN, 3840)).toBe(370);
  });

  it('clamps outside the system rather than running off the staff', () => {
    expect(playheadX(UNEVEN, -500)).toBe(60);
    expect(playheadX(UNEVEN, 99999)).toBe(370);
  });

  it('needs two anchors to place anything', () => {
    expect(playheadX([], 0)).toBeNull();
    expect(playheadX([{ tick: 0, x: 60 }], 0)).toBeNull();
  });

  it('survives a system with no duration', () => {
    expect(
      playheadX(
        [
          { tick: 0, x: 60 },
          { tick: 0, x: 200 },
        ],
        0,
      ),
    ).toBe(60);
  });
});
