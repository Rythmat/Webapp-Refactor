import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/components/atlas/data/timelineIndex';
import type { HistoricalEvent } from '@/components/atlas/types';
import { binSeries, binSize, scopeStats } from './placeStats';

const t = (id: string, year: number, lane = 'blues-jazz'): TimelineEvent => ({
  event: { id, year } as HistoricalEvent,
  year,
  lane: lane as TimelineEvent['lane'],
  lanes: [lane as TimelineEvent['lane']],
  regionId: 'north-america' as TimelineEvent['regionId'],
  cityId: null,
});

const ARTISTS: Record<string, string[]> = {
  a: ['armstrong'],
  b: ['armstrong', 'oliver'],
};
const artistsFor = (id: string) => ARTISTS[id] ?? [];

describe('a stop’s stats', () => {
  it('bins years finely for decades and coarsely for centuries', () => {
    expect(binSize(30)).toBe(5);
    expect(binSize(120)).toBe(10);
    expect(binSize(300)).toBe(25);
    expect(binSize(1500)).toBe(50);
    expect(binSeries([1951, 1955, 1962], 1950, 1969, 10)).toEqual([
      { start: 1950, size: 10, count: 2 },
      { start: 1960, size: 10, count: 1 },
    ]);
  });

  it('adds up events, artists, genres, eras and lanes in the years shown', () => {
    const events = [
      t('a', 1923),
      t('b', 1925),
      t('c', 1955, 'rock'),
      t('d', 1990, 'hiphop'),
    ];
    const all = scopeStats(events, null, { artistsFor });
    expect(all).toMatchObject({
      events: 4,
      artists: 2,
      genres: 3,
      span: [1923, 1990],
    });
    expect(all.eras.map((e) => e.id)).toEqual([
      'early-modern',
      'postwar',
      'electronic-hiphop',
    ]);
    expect(all.lanes[0]).toEqual({ id: 'blues-jazz', count: 2 });
    const fifties = scopeStats(
      events,
      { from: 1950, to: 1959 },
      { artistsFor },
    );
    expect(fifties).toMatchObject({ events: 1, artists: 0, binSize: 5 });
  });

  it('names the busiest span, and the quietest between the first and last', () => {
    const s = scopeStats([t('a', 1921), t('b', 1923), t('c', 1945)], null, {
      artistsFor,
    });
    expect(s.busiest?.start).toBe(1920);
    expect(s.quietest?.count).toBe(0);
    expect(s.quietest!.start).toBeGreaterThan(1920);
    expect(s.quietest!.start).toBeLessThan(1940);
  });

  it('keeps the world’s chart from 1900, the rest as a stub', () => {
    const s = scopeStats([t('a', 1500), t('b', 1950)], null, {
      world: true,
      artistsFor,
    });
    expect(s.bins[0].start).toBe(1900);
    expect(s.earlier).toBe(1);
  });

  it('is empty, not broken, for no events', () => {
    const s = scopeStats([], { from: 1950, to: 1959 }, { artistsFor });
    expect(s).toMatchObject({
      events: 0,
      span: null,
      busiest: null,
      quietest: null,
    });
  });
});
