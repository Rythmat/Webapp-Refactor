import { describe, expect, it } from 'vitest';
import type { HistoricalEvent } from '@/components/atlas/types';
import { buildPathwayGlobeData } from './pathwayGlobeData';

const evt = (
  id: string,
  lat: number,
  lng: number,
  city: string,
): HistoricalEvent => ({
  id,
  year: 1960,
  location: { lat, lng, city, country: 'United States' },
  genre: ['Jazz'],
  title: `Event ${id}`,
  description: '',
  tags: [],
});

const CHAIN = [
  evt('a', 29.95, -90.07, 'New Orleans'),
  evt('b', 41.88, -87.63, 'Chicago'),
  evt('c', 51.5, -0.12, 'London'),
];

describe('buildPathwayGlobeData', () => {
  it('one marker per stop, one arc per consecutive pair', () => {
    const { markers, arcs } = buildPathwayGlobeData(CHAIN, 0);
    expect(markers).toHaveLength(3);
    expect(arcs).toHaveLength(2);
    expect(markers[0].location).toEqual([29.95, -90.07]);
    expect(arcs[0].from).toEqual([29.95, -90.07]);
    expect(arcs[0].to).toEqual([41.88, -87.63]);
  });

  it('emphasizes + labels the active stop only', () => {
    const { markers } = buildPathwayGlobeData(CHAIN, 1);
    expect(markers[1].label).toBe('Chicago');
    expect(markers[0].label).toBe('');
    expect(markers[1].size).toBeGreaterThan(markers[0].size ?? 0);
  });

  it('marker colors are 0–1 rgb triples', () => {
    const { markers } = buildPathwayGlobeData(CHAIN, 0);
    for (const m of markers) {
      expect(m.color).toHaveLength(3);
      for (const c of m.color ?? []) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it('arcHeight stays within cobe bounds', () => {
    const { arcHeight } = buildPathwayGlobeData(CHAIN, 0);
    expect(arcHeight).toBeGreaterThanOrEqual(0.28);
    expect(arcHeight).toBeLessThanOrEqual(0.72);
  });

  it('degenerate pathways: 1 stop → 0 arcs, 0 stops → empty', () => {
    expect(buildPathwayGlobeData([CHAIN[0]], 0).arcs).toHaveLength(0);
    const empty = buildPathwayGlobeData([], 0);
    expect(empty.markers).toHaveLength(0);
    expect(empty.arcs).toHaveLength(0);
    expect(empty.arcHeight).toBe(0.28);
  });
});
