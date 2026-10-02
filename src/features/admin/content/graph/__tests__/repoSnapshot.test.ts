import { describe, expect, it, vi } from 'vitest';
import { INSTRUMENT_GENRES } from '@/content/graph/instrumentGenres';
import { loadRepoGraph, loadRepoSnapshot } from '../repoSnapshot';

/**
 * The loader hands the graph everything the repo knows: the full globe
 * events with who they are about, the song pins and the instrument table. The
 * counts the graph makes of them are pinned in deriveGraph.test.ts; this
 * pins that the loader passes them at all, and that it no longer needs the
 * globe's artist index (which reads the content store) to say who an event
 * is about.
 */

// `eventConnections.ts` reads the content store for its arc drawing; the arcs
// themselves are a plain list. The artist index must not load at all.
vi.mock('@/content/contentStore', () => ({
  contentGeneration: 0,
  MUSIC_HISTORY: [],
}));
vi.mock('@/components/atlas/data/artists', () => {
  throw new Error('the loader read the globe artist index');
});

// The loader reads every chart, event and pin: slow to import under a full
// parallel run, so it is loaded once and each test has room.
const LOAD = 30_000;
let loaded: ReturnType<typeof loadRepoSnapshot> | undefined;
const snapshotOnce = () => (loaded ??= loadRepoSnapshot());

describe('the repo snapshot', () => {
  it(
    'passes the full events, and who and what each is about',
    async () => {
      const snapshot = await snapshotOnce();
      const events = snapshot.events ?? [];
      expect(events.length).toBeGreaterThan(1500);
      const bebop = events.find((e) => e.id.startsWith('evt-bebop'));
      expect(bebop).toMatchObject({
        year: expect.any(Number),
        location: { city: expect.any(String) },
        genre: expect.any(Array),
        tags: expect.any(Array),
      });
      // Every event has an entry; an `evt-` event the matcher found no one in
      // has an empty one.
      const matches = snapshot.eventMatches!;
      expect(matches.size).toBe(new Set(events.map((e) => e.id)).size);
      const about = [...matches]
        .filter(([id, m]) => id.startsWith('evt-') && m.artists.length)
        .map(([id]) => id);
      // One fewer than the globe's chips: a tag 'portland maine' is the city
      // with its state, not the registry entry of that name. 697 rather than
      // 687 since the bulk import of 30 September 2026: the matcher knows the
      // artists it made too (players, writers and producers off the roster),
      // and finds one or more of them on ten more events.
      expect(about).toHaveLength(697);
      expect(matches.get(bebop!.id)?.artists.map((a) => a.artistId)).toEqual(
        expect.arrayContaining(['charlie-parker', 'dizzy-gillespie']),
      );
    },
    LOAD,
  );

  it(
    'passes the song pins as artist_location items, and the instrument table',
    async () => {
      const snapshot = await snapshotOnce();
      const pins = snapshot.artistLocations ?? [];
      // 362 before 30 Sep 2026. The owner's 23 duplicate merges dropped 12
      // pins whose kept name has its own, and "Remind In Light" repeated
      // Talking Heads' (the other merged spellings' pins moved, not dropped).
      expect(pins).toHaveLength(349);
      expect(pins.find((p) => p.id === 'marvin gaye')).toMatchObject({
        city: 'Washington',
        country: 'US',
      });
      expect(snapshot.instrumentGenres).toBe(INSTRUMENT_GENRES);
      expect(snapshot.asOfYear).toBe(new Date().getFullYear());
    },
    LOAD,
  );

  it(
    'builds the graph from it once',
    async () => {
      const first = await loadRepoGraph();
      expect(await loadRepoGraph()).toBe(first);
      expect(Object.keys(first).sort()).toEqual(['graph', 'snapshot']);
      expect(
        first.graph.edges.some(
          (e) => e.kind === 'about' && e.to === 'artist:charlie-parker',
        ),
      ).toBe(true);
    },
    LOAD,
  );
});
