/**
 * The lifted region, pure: which place lifts, the strips it is cut into, and
 * the gradient of its events' eras.
 */
import type { Geometry, Position } from 'geojson';
import { describe, expect, it } from 'vitest';
import { ERA_HEX } from '@/components/atlas/data/musicalEras';
import {
  STRIPS,
  busiestColor,
  clipRing,
  cssRgb,
  edgeGradient,
  eraRamp,
  liftFrame,
  liftPlaceOf,
  rampAt,
  sliceRegion,
} from './regionLift';

const square = (x: number, y: number, w: number, h: number): Position[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
  [x, y],
];
const area = (ring: readonly Position[]) => {
  let twice = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    twice += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(twice) / 2;
};
const box = (w: number, s: number, e: number, n: number) =>
  [
    [w, s],
    [e, n],
  ] as [[number, number], [number, number]];

describe('which place lifts', () => {
  it('lifts a country or a state itself', () => {
    const brazil = { type: 'country', name: 'Brazil', iso: 'BRA' } as const;
    expect(liftPlaceOf(brazil)).toBe(brazil);
    expect(liftPlaceOf(null)).toBeNull();
  });

  it('lifts a city’s state in the US and Canada, else its country', () => {
    expect(liftPlaceOf({ type: 'city', id: 'new-orleans' })).toEqual({
      type: 'state',
      name: 'Louisiana',
      country: 'United States',
    });
    expect(liftPlaceOf({ type: 'city', id: 'london' })).toMatchObject({
      type: 'country',
      iso: 'GBR',
    });
    expect(liftPlaceOf({ type: 'city', id: 'nowhere' })).toBeNull();
  });
});

describe('what a flight frames', () => {
  it('frames the region a city lifts', () => {
    expect(
      liftFrame({ kind: 'city', zoom: 10, cityId: 'new-orleans' }),
    ).toEqual({
      kind: 'region',
      place: { type: 'state', name: 'Louisiana', country: 'United States' },
    });
  });

  it('leaves a tour’s stop, and a place’s own frame, as they are', () => {
    const stop = { kind: 'city', zoom: 8 } as const;
    expect(liftFrame(stop)).toBe(stop);
    const region = {
      kind: 'region',
      place: { type: 'state', name: 'Ohio' },
    } as const;
    expect(liftFrame(region)).toBe(region);
    expect(liftFrame(undefined)).toBeUndefined();
  });
});

describe('the strips', () => {
  it('cuts across the longer side', () => {
    const wide: Geometry = {
      type: 'Polygon',
      coordinates: [square(0, 0, 40, 10)],
    };
    const tall: Geometry = {
      type: 'Polygon',
      coordinates: [square(0, 0, 10, 40)],
    };
    const xOf = (g: Geometry, b: ReturnType<typeof box>) =>
      sliceRegion(g, b, 4).strips.features[1].geometry.coordinates[0][0].map(
        (p) => p[0],
      );
    expect(Math.max(...xOf(wide, box(0, 0, 40, 10)))).toBeCloseTo(22.5, 1);
    expect(Math.max(...xOf(tall, box(0, 0, 10, 40)))).toBe(10);
  });

  it('keeps the whole region, its area adding up', () => {
    const ring = square(0, 0, 40, 10);
    const { strips } = sliceRegion(
      { type: 'Polygon', coordinates: [ring] },
      box(0, 0, 40, 10),
    );
    expect(strips.features).toHaveLength(STRIPS);
    const total = strips.features.reduce(
      (n, f) => n + f.geometry.coordinates.reduce((m, p) => m + area(p[0]), 0),
      0,
    );
    // The strips overlap a little, so no seam shows.
    expect(total).toBeGreaterThanOrEqual(400);
    expect(total).toBeLessThan(400 * 1.26);
    expect(strips.features.map((f) => f.id)).toEqual(
      strips.features.map((f) => f.properties.i),
    );
  });

  it('reads like a page: left to right, or top to bottom', () => {
    const t = (g: Geometry, b: ReturnType<typeof box>) => {
      const { strips } = sliceRegion(g, b, 4);
      return strips.features.map((f) => f.properties.t);
    };
    expect(
      t(
        { type: 'Polygon', coordinates: [square(0, 0, 40, 10)] },
        box(0, 0, 40, 10),
      ),
    ).toEqual([0.125, 0.375, 0.625, 0.875]);
    expect(
      t(
        { type: 'Polygon', coordinates: [square(0, 0, 10, 40)] },
        box(0, 0, 10, 40),
      ),
    ).toEqual([0.875, 0.625, 0.375, 0.125]);
  });

  it('puts parts beyond the framed bounds in the end strips', () => {
    const geometry: Geometry = {
      type: 'MultiPolygon',
      coordinates: [[square(0, 0, 40, 10)], [square(100, 0, 5, 5)]],
    };
    const { strips } = sliceRegion(geometry, box(0, 0, 40, 10));
    const last = strips.features[strips.features.length - 1];
    expect(last.properties.i).toBe(STRIPS - 1);
    expect(last.geometry.coordinates).toHaveLength(2);
  });

  it('keeps a hole a hole', () => {
    const geometry: Geometry = {
      type: 'Polygon',
      coordinates: [square(0, 0, 40, 10), square(18, 3, 4, 4)],
    };
    const { strips, outline } = sliceRegion(geometry, box(0, 0, 40, 10), 2);
    expect(strips.features[0].geometry.coordinates[0]).toHaveLength(2);
    expect(outline.features).toHaveLength(2);
  });

  it('carries a region over the antimeridian to the east of 180°', () => {
    const geometry: Geometry = {
      type: 'MultiPolygon',
      coordinates: [[square(100, 50, 79, 10)], [square(-179, 60, 9, 5)]],
    };
    const { outline } = sliceRegion(geometry, box(100, 50, 179, 60));
    const moved = outline.features[1].geometry.coordinates;
    expect(Math.min(...moved.map((p) => p[0]))).toBe(181);
  });

  it('leaves nothing of a ring outside the cut', () => {
    expect(clipRing(square(0, 0, 10, 10), 0, 20, 30)).toBeNull();
    const cut = clipRing(square(0, 0, 10, 10), 1, 2, 4)!;
    expect(cut[0]).toEqual(cut[cut.length - 1]);
    expect(area(cut)).toBeCloseTo(20);
  });
});

describe('the era gradient', () => {
  it('runs oldest to newest, each era as wide as its share', () => {
    const ramp = eraRamp([
      { id: 'early-modern', count: 1 },
      { id: 'postwar', count: 3 },
    ])!;
    expect(ramp.map((s) => s.t)).toEqual([0, 0.125, 0.625, 1]);
    expect(cssRgb(rampAt(ramp, 0))).toBe('rgb(139, 92, 246)');
    expect(cssRgb(rampAt(ramp, 1))).toBe('rgb(59, 130, 246)');
    // Past the first era's middle, it has begun to turn.
    expect(rampAt(ramp, 0.4)[0]).toBeLessThan(139);
    expect(rampAt(ramp, 0.4)[0]).toBeGreaterThan(59);
  });

  it('runs one era dark to light, and has none for no events', () => {
    const ramp = eraRamp([{ id: 'postwar', count: 5 }])!;
    expect(rampAt(ramp, 0)[2]).toBeLessThan(rampAt(ramp, 1)[2]);
    expect(eraRamp([])).toBeNull();
  });

  it('glows in the busiest era’s colour', () => {
    expect(
      busiestColor([
        { id: 'early-modern', count: 1 },
        { id: 'postwar', count: 3 },
      ]),
    ).toBe(ERA_HEX.postwar);
    expect(busiestColor([])).toBeNull();
  });
});

describe('the edge', () => {
  const ramp = eraRamp([{ id: 'postwar', count: 1 }]);
  const colorAt = (g: unknown[], t: number) => g[g.indexOf(t) + 1];

  it('is an ascending line-gradient, whatever the head', () => {
    for (const head of [null, 0, 0.5, 0.99]) {
      const g = edgeGradient(ramp, head);
      expect(g.slice(0, 3)).toEqual([
        'interpolate',
        ['linear'],
        ['line-progress'],
      ]);
      const ts = g.slice(3).filter((v) => typeof v === 'number') as number[];
      expect(ts[0]).toBe(0);
      expect(ts[ts.length - 1]).toBe(1);
      for (let i = 1; i < ts.length; i++) {
        expect(ts[i]).toBeGreaterThan(ts[i - 1]);
      }
    }
  });

  it('is white at the comet, and wraps round the ring', () => {
    const g = edgeGradient(ramp, 0.5);
    expect(colorAt(g, 0.5)).toBe('rgb(255, 255, 255)');
    expect(colorAt(g, 0)).not.toBe('rgb(255, 255, 255)');
    expect(colorAt(edgeGradient(ramp, 0), 1)).toBe('rgb(255, 255, 255)');
  });
});
