import { describe, expect, it } from 'vitest';
import { NO_MARKS, packSystems, type SystemMarks } from '../systemPlan';

/**
 * The lesson staff sits in a box that does not scroll sideways, so a system
 * wider than the box does not become awkward to read — it becomes invisible.
 * Bars therefore wrap the way text does, and the reader gets the habit sheet
 * music depends on: to the end of the line, then down and back to the left.
 */

const bars = (n: number) => Array.from({ length: n }, (_, i) => i);
const even = (n: number, w: number) => Array.from({ length: n }, () => w);
const shape = (systems: { measures: number[] }[]) =>
  systems.map((s) => s.measures);

describe('wrapping bars onto systems', () => {
  it('fills a line and breaks to the next', () => {
    // 400 wide. First line: 60 header + 3 × 100 = 360, and a 4th would be 460.
    // Later lines: 20 header + 3 × 100 = 320, and a 4th would be 420.
    expect(shape(packSystems(bars(8), even(8, 100), 400, 60, 20))).toEqual([
      [0, 1, 2],
      [3, 4, 5],
      [6, 7],
    ]);
  });

  it('gives the first line less room, because it carries the clef and key', () => {
    // A 160px header leaves the opening line room for two bars where the
    // lines below it, carrying only a clef, take three.
    const systems = packSystems(bars(8), even(8, 100), 400, 160, 20);
    expect(shape(systems)[0]).toEqual([0, 1]);
    expect(shape(systems)[1]).toEqual([2, 3, 4]);
  });

  it('puts everything on one line when it all fits', () => {
    expect(shape(packSystems(bars(4), even(4, 100), 900, 60, 20))).toEqual([
      [0, 1, 2, 3],
    ]);
  });

  it('lets a busy bar take the room it needs', () => {
    // Bar 1 is a bar of sixteenths: it does not fit beside bar 0, so it starts
    // a line. A fixed bars-per-line count cannot express this.
    const widths = [100, 340, 100, 100];
    expect(shape(packSystems(bars(4), widths, 400, 20, 20))).toEqual([
      [0],
      [1],
      [2, 3],
    ]);
  });

  it('keeps one bar per system even when nothing fits', () => {
    // A bar wider than any window overflows alone rather than wrapping forever.
    const systems = packSystems(bars(3), even(3, 5000), 400, 20, 20);
    expect(shape(systems)).toEqual([[0], [1], [2]]);
  });

  it('never drops or reorders a bar', () => {
    for (const width of [120, 200, 380, 640, 1200]) {
      const systems = packSystems(bars(13), even(13, 90), width, 60, 20);
      expect(systems.flatMap((s) => s.measures)).toEqual(bars(13));
    }
  });

  it('wraps more as the view narrows, and never fewer', () => {
    const counts = [1200, 900, 600, 400, 240].map(
      (w) => packSystems(bars(12), even(12, 100), w, 40, 20).length,
    );
    const ascending = [...counts].sort((a, b) => a - b);
    expect(counts).toEqual(ascending);
    expect(counts[0]).toBeLessThan(counts[counts.length - 1]);
  });

  it('breaks where a mark says to, even mid-line', () => {
    const marks: SystemMarks = {
      ...NO_MARKS,
      breaks: new Set([2]),
    };
    // Room for four bars a line, but bar 2 is marked to start a system.
    expect(
      shape(packSystems(bars(6), even(6, 100), 480, 20, 20, marks)),
    ).toEqual([
      [0, 1],
      [2, 3, 4, 5],
    ]);
  });

  it('starts a page where a page break says to, and records it', () => {
    const marks: SystemMarks = {
      ...NO_MARKS,
      pageBreaks: new Set([2]),
    };
    const systems = packSystems(bars(4), even(4, 100), 480, 20, 20, marks);
    expect(shape(systems)).toEqual([
      [0, 1],
      [2, 3],
    ]);
    expect(systems[1].startsPage).toBe(true);
    expect(systems[0].startsPage).toBe(false);
  });

  it('falls back to a sane width for a bar it was given none for', () => {
    // `widths` is indexed by bar, and a slot list can skip bars (multi-rests).
    const sparse: number[] = [];
    sparse[0] = 100;
    sparse[5] = 100;
    const systems = packSystems([0, 5], sparse, 400, 20, 20);
    expect(systems.flatMap((s) => s.measures)).toEqual([0, 5]);
  });

  it('handles an empty score without inventing a system', () => {
    expect(packSystems([], [], 400, 20, 20)).toEqual([]);
  });
});
