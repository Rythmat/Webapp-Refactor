/**
 * The place network on the real content: the links resolve, nearly all of
 * them to a city, and the history reads right.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { allConnections } from '@/components/atlas/data/eventConnections';
import { getTimelineIndex } from '@/components/atlas/data/timelineIndex';
import { ensureAtlasContent } from '@/content/contentStore';
import { scopeLinks } from './placeNetwork';
import { getNetworkIndex } from './useNetwork';

beforeAll(() => ensureAtlasContent(), 60_000);

describe('the place network, on the real content', () => {
  it('places nearly every link, and nearly all at a city', () => {
    const ix = getNetworkIndex(allConnections());
    expect(ix.edges.length).toBeGreaterThan(allConnections().length * 0.95);
    const atCities = ix.edges.filter(
      (e) => e.from.cityId !== null && e.to.cityId !== null,
    ).length;
    expect(atCities / ix.edges.length).toBeGreaterThan(0.9);
  });

  it('finds the Delta among the places Memphis’s music came from', () => {
    const ix = getNetworkIndex(allConnections());
    const memphis = new Set(
      getTimelineIndex()
        .filter((t) => t.cityId === 'memphis')
        .map((t) => t.event.id),
    );
    const { roots } = scopeLinks(ix, memphis, null);
    expect(roots.map((l) => ix.node(l.from)?.label)).toContain('Clarksdale');
  });
});
