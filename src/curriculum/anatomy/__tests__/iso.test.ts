import { describe, expect, it } from 'vitest';
import {
  circle,
  compileDrawing,
  faceViewer,
  hatchInside,
  mirrorHalf,
  project,
  projectOffset,
  roundedRect,
  sampleOutline,
  type V2,
} from '../iso';

describe('iso projection', () => {
  it('is linear: a move in 3D is one translate on the page', () => {
    const offset = [3, -2, 5] as const;
    const [dx, dy] = projectOffset(offset);
    for (const [u, v, z] of [
      [0, 0, 0],
      [12, 4, 1],
      [-3, 7, 2],
    ]) {
      const [x0, y0] = project(u, v, z);
      const [x1, y1] = project(u + offset[0], v + offset[1], z + offset[2]);
      expect(x1 - x0).toBeCloseTo(dx);
      expect(y1 - y0).toBeCloseTo(dy);
    }
  });

  it('sends the guitar up and to the right, and z straight up', () => {
    const [x, y] = project(10, 0, 0);
    expect(x).toBeGreaterThan(0);
    expect(y).toBeLessThan(0);
    expect(project(0, 0, 4)).toEqual([0, -4]);
  });
});

describe('outlines', () => {
  it('samples curves and does not repeat the closing point', () => {
    const points = sampleOutline('M 0 0 C 1 0, 1 1, 0 1 L 0 0 Z', 4);
    expect(points).toHaveLength(5);
    expect(points[4]).toEqual([0, 1]);
  });

  it('mirrors half a shape without doubling its ends', () => {
    const whole = mirrorHalf([
      [0, 0],
      [1, 1],
      [2, 0],
    ]);
    expect(whole).toEqual([
      [0, 0],
      [1, 1],
      [2, 0],
      [1, -1],
    ]);
  });

  it('clips hatching to an outline and leaves its holes clear', () => {
    const outer = roundedRect(0, 0, 5, 5);
    const lines = hatchInside(outer, [circle(0, 0, 2, 40)], 1, 1, 0);
    const across = lines.filter(([a]) => Math.abs(a[1]) < 0.6);
    // A line through the hole is cut in two.
    expect(across.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      expect(line.every((p) => p[2] === 1)).toBe(true);
      expect(Math.abs(line[0][0])).toBeLessThanOrEqual(5.01);
    }
  });
});

describe('solids', () => {
  const square: V2[] = [
    [0, 0],
    [4, 0],
    [4, 4],
    [0, 4],
  ];

  it('knows which walls face the viewer, who is at −u, +v', () => {
    // Counter-clockwise, material on the left: −u wall and +v wall.
    expect(faceViewer([4, 4], [0, 4])).toBe(true);
    expect(faceViewer([0, 4], [0, 0])).toBe(true);
    expect(faceViewer([0, 0], [4, 0])).toBe(false);
    expect(faceViewer([4, 0], [4, 4])).toBe(false);
  });

  it('draws two of a box’s four walls, and hatches a tall one only', () => {
    const tall = compileDrawing([{ outer: square, z0: 0, z1: 2 }]);
    const flat = compileDrawing([{ outer: square, z0: 0, z1: 0.1 }]);
    expect(tall.fill.match(/M/g)).toHaveLength(2);
    expect(tall.hatch).not.toBe('');
    expect(flat.hatch).toBe('');
    expect(tall.fill.endsWith('Z')).toBe(true);
  });

  it('shows a hole’s far wall, so a hole is really a hole', () => {
    const plain = compileDrawing([{ outer: square, z0: 0, z1: 1 }]);
    const holed = compileDrawing([
      {
        outer: square,
        holes: [circle(2, 2, 1, 16)],
        z0: 0,
        z1: 1,
      },
    ]);
    expect(holed.fill.match(/M/g)!.length).toBeGreaterThan(
      plain.fill.match(/M/g)!.length,
    );
  });
});
