import { afterEach, describe, expect, it } from 'vitest';
import type { HistoricalEvent } from '@/components/atlas/types';
import { MUSIC_HISTORY } from '@/content/contentStore';
import {
  getTimelineEvent,
  getTimelineIndex,
  lowerBound,
} from './timelineIndex';

const event = (
  id: string,
  year: number,
  city: string,
  genre: string[],
  [lat, lng] = [29.95, -90.07],
): HistoricalEvent => ({
  id,
  year,
  location: { lat, lng, city, country: 'United States' },
  genre,
  title: id,
  description: '',
  tags: [],
});

afterEach(() => {
  MUSIC_HISTORY.length = 0;
});

describe('the timeline index', () => {
  it('is empty before content loads', () => {
    expect(getTimelineIndex()).toEqual([]);
  });

  it('orders events by year and places each in a stream, region and city', () => {
    MUSIC_HISTORY.push(
      event('b', 1960, 'Memphis', ['Soul', 'Rock'], [35.15, -90.05]),
      event('a', 1917, 'New Orleans', ['Jazz']),
    );
    const index = getTimelineIndex();
    expect(index.map((t) => t.event.id)).toEqual(['a', 'b']);
    expect(index[0]).toMatchObject({
      stream: 'blues-jazz-soul',
      regionId: 'north-america',
      cityId: 'new-orleans',
    });
    expect(index[1].streams).toEqual(['blues-jazz-soul', 'rock-pop']);
    expect(getTimelineEvent('b')?.cityId).toBe('memphis');
  });

  it('rebuilds when content changes', () => {
    MUSIC_HISTORY.push(event('a', 1917, 'New Orleans', ['Jazz']));
    expect(getTimelineIndex()).toHaveLength(1);
    MUSIC_HISTORY.push(event('c', 1990, 'New Orleans', ['Hip Hop']));
    expect(getTimelineIndex()).toHaveLength(2);
    expect(getTimelineEvent('c')?.stream).toBe('beats');
  });
});

describe('lowerBound', () => {
  const sorted = [1900, 1920, 1920, 1950].map((year) => ({ year }));

  it('finds the first year at or after the one asked for', () => {
    expect(lowerBound(sorted, 1800)).toBe(0);
    expect(lowerBound(sorted, 1920)).toBe(1);
    expect(lowerBound(sorted, 1921)).toBe(3);
    expect(lowerBound(sorted, 2000)).toBe(4);
  });
});
