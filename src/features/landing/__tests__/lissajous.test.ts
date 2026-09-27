import { describe, expect, it } from 'vitest';
import {
  AMP,
  createRenderer,
  DEPTH_BINS,
  END_S,
  LOGO,
  MORPH_S,
  poseAt,
  projectPose,
  REST_PATHS,
  SAMPLES,
  sleepProgress,
  turnBetween,
  wakeProgress,
  weightScale,
  type Curve,
} from '../motion/lissajous';

const TAU = 2 * Math.PI;
const sampleT = (i: number) => (TAU * i) / SAMPLES;

/** A spread of curves to move between. */
const CURVES: readonly Curve[] = [
  LOGO,
  { ratio: [3, 4], phase: 1.08 * Math.PI },
  { ratio: [1, 3], phase: 2.5 * Math.PI },
  { ratio: [1, 1], phase: 6.3 * Math.PI },
  { ratio: [4, 1], phase: 10.05 * Math.PI },
];
const MOVES = CURVES.map((from, i) => [from, CURVES[(i + 1) % CURVES.length]]);

const project = (time: number, from: Curve, to: Curve) => {
  const out = new Float64Array(SAMPLES * 3);
  projectPose(poseAt(time, from, to), out);
  return out;
};

/** A curve at rest, face-on: x = sin(a·t), y = sin(b·t − phase). */
const expectAtRest = (pts: Float64Array, { ratio: [a, b], phase }: Curve) => {
  for (let i = 0; i < SAMPLES; i++) {
    expect(pts[i * 3]).toBeCloseTo(32 + AMP * Math.sin(a * sampleT(i)), 6);
    expect(pts[i * 3 + 1]).toBeCloseTo(
      32 - AMP * Math.sin(b * sampleT(i) - phase),
      6,
    );
  }
};

/** Times across one move, fade included, stepping `step` seconds. */
const grid = (step: number) =>
  Array.from({ length: Math.round(END_S / step) + 1 }, (_, i) => i * step);

describe('lissajous moves', () => {
  it('draws the logo at rest: 2:3 face-on at phase 0', () => {
    expect(LOGO).toEqual({ ratio: [2, 3], phase: 0 });
    expect(AMP).toBeCloseTo((64 * 61) / 129, 12);
    expectAtRest(project(0, LOGO, LOGO), LOGO);
  });

  it('starts still on one curve and lands still, exactly on the next', () => {
    for (const [from, to] of MOVES) {
      expect(poseAt(0, from, to)).toMatchObject({ from: from.ratio, mix: 0 });
      expectAtRest(project(0, from, to), from);
      for (const time of [MORPH_S, END_S]) {
        expect(poseAt(time, from, to)).toMatchObject({ to: to.ratio, mix: 1 });
        expectAtRest(project(time, from, to), to);
      }
    }
  });

  it('turns forward between a quarter turn and 1¼ turns, landing exactly', () => {
    for (let a = -7; a <= 7; a += 0.37) {
      for (let b = -7; b <= 7; b += 0.41) {
        const d = turnBetween(a, b);
        expect(d).toBeGreaterThanOrEqual(Math.PI / 2);
        expect(d).toBeLessThan(2.5 * Math.PI);
        expect(Math.cos(a + d)).toBeCloseTo(Math.cos(b), 9);
        expect(Math.sin(a + d)).toBeCloseTo(Math.sin(b), 9);
      }
    }
  });

  it('turns about the x axis only: horizontal positions ignore the turn', () => {
    for (const [from, to] of MOVES) {
      for (const time of grid(0.05)) {
        const { mix } = poseAt(time, from, to);
        const pts = project(time, from, to);
        for (let i = 0; i < SAMPLES; i++) {
          const x =
            (1 - mix) * Math.sin(from.ratio[0] * sampleT(i)) +
            mix * Math.sin(to.ratio[0] * sampleT(i));
          expect(pts[i * 3]).toBeCloseTo(32 + AMP * x, 6);
        }
      }
    }
  });

  it('never jumps: every point moves under 8 units per 60 fps frame', () => {
    for (const [from, to] of MOVES) {
      let prev = project(0, from, to);
      let worst = 0;
      for (const time of grid(1 / 60).slice(1)) {
        const next = project(time, from, to);
        for (let i = 0; i < SAMPLES; i++) {
          const dx = next[i * 3] - prev[i * 3];
          const dy = next[i * 3 + 1] - prev[i * 3 + 1];
          worst = Math.max(worst, Math.hypot(dx, dy));
        }
        prev = next;
      }
      // Fast but continuous. A seam would jump tens of units.
      expect(worst).toBeLessThan(8);
    }
  });

  it('stays inside its box', () => {
    for (const [from, to] of MOVES) {
      for (const time of grid(0.02)) {
        const pts = project(time, from, to);
        for (let i = 0; i < SAMPLES; i++) {
          expect(Math.abs(pts[i * 3] - 32)).toBeLessThanOrEqual(AMP + 1e-6);
          expect(Math.abs(pts[i * 3 + 1] - 32)).toBeLessThanOrEqual(AMP + 1e-6);
          expect(Math.abs(pts[i * 3 + 2])).toBeLessThanOrEqual(1 + 1e-9);
        }
      }
    }
  });
});

describe('lissajous depth paths', () => {
  it('draws every segment exactly once across the depth bins', () => {
    const render = createRenderer();
    for (const [from, to] of MOVES) {
      for (const time of [0, 0.3, 0.5, 0.8, 1.2]) {
        const { paths } = render(time, from, to);
        expect(paths).toHaveLength(DEPTH_BINS);
        expect(paths.join('').match(/L/g)).toHaveLength(SAMPLES);
        for (const d of paths) {
          if (d) expect(d.startsWith('M')).toBe(true);
          expect(d).not.toContain('NaN');
        }
      }
    }
  });

  it('paints the logo’s centre crossing in front at rest', () => {
    expect(REST_PATHS[DEPTH_BINS - 1].startsWith('M32 32L')).toBe(true);
    expect(REST_PATHS).toEqual(createRenderer()(0, LOGO, LOGO).paths);
  });

  it('keeps each renderer’s buffers separate', () => {
    const a = createRenderer();
    const b = createRenderer();
    const atRest = [...a(0, LOGO, LOGO).paths];
    b(0.4, LOGO, CURVES[2]);
    expect(a(0, LOGO, LOGO).paths).toEqual(atRest);
  });
});

describe('lissajous weight, wake and fade', () => {
  it('draws sparse ratios heavier than dense ones, continuously', () => {
    const atRest = (curve: Curve) => weightScale(poseAt(0, curve, curve));
    expect(atRest(LOGO)).toBe(1);
    expect(atRest({ ratio: [1, 2], phase: 0 })).toBeGreaterThan(1);
    expect(atRest({ ratio: [4, 3], phase: 0 })).toBeLessThan(1);
    for (const [from, to] of MOVES) {
      let prev = weightScale(poseAt(0, from, to));
      for (const time of grid(1 / 60).slice(1)) {
        const next = weightScale(poseAt(time, from, to));
        expect(Math.abs(next - prev)).toBeLessThan(0.02);
        prev = next;
      }
    }
  });

  it('wakes as a move starts, and fades back only once it has landed', () => {
    expect(wakeProgress(0)).toBe(0);
    expect(wakeProgress(0.3)).toBeGreaterThan(0);
    expect(wakeProgress(MORPH_S)).toBe(1);
    expect(sleepProgress(MORPH_S)).toBe(0);
    expect(sleepProgress(END_S)).toBe(1);
    let prev = 0;
    for (let t = MORPH_S; t <= END_S; t += 0.02) {
      expect(sleepProgress(t)).toBeGreaterThanOrEqual(prev);
      prev = sleepProgress(t);
    }
  });
});
