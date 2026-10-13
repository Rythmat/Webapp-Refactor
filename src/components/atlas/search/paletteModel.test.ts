/**
 * What the command palette lists: with nothing typed, recent stops, the
 * actions, and every pathway and tour; typing narrows them all and adds the
 * globe's search results, ranked as the old search field ranked them.
 */
import { describe, expect, it } from 'vitest';
import { GUIDED_TOURS } from '@/components/atlas/data/guidedTours';
import { HISTORICAL_MODULES } from '@/components/atlas/data/historicalModules';
import {
  stopKey,
  type AtlasStop,
} from '@/components/atlas/navigation/atlasStop';
import type { TrailEntry } from '@/components/atlas/navigation/useAtlasTrail';
import {
  buildPalette,
  paletteItems,
  recentStops,
  type PaletteCommand,
} from './paletteModel';

const ACTIONS: PaletteCommand[] = [
  { id: 'spin', title: 'Spin the globe', keywords: ['rotate'] },
  { id: 'copy-link', title: 'Copy link', keywords: ['share'] },
  { id: 'legend', title: 'Show legend', keywords: ['key'] },
];

const entry = (idx: number, stop: AtlasStop): TrailEntry => ({
  idx,
  search: '',
  key: stopKey(stop),
  stop,
});

describe('recent stops', () => {
  it('lists the steps before the current one, newest first, each once', () => {
    const trail = [
      entry(0, { kind: 'home' }),
      entry(1, { kind: 'search', query: 'jazz' }),
      entry(2, { kind: 'search', query: 'blues' }),
      entry(3, { kind: 'search', query: 'jazz' }),
      entry(4, { kind: 'search', query: 'soul' }),
    ];
    expect(recentStops(trail, 4).map((e) => e.idx)).toEqual([3, 2]);
    // Walking back: the steps ahead of the cursor are not "recent".
    expect(recentStops(trail, 2).map((e) => e.idx)).toEqual([1]);
  });
});

describe('palette', () => {
  it('opens on recent stops, the actions, and every pathway and tour', () => {
    const recent = [entry(1, { kind: 'search', query: 'jazz' })];
    const groups = buildPalette('', { recent, actions: ACTIONS });
    expect(groups.map((g) => g.id)).toEqual([
      'recent',
      'actions',
      'pathways',
      'tours',
    ]);
    const byId = Object.fromEntries(groups.map((g) => [g.id, g.items]));
    expect(byId.pathways).toHaveLength(HISTORICAL_MODULES.length);
    expect(byId.tours).toHaveLength(GUIDED_TOURS.length);
  });

  it('narrows the actions by title and keywords', () => {
    const actions = (q: string) =>
      buildPalette(q, { recent: [], actions: ACTIONS })
        .find((g) => g.id === 'actions')
        ?.items.map((i) => i.id);
    expect(actions('spin')).toEqual(['action:spin']);
    expect(actions('rotate')).toEqual(['action:spin']);
    expect(actions('share')).toEqual(['action:copy-link']);
  });

  it('finds a pathway and a tour by name', () => {
    const pathway = HISTORICAL_MODULES[0];
    const tour = GUIDED_TOURS[0];
    expect(
      paletteItems(buildPalette(pathway.title, { recent: [], actions: [] })),
    ).toContainEqual(
      expect.objectContaining({ type: 'pathway', pathwayId: pathway.id }),
    );
    expect(
      paletteItems(buildPalette(tour.title, { recent: [], actions: [] })),
    ).toContainEqual(
      expect.objectContaining({ type: 'tour', tourId: tour.id }),
    );
  });

  it("leads with the globe's search, then a row for all its results", () => {
    const groups = buildPalette('new orleans', { recent: [], actions: [] });
    expect(groups[0].id).toBe('place');
    const items = paletteItems(groups);
    expect(items[0]).toMatchObject({
      type: 'result',
      result: { kind: 'place', title: 'New Orleans' },
    });
    const seeAll = groups.find((g) => g.id === 'see-all');
    expect(seeAll?.items[0]).toMatchObject({
      type: 'see-all',
      query: 'new orleans',
    });
  });

  it('lists nothing for a query nothing matches', () => {
    expect(buildPalette('zzqqxx', { recent: [], actions: ACTIONS })).toEqual(
      [],
    );
  });

  it('gives every row a unique id (the list keys and selects by it)', () => {
    const items = paletteItems(
      buildPalette('', { recent: [], actions: ACTIONS }),
    );
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
});
