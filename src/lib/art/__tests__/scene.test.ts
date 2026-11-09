import { beforeEach, describe, expect, it } from 'vitest';
import { contours, helix, rings, strands, type BuildInput } from '../builders';
import {
  ART_KINDS,
  buildArtScene,
  clearArtSceneCache,
  type ArtKind,
} from '../index';
import { curvePath, fmt, joinNumbers, type ArtLine } from '../path';
import { artRandom } from '../seed';

const DENSITIES = ['thumb', 'tile', 'hero'] as const;
const ASPECTS = [0.75, 1, 2.4, 10];

const input = (seed: string, loop = false): BuildInput => ({
  rng: artRandom(seed),
  width: 400,
  height: 300,
  density: 'tile',
  loop,
});

const pointsOf = (lines: ArtLine[]) =>
  lines.flatMap((l) => ('points' in l ? l.points : []));

beforeEach(clearArtSceneCache);

describe('path data', () => {
  it('writes numbers as short as SVG reads them', () => {
    expect([fmt(0.5), fmt(-0.5), fmt(2), fmt(-0.04), fmt(12.345)]).toEqual([
      '.5',
      '-.5',
      '2',
      '0',
      '12.3',
    ]);
    expect(joinNumbers([1.2, 0.5, -3, 4])).toBe('1.2.5-3 4');
  });

  it('closes a loop where it began', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const d = curvePath(square, true);
    expect(d.startsWith('M0 0')).toBe(true);
    expect(d.endsWith('z')).toBe(true);
    expect(d.match(/c/g)).toHaveLength(4);
  });
});

describe('the builders', () => {
  it.each([
    ['strands', strands],
    ['contours', contours],
    ['helix', helix],
  ] as const)('%s: the same seed draws the same lines', (_name, build) => {
    expect(build(input('a'))).toEqual(build(input('a')));
    expect(build(input('a'))).not.toEqual(build(input('b')));
  });

  it('rings: ripples and orbits, from the same seed, the same', () => {
    expect(rings(input('a'), 'ripple')).toEqual(rings(input('a'), 'ripple'));
    expect(rings(input('a'), 'orbit')).not.toEqual(rings(input('a'), 'ripple'));
  });

  it.each([
    ['strands', strands],
    ['contours', contours],
    ['helix', helix],
  ] as const)('%s: every point is a number, near the frame', (_n, build) => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      for (const p of pointsOf(build(input(seed)))) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        expect(p.x).toBeGreaterThan(-400);
        expect(p.x).toBeLessThan(800);
        expect(p.y).toBeGreaterThan(-300);
        expect(p.y).toBeLessThan(600);
      }
    }
  });

  it.each([
    ['strands', strands],
    ['helix', helix],
  ] as const)(
    '%s: a looping drawing repeats every frame, so it slides seamlessly',
    (_n, build) => {
      for (const seed of ['a', 'b', 'c']) {
        for (const line of build(input(seed, true))) {
          if (!('points' in line)) continue;
          const half = (line.points.length - 1) / 2;
          // The point one frame along is the same height.
          for (let s = 0; s <= half; s++) {
            expect(line.points[s + half].y).toBeCloseTo(line.points[s].y, 6);
          }
        }
      }
    },
  );
});

describe('a scene', () => {
  it('is cached: the same spec, the same object', () => {
    const spec = { seed: 'x', density: 'tile' as const, aspect: 0.75 };
    expect(buildArtScene(spec)).toBe(buildArtScene({ ...spec }));
  });

  it('picks its kind and palette from the seed unless told', () => {
    const picked = buildArtScene({ seed: 'x', density: 'tile', aspect: 1 });
    expect(ART_KINDS).toContain(picked.kind);
    const told = buildArtScene({
      seed: 'x',
      kind: 'helix',
      palette: 'lagoon',
      density: 'tile',
      aspect: 1,
    });
    expect([told.kind, told.palette]).toEqual(['helix', 'lagoon']);
  });

  it('loops only the flowing kinds, two frames wide', () => {
    for (const kind of ART_KINDS) {
      const scene = buildArtScene({
        seed: 's',
        kind,
        density: 'hero',
        aspect: 2.4,
        loop: true,
      });
      const flow = kind === 'strands' || kind === 'helix';
      expect(scene.loop).toBe(flow);
      expect(scene.viewWidth).toBe(flow ? scene.width * 2 : scene.width);
      // A sliding cover's colours repeat every frame along x (no seam).
      if (flow) {
        expect(scene.gradient).toMatchObject({
          x1: 0,
          x2: scene.width,
          y1: 0,
          y2: 0,
          spread: 'repeat',
        });
      }
    }
  });

  it('draws in the spectrum unless told, with a glow behind the brightest lines', () => {
    const scene = buildArtScene({ seed: 'g', density: 'tile', aspect: 0.75 });
    expect(scene.palette).toBe('spectrum');
    const [glow, ...lines] = scene.layers;
    expect(glow.glow).toBe(true);
    expect(glow.d).toBe(lines[lines.length - 1].d);
    expect(glow.widthScale).toBeGreaterThan(1);
    expect(glow.opacity).toBeLessThan(lines[0].opacity);
    expect(scene.fadeAngle).toBeGreaterThanOrEqual(150);
    expect(scene.fadeAngle).toBeLessThanOrEqual(210);
  });

  it('keeps every cover within five paths, and a tile within budget', () => {
    for (const kind of ART_KINDS as readonly ArtKind[]) {
      for (const density of DENSITIES) {
        for (const aspect of ASPECTS) {
          for (const seed of ['a', 'b', 'c']) {
            const scene = buildArtScene({ seed, kind, density, aspect });
            expect(scene.layers.length).toBeGreaterThan(0);
            expect(scene.layers.length).toBeLessThanOrEqual(5);
            const budget = density === 'hero' ? 48_000 : 16_000;
            expect(
              scene.bytes,
              `${kind} ${density} ${aspect}`,
            ).toBeLessThanOrEqual(budget);
            expect(scene.layers.every((l) => !/NaN|Infinity/.test(l.d))).toBe(
              true,
            );
          }
        }
      }
    }
  });

  it('keeps a looping hero within budget', () => {
    for (const kind of ['strands', 'helix'] as const) {
      const scene = buildArtScene({
        seed: 'jam',
        kind,
        density: 'hero',
        aspect: 2.4,
        loop: true,
      });
      expect(scene.bytes).toBeLessThanOrEqual(80_000);
    }
  });
});
