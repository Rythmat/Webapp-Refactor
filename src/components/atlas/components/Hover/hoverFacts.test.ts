import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { HistoricalEvent } from '@/components/atlas/types';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { eraSplit, hoverFacts } from './hoverFacts';

const event = (id: string, year: number, city: string, country = 'US') =>
  ({
    id,
    year,
    title: `Moment ${id}`,
    description: '',
    genre: [],
    tags: [],
    location: { lat: 29.95, lng: -90.07, city, country },
  }) as HistoricalEvent;

beforeEach(() => {
  MUSIC_HISTORY.length = 0;
  MUSIC_HISTORY.push(
    event('a', 1903, 'New Orleans'),
    event('b', 1955, 'New Orleans'),
    event('c', 1958, 'New Orleans'),
  );
});
afterEach(() => {
  MUSIC_HISTORY.length = 0;
});

describe('what the hover card says', () => {
  it('splits years by era, in the eras’ order', () => {
    expect(eraSplit([1955, 1903, 1958])).toEqual([
      { id: 'early-modern', count: 1 },
      { id: 'postwar', count: 2 },
    ]);
    expect(eraSplit([])).toEqual([]);
  });

  it('tells a place’s events in the years shown', () => {
    const all = hoverFacts({ kind: 'place', id: 'new-orleans' }, null);
    expect(all).toMatchObject({ title: 'New Orleans', events: 3 });
    expect(all?.subtitle).toBe('North America');
    const fifties = hoverFacts(
      { kind: 'place', id: 'new-orleans' },
      { from: 1950, to: 1959 },
    );
    expect(fifties?.events).toBe(2);
    expect(fifties?.eras).toEqual([{ id: 'postwar', count: 2 }]);
  });

  it('tells a country’s, and an event’s year and place', () => {
    expect(
      hoverFacts(
        {
          kind: 'region',
          place: {
            type: 'country',
            name: 'United States of America',
            iso: 'USA',
          },
        },
        null,
      ),
    ).toMatchObject({
      title: 'United States of America',
      subtitle: 'Country',
      events: 3,
    });
    expect(hoverFacts({ kind: 'event', eventId: 'b' }, null)).toMatchObject({
      title: 'Moment b',
      detail: '1955 · New Orleans',
    });
    expect(hoverFacts({ kind: 'place', id: 'atlantis' }, null)).toBeNull();
  });
});
