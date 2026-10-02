import type { HistoricalEvent } from '@/components/atlas/types';
import {
  createEventMatcher,
  eventsByArtist,
} from '@/content/graph/eventMatches';
import { resolveGenreTag } from '@/content/graph/genreTags';
import { SONG_TAG_TO_GENRE } from '@/content/graph/genres';
import { resolvePlace } from '@/content/graph/places';
import { artistSlug } from '@/content/graph/slugs';
import { resolveArea, type ResolvedArea } from './areas';
import {
  type ArtistFetchRow,
  type ArtistToFetch,
  exactCandidates,
  fetchArtists,
  isOneWordName,
} from './artistFetch';
import type { WikidataView } from './artistFields';
import type {
  ArtistCacheRow,
  RegistryArtist,
  SongCacheRow,
} from './cacheStage';
import type { MbArea, MbArtist, MusicBrainzClient } from './musicbrainz';
import type { ArtistEvidence, CandidateFacts } from './scoreIdentity';
import type { SparqlClient } from './sparql';
import type { KnownEntities, WdEntity, WikidataClient } from './wikidata';
import { coordinatesOf } from './wikidataClaims';

/**
 * Scoring's view of the cache: everything the fetch gathered, read back.
 *
 * Scoring keeps no report of its own to go stale. It walks the fetch queue
 * again (`fetchArtists`) with getters that only read the cache — every
 * answer from disk, every miss a gap rather than a request — so it sees
 * exactly what a fetch has gathered so far, finished or not. Then, per
 * artist, it puts the cached answers beside what the repo knows: the songs
 * billed to each candidate (the cache stage), the artist's events and song
 * years, and the city their songs are pinned to.
 */

export interface LibrarySongFacts {
  id: string;
  title: string;
  artist: string;
  year?: number;
  genreTags?: readonly string[];
}

export interface ArtistLocation {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface GatherInputs {
  registry: readonly RegistryArtist[];
  queue: readonly ArtistToFetch[];
  cacheArtists: readonly ArtistCacheRow[];
  cacheSongs: readonly SongCacheRow[];
  songs: readonly LibrarySongFacts[];
  events: readonly HistoricalEvent[];
  /** `artistLocations.json`: lowercased artist name → where their songs are pinned. */
  artistLocations: Readonly<Record<string, ArtistLocation>>;
}

export interface GatherClients {
  mb: MusicBrainzClient;
  wikidata: WikidataClient;
  sparql?: SparqlClient;
  /** The Wikidata items in hand, by the props they were fetched with. */
  known: KnownEntities;
}

export interface Gathered {
  evidence: ArtistEvidence[];
  rows: ArtistFetchRow[];
  wd: WikidataView;
}

const isSongEvent = (id: string) => id.startsWith('song-');

/** The Wikidata the fetch holds, as the fields read it. */
export function wikidataView(known: KnownEntities): WikidataView {
  const items = known.get('labels|descriptions|claims') ?? new Map();
  const places = known.get('labels|claims') ?? new Map();
  const named = known.get('labels') ?? new Map();
  const label = (entity: WdEntity | undefined) =>
    entity?.labels?.en?.value ?? null;
  return {
    item: (id) => items.get(id),
    // A place fetched as an artist item (or the other way round) still has
    // its claims.
    place: (id) => places.get(id) ?? items.get(id),
    label: (id) =>
      label(named.get(id)) ?? label(places.get(id)) ?? label(items.get(id)),
  };
}

/** A search result's area, unresolved: only its name and whether it is a country. */
const searchArea = (area: MbArea | null | undefined): ResolvedArea | null =>
  area?.id
    ? {
        id: area.id,
        name: area.name,
        type: null,
        isCountry: !!area['iso-3166-1-codes']?.length,
        countryCode: area['iso-3166-1-codes']?.[0] ?? null,
        countryName: null,
        wikidata: null,
        chain: [area.name],
        complete: false,
      }
    : null;

const genreNames = (artist: MbArtist): string[] =>
  (artist.genres?.length ? artist.genres : (artist.tags ?? [])).map(
    (g) => g.name,
  );

async function candidateFacts(
  mb: MusicBrainzClient,
  row: ArtistFetchRow,
  artist: RegistryArtist,
  wd: WikidataView,
): Promise<CandidateFacts[]> {
  const facts: CandidateFacts[] = [];
  // An area's coordinates, from its Wikidata item when that is in hand.
  const located = async (area: MbArea): Promise<ResolvedArea> => {
    const resolved = await resolveArea(mb, area);
    const item = resolved.wikidata ? wd.place(resolved.wikidata) : undefined;
    return item ? { ...resolved, coordinates: coordinatesOf(item) } : resolved;
  };
  for (const found of row.candidates) {
    const lookup = await mb.lookupArtist(found.mbid);
    if (!lookup) continue;
    // An id MusicBrainz has merged into another answers as that one: one
    // candidate, carrying the billing of every id that led to it.
    const asked = [
      ...(found.askedAs ?? []),
      ...(found.mbid === lookup.id ? [] : [found.mbid]),
    ];
    const same = facts.find((f) => f.mbid === lookup.id);
    if (same) {
      if (asked.length)
        same.askedAs = [...new Set([...(same.askedAs ?? []), ...asked])];
      same.wikidata = [...new Set([...same.wikidata, ...found.wikidata])];
      continue;
    }
    const browse = await mb.browseReleaseGroups(found.mbid);
    const area = lookup.area?.id ? await located(lookup.area) : null;
    const beginArea = lookup['begin-area']?.id
      ? await located(lookup['begin-area'])
      : null;
    facts.push({
      mbid: lookup.id,
      name: lookup.name,
      ...(lookup['sort-name'] ? { sortName: lookup['sort-name'] } : {}),
      aliases: (lookup.aliases ?? []).map((a) => a.name),
      ...(lookup.disambiguation
        ? { disambiguation: lookup.disambiguation }
        : {}),
      type: lookup.type ?? null,
      lookedUp: true,
      area,
      beginArea,
      lifeSpan: lookup['life-span'] ?? null,
      genres: genreNames(lookup),
      releaseTitles: browse ? browse.releaseGroups.map((g) => g.title) : null,
      wikidata: found.wikidata,
      ...(found.wikidataVia ? { wikidataVia: found.wikidataVia } : {}),
      ...(asked.length ? { askedAs: [...new Set(asked)] } : {}),
      memberOf: (lookup.relations ?? [])
        .filter(
          (r) =>
            r.type === 'member of band' &&
            r.direction === 'forward' &&
            r.artist,
        )
        .map((r) => ({ name: r.artist!.name, attributes: r.attributes ?? [] })),
    });
  }

  // The exact-name search results never looked up: they can only be scored
  // on what a search shows, but a close runner-up among them still makes
  // the name ambiguous.
  if (row.source !== 'songs') {
    const search = await mb.searchArtists(row.searchedAs ?? artist.name);
    const looked = new Set(
      facts.flatMap((f) => [f.mbid, ...(f.askedAs ?? [])]),
    );
    for (const result of exactCandidates(search?.artists ?? [], [
      artist.name,
      ...(artist.aliases ?? []),
    ])) {
      if (looked.has(result.id)) continue;
      looked.add(result.id);
      facts.push({
        mbid: result.id,
        name: result.name,
        ...(result['sort-name'] ? { sortName: result['sort-name'] } : {}),
        aliases: (result.aliases ?? []).map((a) => a.name),
        ...(result.disambiguation
          ? { disambiguation: result.disambiguation }
          : {}),
        type: result.type ?? null,
        lookedUp: false,
        area: searchArea(result.area),
        beginArea: searchArea(result['begin-area']),
        lifeSpan: result['life-span'] ?? null,
        genres: genreNames(result),
        releaseTitles: null,
        wikidata: [],
        memberOf: [],
      });
    }
  }
  return facts;
}

/** Song pins by registry slug: the key is the artist's name, lowercased. */
function pinsBySlug(
  registry: readonly RegistryArtist[],
  locations: GatherInputs['artistLocations'],
) {
  const slugs = new Map<string, string>();
  for (const artist of registry) {
    slugs.set(artist.slug, artist.slug);
    for (const alias of artist.aliases ?? [])
      if (!slugs.has(artistSlug(alias)))
        slugs.set(artistSlug(alias), artist.slug);
  }
  const out = new Map<string, NonNullable<ArtistEvidence['pin']>>();
  for (const [key, where] of Object.entries(locations)) {
    const slug = slugs.get(artistSlug(key));
    if (!slug || out.has(slug)) continue;
    out.set(slug, {
      key,
      city: where.city,
      country: where.country,
      coordinates: [where.lat, where.lng],
      placeId: resolvePlace(where.city, where.country),
    });
  }
  return out;
}

export async function gatherEvidence(
  inputs: GatherInputs,
  clients: GatherClients,
): Promise<Gathered> {
  const { rows } = await fetchArtists(inputs.queue, clients);
  const wd = wikidataView(clients.known);
  const bySlug = new Map(inputs.registry.map((a) => [a.slug, a]));

  const matcher = createEventMatcher({ artists: inputs.registry });
  const eventIds = eventsByArtist(inputs.events, matcher);
  const eventById = new Map(inputs.events.map((e) => [e.id, e]));
  const songById = new Map(inputs.songs.map((s) => [s.id, s]));
  const cacheBySlug = new Map(inputs.cacheArtists.map((a) => [a.slug, a]));
  const songsBySlug = new Map<string, string[]>();
  for (const row of inputs.cacheSongs) {
    if (!row.artistSlug) continue;
    songsBySlug.set(row.artistSlug, [
      ...(songsBySlug.get(row.artistSlug) ?? []),
      row.songId,
    ]);
  }
  const pins = pinsBySlug(inputs.registry, inputs.artistLocations);

  const evidence: ArtistEvidence[] = [];
  for (const row of rows) {
    const artist = bySlug.get(row.slug);
    if (!artist) continue;
    const events = (eventIds.get(artist.slug) ?? [])
      .map((id) => eventById.get(id))
      .filter((e): e is HistoricalEvent => !!e);
    const songIds = songsBySlug.get(artist.slug) ?? [];
    const songs = songIds
      .map((id) => songById.get(id))
      .filter((s): s is LibrarySongFacts => !!s);
    const genres = new Set<string>();
    for (const event of events)
      for (const tag of event.genre ?? []) {
        const resolved = resolveGenreTag(tag);
        if (resolved) genres.add(resolved.genre);
      }
    for (const song of songs)
      for (const tag of song.genreTags ?? []) {
        const genre = SONG_TAG_TO_GENRE[tag];
        if (genre) genres.add(genre);
      }
    evidence.push({
      slug: artist.slug,
      name: artist.name,
      aliases: artist.aliases ?? [],
      oneWord: isOneWordName(artist.name),
      songCandidates: cacheBySlug.get(artist.slug)?.candidates ?? [],
      songTitles: Object.fromEntries(songs.map((s) => [s.id, s.title])),
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        text: `${e.title}\n${e.description ?? ''}`,
        year: e.year,
        city: e.location?.city,
        country: e.location?.country,
        ...(Number.isFinite(e.location?.lat) && Number.isFinite(e.location?.lng)
          ? {
              coordinates: [e.location.lat, e.location.lng] as [number, number],
            }
          : {}),
      })),
      // A song event's year is the song's, or the 2000 placeholder when it
      // has none; the song's own year is the one to count.
      years: [
        ...events.filter((e) => !isSongEvent(e.id)).map((e) => e.year),
        ...songs.flatMap((s) => (typeof s.year === 'number' ? [s.year] : [])),
      ].filter((y) => Number.isFinite(y)),
      genres,
      pin: pins.get(artist.slug) ?? null,
      candidates:
        row.pending && !row.candidates.length
          ? []
          : await candidateFacts(clients.mb, row, artist, wd),
      pending: !!row.pending,
    });
  }
  return { evidence, rows, wd };
}
