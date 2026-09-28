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

const placeNames = (() => {
  const places = new Set<string>();
  for (const city of CITIES) {
    places.add(normalizeArtistName(city.name));
    places.add(normalizeArtistName(city.country));
    if (city.subdivision) places.add(normalizeArtistName(city.subdivision));
  }
  for (const event of MUSIC_HISTORY) {
    places.add(normalizeArtistName(event.location.city));
    places.add(normalizeArtistName(event.location.country));
  }
  return places;
})();

const genreNames = new Set(
  MUSIC_HISTORY.flatMap((e) => e.genre).map(normalizeArtistName),
);

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
    expect(collisions).toEqual([]);
  });

  it('never registers a name that is also a genre', () => {
    const collisions = ARTIST_REGISTRY.filter((a) =>
      genreNames.has(normalizeArtistName(a.name)),
    ).map((a) => a.name);
    expect(collisions).toEqual([]);
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
