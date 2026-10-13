import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Geometry } from 'geojson';
import { describe, expect, it, vi } from 'vitest';
import { GEO_FILES } from '@/components/atlas/data/geoFiles';
import { decodeTopology } from '@/components/atlas/data/geoLoader';
import type { FlyTarget, SelectedLocation } from '@/components/atlas/types';
import {
  CITY_MAX_ZOOM,
  COUNTRY_MAX_ZOOM,
  POINTS_MAX_ZOOM,
  STATE_MAX_ZOOM,
  findRegion,
  fitCamera,
  frameCamera,
  landingInsets,
  pointsBounds,
  regionBounds,
  type Bounds,
  type Outlines,
} from './mapFraming';

/** The outlines the app ships (public/geo, scripts/buildGeo.mjs). */
const read = (url: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'public', url), 'utf8'));
const OUTLINES: Outlines = {
  countries: decodeTopology(read(GEO_FILES.countries), 'countries'),
  states: decodeTopology(read(GEO_FILES.states), 'states'),
};

/** A place's framed bounds, rounded to a degree. */
function framed(place: SelectedLocation): number[] {
  const region = findRegion(place, OUTLINES);
  if (!region || region === 'loading') throw new Error(`no ${place.type}`);
  const bounds = regionBounds(region.feature.geometry, region.anchors)!;
  return bounds.flat().map(Math.round);
}
const country = (name: string, iso = ''): SelectedLocation => ({
  type: 'country',
  name,
  iso,
});

describe('framing a country on its outline', () => {
  it('frames the lower 48 for the United States, not Alaska or Hawaii', () => {
    expect(framed(country('United States of America', 'USA'))).toEqual([
      -125, 25, -67, 49,
    ]);
  });

  it('keeps the islands close by: Sicily and Sardinia, Tasmania, Hokkaido', () => {
    const [, italySouth] = framed(country('Italy', 'ITA'));
    expect(italySouth).toBeLessThanOrEqual(37);
    const [, australiaSouth] = framed(country('Australia', 'AUS'));
    expect(australiaSouth).toBeLessThanOrEqual(-43);
    const [, , , japanNorth] = framed(country('Japan', 'JPN'));
    expect(japanNorth).toBeGreaterThanOrEqual(45);
  });

  it('leaves the far ones out: Svalbard, the Canaries, the Galápagos', () => {
    expect(framed(country('Norway'))[3]).toBeLessThan(72);
    expect(framed(country('Spain', 'ESP'))[1]).toBeGreaterThan(35);
    expect(framed(country('Ecuador', 'ECU'))[0]).toBeGreaterThan(-82);
  });

  it('follows a chain of islands across a whole archipelago', () => {
    expect(framed(country('Indonesia', 'IDN'))).toEqual([95, -10, 141, 5]);
  });

  it('frames the part with the music: the Malaysian peninsula, where Kuala Lumpur is', () => {
    const [west, , east] = framed(country('Malaysia', 'MYS'));
    expect(west).toBeGreaterThanOrEqual(99);
    expect(east).toBeLessThanOrEqual(105);
  });

  it('finds a country by the dataset’s name through its code, never by -99', () => {
    expect(framed(country('US', 'USA'))).toEqual(
      framed(country('United States of America', 'USA')),
    );
    // France and Norway both carry ISO_A3 -99: only the name may find them.
    expect(findRegion(country('Nowhere', '-99'), OUTLINES)).toBeNull();
  });

  it('frames a state by its own outline', () => {
    expect(
      framed({ type: 'state', name: 'Louisiana', country: 'United States' }),
    ).toEqual([-94, 29, -89, 33]);
  });

  it('waits while the outlines load', () => {
    expect(
      findRegion(country('Brazil', 'BRA'), { countries: null, states: null }),
    ).toBe('loading');
  });
});

describe('regionBounds', () => {
  const square = (w: number, s: number, size: number): number[][] => [
    [w, s],
    [w + size, s],
    [w + size, s + size],
    [w, s + size],
    [w, s],
  ];
  const parts = (...rings: number[][][]): Geometry => ({
    type: 'MultiPolygon',
    coordinates: rings.map((ring) => [ring]),
  });

  it('takes the largest part when no city says otherwise', () => {
    expect(regionBounds(parts(square(0, 0, 10), square(40, 0, 2)))).toEqual([
      [0, 0],
      [10, 10],
    ]);
  });

  it('takes the part holding the most music cities over a larger one', () => {
    expect(
      regionBounds(parts(square(0, 0, 10), square(40, 0, 2)), [
        { lat: 1, lng: 41 },
      ]),
    ).toEqual([
      [40, 0],
      [42, 2],
    ]);
  });

  it('is null for no outline', () => {
    expect(regionBounds(null)).toBeNull();
  });
});

describe('pointsBounds', () => {
  it('frames points, across the antimeridian when that is shorter', () => {
    expect(
      pointsBounds([
        { lat: 35.7, lng: 139.7 },
        { lat: 34.05, lng: -118.24 },
      ]),
    ).toEqual([
      [139.7, 34.05],
      [241.76, 35.7],
    ]);
    expect(pointsBounds([])).toBeNull();
  });
});

describe('landingInsets', () => {
  const measured = { top: 64, right: 0, bottom: 140, left: 0 };
  const desktop = { phone: false, width: 1360, height: 780 };

  it('assumes the details card a framed flight opens, until it is measured', () => {
    expect(landingInsets(measured, desktop, true).left).toBe(496);
    expect(landingInsets({ ...measured, left: 380 }, desktop, true).left).toBe(
      380,
    );
  });

  it('assumes the phone’s sheet at half', () => {
    const phone = { phone: true, width: 375, height: 700 };
    expect(landingInsets(measured, phone, true)).toEqual({
      ...measured,
      bottom: 350,
    });
  });

  it('leaves an unframed flight as measured', () => {
    expect(landingInsets(measured, desktop, false)).toBe(measured);
  });
});

describe('frameCamera', () => {
  const at = (frame: FlyTarget['frame']): FlyTarget => ({
    lat: 10,
    lng: 20,
    zoom: 6,
    frame,
  });
  const fit = vi.fn((bounds: Bounds, maxZoom: number) => ({
    center: [
      (bounds[0][0] + bounds[1][0]) / 2,
      (bounds[0][1] + bounds[1][1]) / 2,
    ] as [number, number],
    zoom: maxZoom,
  }));

  it('fits a country, a state and an artist’s points no closer than their caps', () => {
    frameCamera(
      at({ kind: 'region', place: country('Brazil', 'BRA') }),
      OUTLINES,
      fit,
      800,
    );
    expect(fit).toHaveBeenLastCalledWith(expect.anything(), COUNTRY_MAX_ZOOM);
    frameCamera(
      at({
        kind: 'region',
        place: { type: 'state', name: 'Ohio', country: 'United States' },
      }),
      OUTLINES,
      fit,
      800,
    );
    expect(fit).toHaveBeenLastCalledWith(expect.anything(), STATE_MAX_ZOOM);
    frameCamera(
      at({ kind: 'points', points: [{ lat: 40, lng: -74 }] }),
      OUTLINES,
      fit,
      800,
    );
    expect(fit).toHaveBeenLastCalledWith(expect.anything(), POINTS_MAX_ZOOM);
  });

  it('fits a city to its outline, no closer than its cap', () => {
    const vienna = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [16.18, 48.12],
            [16.58, 48.12],
            [16.58, 48.32],
            [16.18, 48.32],
            [16.18, 48.12],
          ],
        ],
      },
    };
    const camera = frameCamera(
      {
        lat: 48.21,
        lng: 16.37,
        zoom: 10,
        frame: { kind: 'city', zoom: 10, cityId: 'vienna' },
      },
      { ...OUTLINES, city: (id) => (id === 'vienna' ? vienna : null) },
      fit,
      800,
    );
    expect(fit).toHaveBeenLastCalledWith(
      [
        [16.18, 48.12],
        [16.58, 48.32],
      ],
      CITY_MAX_ZOOM,
    );
    expect(camera.zoom).toBe(CITY_MAX_ZOOM);
  });

  it('centres a city at its own zoom', () => {
    expect(
      frameCamera(at({ kind: 'city', zoom: 10 }), OUTLINES, fit, 800),
    ).toEqual({
      center: [20, 10],
      zoom: 10,
    });
  });

  it('falls back to the target itself for a place it cannot find', () => {
    const camera = frameCamera(
      at({ kind: 'region', place: country('Atlantis') }),
      OUTLINES,
      fit,
      800,
    );
    expect(camera.center).toEqual([20, 10]);
  });
});

describe('fitCamera', () => {
  /** Web Mercator's y, in px at `zoom` (as fitCamera measures). */
  const y = (lat: number, zoom: number) =>
    (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI)) *
    512 *
    2 ** zoom;
  const view = { width: 1352, height: 775 };
  const insets = { top: 56, right: 0, bottom: 128, left: 496 };
  const louisiana: Bounds = [
    [-94.04, 28.93],
    [-88.82, 33.02],
  ];

  it('fits a tall place by its height, inside the margin', () => {
    const { zoom, center } = fitCamera(louisiana, view, insets, 12, 32);
    // 775 - 56 - 128 - 64 = 527 px of height, all used.
    expect(y(33.02, zoom) - y(28.93, zoom)).toBeCloseTo(527, 0);
    expect(center[0]).toBeCloseTo(-91.43);
  });

  it('fits a wide place by its width', () => {
    const wide: Bounds = [
      [-125, 40],
      [-67, 41],
    ];
    const { zoom } = fitCamera(wide, view, insets, 12, 32);
    // 1352 - 496 - 64 = 792 px of width.
    expect((58 / 360) * 512 * 2 ** zoom).toBeCloseTo(792, 0);
  });

  it('comes no closer than its cap', () => {
    const tiny: Bounds = [
      [6.0, 49.4],
      [6.5, 50.2],
    ];
    expect(fitCamera(tiny, view, insets, 7).zoom).toBe(7);
  });

  it('centres a place framed across the antimeridian on the map’s side of it', () => {
    const pacific: Bounds = [
      [139.7, 34],
      [241.76, 36],
    ];
    expect(fitCamera(pacific, view, insets, 9).center[0]).toBeCloseTo(-169.27);
  });
});
