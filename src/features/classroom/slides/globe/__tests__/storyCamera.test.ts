import type { Feature } from 'geojson';
import { describe, expect, it } from 'vitest';
import {
  distanceKm,
  flightMs,
  insideRings,
  regionAt,
  sameRegion,
} from '../storyCamera';

/** A square outline, [west, south] to [east, north]. */
const square = (
  properties: Record<string, unknown>,
  [west, south, east, north]: [number, number, number, number],
): Feature => ({
  type: 'Feature',
  properties,
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  },
});

const indiana = square(
  { name: 'Indiana', iso_a2: 'US' },
  [-88, 37.8, -84.8, 41.8],
);
const usa = square(
  { NAME: 'United States of America', ISO_A2: 'US' },
  [-125, 25, -66, 49],
);
const cameroon = square({ NAME: 'Cameroon', ISO_A2: 'CM' }, [9.8, 2, 16, 13]);

describe('the lesson globe’s camera', () => {
  it('lifts the state a place is in, before its country', () => {
    const gary = regionAt([41.58, -87.35], {
      countries: [usa, cameroon],
      states: [indiana],
    });
    expect(gary?.place).toEqual({
      type: 'state',
      name: 'Indiana',
      country: 'United States',
    });
    expect(insideRings(gary!.rings, [39.77, -86.16])).toBe(true);
    expect(insideRings(gary!.rings, [34.05, -118.24])).toBe(false);
  });

  it('lifts the country elsewhere, a coastal city just off its outline included', () => {
    // Douala sits a few km west of this coarse Cameroon.
    const douala = regionAt([4.05, 9.77], {
      countries: [usa, cameroon],
      states: [indiana],
    });
    expect(douala?.place).toMatchObject({ type: 'country' });
    expect(
      regionAt([0, -30], { countries: [usa, cameroon], states: [] }),
    ).toBeNull();
    expect(regionAt([4, 10], { countries: null, states: null })).toBeNull();
  });

  it('knows one region from another', () => {
    const a = {
      type: 'state' as const,
      name: 'California',
      country: 'United States',
    };
    expect(sameRegion(a, { ...a })).toBe(true);
    expect(sameRegion(a, { ...a, name: 'Indiana' })).toBe(false);
    expect(sameRegion(a, null)).toBe(false);
  });

  it('flies slowly, longer the further it goes', () => {
    const gary: [number, number] = [41.58, -87.35];
    const detroit: [number, number] = [42.36, -83.09];
    const tokyo: [number, number] = [35.71, 139.75];
    expect(distanceKm(gary, detroit)).toBeGreaterThan(300);
    expect(distanceKm(gary, detroit)).toBeLessThan(450);
    expect(flightMs(0)).toBeGreaterThanOrEqual(3000);
    expect(flightMs(distanceKm(gary, detroit))).toBeLessThan(
      flightMs(distanceKm(detroit, tokyo)),
    );
    expect(flightMs(20000)).toBeLessThanOrEqual(8000);
  });
});
