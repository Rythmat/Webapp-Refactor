import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/components/atlas/data/timelineIndex';
import type { HistoricalEvent } from '@/components/atlas/types';
import { buildNetworkIndex } from './networkIndex';
import {
  edgesInWindow,
  farTotals,
  linksAmong,
  nodeMetrics,
  scopeLinks,
  topNodes,
  worldLinks,
} from './placeNetwork';

const t = (
  id: string,
  year: number,
  cityId: string | null,
  regionId: string,
  country = 'US',
): TimelineEvent => ({
  event: {
    id,
    year,
    location: { lat: 10, lng: 20, city: '', country },
    genre: [],
    title: id,
    description: '',
    tags: [],
  } as HistoricalEvent,
  year,
  lane: 'blues-jazz' as TimelineEvent['lane'],
  lanes: [],
  regionId: regionId as TimelineEvent['regionId'],
  cityId,
});

// In year order, as the timeline index is.
const EVENTS = [
  t('griot', 1500, 'timbuktu', 'west-africa', 'Mali'),
  t('delta', 1903, 'clarksdale', 'north-america'),
  t('handy', 1912, 'memphis', 'north-america'),
  t('nyc', 1920, 'new-york', 'north-america'),
  t('elvis', 1954, 'memphis', 'north-america'),
  t('stax', 1962, 'memphis', 'north-america'),
  t('beatles', 1963, 'liverpool', 'north-europe', 'UK'),
  t('nowhere', 1970, null, 'north-america'),
];
const byId = new Map(EVENTS.map((e) => [e.event.id, e]));
const CONNECTIONS = [
  { from: 'griot', to: 'delta' },
  { from: 'delta', to: 'handy' },
  { from: 'handy', to: 'nyc' },
  { from: 'elvis', to: 'beatles' },
  { from: 'stax', to: 'beatles' },
  { from: 'elvis', to: 'stax' },
  { from: 'stax', to: 'nowhere' },
  // An event the content doesn't publish: left out.
  { from: 'ghost', to: 'handy' },
];
const ix = buildNetworkIndex(EVENTS, CONNECTIONS, (id) => byId.get(id));
const ids = (...list: string[]) => new Set(list);

describe('the place network', () => {
  it('places each link by its events, in the year it arrived', () => {
    expect(ix.edges).toHaveLength(7);
    expect(ix.edges.map((e) => e.year)).toEqual([
      1903, 1912, 1920, 1962, 1963, 1963, 1970,
    ]);
    expect(edgesInWindow(ix, { from: 1960, to: 1963 })).toHaveLength(3);
  });

  it('adds up across windows: each link counts once, when it arrived', () => {
    const all = edgesInWindow(ix, null).length;
    const parts = [
      { from: 1500, to: 1949 },
      { from: 1950, to: 1999 },
    ].reduce((n, w) => n + edgesInWindow(ix, w).length, 0);
    expect(parts).toBe(all);
  });

  it('names a place by its city, else its country', () => {
    expect(ix.node('city:memphis')?.place).toEqual({
      type: 'city',
      id: 'memphis',
    });
    expect(ix.nodeOf(byId.get('nowhere')!, 'city')).toBe('country:US');
    expect(ix.nodeOf(byId.get('beatles')!, 'region')).toBe(
      'region:north-europe',
    );
    expect(ix.node('region:west-africa')?.place).toBeNull();
  });

  it('splits a place’s links into where its music came from and went', () => {
    const memphis = ids('handy', 'elvis', 'stax');
    const links = scopeLinks(ix, memphis, null);
    expect(links.roots.map((l) => [l.id, l.weight])).toEqual([
      ['city:clarksdale>city:memphis', 1],
    ]);
    expect(links.routes.map((l) => [l.id, l.weight])).toEqual([
      ['city:memphis>city:liverpool', 2],
      ['city:memphis>city:new-york', 1],
      ['city:memphis>country:US', 1],
    ]);
    // Elvis to Stax stayed home.
    expect(links.local).toBe(1);
    // One in, four out, one at home.
    expect(links.total).toBe(6);
    expect(links.routes[0].years).toEqual([1963, 1963]);
    expect(links.routes[0].sample).toEqual([
      ['elvis', 'beatles'],
      ['stax', 'beatles'],
    ]);
  });

  it('keeps a stop’s links to the years shown', () => {
    const memphis = ids('handy', 'elvis', 'stax');
    const early = scopeLinks(ix, memphis, { from: 1900, to: 1930 });
    expect(early.roots).toHaveLength(1);
    expect(early.routes.map((l) => l.id)).toEqual([
      'city:memphis>city:new-york',
    ]);
  });

  it('weighs the world’s strongest links between regions', () => {
    expect(worldLinks(ix, null).map((l) => [l.id, l.weight])).toEqual([
      ['region:north-america>region:north-europe', 2],
      ['region:west-africa>region:north-america', 1],
    ]);
  });

  it('keeps only the links among the places asked for', () => {
    const among = linksAmong(
      ix,
      ids('city:memphis', 'city:liverpool'),
      null,
      'city',
    );
    expect(among.map((l) => l.id)).toEqual(['city:memphis>city:liverpool']);
  });

  it('measures each place, and ranks the busiest', () => {
    const metrics = nodeMetrics(ix, EVENTS, null, 'city');
    expect(metrics.get('city:memphis')).toEqual({
      events: 3,
      inLinks: 1,
      outLinks: 4,
      localLinks: 1,
    });
    expect(topNodes(metrics, { limit: 2 })).toEqual([
      'city:memphis',
      'city:clarksdale',
    ]);
    // A place asked for stays, whatever its rank.
    expect(
      topNodes(metrics, { limit: 2, include: ['city:liverpool'] }),
    ).toEqual(['city:memphis', 'city:liverpool']);
  });

  it('totals each far place', () => {
    const memphis = scopeLinks(ix, ids('handy', 'elvis', 'stax'), null);
    expect(farTotals(memphis.routes, 'to')[0]).toEqual({
      node: 'city:liverpool',
      weight: 2,
    });
  });
});
