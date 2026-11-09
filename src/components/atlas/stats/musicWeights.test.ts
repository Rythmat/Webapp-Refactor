import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/components/atlas/data/timelineIndex';
import type { HistoricalEvent } from '@/components/atlas/types';
import { haloLevel, landLevel, weighMusic } from './musicWeights';

const t = (
  id: string,
  year: number,
  country: string,
  cityId: string | null,
): TimelineEvent => ({
  event: {
    id,
    year,
    location: { lat: 0, lng: 0, city: '', country },
    genre: [],
    title: id,
    description: '',
    tags: [],
  } as HistoricalEvent,
  year,
  lane: 'blues-jazz' as TimelineEvent['lane'],
  lanes: [],
  regionId: 'north-america' as TimelineEvent['regionId'],
  cityId,
});

// In year order, as the timeline index is.
const INDEX = [
  t('a', 1903, 'US', 'clarksdale'),
  t('b', 1925, 'United States', 'new-orleans'),
  t('c', 1955, 'US', 'new-orleans'),
  t('d', 1958, 'USA', 'new-orleans'),
  t('e', 1964, 'GB', 'liverpool'),
  t('f', 1964, 'United Kingdom', 'liverpool'),
  t('g', 2001, 'JM', null),
];

describe('music in the years shown', () => {
  it('counts each country under one key, however the events spell it', () => {
    const all = weighMusic(INDEX, null);
    expect(all.countries.get('US')).toBe(4);
    expect(all.countries.get('UK')).toBe(2);
    expect(all.countries.get('jamaica')).toBe(1);
    expect(all.maxCountry).toBe(4);
  });

  it('counts places and names their busiest era', () => {
    const all = weighMusic(INDEX, null);
    expect(all.places.get('new-orleans')).toEqual({
      events: 3,
      era: 'postwar',
    });
    expect(all.places.get('clarksdale')?.era).toBe('early-modern');
    expect(all.maxPlace).toBe(3);
    // An event with no place lights its country only.
    expect([...all.places.keys()]).not.toContain(null);
  });

  it('keeps to the years shown, both ends included', () => {
    const sixties = weighMusic(INDEX, { from: 1958, to: 1964 });
    expect(sixties.countries.get('US')).toBe(1);
    expect(sixties.countries.get('UK')).toBe(2);
    expect(sixties.places.get('new-orleans')?.events).toBe(1);
    expect(weighMusic(INDEX, { from: 1700, to: 1800 }).maxCountry).toBe(0);
  });

  it('lights land from a floor, and sizes halos by area', () => {
    expect(landLevel(0, 10)).toBe(0);
    expect(landLevel(1, 1000)).toBeGreaterThan(0.12);
    expect(landLevel(1000, 1000)).toBe(1);
    expect(landLevel(10, 1000)).toBeGreaterThan(landLevel(9, 1000));
    expect(haloLevel(25, 100)).toBe(0.5);
    expect(haloLevel(5, 0)).toBe(0);
  });
});
