import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CITIES } from '@/components/atlas/data/cities';
import {
  type ArtistLocationInput,
  buildGraph,
  type GlobeEventInput,
  INFLUENCE_ARC_PATH,
  SUBGENRE_PARENT_PATH,
} from '@/content/graph/deriveGraph';
import type { EventMatch } from '@/content/graph/eventMatches';
import {
  INSTRUMENT_GENRES,
  TYPICAL_IN_PATH,
} from '@/content/graph/instrumentGenres';
import { YEAR_DECADE_PATH, YEAR_ERA_PATH } from '@/content/graph/time';
import {
  type EdgeVia,
  ENTITY_KINDS,
  isCodeOwnedVia,
} from '@/content/graph/types';
import type {
  ArtistRecord,
  GlobeEventRecord,
  LabelRecord,
  ReleaseRecord,
  StudioRecord,
} from '@/content/records/types';
import { REPO_REF_PATHS } from '@/content/vocabulary/refPaths';
import { RECORD_SCHEMAS } from '@/content/vocabulary/schemas';
import LIB from '@/curriculum/data/chordProgressionLibrary';
import type { Song } from '@/curriculum/types/songLibrary';
import { recordBodySchemas } from '@/scripts/apiContract/recordBodySchemas';
import { REF_PATHS } from '@/scripts/apiContract/refPaths';
import { songBodySchema } from '@/scripts/apiContract/songBodySchema';

/**
 * REF_PATHS is only useful if it is complete: a reference field it does not
 * list is one a rename silently leaves dangling. So completeness is checked
 * from both ends — against the body schema (every id-shaped field) and against
 * the derivation (every field an edge claims to come from).
 *
 * The vocabulary's own records (genres, subgenres, instruments) are data the
 * repo holds and the API does not, so their fields are listed apart, in
 * REPO_REF_PATHS (src/content/vocabulary/refPaths.ts), and the contract file
 * is left alone. Everything below holds the two lists as one.
 */

const FILE = 'src/scripts/apiContract/refPaths.ts';

/** Every reference-bearing path: the contract's and the vocabulary's. */
const ALL_REF_PATHS: readonly {
  kind: string;
  path: string;
  target: string;
  alsoTargets?: readonly string[];
  acyclic?: string;
  derive?: false;
}[] = [...REF_PATHS, ...REPO_REF_PATHS];

/**
 * Entity kinds that exist in code today but are not graph nodes yet: an
 * instrument's `worldInstrumentId` names an entry in the globe's
 * Instruments of the World.
 */
const PLANNED_KINDS = new Set([
  'technique',
  'theory_topic',
  'studio_template',
  'world_instrument',
]);

/** Every body schema, by content kind: the contract's, and the vocabulary files'. */
const SCHEMAS: Record<string, z.ZodTypeAny> = {
  song: songBodySchema,
  ...recordBodySchemas,
  ...RECORD_SCHEMAS,
};

/**
 * Id-shaped names that are not references into the Atlas: `externalIds`
 * holds other catalogues' ids (MusicBrainz, Discogs, Wikidata), and an
 * event's `videoId` is a YouTube id.
 */
const NOT_REFERENCES = new Set(['externalIds', 'videoId']);

/** Content kinds whose edges the graph derives: all of them, since 1d. */
const DERIVED_KINDS = new Set([
  'song',
  'chord_progression',
  'artist',
  'release',
  'studio',
  'label',
  'globe_city',
  'globe_event',
  'artist_location',
  'subgenre',
  'instrument',
]);

/**
 * Content kind → the graph entity kind of its items (a `via.item` prefix).
 * An artist location speaks for the artist it pins.
 */
const ENTITY_OF: Record<string, string> = {
  song: 'song',
  chord_progression: 'progression',
  artist: 'artist',
  release: 'release',
  studio: 'studio',
  label: 'label',
  globe_city: 'place',
  globe_event: 'event',
  artist_location: 'artist',
  genre: 'genre',
  subgenre: 'subgenre',
  instrument: 'instrument',
};

/**
 * Fields an edge is computed from that are values, not references: a year
 * becomes its `year:` node, which the calendar files under a decade and an
 * era, and a city's scene decade its `decade:` node. So does an artist's
 * birth or forming date (its year) and first year active (every decade the
 * span touches, to `activeTo` or `asOfYear`). Nothing a rename or merge does
 * can leave one dangling, so REF_PATHS has no entry to rewrite.
 */
const BUCKETED_VALUES = new Set([
  'song:year',
  'release:year',
  'label:foundedYear',
  'studio:openedYear',
  'event:year',
  'place:activeDecades[]',
  'artist:born.date',
  'artist:activeFrom',
]);

/**
 * Paths no content body has: code states these connections (the canonical
 * Teach days, the globe's pathways and influence arcs, the calendar's
 * decades and eras), so there is nothing in REF_PATHS to validate or
 * rewrite. Listed one by one, `<item kind>:<path>`, so a code source added
 * later has to be named here — and one that forgets its `via.code` fails the
 * declared-paths check instead. An arc is filed under its influencer, an
 * `evt-` event or a folded song; a decade or an era under its year.
 */
const CODE_OWNED_PATHS = new Set([
  'teach_day:songId',
  'teach_day:globeEventIds[]',
  'pathway:eventIds[]',
  `event:${INFLUENCE_ARC_PATH}`,
  `song:${INFLUENCE_ARC_PATH}`,
  `year:${YEAR_DECADE_PATH}`,
  `year:${YEAR_ERA_PATH}`,
]);

/**
 * A subgenre's parent and an instrument's typical genres are the
 * vocabulary files' to state now (REPO_REF_PATHS), so they are no longer
 * code's. The graph still draws them from its code tables, filed under
 * `CODE_OWNERS.subgenres` and `.instrumentGenres` and, for the typical
 * genres, the path `typical_in`, until it reads the vocabulary from the
 * records (plan P5). Keyed as the graph files them, each to the path it
 * states: either is enough for the edge to count as drawn.
 */
const VOCABULARY_FILED_AS_CODE: ReadonlyMap<string, string> = new Map([
  [`subgenre:${SUBGENRE_PARENT_PATH}`, 'subgenre:parent'],
  [`instrument:${TYPICAL_IN_PATH}`, 'instrument:typicalIn[]'],
]);

/** One record of each kind with every reference field filled. */
const ARTIST: ArtistRecord = {
  slug: 'the-funk-brothers',
  name: 'The Funk Brothers',
  group: true,
  members: [{ artistId: 'james-jamerson', instrumentIds: ['electric-bass'] }],
  // A group's born is the year it formed; where is its City.
  born: { date: '1959' },
  activeFrom: 1959,
  activeTo: 1972,
  basedInPlaceId: 'detroit',
  // A subgenre too, so the walk up to its genre is exercised.
  genreIds: ['funk', 'acid-rock'],
  instrumentIds: ['horn-section'],
  labelIds: ['motown'],
  influencedBy: [{ artistId: 'ray-charles' }],
};
const RELEASE: ReleaseRecord = {
  slug: 'toto-toto-iv',
  title: 'Toto IV',
  artistIds: ['toto'],
  format: 'album',
  year: 1982,
  labelId: 'columbia',
};
const STUDIO: StudioRecord = {
  slug: 'hitsville-u-s-a',
  name: 'Hitsville U.S.A.',
  placeId: 'detroit',
  openedYear: 1959,
};
const LABEL: LabelRecord = {
  slug: 'tamla',
  name: 'Tamla',
  placeId: 'detroit',
  parentLabelId: 'motown',
  foundedYear: 1959,
};
/** An act with no city of its own, so its song pins stand in. */
const TOTO: ArtistRecord = { slug: 'toto', name: 'Toto' };
/** A person, born somewhere, still active (an open span reads `asOfYear`). */
const PERSON: ArtistRecord = {
  slug: 'paul-mccartney',
  name: 'Paul McCartney',
  born: { date: '1942-06-18', placeId: 'liverpool' },
  activeFrom: 1957,
};
/**
 * Two hand-authored events. The matcher found Toto in the first one's title
 * and tags and the song its title quotes; the second names no one and is set
 * in a city the registry cannot place, so it states only its year.
 */
const LINKED_EVENT: GlobeEventInput = {
  id: 'evt-toto-africa-1982',
  title: 'Toto release "Africa"',
  year: 1982,
  location: { lat: 34.05, lng: -118.24, city: 'Los Angeles', country: 'USA' },
  genre: ['Soft Rock', 'Rock', 'Not A Genre'],
  tags: ['toto', 'africa'],
};
const UNLINKED_EVENT: GlobeEventInput = {
  id: 'evt-unlinked-fixture',
  title: 'A night somewhere',
  year: 1969,
  location: { lat: 0, lng: 0, city: 'Nowhere', country: 'Atlantis' },
  genre: [],
  tags: ['nobody'],
};
/**
 * An event a reviewer has confirmed: its ids win over any guess, and it names
 * the record, the room and the label too (event body v2).
 */
const STORED_EVENT: GlobeEventInput &
  Pick<GlobeEventRecord, 'releaseIds' | 'studioIds' | 'labelIds'> = {
  id: 'evt-stored-fixture',
  title: 'Toto record in Los Angeles',
  year: 1982,
  location: { lat: 34.05, lng: -118.24, city: 'Los Angeles', country: 'USA' },
  artistIds: ['toto'],
  songIds: ['africa'],
  placeId: 'los-angeles',
  releaseIds: ['toto-toto-iv'],
  studioIds: ['sunset-sound'],
  labelIds: ['columbia'],
};
const EVENT_MATCHES = new Map<string, EventMatch>([
  [
    LINKED_EVENT.id,
    {
      artists: [
        { artistId: 'toto', path: 'tags[]' },
        { artistId: 'toto', path: 'title' },
      ],
      songs: [{ songId: 'africa', path: 'title' }],
    },
  ],
  [UNLINKED_EVENT.id, { artists: [], songs: [] }],
]);
/** Toto's song pin, as the `artist_location` item keeps it. */
const TOTO_PINS: ArtistLocationInput = {
  id: 'toto',
  city: 'Los Angeles',
  country: 'US',
  lat: 34.05,
  lng: -118.24,
};

/**
 * The end of an edge its field names: the one that is not the field's own
 * item, or `to` when neither is (a credit's instrument, hung off its player;
 * a city a song reaches through its studio).
 */
function namedEnd(edge: { from: string; to: string }, via: EdgeVia): string {
  if (edge.from === via.item) return edge.to;
  if (edge.to === via.item) return edge.from;
  return edge.to;
}

/** A path without array markers, so 'genreIds[]' and 'genreIds' compare equal. */
const bare = (path: string) => path.replace(/\[\]/g, '');

/** Every field path in a zod schema, `[]` marking array elements. */
function schemaPaths(schema: z.ZodTypeAny, prefix = ''): string[] {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return schemaPaths(schema.unwrap(), prefix);
  }
  if (schema instanceof z.ZodDefault) {
    return schemaPaths(schema._def.innerType, prefix);
  }
  if (schema instanceof z.ZodEffects) {
    return schemaPaths(schema.innerType(), prefix);
  }
  if (schema instanceof z.ZodArray) {
    return schemaPaths(schema.element, `${prefix}[]`);
  }
  if (schema instanceof z.ZodUnion) {
    return (schema.options as z.ZodTypeAny[]).flatMap((o) =>
      schemaPaths(o, prefix),
    );
  }
  if (schema instanceof z.ZodObject) {
    return Object.entries(schema.shape as Record<string, z.ZodTypeAny>).flatMap(
      ([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        return [path, ...schemaPaths(value, path)];
      },
    );
  }
  return [];
}

const songModules = import.meta.glob<Record<string, unknown>>(
  [
    '../../../curriculum/data/songs/*.ts',
    '!../../../curriculum/data/songs/_*.ts',
  ],
  { eager: true },
);
const songs: Song[] = Object.values(songModules)
  .flatMap((m) => Object.values(m))
  .filter(
    (v): v is Song =>
      !!v && typeof v === 'object' && 'sections' in v && 'keyRoot' in v,
  );

describe('REF_PATHS', () => {
  it('stays import-free, so it can be copied into the API', () => {
    expect(readFileSync(FILE, 'utf8')).not.toMatch(/^import /m);
  });

  it('lists each path once', () => {
    const keys = ALL_REF_PATHS.map((r) => `${r.kind}:${r.path}`);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it('only targets kinds the graph knows or has planned', () => {
    const known = new Set<string>([...ENTITY_KINDS, ...PLANNED_KINDS]);
    const unknown = ALL_REF_PATHS.flatMap((r) =>
      [r.target, ...(r.alsoTargets ?? [])]
        .filter((target) => !known.has(target))
        .map((target) => `${r.path} → ${target}`),
    );
    expect(unknown).toEqual([]);
  });

  it('names every id-shaped field in every body schema', () => {
    let checked = 0;
    for (const [kind, schema] of Object.entries(SCHEMAS)) {
      const listed = new Set(
        ALL_REF_PATHS.filter((r) => r.kind === kind).map((r) => bare(r.path)),
      );
      const idFields = schemaPaths(schema)
        .map(bare)
        .filter((p) => /(Id|Ids|GlobeId)$/.test(p))
        .filter((p) => !NOT_REFERENCES.has(p.split('.').pop()!));
      checked += idFields.length;
      expect(
        idFields.filter((p) => !listed.has(p)),
        kind,
      ).toEqual([]);
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('only lists paths the schemas actually have', () => {
    for (const [kind, schema] of Object.entries(SCHEMAS)) {
      const inSchema = new Set(schemaPaths(schema).map(bare));
      const stray = ALL_REF_PATHS.filter((r) => r.kind === kind)
        .map((r) => bare(r.path))
        .filter((p) => !inSchema.has(p));
      expect(stray, kind).toEqual([]);
    }
  });

  it('marks a cycle only on a field that points back at its own kind', () => {
    // `acyclic` means "following this field must not return to the start", which
    // only makes sense when the field names the same kind of thing.
    const kindOf: Record<string, string> = {
      artist: 'artist',
      label: 'label',
      release: 'release',
      studio: 'studio',
      globe_city: 'place',
      song: 'song',
      chord_progression: 'progression',
      globe_event: 'event',
      artist_location: 'artist',
      genre: 'genre',
      subgenre: 'subgenre',
      instrument: 'instrument',
    };
    const wrong = ALL_REF_PATHS.filter(
      (r) => r.acyclic && kindOf[r.kind] !== r.target,
    ).map((r) => `${r.kind}:${r.path}`);
    expect(wrong).toEqual([]);
  });

  it('declares exactly the fields edges are derived from', () => {
    // A synthetic song that exercises the id-bearing branches the corpus
    // barely uses yet (linked credits, linked related recordings).
    const base = songs.find((s) => s.id === 'africa')!;
    const linked: Song = {
      ...base,
      origin: { artistGlobeId: 'toto' },
      // Song v2: the record it is on, a subgenre, and the session by id.
      releases: [{ releaseId: RELEASE.slug, track: 10 }],
      subgenreIds: ['soft-rock'],
      session: {
        studio: 'Sunset Sound',
        studioId: 'sunset-sound',
        city: 'Los Angeles',
        country: 'USA',
        placeId: 'los-angeles',
      },
      credits: [
        {
          name: 'Jeff Porcaro',
          role: 'performer',
          instrument: 'drum-kit',
          artistGlobeId: 'jeff-porcaro',
        },
      ],
      relatedRecordings: [
        { artist: 'Weezer', relation: 'cover', artistGlobeId: 'weezer' },
        { artist: 'x', relation: 'sample', songId: 'dreams' },
        { artist: 'Some Guest', relation: 'collaboration' },
      ],
    };
    // Unlinked: a display name, a composer line with no songwriter credit.
    const unlinked: Song = {
      ...base,
      id: 'unlinked_fixture',
      composer: 'A. Writer and B. Writer',
      credits: [{ name: 'A Player', role: 'performer' }],
    };
    // A session naming a studio and no city: placed through the studio.
    const studioOnly: Song = {
      ...base,
      id: 'studio_only_fixture',
      session: { studio: STUDIO.name },
    };
    // No releases, so its session's label id is the one read. (Africa has
    // named its record since the bulk import of 30 September 2026, so it is
    // left out here.)
    const labelOnly: Song = {
      ...base,
      id: 'label_only_fixture',
      releases: undefined,
      session: { label: LABEL.name, labelId: LABEL.slug },
    };
    // A label named as text alone, with no record and no id: read as a
    // guess. (A real song did this until the bulk import of 30 September
    // 2026 gave the pilot songs their records.)
    const labelTextOnly: Song = {
      ...base,
      id: 'label_text_fixture',
      releases: undefined,
      session: { label: LABEL.name },
    };
    const derivable = new Set(
      ALL_REF_PATHS.filter(
        (r) => r.derive !== false && DERIVED_KINDS.has(r.kind),
      ).map((r) => `${ENTITY_OF[r.kind]}:${r.path}`),
    );
    // The assembled pipeline, not the derivers one by one: an edge a deriver
    // makes but buildGraph never asks for, or one assembly adds, counts here.
    const graph = buildGraph({
      songs: [...songs, linked, unlinked, studioOnly, labelOnly, labelTextOnly],
      progressions: LIB,
      artists: [ARTIST, TOTO, PERSON],
      releases: [RELEASE],
      studios: [STUDIO],
      labels: [LABEL],
      places: CITIES,
      events: [LINKED_EVENT, UNLINKED_EVENT, STORED_EVENT],
      eventMatches: EVENT_MATCHES,
      artistLocations: [TOTO_PINS],
      instrumentGenres: INSTRUMENT_GENRES,
      asOfYear: 2026,
      dayStubs: [
        {
          slug: 'aug-day-1',
          label: 'Day 1',
          songId: 'africa',
          globeEventIds: ['evt-x', 'song-dreams'],
        },
      ],
      pathways: [
        { id: 'blues-to-rock', title: 'Blues to rock', eventIds: ['evt-x'] },
      ],
      influenceArcs: [
        { from: 'evt-x', to: 'song-africa' },
        { from: 'song-africa', to: 'song-dreams' },
      ],
    });
    expect(graph.unreadable).toEqual([]);
    const vias: EdgeVia[] = [
      ...graph.edges.flatMap((e) => e.via),
      ...graph.violations.flatMap((v) => (v.edge.via ? [v.edge.via] : [])),
    ];
    const key = (via: EdgeVia) => `${via.item.split(':')[0]}:${via.path}`;
    const emitted = new Set(vias.filter((v) => !isCodeOwnedVia(v)).map(key));
    const codeOwned = new Set(vias.filter(isCodeOwnedVia).map(key));
    // Every edge names a declared path (or a year, a value, not a reference)…
    expect(
      [...emitted]
        .filter((p) => !derivable.has(p) && !BUCKETED_VALUES.has(p))
        .sort(),
    ).toEqual([]);
    // …every path declared as derived really produces edges (a vocabulary
    // path still drawn from code counting as drawn)…
    const drawnAsCode = new Set(
      [...VOCABULARY_FILED_AS_CODE]
        .filter(([graphKey]) => codeOwned.has(graphKey))
        .map(([, stated]) => stated),
    );
    expect(
      [...derivable]
        .filter((p) => !emitted.has(p) && !drawnAsCode.has(p))
        .sort(),
    ).toEqual([]);
    // …the bucketed exemptions name only fields in use…
    expect([...BUCKETED_VALUES].filter((p) => !emitted.has(p))).toEqual([]);
    // …code states exactly the connections listed as code's, besides the
    // vocabulary's it still draws, each of which REPO_REF_PATHS states…
    expect(
      [...codeOwned].filter((p) => !VOCABULARY_FILED_AS_CODE.has(p)).sort(),
    ).toEqual([...CODE_OWNED_PATHS].sort());
    const stated = new Set(
      REPO_REF_PATHS.map((r) => `${ENTITY_OF[r.kind]}:${r.path}`),
    );
    expect(
      [...VOCABULARY_FILED_AS_CODE.values()].filter((p) => !stated.has(p)),
    ).toEqual([]);
    // …and each path names only the kinds it declares, `target` or one of
    // `alsoTargets`: an event's tag names an artist or a song, never a place.
    const declared = new Map<string, ReadonlySet<string>>(
      ALL_REF_PATHS.filter((r) => DERIVED_KINDS.has(r.kind)).map((r) => [
        `${ENTITY_OF[r.kind]}:${r.path}`,
        new Set([r.target, ...(r.alsoTargets ?? [])]),
      ]),
    );
    const strays = graph.edges.flatMap((edge) =>
      edge.via
        .filter((v) => !isCodeOwnedVia(v) && !BUCKETED_VALUES.has(key(v)))
        .flatMap((v) => {
          const end = namedEnd(edge, v);
          return declared.get(key(v))?.has(end.split(':')[0])
            ? []
            : [`${key(v)} → ${end}`];
        }),
    );
    expect(strays.sort()).toEqual([]);
  });
});
