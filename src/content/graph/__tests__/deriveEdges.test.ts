import { describe, expect, it } from 'vitest';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import LIB from '@/curriculum/data/chordProgressionLibrary';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  buildFacetIndex,
  deriveSongEdges,
  edgesForProgression,
  edgesForSong,
  nodesIn,
} from '../deriveEdges';
import { isValidEdge, parseEntityId } from '../types';

/**
 * The graph is derived from the records, so these guard the derivation rather
 * than any stored edge list: every edge it emits must be one the schema allows,
 * and the facet index must actually answer the question the globe will ask.
 */

const songModules = import.meta.glob<Record<string, unknown>>(
  '../../../curriculum/data/songs/*.ts',
  { eager: true },
);

const songs: Song[] = Object.entries(songModules)
  .filter(([path]) => !/\/(index|bundled)\.ts$/.test(path))
  .flatMap(([, mod]) =>
    Object.values(mod).filter(
      (v): v is Song =>
        typeof v === 'object' &&
        v !== null &&
        'sections' in v &&
        'keyRoot' in v,
    ),
  );

const edges = deriveSongEdges(songs);

/**
 * Chicago the band cannot be registered while Chicago the city exists.
 *
 * The globe matches event TAGS to artist names, so a registered 'Chicago'
 * would attach all forty-three Chicago-the-city events to the band. The
 * namespace keeps `artist:chicago` and `place:chicago` apart in the graph;
 * what still cannot tell them apart is tag matching. Registering it needs the
 * index to skip tag-matching for place-colliding names first.
 */
const KNOWN_UNREGISTERED = new Set(['artist:chicago']);

describe('deriving edges from song records', () => {
  it('reads the library', () => {
    expect(songs.length).toBeGreaterThan(600);
    expect(edges.length).toBeGreaterThan(songs.length);
  });

  it('only emits edges the schema allows', () => {
    const invalid = edges
      .filter((e) => !isValidEdge(e))
      .slice(0, 10)
      .map((e) => `${e.from} -${e.kind}-> ${e.to}`);
    expect(invalid).toEqual([]);
  });

  it('gives every node a well-formed id', () => {
    const broken = [...nodesIn(edges)]
      .filter((id) => !parseEntityId(id))
      .slice(0, 10);
    expect(broken).toEqual([]);
  });

  it('connects a fully-credited song to everything its record states', () => {
    const song = songs.find((s) => s.id === 'aint_no_mountain_high_enough');
    expect(song).toBeDefined();
    const kinds = new Set(edgesForSong(song!).map((e) => e.kind));
    // Billed duet, sidemen, writers, producers, label, studio, city, covers.
    expect(kinds).toContain('performed_by');
    expect(kinds).toContain('written_by');
    expect(kinds).toContain('produced_by');
    expect(kinds).toContain('released_on');
    expect(kinds).toContain('recorded_at');
    expect(kinds).toContain('recorded_in');
    expect(kinds).toContain('covers');
    expect(kinds).toContain('in_genre');
    expect(kinds).toContain('in_key');
  });

  it('bills both halves of a duet, not just the first', () => {
    const song = songs.find((s) => s.id === 'aint_no_mountain_high_enough')!;
    const billed = edgesForSong(song)
      .filter((e) => e.kind === 'performed_by')
      .map((e) => e.to);
    expect(billed).toContain('artist:marvin-gaye');
    expect(billed).toContain('artist:tammi-terrell');
  });

  it('hangs an instrument off the player, on the record it was played on', () => {
    const song = songs.find((s) => s.id === 'africa')!;
    const plays = edgesForSong(song).filter(
      (e) => e.kind === 'plays_instrument',
    );
    expect(plays.length).toBeGreaterThan(0);
    // Every one must say WHICH record, or the graph can only say someone plays
    // an instrument somewhere.
    expect(plays.every((e) => e.on === 'song:africa')).toBe(true);
  });

  it('answers "which songs carry this facet"', () => {
    const index = buildFacetIndex(edges);
    const funk = index.get('genre:funk');
    expect(funk?.size).toBeGreaterThan(50);
    expect(funk).toContain('song:1999');
    // An instrument edge starts at the artist, so it only lands in the index
    // via `on` — this is the case that would silently drop out.
    expect(index.get('instrument:drum-kit')).toContain('song:africa');
  });

  it('points every artist edge at a registered artist', () => {
    // An unregistered artist id is a connection that resolves to nothing: the
    // pill renders, the click goes nowhere. This is the check that keeps the
    // registry and the song library from drifting apart again — it is how the
    // '&' problem surfaced (song: 'Hall & Oates', globe: 'Hall and Oates').
    const registered = new Set(ARTIST_REGISTRY.map((a) => `artist:${a.slug}`));
    const strays = [...nodesIn(edges)]
      .filter((n) => n.startsWith('artist:') && !registered.has(n))
      .filter((n) => !KNOWN_UNREGISTERED.has(n))
      .sort();
    expect(strays).toEqual([]);
  });

  it('does not invent a writer when a songwriter credit exists', () => {
    // `composer` is the display line; using both would double-count.
    const song = songs.find((s) => s.id === 'africa')!;
    const writers = edgesForSong(song).filter((e) => e.kind === 'written_by');
    expect(writers).toHaveLength(2); // Paich and Porcaro, once each
  });

  it('links a progression to the songs that use it', () => {
    // 'Dreams- Fleetwood Mac' resolved to the real chart, so the edge runs
    // song → progression and lands in the facet index like any other.
    const dreams = LIB.find((p) => p.id === 409)!;
    expect(dreams.songIds).toEqual(['dreams']);
    const edges = edgesForProgression(dreams);
    expect(edges).toContainEqual({
      from: 'song:dreams',
      kind: 'uses_progression',
      to: 'progression:409',
    });
  });

  it('translates the progression library own style vocabulary', () => {
    const dreams = LIB.find((p) => p.id === 409)!;
    const genres = edgesForProgression(dreams)
      .filter((e) => e.kind === 'in_genre')
      .map((e) => e.to);
    // The library writes 'r&b'; the graph's genre is `rnb`.
    expect(genres).toContain('genre:rnb');
    expect(genres).toContain('genre:jazz');
  });

  it('only emits progression edges the schema allows', () => {
    const all = LIB.flatMap(edgesForProgression);
    expect(all.filter((e) => !isValidEdge(e))).toEqual([]);
    expect(
      all.filter((e) => e.kind === 'uses_progression').length,
    ).toBeGreaterThan(10);
  });
});
