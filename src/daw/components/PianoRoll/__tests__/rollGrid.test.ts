import { describe, expect, it } from 'vitest';
import { rollBeatLines } from '../rollGrid';

// ── The roll's bars are the song's (pianoroll-10) ──────────────────────────

const PPT = 0.1; // px per tick

describe('rollBeatLines', () => {
  it('numbers a clip at bar 9 from 9, not 1', () => {
    const lines = rollBeatLines(8 * 1920, PPT, 0, 1920 * PPT, {
      numerator: 4,
      denominator: 4,
    });
    expect(lines[0]).toMatchObject({
      x: 0,
      bar: true,
      barNumber: 9,
      atClipStart: true,
    });
    expect(lines.filter((l) => l.bar).map((l) => l.barNumber)).toEqual([9, 10]);
  });

  it('keeps the song bar lines under a clip that starts on beat 2', () => {
    const lines = rollBeatLines(480, PPT, 0, 2000 * PPT, {
      numerator: 4,
      denominator: 4,
    });
    expect(lines[0]).toMatchObject({ x: 0, bar: false, beatInBar: 1 });
    // Bar 2 opens at song tick 1920: 1440 ticks into the clip.
    expect(lines.find((l) => l.bar)).toMatchObject({
      x: 1440 * PPT,
      barNumber: 2,
    });
  });

  it('draws eighth-note beats and 7/8 bars in 7/8', () => {
    const bars = rollBeatLines(0, PPT, 0, 3400 * PPT, {
      numerator: 7,
      denominator: 8,
    }).filter((l) => l.bar);
    expect(bars.map((l) => l.x / PPT)).toEqual([0, 1680, 3360]);
  });
});
