import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import { CITIES } from '@/components/atlas/data/cities';
import { allConnections } from '@/components/atlas/data/eventConnections';
import { BUNDLED_MUSIC_HISTORY } from '@/components/atlas/data/events';
import { HISTORICAL_MODULES } from '@/components/atlas/data/historicalModules';
import ARTIST_ROWS from '@/content/data/artists.json';
import LABEL_ROWS from '@/content/data/labels.json';
import PLACE_ROWS from '@/content/data/places.json';
import RELEASE_ROWS from '@/content/data/releases.json';
import STUDIO_ROWS from '@/content/data/studios.json';
import {
  type ArtistRow,
  composeArtists,
  composePlaces,
} from '@/content/records/compose';
import type {
  ArtistRecord,
  LabelRecord,
  PlaceRecord,
  ReleaseRecord,
  StudioRecord,
} from '@/content/records/types';
import LIB from '@/curriculum/data/chordProgressionLibrary';
import { SESSION_INSTRUMENTS } from '@/curriculum/data/instruments';
import { BUNDLED_SONGS } from '@/curriculum/data/songs/bundled';
import type { Song } from '@/curriculum/types/songLibrary';
import { CANONICAL_ANNUAL_TEMPLATE } from '@/features/classroom/annual/curriculumTemplate';
import ARTIST_LOCATIONS from '@/scripts/artistLocations.json';
import {
  type ArtistLocationInput,
  assembleGraph,
  buildGraph,
  edgesForArtist,
  edgesForArtistLocation,
  edgesForDayStub,
  edgesForEvent,
  edgesForInfluenceArcs,
  edgesForInstrument,
  edgesForLabel,
  edgesForPathway,
  edgesForPlace,
  edgesForRelease,
  edgesForSongYear,
  edgesForStudio,
  eraForYear,
  type GlobeEventInput,
  INFLUENCE_ARC_PATH,
  isGroupArtist,
  type ItemStatus,
  matchSnapshotEvents,
  placeAndGenreNames,
  SUBGENRE_PARENT_PATH,
} from '../deriveGraph';
import type { EventMatch } from '../eventMatches';
import { SUBGENRE_PARENT } from '../genreTags';
import { GENRES } from '../genres';
import { canonicalId, isWellFormedSlug } from '../ids';
import { INSTRUMENT_GENRES, TYPICAL_IN_PATH } from '../instrumentGenres';
import { YEAR_DECADE_PATH, YEAR_ERA_PATH, yearOf } from '../time';
import {
  CODE_OWNERS,
  type Edge,
  EDGE_ENDPOINTS,
  EDGE_LABELS,
  type EntityId,
  type GraphNode,
  isCodeOwnedVia,
  isValidEdge,
  isWellFormed,
} from '../types';

/**
 * The built graph is what the console's mind map and integrity page read, so
 * these pin its promises: every edge says where it came from, one connection
 * is one edge however many fields state it, a song and its globe event are one
 * node, nothing invalid gets in unreported, and nothing referenced is dropped.
 */

// `eventConnections.ts` reads the content store for its arc drawing; the arcs
// themselves are a plain list. Stubbing the store keeps it out of this test.
vi.mock('@/content/contentStore', () => ({
  contentGeneration: 0,
  MUSIC_HISTORY: [],
}));

const africa = BUNDLED_SONGS.africa;

/** A song with nothing but what the test gives it (plus africa's key/mode). */
const song = (id: string, over: Partial<Song> = {}): Song => ({
  ...africa,
  id,
  title: id,
  artist: 'Unknown Artist',
  composer: undefined,
  year: undefined,
  genreTags: [],
  session: undefined,
  credits: undefined,
  // africa has named its record (Toto IV) since the bulk import of 30
  // September 2026; a fixture song names none unless the test gives it.
  releases: undefined,
  origin: undefined,
  relatedRecordings: undefined,
  ...over,
});

const line = (e: Pick<Edge, 'from' | 'kind' | 'to'>) =>
  `${e.from} -${e.kind}-> ${e.to}`;

describe('the graph builder module', () => {
  it('stays pure: no store, no globe artist index, no React', () => {
    // The influence arcs come in as a parameter precisely so this module never
    // loads eventConnections.ts, which reads the content store.
    const source = readFileSync('src/content/graph/deriveGraph.ts', 'utf8');
    expect(source).not.toMatch(
      /from '@\/(content\/contentStore|components\/atlas\/data\/(artists|eventConnections))'/,
    );
    expect(source).not.toMatch(/from 'react'/);
  });
});

describe('the slice-1 vocabulary', () => {
  it('reads every new edge both ways', () => {
    for (const kind of [
      'on_release',
      'member_of',
      'signed_to',
      'imprint_of',
      'uses_song',
      'references_event',
      'part_of',
    ] as const) {
      expect(EDGE_LABELS[kind].forward, kind).toBeTruthy();
      expect(EDGE_LABELS[kind].inverse, kind).toBeTruthy();
      expect(EDGE_ENDPOINTS[kind].from.length, kind).toBeGreaterThan(0);
    }
  });

  it('joins only the kinds each new edge is for', () => {
    const ok = (from: EntityId, kind: Edge['kind'], to: EntityId) =>
      isValidEdge({ from, kind, to });
    expect(ok('song:africa', 'on_release', 'release:toto-toto-iv')).toBe(true);
    expect(ok('release:toto-toto-iv', 'on_release', 'song:africa')).toBe(false);
    expect(ok('artist:james-jamerson', 'member_of', 'artist:x')).toBe(true);
    expect(ok('artist:x', 'signed_to', 'label:motown')).toBe(true);
    expect(ok('label:tamla', 'imprint_of', 'label:motown')).toBe(true);
    expect(ok('artist:x', 'imprint_of', 'label:motown')).toBe(false);
    expect(ok('teach_day:aug-day-1', 'uses_song', 'song:lovely_day')).toBe(
      true,
    );
    // A song's globe event folds onto the song, so both are referenceable.
    expect(ok('teach_day:aug-day-1', 'references_event', 'event:evt-x')).toBe(
      true,
    );
    expect(ok('teach_day:aug-day-1', 'references_event', 'song:x')).toBe(true);
    expect(ok('event:evt-x', 'part_of', 'pathway:blues-to-rock')).toBe(true);
    expect(ok('song:x', 'part_of', 'pathway:blues-to-rock')).toBe(true);
    // Releases carry their own billing, label and year.
    expect(ok('release:r', 'performed_by', 'artist:toto')).toBe(true);
    expect(ok('release:r', 'released_on', 'label:columbia')).toBe(true);
    expect(ok('release:r', 'from_year', 'year:1982')).toBe(true);
    expect(ok('event:evt-x', 'from_year', 'year:1969')).toBe(true);
    expect(ok('label:motown', 'from_year', 'year:1959')).toBe(true);
    expect(ok('studio:s', 'from_year', 'year:1959')).toBe(true);
    // An era is reached through a year, never stated straight off a thing.
    expect(ok('year:1982', 'in_decade', 'decade:1980s')).toBe(true);
    expect(ok('year:1982', 'from_era', 'era:electronic-hiphop')).toBe(true);
    expect(ok('release:r', 'from_era', 'era:postwar')).toBe(false);
    expect(ok('event:evt-x', 'from_era', 'era:postwar')).toBe(false);
    expect(ok('decade:1980s', 'in_decade', 'decade:1980s')).toBe(false);
    // …but not where they were recorded: that is the songs'.
    expect(ok('release:r', 'recorded_at', 'studio:s')).toBe(false);
    expect(ok('artist:a', 'influenced', 'artist:b')).toBe(true);
    expect(ok('place:detroit', 'located_in', 'place:region-x')).toBe(true);
  });

  it('holds the new kinds to their slug grammar', () => {
    const units = [
      ...CANONICAL_ANNUAL_TEMPLATE.autumn.units,
      ...CANONICAL_ANNUAL_TEMPLATE.spring.units,
    ];
    const days = units.flatMap((u) => u.dayStubs.map((d) => d.slug));
    expect(days.length).toBeGreaterThan(200);
    expect(days.filter((d) => !isWellFormedSlug('teach_day', d))).toEqual([]);
    // A unit is not a day.
    expect(isWellFormedSlug('teach_day', units[0].slug)).toBe(false);
    const pathways = HISTORICAL_MODULES.map((m) => m.id);
    expect(pathways.filter((p) => !isWellFormedSlug('pathway', p))).toEqual([]);
    expect(isWellFormedSlug('release', 'toto-toto-iv-1982')).toBe(true);
    expect(isWellFormedSlug('release', 'Toto IV')).toBe(false);
  });
});

describe('deriving record edges', () => {
  const group: ArtistRecord = {
    slug: 'the-funk-brothers',
    name: 'The Funk Brothers',
    group: true,
    members: [
      {
        artistId: 'james-jamerson',
        instrumentIds: ['electric-bass'],
        unverified: true,
        source: 'liner notes',
      },
      { artistId: 'benny-benjamin', instrumentIds: ['drum-kit'] },
    ],
    basedInPlaceId: 'detroit',
    genreIds: ['funk', 'acid-rock'],
    instrumentIds: ['horn-section'],
    labelIds: ['motown'],
    influencedBy: [{ artistId: 'ray-charles', source: 'wikipedia' }],
  };

  it('points membership from the member to the group', () => {
    const edges = edgesForArtist(group);
    expect(edges).toContainEqual({
      from: 'artist:james-jamerson',
      kind: 'member_of',
      to: 'artist:the-funk-brothers',
      via: { item: 'artist:the-funk-brothers', path: 'members[].artistId' },
      unverified: true,
      source: 'liner notes',
    });
    expect(edges).toContainEqual(
      expect.objectContaining({
        from: 'artist:benny-benjamin',
        kind: 'member_of',
        to: 'artist:the-funk-brothers',
      }),
    );
  });

  it('hangs what a member played off the member, on no one record', () => {
    const plays = edgesForArtist(group).filter(
      (e) => e.kind === 'plays_instrument',
    );
    expect(plays.map(line)).toEqual([
      'artist:james-jamerson -plays_instrument-> instrument:electric-bass',
      'artist:benny-benjamin -plays_instrument-> instrument:drum-kit',
      'artist:the-funk-brothers -plays_instrument-> instrument:horn-section',
    ]);
    expect(plays.every((e) => e.on === undefined)).toBe(true);
    // The member's own flag travels with what they played.
    expect(plays[0]).toMatchObject({
      unverified: true,
      via: { path: 'members[].instrumentIds[]' },
    });
  });

  it('files a genre id at the level the vocabulary has it', () => {
    const genres = edgesForArtist(group)
      .filter((e) => e.kind === 'in_genre')
      .map((e) => e.to);
    expect(genres).toEqual(['genre:funk', 'subgenre:acid-rock']);
  });

  it('signs, places and credits influence from the influencer', () => {
    const edges = edgesForArtist(group).map(line);
    expect(edges).toContain(
      'artist:the-funk-brothers -signed_to-> label:motown',
    );
    expect(edges).toContain(
      'artist:the-funk-brothers -based_in-> place:detroit',
    );
    expect(edges).toContain(
      'artist:ray-charles -influenced-> artist:the-funk-brothers',
    );
    expect(
      edgesForArtist(group).find((e) => e.kind === 'influenced'),
    ).toMatchObject({
      source: 'wikipedia',
      via: { path: 'influencedBy[].artistId' },
    });
  });

  it('lets an unverified record vouch for none of its fields', () => {
    const edges = edgesForArtist({
      ...group,
      unverified: true,
      source: 'fan wiki',
    });
    expect(edges.every((e) => e.unverified)).toBe(true);
    // The most specific source wins; the record's fills the rest.
    const signed = edges.find((e) => e.kind === 'signed_to');
    expect(signed?.source).toBe('fan wiki');
    const member = edges.find((e) => e.from === 'artist:james-jamerson');
    expect(member?.source).toBe('liner notes');
  });

  it("dates a person's birth, places it, and fills the decades they were active", () => {
    const edges = edgesForArtist({
      slug: 'marvin-gaye',
      name: 'Marvin Gaye',
      born: {
        date: '1939-04-02',
        placeId: 'washington-dc',
        source: 'wikidata',
      },
      activeFrom: 1957,
      activeTo: 1984,
    });
    expect(edges).toEqual([
      {
        from: 'artist:marvin-gaye',
        kind: 'born_year',
        to: 'year:1939',
        via: { item: 'artist:marvin-gaye', path: 'born.date' },
        source: 'wikidata',
      },
      {
        from: 'artist:marvin-gaye',
        kind: 'born_in',
        to: 'place:washington-dc',
        via: { item: 'artist:marvin-gaye', path: 'born.placeId' },
        source: 'wikidata',
      },
      ...['1950s', '1960s', '1970s', '1980s'].map((decade) => ({
        from: 'artist:marvin-gaye',
        kind: 'active_in',
        to: `decade:${decade}`,
        via: { item: 'artist:marvin-gaye', path: 'activeFrom' },
      })),
    ]);
    expect(edges.every(isValidEdge)).toBe(true);
    // A year or a month is as good a date as a day.
    for (const date of ['1939', '1939-04']) {
      expect(
        edgesForArtist({ slug: 'x', name: 'X', born: { date } }).map(line),
      ).toEqual(['artist:x -born_year-> year:1939']);
    }
  });

  it("files a group's born as the year it formed, and never its birthplace", () => {
    const edges = edgesForArtist({
      ...group,
      // A group is born where its City is; this states nothing here.
      born: { date: '1959', placeId: 'detroit', unverified: true },
      activeFrom: 1959,
      activeTo: 1972,
    });
    const when = edges.filter((e) =>
      ['born_year', 'formed_year', 'born_in', 'active_in'].includes(e.kind),
    );
    expect(when.map(line)).toEqual([
      'artist:the-funk-brothers -formed_year-> year:1959',
      'artist:the-funk-brothers -active_in-> decade:1950s',
      'artist:the-funk-brothers -active_in-> decade:1960s',
      'artist:the-funk-brothers -active_in-> decade:1970s',
    ]);
    // Born's own flag covers the birth, not the years active.
    expect(when[0].unverified).toBe(true);
    expect(when.slice(1).some((e) => e.unverified)).toBe(false);
  });

  it('reads a record with members as a group, flag or not', () => {
    const band = {
      slug: 'toto',
      name: 'Toto',
      members: [{ artistId: 'jeff-porcaro' }],
      born: { date: '1977', placeId: 'los-angeles' },
    };
    const when = (a: ArtistRecord) =>
      edgesForArtist(a)
        .filter((e) => ['born_year', 'formed_year', 'born_in'].includes(e.kind))
        .map(line);
    expect(when(band)).toEqual(['artist:toto -formed_year-> year:1977']);
    expect(isGroupArtist(band)).toBe(true);
    // No members, no flag: a person, born there.
    expect(when({ ...band, members: [] })).toEqual([
      'artist:toto -born_year-> year:1977',
      'artist:toto -born_in-> place:los-angeles',
    ]);
    expect(isGroupArtist({ members: 'jeff-porcaro' })).toBe(false);
  });

  it('runs a span still open to the snapshot year, or to its first decade', () => {
    const active = (over: Partial<ArtistRecord>, asOfYear?: number): string[] =>
      edgesForArtist({ slug: 'x', name: 'X', ...over }, asOfYear)
        .filter((e) => e.kind === 'active_in')
        .map((e) => e.to);
    expect(active({ activeFrom: 2008 }, 2026)).toEqual([
      'decade:2000s',
      'decade:2010s',
      'decade:2020s',
    ]);
    // Null is how a JSON body leaves a field unset.
    expect(
      active({ activeFrom: 2008, activeTo: null as unknown as number }, 2026),
    ).toHaveLength(3);
    // With no year to run to, all the span says for sure is where it began.
    expect(active({ activeFrom: 2008 })).toEqual(['decade:2000s']);
    expect(active({ activeFrom: 2008 }, 0)).toEqual(['decade:2000s']);
    // A span the calendar cannot read states no decade; integrity lists it.
    expect(active({ activeFrom: 2030 }, 2026)).toEqual([]);
    expect(active({ activeFrom: 1990, activeTo: 1980 })).toEqual([]);
    expect(active({ activeFrom: 1065, activeTo: 1965 })).toEqual([]);
    expect(active({ activeFrom: 1990, activeTo: 1990.5 })).toEqual([]);
    expect(active({ activeTo: 1990 })).toEqual([]);
    // The snapshot's year reaches the deriver through buildGraph.
    const graph = buildGraph({
      artists: [{ slug: 'x', name: 'X', activeFrom: 2008 }],
      asOfYear: 2026,
    });
    expect(
      graph.edges.filter((e) => e.kind === 'active_in').map((e) => e.to),
    ).toEqual(['decade:2000s', 'decade:2010s', 'decade:2020s']);
  });

  it('derives nothing from a birth with no date or place, or no birth at all', () => {
    const when = (born: unknown) =>
      edgesForArtist({
        slug: 'x',
        name: 'X',
        born: born as ArtistRecord['born'],
      });
    expect(when({})).toEqual([]);
    expect(when({ date: '', placeId: ' ' })).toEqual([]);
    expect(when({ date: 'c. 1939' })).toEqual([]);
    expect(when('1939')).toEqual([]);
    expect(when(null)).toEqual([]);
  });

  it('gives a record its billing, label and year, and nothing else', () => {
    const release: ReleaseRecord = {
      slug: 'toto-toto-iv',
      title: 'Toto IV',
      artistIds: ['toto'],
      format: 'album',
      year: 1982,
      labelId: 'columbia',
    };
    expect(edgesForRelease(release)).toEqual([
      {
        from: 'release:toto-toto-iv',
        kind: 'performed_by',
        to: 'artist:toto',
        via: { item: 'release:toto-toto-iv', path: 'artistIds[]' },
      },
      {
        from: 'release:toto-toto-iv',
        kind: 'released_on',
        to: 'label:columbia',
        via: { item: 'release:toto-toto-iv', path: 'labelId' },
      },
      {
        from: 'release:toto-toto-iv',
        kind: 'from_year',
        to: 'year:1982',
        via: { item: 'release:toto-toto-iv', path: 'year' },
      },
    ]);
  });

  it('places a studio, and a label under its parent', () => {
    const studio: StudioRecord = {
      slug: 'hitsville-u-s-a',
      name: 'Hitsville U.S.A.',
      placeId: 'detroit',
    };
    const label: LabelRecord = {
      slug: 'tamla',
      name: 'Tamla',
      placeId: 'detroit',
      parentLabelId: 'motown',
    };
    expect(edgesForStudio(studio).map(line)).toEqual([
      'studio:hitsville-u-s-a -based_in-> place:detroit',
    ]);
    expect(edgesForLabel(label).map(line)).toEqual([
      'label:tamla -based_in-> place:detroit',
      'label:tamla -imprint_of-> label:motown',
    ]);
    expect(edgesForLabel({ slug: 'motown', name: 'Motown' })).toEqual([]);
  });

  it("dates a studio's opening and a label's founding by their years", () => {
    expect(
      edgesForStudio({
        slug: 'hitsville-u-s-a',
        name: 'Hitsville U.S.A.',
        openedYear: 1959,
        unverified: true,
      }),
    ).toEqual([
      {
        from: 'studio:hitsville-u-s-a',
        kind: 'from_year',
        to: 'year:1959',
        via: { item: 'studio:hitsville-u-s-a', path: 'openedYear' },
        unverified: true,
      },
    ]);
    expect(
      edgesForLabel({ slug: 'motown', name: 'Motown', foundedYear: 1959 }),
    ).toEqual([
      {
        from: 'label:motown',
        kind: 'from_year',
        to: 'year:1959',
        via: { item: 'label:motown', path: 'foundedYear' },
      },
    ]);
    // A value that is not a year states none; closing years are not edges.
    expect(
      edgesForLabel({
        slug: 'x',
        name: 'X',
        foundedYear: 19.5,
        defunctYear: 1990,
      }),
    ).toEqual([]);
  });

  it('puts a city in its globe region', () => {
    const detroit = CITIES.find((c) => c.id === 'detroit')!;
    expect(edgesForPlace(detroit)[0]).toEqual({
      from: 'place:detroit',
      kind: 'located_in',
      to: 'place:region-north-america',
      via: { item: 'place:detroit', path: 'region' },
    });
    expect(edgesForPlace({ id: 'detroit', region: 'north-america' })).toEqual([
      edgesForPlace(detroit)[0],
    ]);
  });

  it("files a city's scene under its genres and decades", () => {
    const detroit = CITIES.find((c) => c.id === 'detroit')!;
    const edges = edgesForPlace(detroit).filter((e) => e.kind !== 'located_in');
    // 'Motown', 'Techno', 'Garage Rock' through the genre table; 1960–1990.
    expect(edges.map(line)).toEqual([
      'place:detroit -scene_of-> subgenre:motown',
      'place:detroit -scene_of-> subgenre:techno',
      'place:detroit -scene_of-> subgenre:garage-rock',
      'place:detroit -scene_active_in-> decade:1960s',
      'place:detroit -scene_active_in-> decade:1970s',
      'place:detroit -scene_active_in-> decade:1980s',
      'place:detroit -scene_active_in-> decade:1990s',
    ]);
    // The table is a lookup, not a guess: nothing here is dotted.
    expect(edges.every((e) => !e.inferred && !e.unverified)).toBe(true);
    expect(edges[0].via).toEqual({ item: 'place:detroit', path: 'genres[]' });
    expect(edges[3].via).toEqual({
      item: 'place:detroit',
      path: 'activeDecades[]',
    });
    // A string the table does not know, and a year that is none, say nothing.
    expect(
      edgesForPlace({
        id: 'x',
        region: 'north-america',
        genres: ['Not A Genre', 'World Music', ''],
        activeDecades: [1965.5, 0],
      }).map(line),
    ).toEqual(['place:x -located_in-> place:region-north-america']);
  });

  it('dates a song by its year, and still buckets a year into its era here', () => {
    // eraForYear lives in time.ts now (time.test.ts pins it); it stays
    // importable from here for the callers that already use it.
    expect(eraForYear(1979)).toBe('postwar');
    expect(eraForYear(1980)).toBe('electronic-hiphop');
    expect(edgesForSongYear({ id: 'africa', year: 1982 })).toEqual([
      {
        from: 'song:africa',
        kind: 'from_year',
        to: 'year:1982',
        via: { item: 'song:africa', path: 'year' },
      },
    ]);
    // A year before the first era still has its year node.
    expect(edgesForSongYear({ id: 'old', year: 300 }).map(line)).toEqual([
      'song:old -from_year-> year:300',
    ]);
    expect(edgesForSongYear({ id: 'undated' })).toEqual([]);
  });

  it("reads a Teach day's song and events, folding a song's event", () => {
    const edges = edgesForDayStub({
      slug: 'aug-day-1',
      songId: 'lovely_day',
      globeEventIds: ['evt-funk-la-1975-earth-wind-fire', 'song-africa'],
    });
    expect(edges.map(line)).toEqual([
      'teach_day:aug-day-1 -uses_song-> song:lovely_day',
      'teach_day:aug-day-1 -references_event-> event:evt-funk-la-1975-earth-wind-fire',
      'teach_day:aug-day-1 -references_event-> song:africa',
    ]);
    expect(edges[0].via).toEqual({
      item: 'teach_day:aug-day-1',
      path: 'songId',
      code: CODE_OWNERS.teachYear,
    });
  });

  it('puts each stop of a pathway on it', () => {
    const edges = edgesForPathway({
      id: 'blues-to-rock',
      eventIds: ['evt-blues-clarksdale-1903', 'song-africa'],
    });
    expect(edges.map(line)).toEqual([
      'event:evt-blues-clarksdale-1903 -part_of-> pathway:blues-to-rock',
      'song:africa -part_of-> pathway:blues-to-rock',
    ]);
    expect(edges[1].via).toEqual({
      item: 'pathway:blues-to-rock',
      path: 'eventIds[]',
      code: CODE_OWNERS.pathways,
    });
  });

  it('lands an influence arc between two song events on the songs', () => {
    const [arc] = edgesForInfluenceArcs([
      { from: 'song-africa', to: 'song-dreams' },
    ]);
    expect(arc).toEqual({
      from: 'song:africa',
      kind: 'influenced',
      to: 'song:dreams',
      via: {
        item: 'song:africa',
        path: INFLUENCE_ARC_PATH,
        code: CODE_OWNERS.influenceArcs,
      },
    });
  });

  it('lands an arc from a second recording on its song, and drops the one to the song itself', () => {
    // The BBC live Valerie is the song valerie (songEventAliases.ts): its arc
    // to the record would be the song influencing itself.
    const edges = edgesForInfluenceArcs([
      { from: 'song-valerie_bbc_live_version', to: 'song-valerie' },
      { from: 'evt-britpop-london-1995', to: 'song-valerie_bbc_live_version' },
      { from: 'song-valerie_bbc_live_version', to: 'song-rehab' },
    ]);
    expect(edges.map(line)).toEqual([
      'event:evt-britpop-london-1995 -influenced-> song:valerie',
      'song:valerie -influenced-> song:rehab',
    ]);
    expect(edges[1].via?.item).toBe('song:valerie');
  });

  it('derives nothing from a blank field', () => {
    expect(
      edgesForArtist({
        slug: 'x',
        name: 'X',
        basedInPlaceId: ' ',
        labelIds: [''],
        members: [{ artistId: '' }],
      }),
    ).toEqual([]);
    expect(edgesForDayStub({ slug: 'aug-day-1', songId: '' })).toEqual([]);
  });
});

describe('deriving event, song-pin and instrument edges', () => {
  const event: GlobeEventInput = {
    id: 'evt-toto-africa-1982',
    title: 'Toto release "Africa"',
    year: 1982,
    location: { lat: 34.05, lng: -118.24, city: 'Los Angeles', country: 'USA' },
    genre: ['Soft Rock', 'Not A Genre'],
    tags: ['toto', 'africa'],
  };
  const match: EventMatch = {
    artists: [
      { artistId: 'toto', path: 'tags[]' },
      { artistId: 'toto', path: 'title' },
    ],
    songs: [{ songId: 'africa', path: 'title' }],
  };

  it("reads an event's year, place, genres and subjects", () => {
    const edges = edgesForEvent(event, match);
    expect(edges.map(line)).toEqual([
      'event:evt-toto-africa-1982 -from_year-> year:1982',
      'event:evt-toto-africa-1982 -took_place_in-> place:los-angeles',
      'event:evt-toto-africa-1982 -in_genre-> subgenre:soft-rock',
      'event:evt-toto-africa-1982 -about-> artist:toto',
      'event:evt-toto-africa-1982 -about-> artist:toto',
      'event:evt-toto-africa-1982 -about-> song:africa',
    ]);
    const by = (kind: Edge['kind']) => edges.filter((e) => e.kind === kind);
    // The city is placed by name and the subjects read from the text: guesses.
    expect(by('took_place_in')[0]).toMatchObject({
      inferred: true,
      via: { item: 'event:evt-toto-africa-1982', path: 'location.city' },
    });
    expect(by('about').every((e) => e.inferred)).toBe(true);
    // Each guess cites the part of the event that named it.
    expect(by('about').map((e) => e.via?.path)).toEqual([
      'tags[]',
      'title',
      'title',
    ]);
    // The genre goes through the curated table, so it is drawn solid.
    expect(by('in_genre')[0].inferred).toBeUndefined();
    expect(by('from_year')[0].inferred).toBeUndefined();
    // Merged, the one artist is one edge citing both.
    const graph = buildGraph({
      events: [event],
      eventMatches: new Map([[event.id, match]]),
    });
    const about = graph.edges.filter((e) => e.to === 'artist:toto');
    expect(about).toHaveLength(1);
    expect(about[0].via.map((v) => v.path)).toEqual(['tags[]', 'title']);
  });

  it('lets a stored id beat a guess, field by field', () => {
    const stored: GlobeEventInput = {
      ...event,
      artistIds: ['toto', 'jeff-porcaro'],
      placeId: 'los-angeles',
    };
    const edges = edgesForEvent(stored, match);
    expect(edges.filter((e) => e.kind === 'about').map(line)).toEqual([
      'event:evt-toto-africa-1982 -about-> artist:toto',
      'event:evt-toto-africa-1982 -about-> artist:jeff-porcaro',
      // No songs are stored, so the song is still the guess.
      'event:evt-toto-africa-1982 -about-> song:africa',
    ]);
    const solid = edges.filter((e) => !e.inferred);
    expect(solid.map((e) => `${line(e)} ${e.via?.path}`)).toEqual([
      'event:evt-toto-africa-1982 -from_year-> year:1982 year',
      'event:evt-toto-africa-1982 -took_place_in-> place:los-angeles placeId',
      'event:evt-toto-africa-1982 -in_genre-> subgenre:soft-rock genre[]',
      'event:evt-toto-africa-1982 -about-> artist:toto artistIds[]',
      'event:evt-toto-africa-1982 -about-> artist:jeff-porcaro artistIds[]',
    ]);
  });

  it('reads an empty stored list as about no one', () => {
    const edges = edgesForEvent(
      { ...event, artistIds: [], songIds: [] },
      match,
    );
    expect(edges.filter((e) => e.kind === 'about')).toEqual([]);
    // Nothing else changes.
    expect(edges.map((e) => e.kind)).toEqual([
      'from_year',
      'took_place_in',
      'in_genre',
    ]);
  });

  it('reads a stored value that is not a list as not stated', () => {
    // A partial body can hold anything. Integrity's coverage counts such a
    // value as absent; so does the deriver, and the event keeps the rest.
    const edges = edgesForEvent(
      {
        ...event,
        artistIds: 'toto' as unknown as string[],
        studioIds: { id: 'sunset-sound' } as unknown as string[],
      },
      match,
    );
    expect(edges.map((e) => e.kind)).toEqual(
      edgesForEvent(event, match).map((e) => e.kind),
    );
    expect(
      edges.filter((e) => e.kind === 'about').every((e) => e.inferred),
    ).toBe(true);
  });

  it('states the records, studios and labels an event stores, and guesses none', () => {
    const stored: GlobeEventInput = {
      ...event,
      releaseIds: ['toto-toto-iv', ''],
      studioIds: ['sunset-sound'],
      labelIds: ['columbia'],
    };
    const about = edgesForEvent(stored, match).filter(
      (e) => e.kind === 'about' && !e.inferred,
    );
    expect(about.map((e) => `${line(e)} ${e.via?.path}`)).toEqual([
      'event:evt-toto-africa-1982 -about-> release:toto-toto-iv releaseIds[]',
      'event:evt-toto-africa-1982 -about-> studio:sunset-sound studioIds[]',
      'event:evt-toto-africa-1982 -about-> label:columbia labelIds[]',
    ]);
    expect(about.every(isValidEdge)).toBe(true);
    // Nothing infers them, so an event that stores none is about none.
    expect(
      edgesForEvent({ ...event, releaseIds: [] }, match).filter((e) =>
        ['release', 'studio', 'label'].some((k) => e.to.startsWith(`${k}:`)),
      ),
    ).toEqual([]);
  });

  it('lets an unverified event vouch for none of its fields', () => {
    const edges = edgesForEvent(
      {
        ...event,
        placeId: 'los-angeles',
        labelIds: ['columbia'],
        unverified: true,
        source: 'fan wiki',
      },
      match,
    );
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((e) => e.unverified && e.source === 'fan wiki')).toBe(
      true,
    );
    // The guesses stay guesses.
    expect(
      edges.filter((e) => e.kind === 'about' && e.to.startsWith('artist:')),
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ inferred: true })]),
    );
  });

  it("skips a song's globe event: it is the song", () => {
    expect(
      edgesForEvent(
        { ...event, id: 'song-africa', year: 2000, artistIds: ['toto'] },
        match,
      ),
    ).toEqual([]);
    // Its node is still the song's.
    const graph = buildGraph({
      songs: [africa],
      events: [{ ...event, id: 'song-africa' }],
      eventMatches: new Map([['song-africa', match]]),
    });
    expect(graph.nodes.has('event:song-africa')).toBe(false);
    expect(graph.edges.filter((e) => e.kind === 'about')).toEqual([]);
  });

  it('places an event only where the registry can', () => {
    const at = (city: string, country?: string) =>
      edgesForEvent({
        id: 'evt-x',
        location: { city, ...(country ? { country } : {}) },
      }).map(line);
    expect(at('Los Angeles', 'USA')).toEqual([
      'event:evt-x -took_place_in-> place:los-angeles',
    ]);
    // Unknown to the registry, or a name it cannot pin to one city: no guess
    // of a guess, so no edge at all.
    expect(at('Nowhere', 'Atlantis')).toEqual([]);
    expect(at('Portland')).toEqual([]);
    expect(at('Portland', 'US')).toEqual([]);
    expect(at('')).toEqual([]);
  });

  it('never makes an artist of a tag that is also a place or a genre', () => {
    // An artist record the console created, named like the city and a genre.
    const artists = [
      { slug: 'chicago', name: 'Chicago' },
      { slug: 'soul', name: 'Soul' },
      { slug: 'toto', name: 'Toto' },
    ];
    const events: GlobeEventInput[] = [
      {
        id: 'evt-blues-chicago-1950',
        title: 'Electric blues takes over the South Side',
        location: { city: 'Chicago', country: 'USA' },
        genre: ['Soul'],
        tags: ['chicago', 'soul', 'toto'],
      },
      {
        id: 'evt-chicago-debut-1969',
        title: 'Chicago release their debut',
        tags: ['chicago'],
      },
    ];
    const matches = matchSnapshotEvents({ events, artists, places: CITIES });
    const named = (id: string) =>
      matches.get(id)?.artists.map((a) => `${a.artistId} ${a.path}`);
    expect(named('evt-blues-chicago-1950')).toEqual(['toto tags[]']);
    // A title that opens on the name, confirmed by a tag, still says so.
    expect(named('evt-chicago-debut-1969')).toEqual(['chicago title']);
  });

  it('knows a city by its state or country too', () => {
    // A registry entry named for a city with its state, and a tag like it.
    const artists = [{ slug: 'portland-maine', name: 'Portland, Maine' }];
    const events: GlobeEventInput[] = [
      { id: 'evt-a', title: 'A folk night', tags: ['portland maine'] },
      { id: 'evt-b', title: 'A reggae night', tags: ['kingston jamaica'] },
    ];
    const matches = matchSnapshotEvents({ events, artists, places: CITIES });
    expect(matches.get('evt-a')?.artists).toEqual([]);
    const { placeNames } = placeAndGenreNames({ places: CITIES, events });
    expect(placeNames).toContain('Portland Maine');
    expect(placeNames).toContain('Kingston Jamaica');
    expect(placeNames).toContain('Portland US');
  });

  it('matches a song only with its performer, as the graph reads the song', () => {
    const events: GlobeEventInput[] = [
      { id: 'evt-a', title: 'Toto release "Africa"', tags: ['toto'] },
      { id: 'evt-b', title: 'A continent sings "Africa"', tags: ['africa'] },
    ];
    // By Toto on its artist line alone. (The real chart bills its two
    // singers, so to the graph it is theirs, and an event about Toto does
    // not reach it until the lead act is linked.)
    const byToto = song('africa', { title: 'Africa', artist: 'Toto' });
    const matches = matchSnapshotEvents({
      events,
      artists: [{ slug: 'toto', name: 'Toto' }],
      songs: [byToto],
    });
    expect(matches.get('evt-a')?.songs).toEqual([
      { songId: 'africa', path: 'title' },
    ]);
    expect(matches.get('evt-b')?.songs).toEqual([]);
    expect(
      matchSnapshotEvents({
        events,
        artists: [{ slug: 'toto', name: 'Toto' }],
        songs: [africa],
      }).get('evt-a')?.songs,
    ).toEqual([]);
  });

  it("pins an act's songs to a city only while the act names none", () => {
    const pin = { id: 'marvin gaye', city: 'Detroit', country: 'US' };
    expect(edgesForArtistLocation(pin, { slug: 'marvin-gaye' })).toEqual([
      {
        from: 'artist:marvin-gaye',
        kind: 'based_in',
        to: 'place:detroit',
        // Filed under the artist, naming the pin that states it.
        via: {
          item: 'artist:marvin-gaye',
          path: 'city',
          statedBy: { kind: 'artist_location', id: 'marvin gaye' },
        },
        inferred: true,
      },
    ]);
    // A City of its own wins; with no artist record, or a city the registry
    // cannot place, the pin says nothing.
    expect(
      edgesForArtistLocation(pin, {
        slug: 'marvin-gaye',
        basedInPlaceId: 'washington-dc',
      }),
    ).toEqual([]);
    expect(edgesForArtistLocation(pin, undefined)).toEqual([]);
    expect(
      edgesForArtistLocation(
        { ...pin, city: 'Slab Fork' },
        { slug: 'marvin-gaye' },
      ),
    ).toEqual([]);

    // Through the snapshot: the record's own city suppresses the pin.
    const based = buildGraph({
      artists: [
        { slug: 'marvin-gaye', name: 'Marvin Gaye', basedInPlaceId: 'detroit' },
        { slug: 'toto', name: 'Toto' },
      ],
      places: CITIES.filter((c) =>
        ['detroit', 'los-angeles', 'washington-dc'].includes(c.id),
      ),
      artistLocations: [
        { id: 'marvin gaye', city: 'Los Angeles', country: 'US' },
        { id: 'toto', city: 'Los Angeles', country: 'US' },
      ],
    });
    expect(
      based.edges
        .filter((e) => e.kind === 'based_in')
        .map((e) => `${line(e)}${e.inferred ? ' (guess)' : ''}`),
    ).toEqual([
      'artist:marvin-gaye -based_in-> place:detroit',
      'artist:toto -based_in-> place:los-angeles (guess)',
    ]);
  });

  it('keeps two pins for one act as two sources', () => {
    // The globe keys pins by name as written, so one act can have two.
    const graph = buildGraph({
      artists: [{ slug: 'earth-wind-and-fire', name: 'Earth, Wind & Fire' }],
      places: CITIES.filter((c) => c.id === 'chicago'),
      artistLocations: [
        { id: 'earth, wind and fire', city: 'Chicago', country: 'US' },
        { id: 'earth, wind, and fire', city: 'Chicago', country: 'US' },
      ],
    });
    const pins = graph.edges.filter((e) => e.kind === 'based_in');
    expect(pins).toHaveLength(1);
    expect(pins[0].via.map((v) => v.statedBy?.id)).toEqual([
      'earth, wind and fire',
      'earth, wind, and fire',
    ]);
  });

  it("states an instrument's typical genres as code's", () => {
    expect(
      edgesForInstrument('banjo', ['subgenre:bluegrass', 'genre:folk']),
    ).toEqual([
      {
        from: 'instrument:banjo',
        kind: 'typical_in',
        to: 'subgenre:bluegrass',
        via: {
          item: 'instrument:banjo',
          path: TYPICAL_IN_PATH,
          code: CODE_OWNERS.instrumentGenres,
        },
      },
      expect.objectContaining({ to: 'genre:folk' }),
    ]);
    // Only a snapshot that carries the table has its edges.
    expect(buildGraph({}).edges).toEqual([]);
    const graph = buildGraph({ instrumentGenres: INSTRUMENT_GENRES });
    expect(graph.violations).toEqual([]);
    // A subgenre walks up to its genre, so the banjo reaches Folk.
    expect(
      graph.egoNetwork('instrument:banjo', 2).hopOf.get('genre:folk'),
    ).toBe(2);
  });

  it('names only real instruments, genres and subgenres in the table', () => {
    const instruments = new Set(SESSION_INSTRUMENTS.map((i) => i.id));
    const genres = new Set(GENRES.map((g) => `genre:${g.id}`));
    const subgenres = new Set(
      Object.keys(SUBGENRE_PARENT).map((id) => `subgenre:${id}`),
    );
    const rows = Object.entries(INSTRUMENT_GENRES);
    expect(rows.length).toBeGreaterThan(30);
    expect(rows.map(([id]) => id).filter((id) => !instruments.has(id))).toEqual(
      [],
    );
    const named = rows.flatMap(([, list]) => list);
    expect(named.filter((id) => !genres.has(id) && !subgenres.has(id))).toEqual(
      [],
    );
    // Each row lists a genre once.
    for (const [id, list] of rows) {
      expect(new Set(list).size, id).toBe(list.length);
    }
  });
});

describe('building the graph', () => {
  it('names a source on every edge, and only real items as sources', () => {
    const graph = buildGraph({
      songs: [africa],
      artists: [
        { slug: 'toto', name: 'Toto', labelIds: ['columbia'] },
        { slug: 'x', name: 'X', influencedBy: [{ artistId: 'toto' }] },
      ],
      places: CITIES.filter((c) => c.id === 'los-angeles'),
      dayStubs: [{ slug: 'aug-day-1', label: 'Day 1', songId: 'africa' }],
      pathways: [{ id: 'p', title: 'P', eventIds: ['song-africa'] }],
      influenceArcs: [{ from: 'song-africa', to: 'song-africa' }],
    });
    expect(graph.edges.length).toBeGreaterThan(20);
    for (const edge of graph.edges) {
      expect(edge.via.length, line(edge)).toBeGreaterThan(0);
      for (const via of edge.via) {
        expect(graph.nodes.has(via.item), `${line(edge)} ${via.item}`).toBe(
          true,
        );
        expect(via.path).toBeTruthy();
      }
    }
  });

  it('merges one connection stated by two fields into one edge', () => {
    // The lead act is linked; a billed credit names the same act as text.
    const graph = buildGraph({
      songs: [
        song('africa', {
          origin: { artistGlobeId: 'toto' },
          credits: [{ name: 'Toto', role: 'performer', primary: true }],
        }),
      ],
    });
    const billed = graph.edges.filter((e) => e.kind === 'performed_by');
    expect(billed).toHaveLength(1);
    expect(billed[0]).toMatchObject({ from: 'song:africa', to: 'artist:toto' });
    expect(billed[0].via).toEqual([
      { item: 'song:africa', path: 'credits[].name' },
      { item: 'song:africa', path: 'origin.artistGlobeId' },
    ]);
    // One linked source makes it solid, though the credit alone is a guess.
    expect(billed[0].inferred).toBeUndefined();
  });

  it('merges a connection two records state from either end', () => {
    // Each song says the other is related: one as the original it covers,
    // the other as a cover of it. Same fact, two owners, one edge.
    const graph = buildGraph({
      songs: [
        song('cover_version', {
          relatedRecordings: [
            { artist: 'A', relation: 'original', songId: 'the_original' },
          ],
        }),
        song('the_original', {
          relatedRecordings: [
            { artist: 'B', relation: 'cover', songId: 'cover_version' },
          ],
        }),
      ],
    });
    const covers = graph.edges.filter((e) => e.kind === 'covers');
    expect(covers.map(line)).toEqual([
      'song:cover_version -covers-> song:the_original',
    ]);
    expect(covers[0].via).toEqual([
      { item: 'song:cover_version', path: 'relatedRecordings[].songId' },
      { item: 'song:the_original', path: 'relatedRecordings[].songId' },
    ]);
  });

  it('keeps a merged edge a guess, or unconfirmed, only if every source is', () => {
    const at = (path: string, extra: Partial<Edge> = {}): Edge => ({
      from: 'artist:a',
      kind: 'influenced',
      to: 'artist:b',
      via: { item: 'artist:b', path },
      ...extra,
    });
    const merged = (...edges: Edge[]) => assembleGraph([], edges).edges;

    const guesses = merged(
      at('p1', { inferred: true, unverified: true, source: 'x' }),
      at('p2', { inferred: true, unverified: true, source: 'y' }),
    );
    expect(guesses).toHaveLength(1);
    expect(guesses[0]).toMatchObject({
      inferred: true,
      unverified: true,
      source: 'x; y',
    });

    const mixed = merged(
      at('p1', { inferred: true, unverified: true }),
      at('p2'),
    );
    expect(mixed[0].inferred).toBeUndefined();
    expect(mixed[0].unverified).toBeUndefined();
    expect(mixed[0].via.map((v) => v.path)).toEqual(['p1', 'p2']);

    // The same field stated twice is still one source.
    expect(merged(at('p1'), at('p1'))[0].via).toHaveLength(1);
  });

  it('makes a song and its globe event one node', () => {
    const graph = buildGraph({
      songs: [africa, BUNDLED_SONGS.dreams],
      events: [
        { id: 'song-africa', title: 'Africa — Toto' },
        { id: 'song-dreams', title: 'Dreams — Fleetwood Mac' },
        { id: 'evt-a', title: 'An event' },
      ],
      dayStubs: [
        { slug: 'aug-day-1', label: 'Day 1', globeEventIds: ['song-africa'] },
      ],
      pathways: [{ id: 'p', title: 'P', eventIds: ['evt-a', 'song-africa'] }],
      influenceArcs: [
        { from: 'song-africa', to: 'song-dreams' },
        { from: 'evt-a', to: 'song-africa' },
      ],
    });
    expect(
      [...graph.nodes.keys()].filter((id) => id.startsWith('event:song-')),
    ).toEqual([]);
    // The song's own title wins over its event's.
    expect(graph.nodes.get('song:africa')?.label).toBe('Africa');
    const africaEdges = graph.adjacency.get('song:africa')!.map(line);
    expect(africaEdges).toContain('song:africa -influenced-> song:dreams');
    expect(africaEdges).toContain('event:evt-a -influenced-> song:africa');
    expect(africaEdges).toContain(
      'teach_day:aug-day-1 -references_event-> song:africa',
    );
    expect(africaEdges).toContain('song:africa -part_of-> pathway:p');
    // …alongside everything the song's own record says.
    expect(africaEdges).toContain(
      'song:africa -recorded_in-> place:los-angeles',
    );
    expect(graph.violations).toEqual([]);
  });

  it('turns an id nothing defines into a missing node, never a phantom', () => {
    const graph = buildGraph({
      artists: [
        {
          slug: 'toto',
          name: 'Toto',
          labelIds: ['no-such-label'],
          genreIds: ['rock', 'not-a-genre'],
        },
      ],
      events: [{ id: 'song-not_in_library', title: 'Ghost — Nobody' }],
    });
    expect(graph.nodes.get('label:no-such-label')).toEqual({
      id: 'label:no-such-label',
      kind: 'label',
      label: 'no-such-label',
      status: 'missing',
      origin: 'code',
    });
    // A vocabulary value is a code node; a value the vocabulary lacks is not.
    expect(graph.nodes.get('genre:rock')).toMatchObject({
      label: 'Rock',
      status: 'code',
    });
    expect(graph.nodes.get('genre:not-a-genre')?.status).toBe('missing');
    // The globe names a song the library does not have.
    expect(graph.nodes.get('song:not_in_library')).toMatchObject({
      status: 'missing',
      label: 'Ghost — Nobody',
    });
  });

  it('labels a person known only by name with the name the credit prints', () => {
    const graph = buildGraph({
      songs: [
        song('so_far_away', {
          artist: 'Carole King',
          credits: [
            { name: 'Russ  Kunkel', role: 'performer', instrument: 'drum-kit' },
            { name: "D'Arcy Wretzky-Brown", role: 'engineer' },
            // A second spelling of the same person: the first one printed wins.
            { name: 'RUSS KUNKEL', role: 'producer' },
          ],
        }),
        song('ballad', {
          artist: 'Nobody Registered',
          composer: 'Gerry Goffin and Carole King',
        }),
      ],
      artists: [
        { slug: 'carole-king', name: 'Carole King' },
        // A member with no record of their own: no record prints their name.
        { slug: 'band', name: 'Band', members: [{ artistId: 'tal-herzberg' }] },
      ],
    });
    const label = (id: string) => graph.nodes.get(id as EntityId)?.label;
    expect(graph.nodes.get('artist:russ-kunkel' as EntityId)).toMatchObject({
      label: 'Russ Kunkel',
      status: 'missing',
    });
    expect(label('artist:darcy-wretzky-brown')).toBe("D'Arcy Wretzky-Brown");
    expect(label('artist:nobody-registered')).toBe('Nobody Registered');
    expect(label('artist:gerry-goffin')).toBe('Gerry Goffin');
    // A person with a record keeps the record's own name.
    expect(label('artist:carole-king')).toBe('Carole King');
    // No printed name at all: the slug as words.
    expect(label('artist:tal-herzberg')).toBe('Tal Herzberg');
  });

  it('labels the code vocabularies from the code', () => {
    const graph = buildGraph({
      songs: [song('in_e_flat', { key: 'E♭ major', year: 1965 })],
      places: CITIES.filter((c) => c.id === 'detroit'),
      artists: [
        {
          slug: 'a',
          name: 'A',
          instrumentIds: ['drum-kit'],
          genreIds: ['acid-rock'],
        },
      ],
    });
    const label = (id: EntityId) => graph.nodes.get(id)?.label;
    expect(label('key:e-flat')).toBe('E♭');
    expect(label('mode:major')).toBe('Major');
    expect(label('era:postwar')).toBe('Postwar & Revolution');
    expect(label('place:region-north-america')).toBe('North America');
    expect(label('place:detroit')).toBe('Detroit');
    expect(label('instrument:drum-kit')).toBe('Drum Kit');
    expect(label('subgenre:acid-rock')).toBe('Acid Rock');
    expect(label('year:1965')).toBe('1965');
    expect(label('decade:1960s')).toBe('1960s');
    const statuses = new Set(
      [...graph.nodes.values()].map((n: GraphNode) => n.status),
    );
    expect(statuses).toEqual(new Set(['code']));
  });

  it('reports a bad edge after folding, and keeps it out of the graph', () => {
    // A stored id field is read as written, so a display name typed into it
    // is reported rather than quietly slugged into a real-looking id.
    const graph = buildGraph({
      artists: [{ slug: 'toto', name: 'Toto', basedInPlaceId: 'Los Angeles' }],
      // An event id where a song id belongs.
      dayStubs: [{ slug: 'aug-day-1', label: 'Day 1', songId: 'song-africa' }],
    });
    expect(graph.violations.map((v) => `${v.reason}: ${line(v.edge)}`)).toEqual(
      [
        'malformed: artist:toto -based_in-> place:Los Angeles',
        'malformed: teach_day:aug-day-1 -uses_song-> song:song-africa',
      ],
    );
    expect(graph.violations[0].edge.via).toEqual({
      item: 'artist:toto',
      path: 'basedInPlaceId',
    });
    expect(graph.edges).toEqual([]);
    expect(graph.nodes.has('place:Los Angeles')).toBe(false);
  });

  it('validates endpoints on the folded ids, not the written ones', () => {
    const via = { item: 'teach_day:aug-day-1' as EntityId, path: 'songId' };
    const graph = assembleGraph(
      [],
      [
        // Written as an event, it is the song: a valid `uses_song`.
        {
          from: 'teach_day:aug-day-1',
          kind: 'uses_song',
          to: 'event:song-africa',
          via,
        },
        // Folded onto a song, an instrument edge no longer makes sense.
        {
          from: 'event:song-africa',
          kind: 'plays_instrument',
          to: 'instrument:drum-kit',
          via,
        },
        // No source at all.
        { from: 'artist:a', kind: 'influenced', to: 'artist:b' },
      ],
    );
    expect(graph.edges.map(line)).toEqual([
      'teach_day:aug-day-1 -uses_song-> song:africa',
    ]);
    expect(graph.violations.map((v) => `${v.reason}: ${line(v.edge)}`)).toEqual(
      [
        'endpoints: song:africa -plays_instrument-> instrument:drum-kit',
        'no-via: artist:a -influenced-> artist:b',
      ],
    );
  });

  it('builds a record into the graph: its title, billing, label and year', () => {
    const graph = buildGraph({
      releases: [
        {
          slug: 'toto-toto-iv',
          title: 'Toto IV',
          artistIds: ['toto'],
          format: 'album',
          year: 1982,
          labelId: 'columbia',
        },
      ],
    });
    expect(graph.nodes.get('release:toto-toto-iv')).toEqual({
      id: 'release:toto-toto-iv',
      kind: 'release',
      label: 'Toto IV',
      status: 'code',
      origin: 'code',
    });
    const stated = graph.adjacency
      .get('release:toto-toto-iv')!
      .map((e) => `${line(e)} via ${e.via.map((v) => v.path).join(', ')}`);
    expect(stated).toEqual([
      'release:toto-toto-iv -performed_by-> artist:toto via artistIds[]',
      'release:toto-toto-iv -released_on-> label:columbia via labelId',
      'release:toto-toto-iv -from_year-> year:1982 via year',
    ]);
    // Everything else is the calendar's: the year in its decade and era.
    const others = graph.edges.filter(
      (e) => !e.via.every((v) => v.item === 'release:toto-toto-iv'),
    );
    expect(others.map(line)).toEqual([
      'year:1982 -in_decade-> decade:1980s',
      'year:1982 -from_era-> era:electronic-hiphop',
    ]);
    expect(others.every((e) => e.via.every(isCodeOwnedVia))).toBe(true);
  });

  const hitsville: StudioRecord = {
    slug: 'hitsville-u-s-a',
    name: 'Hitsville U.S.A.',
    placeId: 'detroit',
    source: 'wikipedia',
  };

  it("places a song cut at a known studio in that studio's city", () => {
    const graph = buildGraph({
      songs: [
        song('studio_only', {
          session: { studio: 'Hitsville U.S.A.', unverified: true },
        }),
        // A studio with no record, or a record with no city, places nothing.
        song('unknown_room', { session: { studio: 'Nowhere Sound' } }),
      ],
      studios: [hitsville, { slug: 'nowhere-sound', name: 'Nowhere Sound' }],
    });
    expect(graph.edges.filter((e) => e.kind === 'recorded_in')).toEqual([
      {
        from: 'song:studio_only',
        kind: 'recorded_in',
        to: 'place:detroit',
        // The studio's field says where; the session only named the room.
        via: [{ item: 'studio:hitsville-u-s-a', path: 'placeId' }],
        inferred: true,
        unverified: true,
        source: 'wikipedia',
      },
    ]);
    // The song reaches the city in one hop, as a guess.
    expect(
      graph.egoNetwork('song:studio_only', 1).nodes.map((n) => n.id),
    ).toContain('place:detroit');
  });

  it("places a song linked to its studio in the studio's city, stated", () => {
    const graph = buildGraph({
      songs: [
        song('linked_room', {
          session: { studio: 'Hitsville U.S.A.', studioId: 'hitsville-u-s-a' },
        }),
      ],
      studios: [hitsville],
    });
    expect(graph.edges.filter((e) => e.kind === 'recorded_in')).toEqual([
      {
        from: 'song:linked_room',
        kind: 'recorded_in',
        to: 'place:detroit',
        via: [{ item: 'studio:hitsville-u-s-a', path: 'placeId' }],
        source: 'wikipedia',
      },
    ]);
    // Both halves are stated now: the studio's city and the song's.
    expect(graph.solidDegree('place:detroit')).toBe(2);
  });

  it("lets a city the session names win over the studio's", () => {
    const graph = buildGraph({
      songs: [
        song('both', {
          session: {
            studio: 'Hitsville U.S.A.',
            city: 'Los Angeles',
            country: 'USA',
          },
        }),
      ],
      studios: [hitsville],
    });
    const placed = graph.edges.filter((e) => e.kind === 'recorded_in');
    expect(placed.map(line)).toEqual([
      'song:both -recorded_in-> place:los-angeles',
    ]);
    expect(placed[0].via).toEqual([
      { item: 'song:both', path: 'session.city' },
    ]);
  });

  it('walks a subgenre up to its genre', () => {
    const graph = buildGraph({
      artists: [{ slug: 'a', name: 'A', genreIds: ['acid-rock'] }],
    });
    expect(graph.edges.find((e) => e.from === 'subgenre:acid-rock')).toEqual({
      from: 'subgenre:acid-rock',
      kind: 'in_genre',
      to: 'genre:rock',
      via: [
        {
          item: 'subgenre:acid-rock',
          path: SUBGENRE_PARENT_PATH,
          code: CODE_OWNERS.subgenres,
        },
      ],
    });
    expect(graph.nodes.get('genre:rock')).toMatchObject({
      label: 'Rock',
      status: 'code',
    });
    const fromGenre = graph.egoNetwork('genre:rock', 2);
    expect(fromGenre.nodes.map((n) => n.id)).toEqual([
      'genre:rock',
      'subgenre:acid-rock',
      'artist:a',
    ]);
    expect(graph.violations).toEqual([]);
  });

  it('marks what code states, so no content item is held to it', () => {
    const graph = buildGraph({
      songs: [africa, BUNDLED_SONGS.dreams],
      artists: [{ slug: 'a', name: 'A', genreIds: ['acid-rock'] }],
      instrumentGenres: { sitar: ['subgenre:raga-rock'] },
      dayStubs: [
        {
          slug: 'aug-day-1',
          label: 'Day 1',
          songId: 'africa',
          globeEventIds: ['song-dreams'],
        },
      ],
      pathways: [{ id: 'p', title: 'P', eventIds: ['song-africa'] }],
      influenceArcs: [{ from: 'song-africa', to: 'song-dreams' }],
    });
    const vias = graph.edges.flatMap((e) => e.via);
    const owned = vias
      .filter(isCodeOwnedVia)
      .map((v) => `${v.item} ${v.path} ← ${v.code}`)
      .sort();
    expect(owned).toEqual(
      [
        `instrument:sitar ${TYPICAL_IN_PATH} ← ${CODE_OWNERS.instrumentGenres}`,
        `pathway:p eventIds[] ← ${CODE_OWNERS.pathways}`,
        `song:africa ${INFLUENCE_ARC_PATH} ← ${CODE_OWNERS.influenceArcs}`,
        `subgenre:acid-rock ${SUBGENRE_PARENT_PATH} ← ${CODE_OWNERS.subgenres}`,
        `subgenre:raga-rock ${SUBGENRE_PARENT_PATH} ← ${CODE_OWNERS.subgenres}`,
        `teach_day:aug-day-1 globeEventIds[] ← ${CODE_OWNERS.teachYear}`,
        `teach_day:aug-day-1 songId ← ${CODE_OWNERS.teachYear}`,
        // Africa is from 1982 and Dreams from 1977: the calendar's.
        `year:1977 ${YEAR_DECADE_PATH} ← ${CODE_OWNERS.calendar}`,
        `year:1977 ${YEAR_ERA_PATH} ← ${CODE_OWNERS.eras}`,
        `year:1982 ${YEAR_DECADE_PATH} ← ${CODE_OWNERS.calendar}`,
        `year:1982 ${YEAR_ERA_PATH} ← ${CODE_OWNERS.eras}`,
      ].sort(),
    );
    // Nothing a code list states slips through unmarked.
    expect(
      vias
        .filter((v) => !isCodeOwnedVia(v))
        .filter(
          (v) =>
            ['teach_day', 'pathway', 'subgenre', 'year', 'instrument'].includes(
              v.item.split(':')[0],
            ) || v.path === INFLUENCE_ARC_PATH,
        ),
    ).toEqual([]);
    // Each owner is a real file, for the console's `code:<file>` explanation.
    for (const file of Object.values(CODE_OWNERS)) {
      expect(existsSync(file), file).toBe(true);
    }
  });

  it('folds a seed the way it folds an edge', () => {
    const graph = assembleGraph(
      [
        {
          id: 'event:song-africa',
          kind: 'event',
          status: 'draft',
          origin: 'api',
          label: 'Africa — Toto',
        },
      ],
      [
        {
          from: 'teach_day:aug-day-1',
          kind: 'references_event',
          to: 'event:song-africa',
          via: { item: 'teach_day:aug-day-1', path: 'globeEventIds[]' },
        },
      ],
    );
    expect([...graph.nodes.keys()].sort()).toEqual([
      'song:africa',
      'teach_day:aug-day-1',
    ]);
    // The seed's own state lands on the one node, not a `missing` twin.
    expect(graph.nodes.get('song:africa')).toEqual({
      id: 'song:africa',
      kind: 'song',
      status: 'draft',
      origin: 'api',
      label: 'Africa — Toto',
    });
  });

  it('survives partial bodies, and names each one it could not read', () => {
    // What a half-typed draft or a partial API row looks like to the types.
    const partial = <T>(body: object) => body as unknown as T;
    const graph = buildGraph({
      songs: [
        partial<Song>({ ...africa, title: undefined }),
        partial<Song>({ ...africa, id: undefined }),
        song('bad_credit', {
          credits: [partial({ role: 'performer', primary: true })],
        }),
      ],
      artists: [partial<ArtistRecord>({ slug: 'x' })],
      releases: [
        partial<ReleaseRecord>({ slug: 'r', title: 'R', format: 'album' }),
      ],
      pathways: [partial({ id: 'p', title: 'P' })],
      progressions: [partial({ id: 1, styles: [] })],
      events: [partial({ title: 'No id' })],
    });
    // Whatever has an id is a node, named by its slug when it has no name.
    expect(graph.nodes.get('song:africa')?.label).toBe('africa');
    expect(graph.nodes.get('song:bad_credit')).toBeDefined();
    expect(graph.nodes.get('artist:x')?.label).toBe('x');
    expect(graph.nodes.get('release:r')?.label).toBe('R');
    expect(graph.nodes.get('pathway:p')).toBeDefined();
    expect(graph.nodes.get('progression:1')?.label).toBe('1');
    // The readable parts still derive.
    expect(graph.adjacency.get('song:africa')?.length).toBeGreaterThan(5);
    // What threw is named once each, never silently dropped.
    expect(
      graph.unreadable.map(({ list, index, item }) => ({ list, index, item })),
    ).toEqual([
      { list: 'songs', index: 1, item: undefined },
      { list: 'events', index: 0, item: undefined },
      { list: 'songs', index: 2, item: 'song:bad_credit' },
    ]);
    expect(graph.unreadable.every((u) => u.message)).toBe(true);
  });

  it('reads a partial event or song pin as far as it goes', () => {
    const partial = <T>(body: object) => body as unknown as T;
    const graph = buildGraph({
      artists: [{ slug: 'toto', name: 'Toto' }],
      events: [
        partial<GlobeEventInput>({ id: 'evt-half', year: 1982, genre: 'Rock' }),
        partial<GlobeEventInput>({ id: 'evt-bare' }),
      ],
      artistLocations: [
        partial<ArtistLocationInput>({ city: 'Los Angeles' }),
        partial<ArtistLocationInput>({ id: 'toto' }),
      ],
    });
    expect(graph.nodes.has('event:evt-half')).toBe(true);
    expect(graph.nodes.has('event:evt-bare')).toBe(true);
    expect(
      graph.unreadable.map(({ list, index, item }) => ({ list, index, item })),
    ).toEqual([
      { list: 'events', index: 0, item: 'event:evt-half' },
      { list: 'artistLocations', index: 0, item: undefined },
    ]);
  });

  it("marks the API's items with their state, and the repo's as code", () => {
    const graph = buildGraph({
      artists: [
        { slug: 'toto', name: 'Toto' },
        { slug: 'journey', name: 'Journey', unverified: true },
      ],
      statuses: new Map<EntityId, ItemStatus>([['artist:toto', 'draft']]),
    });
    expect(graph.nodes.get('artist:toto')).toMatchObject({
      status: 'draft',
      origin: 'api',
    });
    expect(graph.nodes.get('artist:journey')).toMatchObject({
      status: 'code',
      origin: 'code',
      unverified: true,
    });
  });
});

describe('the ego network', () => {
  // f is the focus. Solid edges walk; guessed (~) and unconfirmed (?) ones
  // are shown when they touch f and go no further.
  //   f → g → label:l      f ~> label:guess → place:p
  //   f ?> u → v           g ~> w            h → f, h → g
  const via = { item: 'artist:f' as EntityId, path: 'test' };
  const e = (
    from: EntityId,
    kind: Edge['kind'],
    to: EntityId,
    extra: Partial<Edge> = {},
  ): Edge => ({ from, kind, to, via, ...extra });
  const graph = assembleGraph(
    [],
    [
      e('artist:f', 'member_of', 'artist:g'),
      e('artist:g', 'signed_to', 'label:l'),
      e('artist:f', 'signed_to', 'label:guess', { inferred: true }),
      e('label:guess', 'based_in', 'place:p'),
      e('artist:f', 'influenced', 'artist:u', { unverified: true }),
      e('artist:u', 'member_of', 'artist:v'),
      e('artist:g', 'influenced', 'artist:w', { inferred: true }),
      e('artist:h', 'influenced', 'artist:f'),
      e('artist:h', 'member_of', 'artist:g'),
    ],
  );
  const ids = (n: { nodes: GraphNode[] }) => n.nodes.map((x) => x.id).sort();

  it('shows everything that touches the focus', () => {
    const one = graph.egoNetwork('artist:f', 1);
    expect(ids(one)).toEqual(
      ['artist:f', 'artist:g', 'artist:h', 'artist:u', 'label:guess'].sort(),
    );
    expect(one.edges).toHaveLength(4);
    expect(one.hopOf.get('artist:f')).toBe(0);
    expect(one.hopOf.get('label:guess')).toBe(1);
  });

  it('walks on only through solid edges', () => {
    const two = graph.egoNetwork('artist:f', 2);
    expect(ids(two)).toEqual(
      [
        'artist:f',
        'artist:g',
        'artist:h',
        'artist:u',
        'label:guess',
        'label:l',
      ].sort(),
    );
    expect(two.hopOf.get('label:l')).toBe(2);
    // Between two nodes already shown, a solid edge is drawn.
    expect(two.edges.map(line)).toContain('artist:h -member_of-> artist:g');
    // A guess past the focus is not.
    expect(two.edges.map(line)).not.toContain(
      'artist:g -influenced-> artist:w',
    );
  });

  it('walks through guesses and unconfirmed claims when asked', () => {
    const all = graph.egoNetwork('artist:f', 2, {
      includeInferred: true,
      includeUnverified: true,
    });
    expect(ids(all)).toEqual(
      expect.arrayContaining(['place:p', 'artist:v', 'artist:w']),
    );
    const guessesOnly = graph.egoNetwork('artist:f', 2, {
      includeInferred: true,
    });
    expect(ids(guessesOnly)).toContain('place:p');
    expect(ids(guessesOnly)).not.toContain('artist:v');
  });

  it('follows only the edge kinds asked for', () => {
    const members = graph.egoNetwork('artist:f', 2, {
      edgeKinds: ['member_of'],
    });
    expect(ids(members)).toEqual(['artist:f', 'artist:g', 'artist:h']);
    expect(members.hopOf.get('artist:h')).toBe(2);
  });

  it('shows a stop node but does not walk on through it', () => {
    // g is one step out by a solid edge, so it would lead on to label:l; as
    // a stop it is drawn, and the walk ends there.
    const stopped = graph.egoNetwork('artist:f', 2, {
      stopAt: (id) => id === 'artist:g',
    });
    expect(ids(stopped)).toEqual(
      ['artist:f', 'artist:g', 'artist:h', 'artist:u', 'label:guess'].sort(),
    );
    expect(stopped.hopOf.get('artist:g')).toBe(1);
    // An edge between two nodes already shown is still drawn from the side
    // that is walked.
    expect(stopped.edges.map(line)).toContain('artist:h -member_of-> artist:g');
    expect(stopped.edges.map(line)).not.toContain(
      'artist:g -signed_to-> label:l',
    );
    // The focus is walked even when it is a stop itself.
    const focusStops = graph.egoNetwork('artist:f', 2, {
      stopAt: (id) => id === 'artist:f',
    });
    expect(ids(focusStops)).toEqual(ids(graph.egoNetwork('artist:f', 2)));
    expect(focusStops.stopped.size).toBe(0);
  });

  it('says how much lies on past each stop', () => {
    // Past g, the walk would have gone on to label:l alone: f and h are
    // already shown, and the guess g ~> w would not have walked.
    const stopped = graph.egoNetwork('artist:f', 2, {
      stopAt: (id) => id === 'artist:g',
    });
    expect([...stopped.stopped]).toEqual([['artist:g', 1]]);
    // Walking guesses too, the guess leads on as well.
    const withGuesses = graph.egoNetwork('artist:f', 2, {
      stopAt: (id) => id === 'artist:g',
      includeInferred: true,
    });
    expect([...withGuesses.stopped]).toEqual([['artist:g', 2]]);
    // A node reached only by a guess is not walked anyway, so it is no stop.
    const guessed = graph.egoNetwork('artist:f', 2, {
      stopAt: (id) => id === 'label:guess',
    });
    expect(guessed.stopped.size).toBe(0);
    // At one step nothing is walked past the focus, so nothing is stopped.
    expect(
      graph.egoNetwork('artist:f', 1, { stopAt: (id) => id === 'artist:g' })
        .stopped.size,
    ).toBe(0);
    // An edge filter narrows the count the same way it narrows the walk.
    const members = graph.egoNetwork('artist:f', 2, {
      stopAt: (id) => id === 'artist:g',
      edgeKinds: ['member_of', 'influenced'],
    });
    expect([...members.stopped]).toEqual([['artist:g', 0]]);
  });

  it('stops where the walk would go on through more edges than asked', () => {
    // g leads on through three solid edges (f, h, label:l) and one guess;
    // h through two (f, g).
    expect(graph.egoNetwork('artist:f', 2, { stopAbove: 3 }).stopped.size).toBe(
      0,
    );
    expect([
      ...graph.egoNetwork('artist:f', 2, { stopAbove: 2 }).stopped,
    ]).toEqual([['artist:g', 1]]);
    // Following guesses, g's guess counts too, as the walk would take it.
    expect([
      ...graph.egoNetwork('artist:f', 2, {
        stopAbove: 3,
        includeInferred: true,
      }).stopped,
    ]).toEqual([['artist:g', 2]]);
    // An edge kind left out counts for nothing: without its label, g has
    // two edges to go on through.
    expect(
      graph.egoNetwork('artist:f', 2, {
        stopAbove: 2,
        edgeKinds: ['member_of', 'influenced'],
      }).stopped.size,
    ).toBe(0);
    // The focus is walked whatever its count.
    const tight = graph.egoNetwork('artist:f', 2, { stopAbove: 0 });
    expect(ids(tight)).toEqual(ids(graph.egoNetwork('artist:f', 1)));
    expect([...tight.stopped.keys()].sort()).toEqual(['artist:g', 'artist:h']);
  });

  it('counts the solid edges at a node, whatever the walk', () => {
    // f: member of g, influenced by h. Its guess and its unconfirmed claim
    // do not count.
    expect(graph.solidDegree('artist:f')).toBe(2);
    // g: f and h are members, and it is signed to l; its guess does not count.
    expect(graph.solidDegree('artist:g')).toBe(3);
    // Reached only by guesses: shown, but nothing solid.
    expect(graph.solidDegree('artist:w')).toBe(0);
    expect(graph.solidDegree('artist:nobody')).toBe(0);
    // A song's globe event is the song.
    const songs = buildGraph({ songs: [africa] });
    expect(songs.solidDegree('song:africa')).toBeGreaterThan(0);
    expect(songs.solidDegree('event:song-africa')).toBe(
      songs.solidDegree('song:africa'),
    );
  });

  it('stops at two hops, folds the focus, and knows an unknown one', () => {
    expect(ids(graph.egoNetwork('artist:f', 5))).toEqual(
      ids(graph.egoNetwork('artist:f', 2)),
    );
    expect(ids(graph.egoNetwork('artist:f', 0))).toEqual(['artist:f']);
    // A garbled `?hops=` is the default, not a lone focus.
    expect(ids(graph.egoNetwork('artist:f', Number('abc')))).toEqual(
      ids(graph.egoNetwork('artist:f', 1)),
    );
    expect(graph.egoNetwork('artist:nobody').nodes).toEqual([]);
    const folded = buildGraph({ songs: [africa] }).egoNetwork(
      'event:song-africa',
    );
    expect(folded.focus).toBe('song:africa');
    expect(folded.nodes.length).toBeGreaterThan(5);
  });
});

describe('the Atlas graph on the repo data', () => {
  const units = [
    ...CANONICAL_ANNUAL_TEMPLATE.autumn.units,
    ...CANONICAL_ANNUAL_TEMPLATE.spring.units,
  ];
  const dayStubs = units.flatMap((u) => u.dayStubs);
  const songs = Object.values(BUNDLED_SONGS);
  const arcs = allConnections();
  // What the console's loader passes (repoSnapshot.ts): the roster and the
  // cities composed with the console's records in src/content/data, the
  // releases, studios and labels, the song pins as `artist_location` items,
  // the instrument table and the event matches. The records were all but
  // empty until the bulk import of 30 September 2026 filled them; JSON
  // modules type only what their values show, so they are cast as the
  // loader casts them.
  const artistLocations = Object.entries(ARTIST_LOCATIONS).map(([id, pin]) => ({
    id,
    ...pin,
  }));
  const lists = {
    songs,
    progressions: LIB,
    artists: composeArtists(
      ARTIST_REGISTRY,
      ARTIST_ROWS as unknown as readonly ArtistRow[],
    ),
    releases: RELEASE_ROWS as unknown as readonly ReleaseRecord[],
    studios: STUDIO_ROWS as unknown as readonly StudioRecord[],
    labels: LABEL_ROWS as unknown as readonly LabelRecord[],
    places: composePlaces(
      CITIES,
      PLACE_ROWS as unknown as readonly PlaceRecord[],
    ),
    events: BUNDLED_MUSIC_HISTORY,
    artistLocations,
    dayStubs,
    pathways: HISTORICAL_MODULES,
    influenceArcs: arcs,
    instrumentGenres: INSTRUMENT_GENRES,
  };
  const graph = buildGraph({
    ...lists,
    eventMatches: matchSnapshotEvents(lists),
  });
  const nodes = [...graph.nodes.values()];
  const evtEvents = BUNDLED_MUSIC_HISTORY.filter((e) =>
    e.id.startsWith('evt-'),
  );
  const count = (kind: Edge['kind'], from?: string) =>
    graph.edges.filter(
      (e) => e.kind === kind && (!from || e.from.startsWith(`${from}:`)),
    ).length;

  it('is the size the design expects', () => {
    // About 4.8k nodes and 18k edges since the globe's events, scenes and
    // song pins became edges (design §4.3); about 8.2k and 33k since the
    // bulk import of 30 September 2026 added its records and links.
    expect(graph.nodes.size).toBeGreaterThan(3000);
    expect(graph.nodes.size).toBeLessThan(12_000);
    expect(graph.edges.length).toBeGreaterThan(12_000);
    expect(graph.edges.length).toBeLessThan(60_000);
  });

  it("reads every hand-authored event's year, place, genres and subjects", () => {
    // Every `evt-` event is dated, and a song's event states nothing.
    expect(count('from_year', 'event')).toBe(evtEvents.length);
    const dated = new Set(
      graph.edges
        .filter((e) => e.kind === 'from_year' && e.from.startsWith('event:'))
        .map((e) => e.from),
    );
    expect(evtEvents.filter((e) => !dated.has(`event:${e.id}`))).toEqual([]);
    // Every event states its place since the bulk import of 30 September
    // 2026, so none is a guess. (Before it, the cities the registry could
    // place were guesses, 934, and the 149 it could not were left out.)
    const placed = graph.edges.filter((e) => e.kind === 'took_place_in');
    expect(placed).toHaveLength(1083);
    expect(placed.every((e) => !e.inferred)).toBe(true);
    expect(placed.every((e) => e.via.some((v) => v.path === 'placeId'))).toBe(
      true,
    );
    // Who and what they are about. Until the import the globe's own matcher
    // found them all, as guesses (815 artists on 687 events; one fewer than
    // the globe's chips: evt-folktradition-portland-2000 names Portland,
    // Maine only by a tag, and a tag 'portland maine' is the city with its
    // state, not the registry entry of that name). The import stored the
    // artists on 693 events and the songs on 38, so all but seven are
    // stated now: 894 artists on 697 events, the seven the matcher alone
    // finds (on events that store no artists) still guesses.
    const about = graph.edges.filter((e) => e.kind === 'about');
    expect(about.filter((e) => e.to.startsWith('artist:'))).toHaveLength(894);
    // 41 since the duplicate merge (30 Sep 2026): the Average White Band's
    // Dundee event and "Pick Up The Pieces" now name the same act, so the
    // event's tag finds the song.
    expect(about.filter((e) => e.to.startsWith('song:'))).toHaveLength(41);
    expect(new Set(about.map((e) => e.from)).size).toBe(697);
    expect(about.filter((e) => e.inferred)).toHaveLength(7);
    // Genres through the curated table, drawn solid.
    expect(count('in_genre', 'event')).toBe(2334);
  });

  it("reads every city's scene, and places acts by their song pins", () => {
    expect(count('scene_of')).toBe(676);
    expect(count('scene_active_in')).toBe(1794);
    const pins = graph.edges.filter(
      (e) => e.kind === 'based_in' && e.via.some((v) => v.path === 'city'),
    );
    // 235 since the duplicate merge (30 Sep 2026): eight acts had a second
    // pin under a removed spelling, in the same city as their own. The
    // album title "Remind In Light" lost its pin the same day (it repeated
    // Talking Heads' New York), and Andy Grammer's, filed under a
    // misspelling until then, is drawn now: one out, one in. 58 since the
    // bulk import of 30 September 2026 stated a City on 332 acts: the graph
    // draws a pin only for an act that states none. (The students' globe
    // still draws every pin from artistLocations.json, which it never
    // touched.)
    expect(pins).toHaveLength(58);
    expect(pins.every((e) => e.inferred)).toBe(true);
    // Every row of the instrument table.
    expect(count('typical_in')).toBe(
      Object.values(INSTRUMENT_GENRES).flat().length,
    );
  });

  it('has no edge that breaks the grammar or joins the wrong kinds', () => {
    expect(graph.violations.map((v) => `${v.reason}: ${line(v.edge)}`)).toEqual(
      [],
    );
  });

  it('gives every node a well-formed id, and folds every song event', () => {
    expect(nodes.filter((n) => !isWellFormed(n.id)).map((n) => n.id)).toEqual(
      [],
    );
    expect(nodes.filter((n) => n.id.startsWith('event:song-'))).toEqual([]);
    for (const edge of graph.edges) {
      expect(graph.nodes.has(edge.from), edge.from).toBe(true);
      expect(graph.nodes.has(edge.to), edge.to).toBe(true);
      expect(edge.via.length).toBeGreaterThan(0);
    }
  });

  it('reads every Teach day, pathway stop and influence arc', () => {
    expect(count('uses_song')).toBe(dayStubs.filter((d) => d.songId).length);
    expect(count('references_event')).toBe(
      new Set(
        dayStubs.flatMap((d) =>
          (d.globeEventIds ?? []).map((id) => `${d.slug}>${id}`),
        ),
      ).size,
    );
    expect(count('part_of')).toBe(
      new Set(
        HISTORICAL_MODULES.flatMap((m) =>
          m.eventIds.map((id) => `${m.id}>${id}`),
        ),
      ).size,
    );
    // Less the arcs whose ends fold onto one song: those are dropped.
    expect(count('influenced')).toBe(
      new Set(
        arcs.flatMap((a) => {
          const from = canonicalId(`event:${a.from}`);
          const to = canonicalId(`event:${a.to}`);
          return from === to ? [] : [`${from}>${to}`];
        }),
      ).size,
    );
    // Every place: the globe's cities, and since the bulk import of 30
    // September 2026 the 349 places it made (none of them a globe pin).
    expect(count('located_in')).toBe(lists.places.length);
  });

  it('dates every song with a year, and walks each year to its decade and era', () => {
    // The records date themselves too, since the bulk import of 30
    // September 2026 filled them: a record's year, a studio's opening, a
    // label's founding, an artist's birth or a group's forming.
    const stated: unknown[] = [
      ...[...songs, ...evtEvents].map((s) => s.year),
      ...lists.releases.map((r) => r.year),
      ...lists.studios.map((s) => s.openedYear),
      ...lists.labels.map((l) => l.foundedYear),
      ...lists.artists.map((a) =>
        a.born && typeof a.born === 'object' ? a.born.date : undefined,
      ),
    ];
    const years = new Set(
      stated.flatMap((value) => {
        const year = yearOf(value);
        return year === null ? [] : [year];
      }),
    );
    // Decades come from years, from the places' scenes, and from the years
    // an artist was active (an open span ends where it starts here, as
    // these lists give no year to run to).
    const activeDecades = lists.artists.flatMap((a) => {
      const first = yearOf(a.activeFrom);
      if (first === null) return [];
      const open = a.activeTo === undefined || a.activeTo === null;
      const last = open ? first : yearOf(a.activeTo);
      const spanned: number[] = [];
      if (last === null) return spanned;
      for (let d = first - (first % 10); d <= last; d += 10) spanned.push(d);
      return spanned;
    });
    const decades = new Set([
      ...[...years].map((y) => y - (y % 10)),
      ...lists.places.flatMap((c) => c.activeDecades.map((d) => d - (d % 10))),
      ...activeDecades,
    ]);
    // A song's era comes through its year now: one era edge per year in use.
    expect(count('from_year', 'song')).toBe(
      songs.filter((s) => yearOf(s.year)).length,
    );
    // 569 until the bulk import of 30 September 2026 gave 58 undated songs
    // their year; 628 once the Music Maps charts began (We Shall Overcome).
    expect(count('from_year', 'song')).toBe(629);
    expect(count('in_decade')).toBe(years.size);
    expect(count('from_era')).toBe(
      [...years].filter((y) => eraForYear(y)).length,
    );
    const ofKind = (kind: string) => nodes.filter((n) => n.kind === kind);
    expect(ofKind('year')).toHaveLength(years.size);
    expect(ofKind('decade')).toHaveLength(decades.size);
    expect(
      [...ofKind('year'), ...ofKind('decade')].map((n) => n.status),
    ).toEqual(expect.not.arrayContaining(['missing']));
  });

  it('is missing only what the data really lacks', () => {
    const missing = nodes.filter((n) => n.status === 'missing');
    // Every studio and label a song or a record names has a record since the
    // bulk import of 30 September 2026 made them (until then none did, and
    // every one a session named was missing, by a guess).
    expect(missing.filter((n) => ['studio', 'label'].includes(n.kind))).toEqual(
      [],
    );
    // A person credited by name only, with no artist record, is missing, and
    // only by a guess from that credit: 1,319 session players, engineers and
    // arrangers the import credited (deriveEdges.test.ts).
    const creditedByName = missing.filter((n) => {
      const edges = graph.adjacency.get(n.id) ?? [];
      return (
        edges.length > 0 &&
        edges.every(
          (e) =>
            e.inferred &&
            e.via.every((v) =>
              ['credits[].name', 'credits[].instrument'].includes(v.path),
            ),
        )
      );
    });
    expect(creditedByName.every((n) => n.kind === 'artist')).toBe(true);
    expect(creditedByName).toHaveLength(1319);
    // Each is labelled as its credits print it, not by its slug. The one
    // label that reads like a slug is printed so: Bruno Mars's "Locked Out
    // of Heaven" credits an engineer as "alalal".
    expect(
      creditedByName
        .filter((n) => n.label === n.id.slice('artist:'.length))
        .map((n) => n.id),
    ).toEqual(['artist:alalal']);
    expect(graph.nodes.get('artist:russ-kunkel' as EntityId)?.label).toBe(
      'Russ Kunkel',
    );
    // The rest are real data gaps for integrity to list:
    //  - two globe events name a song the library does not have (the BBC
    //    live Valerie is the song valerie, songEventAliases.ts);
    //  - Chicago the band is deliberately unregistered while tag matching
    //    cannot tell it from Chicago the city (see deriveEdges.test.ts).
    expect(
      missing
        .filter((n) => !creditedByName.includes(n))
        .map((n) => n.id)
        .sort(),
    ).toEqual([
      'artist:chicago',
      'song:thank_you',
      'song:this_must_be_the_place',
    ]);
  });

  it("centres a song's mind map on everything its record says", () => {
    const ego = graph.egoNetwork('song:africa', 1);
    const near = ego.nodes.map((n) => n.id);
    expect(near).toEqual(
      expect.arrayContaining([
        'artist:jeff-porcaro',
        'studio:sunset-sound',
        'place:los-angeles',
        'year:1982',
        'genre:rock',
        'key:b',
      ]),
    );
    expect(ego.hopOf.get('song:africa')).toBe(0);
    // The decade and the era are one step further, through the year.
    const wider = graph.egoNetwork('song:africa', 2).hopOf;
    expect(wider.get('decade:1980s')).toBe(2);
    expect(wider.get('era:electronic-hiphop')).toBe(2);
  });
});
