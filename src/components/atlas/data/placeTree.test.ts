import { describe, expect, it } from 'vitest';
import type { RegionId } from '@/components/atlas/types';
import {
  CITY_LANES,
  CONTINENTS,
  continentOf,
  placeLaneOf,
  placeLanes,
  placePath,
  shadeOf,
} from './placeTree';
import type { TimelineEvent } from './timelineIndex';

let n = 0;
const t = (regionId: RegionId, cityId: string | null): TimelineEvent => ({
  event: {
    id: `e${++n}`,
    year: 1960,
    location: { lat: 0, lng: 0, city: '', country: '' },
    genre: [],
    title: '',
    description: '',
    tags: [],
  },
  year: 1960,
  lane: 'roots',
  lanes: [],
  regionId,
  cityId,
});

const INDEX: TimelineEvent[] = [
  ...[
    'new-orleans',
    'new-orleans',
    'memphis',
    'chicago',
    'detroit',
    'nashville',
    'atlanta',
    null,
  ].map((city) => t('north-america', city)),
  t('south-america', 'rio-de-janeiro'),
  t('west-europe', 'paris'),
  t('north-europe', 'london'),
  t('west-africa', 'lagos'),
  t('east-asia', 'tokyo'),
];

describe('the place tree', () => {
  it('puts every region in one continent', () => {
    const regions = CONTINENTS.flatMap((c) => c.regions);
    expect(new Set(regions).size).toBe(18);
    expect(continentOf('west-asia')).toBe('africa-me');
    expect(continentOf('oceania')).toBe('asia-pacific');
  });

  it('starts as the four continents', () => {
    const lanes = placeLanes(INDEX, new Set());
    expect(lanes.map((l) => l.id)).toEqual([
      'americas',
      'europe',
      'africa-me',
      'asia-pacific',
    ]);
    expect(lanes[0].splits).toBe(true);
    // One region with events: nothing to split into.
    expect(lanes[2].splits).toBe(false);
  });

  it('splits an open continent into its regions with events, in its shades', () => {
    const lanes = placeLanes(INDEX, new Set(['americas']));
    expect(lanes.slice(0, 2).map((l) => l.id)).toEqual([
      'north-america',
      'south-america',
    ]);
    expect(lanes[0]).toMatchObject({ depth: 2, parent: 'americas' });
    expect(lanes[0].color).not.toBe(lanes[1].color);
    expect(lanes[2].id).toBe('europe');
  });

  it('splits an open region into its busiest cities and the rest', () => {
    const lanes = placeLanes(INDEX, new Set(['americas', 'north-america']));
    const cities = lanes.filter((l) => l.parent === 'north-america');
    expect(cities[0].id).toBe('city:new-orleans');
    expect(cities).toHaveLength(CITY_LANES + 1);
    expect(cities.at(-1)!.id).toBe('rest:north-america');
  });

  it('files each event in the lane that holds it', () => {
    const lanes = new Set(
      placeLanes(INDEX, new Set(['americas', 'north-america'])).map(
        (l) => l.id,
      ),
    );
    expect(placeLaneOf(INDEX[0], lanes)).toBe('city:new-orleans');
    // Ties go by name: Nashville is sixth, so it shares the rest's lane.
    expect(placeLaneOf(INDEX[5], lanes)).toBe('rest:north-america');
    expect(placeLaneOf(INDEX[7], lanes)).toBe('rest:north-america');
    expect(placeLaneOf(INDEX[8], lanes)).toBe('south-america');
    expect(placeLaneOf(INDEX[9], lanes)).toBe('europe');
  });

  it('walks a lane back to its continent', () => {
    expect(placePath('north-america')).toEqual(['americas', 'north-america']);
    expect(placePath('rest:west-africa')).toEqual([
      'africa-me',
      'west-africa',
      'rest:west-africa',
    ]);
  });

  it('shades a parent’s hue for each child', () => {
    const a = shadeOf('#fb7185', 0, 3, 16);
    const b = shadeOf('#fb7185', 2, 3, 16);
    expect(a).toMatch(/^#[0-9a-f]{6}$/);
    expect(a).not.toBe(b);
  });
});
