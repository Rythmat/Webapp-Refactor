import { describe, expect, it } from 'vitest';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import {
  artistSlug,
  getAtlasArtists,
  normalizeArtistName,
} from '@/components/atlas/data/artists';
import { CITIES } from '@/components/atlas/data/cities';
import { BUNDLED_MUSIC_HISTORY } from '@/components/atlas/data/events';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { placeAndGenreNames } from '@/content/graph/deriveGraph';

/**
 * The registry is the artist SET. It replaced a heuristic that inferred who
 * existed from title patterns and then subtracted places, genres and a
 * sixty-name stop list.
 *
 * The guards that matter are the ones that heuristic needed: a registry name
 * colliding with a place or a genre would reintroduce exactly the ambiguity
 * the registry exists to remove — `place:chicago` and `artist:chicago` are
 * different things, and tag matching cannot tell them apart.
 */

MUSIC_HISTORY.push(...BUNDLED_MUSIC_HISTORY);

/**
 * Every name a tag can mean a place or a genre by: the lists the console's
 * graph refuses on a tag alone (`placeAndGenreNames`), so the registry and
 * the graph are held to the same names. They include a city with its state
 * or country as one name ('Portland, Maine') and the scenes the cities name
 * ('Manila Sound'), as well as every event's city, country and genres.
 */
const { placeNames, genreNames } = (() => {
  const names = placeAndGenreNames({ places: CITIES, events: MUSIC_HISTORY });
  const fold = (all: Set<string>) => new Set([...all].map(normalizeArtistName));
  return {
    placeNames: fold(names.placeNames),
    genreNames: fold(names.genreNames),
  };
})();

/**
 * Entries that are a place or a scene by those lists, waiting on the owner:
 * taking one out of the registry changes a chip students see on the globe.
 * The console's graph already refuses each on a tag of its own. Once one is
 * decided, it leaves its list here too.
 */
const PLACES_AWAITING_OWNER = ['Portland, Maine'];
const GENRES_AWAITING_OWNER = ['Manila Sound'];

describe('artist registry', () => {
  it('holds the artists the atlas knows', () => {
    expect(ARTIST_REGISTRY.length).toBeGreaterThan(800);
  });

  it('gives every artist a unique slug', () => {
    const slugs = ARTIST_REGISTRY.map((a) => a.slug);
    expect(slugs.length).toBe(new Set(slugs).size);
  });

  it("keeps each slug true to its artist's name", () => {
    const wrong = ARTIST_REGISTRY.filter(
      (a) => a.slug !== artistSlug(a.name),
    ).map((a) => `${a.name} → '${a.slug}' (expected '${artistSlug(a.name)}')`);
    expect(wrong).toEqual([]);
  });

  it('never registers a name that is also a place', () => {
    // `place:chicago` and `artist:chicago` are different things; a registry
    // entry that collides makes every tag match ambiguous again.
    const collisions = ARTIST_REGISTRY.filter((a) =>
      placeNames.has(normalizeArtistName(a.name)),
    ).map((a) => a.name);
    expect(collisions).toEqual(PLACES_AWAITING_OWNER);
  });

  it('never registers a name that is also a genre', () => {
    const collisions = ARTIST_REGISTRY.filter((a) =>
      genreNames.has(normalizeArtistName(a.name)),
    ).map((a) => a.name);
    expect(collisions).toEqual(GENRES_AWAITING_OWNER);
  });

  it('holds no titles captured as names', () => {
    // The derivation once read film and TV titles as artists, each with a
    // stray opening quote ('"Mad Men'). A real name never starts with one.
    const quoted = ARTIST_REGISTRY.filter((a) => /^["“”']/.test(a.name)).map(
      (a) => a.name,
    );
    expect(quoted).toEqual([]);
  });

  it('leaves no name blank', () => {
    const blank = ARTIST_REGISTRY.filter(
      (a) => !a.name.trim() || !a.slug.trim(),
    ).map((a) => a.slug);
    expect(blank).toEqual([]);
  });
});

describe('the index built from it', () => {
  it('only ever indexes a registered artist', () => {
    const registered = new Set(ARTIST_REGISTRY.map((a) => a.slug));
    const strays = getAtlasArtists()
      .filter((a) => !registered.has(a.slug))
      .map((a) => a.name);
    expect(strays).toEqual([]);
  });

  it('gives every indexed artist at least one event', () => {
    // A registered artist with no events is a valid entity for the graph but
    // has nothing for the globe to show, so it stays out of the index.
    const empty = getAtlasArtists()
      .filter((a) => a.eventIds.length === 0)
      .map((a) => a.name);
    expect(empty).toEqual([]);
  });
});
