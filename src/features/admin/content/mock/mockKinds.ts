import { SLUG_PATTERN } from '@/content/graph/ids';
import {
  VOCABULARY_KINDS,
  type VocabularyKind,
} from '@/content/vocabulary/schemas';
import SLUG_PATTERNS from '@/scripts/apiContract/slugPatterns.generated.json';
import type { ContentMockMode } from './mockSwitch';

/**
 * What the mock knows about each content kind: which body field is its slug,
 * its CDN bundle, how a body projects onto a list row, and its starting
 * template. The contract (docs/console-content-api-contract.md) is the source
 * for every value here; identities and patterns come straight from its
 * generated slugPatterns file rather than being restated.
 *
 * The vocabulary kinds are the exception: genres, subgenres and session
 * instruments are the repo's own data (src/content/vocabulary/*.json), which
 * only repo mode serves, and the contract has no kind for them (the API's
 * copy is `vocabulary.generated.json`). Their identity is `id`, in the
 * graph's kebab-case grammar for them (`SLUG_PATTERN`).
 */

export type Body = Record<string, unknown>;

export type MockKind =
  | 'song'
  | 'globe_event'
  | 'globe_city'
  | 'artist_location'
  | 'activity_flow'
  | 'fundamentals_flow'
  | 'artist'
  | 'release'
  | 'studio'
  | 'label'
  | 'chord_progression'
  | VocabularyKind;

export { VOCABULARY_KINDS };

/** Is this one of the vocabulary kinds, which only repo mode serves? */
export const isVocabularyKind = (kind: string): kind is VocabularyKind =>
  (VOCABULARY_KINDS as readonly string[]).includes(kind);

/** Today's API: the six kinds the console has always had. */
export const LEGACY_KINDS: readonly MockKind[] = [
  'activity_flow',
  'fundamentals_flow',
  'song',
  'globe_event',
  'artist_location',
  'globe_city',
];

/**
 * The contract's kinds, in the publishing order it requires (places, labels,
 * studios, artists, releases, songs) with the rest after.
 */
export const ALL_KINDS: readonly MockKind[] = [
  'globe_city',
  'label',
  'studio',
  'artist',
  'release',
  'song',
  'globe_event',
  'activity_flow',
  'fundamentals_flow',
  'artist_location',
  'chord_progression',
];

/**
 * Repo mode's kinds: every contract kind whose data the repo's files hold
 * (design C.1), in the same publishing order, then the vocabulary kinds,
 * which are the repo's own. Lessons are not served: to edit them, switch
 * repo mode off and use the API. The store's own list,
 * `src/scripts/repoContent/sources/index.ts` `REPO_KINDS`, is held to this
 * one by a test, since console code never imports the store's.
 */
export const REPO_KINDS: readonly MockKind[] = [
  'globe_city',
  'label',
  'studio',
  'artist',
  'release',
  'song',
  'globe_event',
  'artist_location',
  'chord_progression',
  ...VOCABULARY_KINDS,
];

export const kindsFor = (mode: ContentMockMode): readonly MockKind[] =>
  mode === 'legacy' ? LEGACY_KINDS : mode === 'repo' ? REPO_KINDS : ALL_KINDS;

type SlugPatternRow = { identity: 'id' | 'slug'; pattern: string | null };
const PATTERNS: Readonly<Record<string, SlugPatternRow>> = {
  ...(SLUG_PATTERNS as Record<string, SlugPatternRow>),
  ...Object.fromEntries(
    VOCABULARY_KINDS.map((kind) => [
      kind,
      { identity: 'id', pattern: SLUG_PATTERN[kind].source },
    ]),
  ),
};

export const identityOf = (kind: string): 'id' | 'slug' =>
  PATTERNS[kind]?.identity ?? 'id';

const compiled = new Map<string, RegExp | null>();
export const slugPatternOf = (kind: string): RegExp | null => {
  if (!compiled.has(kind)) {
    const source = PATTERNS[kind]?.pattern;
    compiled.set(kind, source ? new RegExp(source) : null);
  }
  return compiled.get(kind) ?? null;
};

/** The identity value of a body, as the slug it must equal. */
export const identityValue = (kind: string, body: Body | null): string =>
  body == null ? '' : String(body[identityOf(kind)] ?? '');

/**
 * The CDN bundle each kind publishes to. `null` kinds still get releases (so
 * `/export?view=published` and derivation read live data) but no bundle, as
 * the contract says for artist_location.
 */
export const BUNDLE: Record<MockKind, string | null> = {
  song: 'songs',
  globe_event: 'globe-events',
  activity_flow: 'lessons',
  fundamentals_flow: 'fundamentals',
  globe_city: 'places',
  artist_location: null,
  artist: 'artists',
  release: 'releases',
  studio: 'studios',
  label: 'labels',
  chord_progression: 'progressions',
  // The vocabulary publishes nothing: students read it from the repo.
  genre: null,
  subgenre: null,
  instrument: null,
};

/**
 * `true` once the store holds the whole set (contract, priority 4). The mock
 * seeds and releases every record kind, which is exactly when the real import
 * sets it. The legacy kinds stay `false` until the owner agrees otherwise.
 * The vocabulary kinds are the vocabulary files, the whole set.
 */
export const AUTHORITATIVE: Record<MockKind, boolean> = {
  song: false,
  globe_event: false,
  activity_flow: false,
  fundamentals_flow: false,
  artist_location: false,
  chord_progression: false,
  globe_city: true,
  artist: true,
  release: true,
  studio: true,
  label: true,
  genre: true,
  subgenre: true,
  instrument: true,
};

/**
 * Whether a kind is authoritative on a server in `mode`. In repo mode every
 * kind is (design A.5): the store is the very files the app's code
 * registries are built from, so there is nothing left to merge in, and the
 * console reads the exported rows alone.
 */
export const authoritativeIn = (kind: MockKind, mode: ContentMockMode) =>
  mode === 'repo' || AUTHORITATIVE[kind];

/**
 * The body level each kind validates at (contract, priority 2): today's API
 * in `legacy` mode; the contract's latest otherwise (repo mode included),
 * which is song v2
 * (`songBodySchema.ts`), the `globe_city` v2 body, the `globe_event` v2 body
 * and the artist body with `born` (`recordBodySchemas.ts`). Legacy mode
 * serves no artist, so the artist's level is only ever the latest.
 */
export const schemaVersionOf = (kind: MockKind, mode: ContentMockMode) => {
  if (kind === 'song') return mode === 'legacy' ? 0 : 2;
  if (kind === 'globe_city' || kind === 'globe_event')
    return mode === 'legacy' ? 1 : 2;
  if (kind === 'artist') return 2;
  return 1;
};

// ── List projection ─────────────────────────────────────────────────────────

export interface Projection {
  title: string;
  subtitle: string | null;
  sortYear: number | null;
  tags: string[];
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
const at = (body: Body, key: string): Body =>
  (body[key] && typeof body[key] === 'object' ? body[key] : {}) as Body;

export function project(kind: string, body: Body | null, slug: string) {
  const b = body ?? {};
  const row = (
    title: unknown,
    subtitle: unknown,
    sortYear: unknown,
    tags: unknown,
  ): Projection => ({
    title: str(title) ?? slug,
    subtitle: str(subtitle),
    sortYear: num(sortYear),
    tags: strings(tags),
  });

  switch (kind) {
    case 'song':
      return row(b.title, b.artist, b.year, b.genreTags);
    case 'globe_event':
      return row(b.title, at(b, 'location').city, b.year, b.tags);
    case 'globe_city':
      return row(b.name, b.country, null, b.aliases);
    case 'artist_location':
      return row(b.id, b.city, null, []);
    case 'activity_flow':
      return row(b.title, b.genre, null, []);
    case 'fundamentals_flow':
      return row(b.title, null, null, []);
    case 'artist':
      return row(b.name, b.basedInPlaceId, b.activeFrom, b.aliases);
    case 'release':
      return row(b.title, strings(b.artistIds).join(', '), b.year, []);
    case 'studio':
      return row(b.name, b.placeId, b.openedYear, b.aliases);
    case 'label':
      return row(b.name, b.placeId, b.foundedYear, b.aliases);
    case 'chord_progression':
      return row(b.progression, b.artist, null, b.styles);
    case 'genre':
      return row(b.name, b.taught === true ? 'Taught' : null, null, b.tags);
    case 'subgenre':
      return row(b.name, b.parent, null, b.tags);
    case 'instrument':
      return row(b.name, b.section, null, b.typicalIn);
    default:
      return row(b.title ?? b.name, null, null, []);
  }
}

// ── Templates (GET /template/:kind) ─────────────────────────────────────────

const TEMPLATE_HINTS: Record<MockKind, string> = {
  song: 'The id becomes the slug: lowercase letters, digits and underscores.',
  globe_event:
    'Ids are "evt-<kebab>"; song events are derived from songs, not created here.',
  globe_city: 'The id is kebab-case and becomes the place id songs link to.',
  artist_location: 'The id is the artist name in lowercase.',
  activity_flow: 'The id must be "<genre>-l<level>".',
  fundamentals_flow: 'There is one fundamentals lesson.',
  artist: 'The slug is artistSlug(name) and does not change with the name.',
  release: 'The slug is "<artist-slug>-<title-slug>".',
  studio: 'The slug is the kebab-case name.',
  label: 'The slug is the kebab-case name.',
  chord_progression: 'The id is a number, and the slug is that number.',
  genre:
    'The id is kebab-case and never changes. A new genre is not taught: which genres the curriculum covers is set in code.',
  subgenre:
    'The id is kebab-case, never changes, and is no genre’s id. The parent is the genre it sits under.',
  instrument:
    'The id is kebab-case and never changes: song credits name it. Students see the name and section on song pages.',
};

export function templateFor(kind: MockKind, slug: string, nextId: number) {
  const bodies: Record<MockKind, Body> = {
    song: {
      id: slug,
      title: '',
      artist: '',
      key: 'C major',
      keyRoot: 60,
      mode: 'major',
      tempo: 120,
      timeSignature: [4, 4],
      difficulty: 1,
      genreTags: [],
      techniques: [],
      sections: [
        {
          id: 'section_1',
          label: '',
          bars: [
            { chords: [] },
            { chords: [] },
            { chords: [] },
            { chords: [] },
          ],
        },
      ],
      audioSources: [],
      artistImageSource: 'none',
    },
    globe_event: {
      id: slug,
      year: new Date().getFullYear(),
      location: { lat: 0, lng: 0, city: '', country: '' },
      genre: [],
      title: '',
      description: '',
      tags: [],
    },
    globe_city: {
      id: slug,
      name: '',
      country: '',
      subdivision: '',
      region: 'north-america',
      coordinates: [0, 0],
      genres: [],
      description: '',
      activeDecades: [],
    },
    artist_location: { id: slug, city: '', country: '', lat: 0, lng: 0 },
    activity_flow: {
      id: slug,
      genre: '',
      level: 1,
      title: '',
      version: 1,
      params: {},
      sections: [],
    },
    fundamentals_flow: { id: slug, title: '', sections: [] },
    artist: { slug, name: '' },
    release: { slug, title: '', artistIds: [], format: 'album' },
    studio: { slug, name: '' },
    label: { slug, name: '' },
    chord_progression: {
      id: nextId,
      progression: '',
      chords: [],
      chordCount: 0,
      startingChord: '',
      startingDegree: '',
      complexity: 'triad',
      vibes: [],
      styles: [],
      artist: '',
      song: '',
    },
    genre: { id: slug, name: '', taught: false, tags: [] },
    subgenre: { id: slug, name: '', parent: '', tags: [] },
    instrument: { id: slug, name: '', section: 'other', typicalIn: [] },
  };
  const body = bodies[kind];
  return {
    kind,
    slug: identityValue(kind, body),
    body,
    hint: TEMPLATE_HINTS[kind],
  };
}
