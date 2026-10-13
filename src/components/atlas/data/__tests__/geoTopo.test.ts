import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Feature } from 'geojson';
import type { Topology } from 'topojson-specification';
import { describe, expect, it } from 'vitest';
import { resolveIso } from '@/components/atlas/components/Globe/globeVisuals';
import { GEO_FILES } from '../geoFiles';
import { decodeTopology } from '../geoLoader';
import reference from './fixtures/geoReference.json';

/**
 * The committed TopoJSON (scripts/buildGeo.mjs) against what the browser used
 * to make of Natural Earth's GeoJSON: the same features in the same order,
 * with the same names and ids, in the same places. The reference was written
 * by the same build from the GeoJSON itself.
 */
const read = (url: string): Topology =>
  JSON.parse(readFileSync(join(process.cwd(), 'public', url), 'utf8'));

function bbox(feat: Feature): number[] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const walk = (c: unknown): void => {
    const p = c as number[] | unknown[];
    if (typeof p[0] === 'number') {
      const [x, y] = p as number[];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    } else (p as unknown[]).forEach(walk);
  };
  walk((feat.geometry as { coordinates: unknown }).coordinates);
  return [minX, minY, maxX, maxY];
}

/** 0.05° of slack: quantization and the states' light simplification. */
const expectNear = (actual: number[], expected: number[], label: string) =>
  actual.forEach((v, i) =>
    expect(Math.abs(v - expected[i]), `${label} bbox[${i}]`).toBeLessThan(0.05),
  );

describe('the Globe outlines (TopoJSON)', () => {
  const countries = decodeTopology(read(GEO_FILES.countries), 'countries');
  const states = decodeTopology(read(GEO_FILES.states), 'states');

  it('decode to the same countries, names and ids as the GeoJSON did', () => {
    expect(countries).toHaveLength(reference.countries.length);
    countries.forEach((feat, i) => {
      const { bbox: box, ...props } = reference.countries[i];
      expect(feat.properties, props.NAME).toEqual(props);
      expectNear(bbox(feat), box, props.NAME);
    });
  });

  it('keep the browser-side fixes: French Guiana is its own country', () => {
    const iso = countries.map((f) => resolveIso(f));
    expect(iso).toContain('GUF');
    const france = countries.find((f) => resolveIso(f) === 'FRA')!;
    // Metropolitan France only: nothing west of the Atlantic.
    expect(bbox(france)[0]).toBeGreaterThan(-10);
  });

  it('give every country an id the globe can colour', () => {
    for (const feat of countries)
      expect(resolveIso(feat)).toMatch(/^[A-Z]{3}$/);
  });

  it('decode to the same US states and Canadian provinces', () => {
    expect(states).toHaveLength(reference.states.length);
    states.forEach((feat, i) => {
      const { bbox: box, ...props } = reference.states[i];
      expect(feat.properties, props.name).toEqual(props);
      expectNear(bbox(feat), box, props.name);
    });
    const michigan = states.find((f) => f.properties?.name === 'Michigan')!;
    // The two peninsulas, plus the islands the fix keeps.
    expect(michigan.geometry.type).toBe('MultiPolygon');
  });

  it('are a fraction of the GeoJSON they replace', () => {
    const size = (url: string) =>
      readFileSync(join(process.cwd(), 'public', url)).length;
    expect(size(GEO_FILES.countries)).toBeLessThan(150_000);
    expect(size(GEO_FILES.states)).toBeLessThan(250_000);
  });
});
