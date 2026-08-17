import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import type { ContentPreview, StructuredEditor } from './editorTypes';
import { SongEditor } from './songEditor/SongEditor';
import { makeEmptySong } from './songEditor/songDefaults';

/**
 * The console's view of each content kind: what to call it, and which fields to
 * render as a typed form rather than raw JSON.
 *
 * One table rather than per-page constants, so adding a kind means editing one
 * place and both the list and the editor pick it up.
 */

export type FieldSpec = {
  /** Dot path into the body, e.g. 'location.city'. */
  path: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'csv' | 'select';
  options?: string[];
  /** Full width in the two-column grid. */
  wide?: boolean;
  help?: string;
};

export type KindSpec = {
  label: string;
  singular: string;
  /** One line describing what this kind is, shown above the list. */
  blurb: string;
  /** Rendered as a typed form. Anything not listed lives in the JSON editor. */
  fields: FieldSpec[];
  /**
   * Body keys the typed form owns. The JSON editor shows the remainder, so the
   * two halves never disagree about who owns a field.
   */
  formKeys: string[];
  /** Shown when the JSON half is non-empty. */
  jsonLabel?: string;
  /**
   * Optional WYSIWYG editor for the structural part of the body. When set, it
   * replaces the raw-JSON pane for the keys in `structuralKeys`; kinds without
   * one keep the JSON pane, so nothing regresses.
   */
  StructuredEditor?: StructuredEditor;
  /** Body keys the StructuredEditor owns — removed from the JSON pane. */
  structuralKeys?: string[];
  /** Optional read-only preview rendering the app's real component. */
  Preview?: ContentPreview;
  /**
   * A full-page editor that owns the ENTIRE body and replaces the scalar form
   * and JSON pane outright (e.g. the Song editor's in-place published-page
   * replica). Mutually exclusive with the form/StructuredEditor path.
   */
  FullEditor?: StructuredEditor;
  /** Local fallback body for "New …" when the API template is unavailable. */
  makeDefault?: () => Record<string, unknown>;
};

export const CONTENT_KINDS: Record<ContentKind, KindSpec> = {
  globe_event: {
    label: 'Globe events',
    singular: 'event',
    blurb:
      'Pins on the music-history globe. Ids are referenced by influence arcs, learning pathways and the annual curriculum, so renaming or deleting one is checked at publish time.',
    fields: [
      {
        path: 'id',
        label: 'Id / slug',
        type: 'text',
        help: 'Unique. Referenced by arcs and pathways.',
      },
      { path: 'year', label: 'Year', type: 'number' },
      { path: 'title', label: 'Title', type: 'text', wide: true },
      { path: 'location.city', label: 'City', type: 'text' },
      { path: 'location.country', label: 'Country', type: 'text' },
      { path: 'location.lat', label: 'Latitude', type: 'number' },
      { path: 'location.lng', label: 'Longitude', type: 'number' },
      { path: 'genre', label: 'Genres', type: 'csv' },
      { path: 'videoId', label: 'YouTube video id', type: 'text' },
      { path: 'tags', label: 'Tags', type: 'csv', wide: true },
      {
        path: 'description',
        label: 'Description',
        type: 'textarea',
        wide: true,
      },
    ],
    formKeys: [
      'id',
      'year',
      'title',
      'location',
      'genre',
      'videoId',
      'tags',
      'description',
    ],
  },

  song: {
    label: 'Songs',
    singular: 'song',
    blurb:
      'Chord charts. Degrees use the Hybrid Number System and are the source of truth; chordName is display only. The schema has no lyrics or melody fields by design.',
    fields: [
      { path: 'id', label: 'Id / slug', type: 'text' },
      { path: 'title', label: 'Title', type: 'text' },
      { path: 'artist', label: 'Artist', type: 'text' },
      { path: 'year', label: 'Year', type: 'number' },
      { path: 'key', label: 'Key', type: 'text', help: 'e.g. "D minor"' },
      {
        path: 'keyRoot',
        label: 'Key root (MIDI note)',
        type: 'number',
        help: 'MIDI note number, not a pitch class — 60 is C4.',
      },
      {
        path: 'mode',
        label: 'Mode',
        type: 'select',
        options: [
          'major',
          'minor',
          'dorian',
          'mixolydian',
          'phrygian',
          'lydian',
          'locrian',
          'aeolian',
          'ionian',
        ],
      },
      { path: 'tempo', label: 'Tempo (BPM)', type: 'number' },
      { path: 'difficulty', label: 'Difficulty (1–3)', type: 'number' },
      {
        path: 'popularity',
        label: 'Popularity (0–100)',
        type: 'number',
        help: 'Drives browse ordering.',
      },
      { path: 'genreTags', label: 'Genre tags', type: 'csv' },
      { path: 'techniques', label: 'Techniques', type: 'csv' },
      {
        path: 'artistImageSource',
        label: 'Artist image source',
        type: 'select',
        options: [
          'spotify',
          'youtube',
          'commissioned',
          'wikipedia',
          'manual',
          'none',
        ],
      },
      { path: 'artistImageRef', label: 'Artist image ref', type: 'text' },
      {
        path: 'historicalDescription',
        label: 'Historical description',
        type: 'textarea',
        wide: true,
        help: 'Used verbatim as the derived globe event’s description.',
      },
    ],
    formKeys: [
      'id',
      'title',
      'artist',
      'year',
      'key',
      'keyRoot',
      'mode',
      'tempo',
      'difficulty',
      'popularity',
      'genreTags',
      'techniques',
      'artistImageSource',
      'artistImageRef',
      'historicalDescription',
    ],
    // The song kind is edited entirely through an in-place replica of the
    // published song page — no scalar form, no JSON pane.
    FullEditor: SongEditor,
    makeDefault: () => makeEmptySong() as unknown as Record<string, unknown>,
    jsonLabel: 'Audio sources, time signature and cross-references',
  },

  activity_flow: {
    label: 'Lessons',
    singular: 'lesson',
    blurb:
      'One genre at one level. Editing opens the whole course — all of that genre’s levels — because a level is its own item and the slug must stay "<genre>-l<level>", which is how the app looks a lesson up.',
    fields: [
      {
        path: 'id',
        label: 'Id / slug',
        type: 'text',
        help: 'Must be "<genre>-l<level>".',
      },
      { path: 'title', label: 'Title', type: 'text', wide: true },
      { path: 'genre', label: 'Genre', type: 'text' },
      { path: 'level', label: 'Level (1–3)', type: 'number' },
      { path: 'params.defaultKey', label: 'Default key', type: 'text' },
      { path: 'params.swing', label: 'Swing', type: 'number' },
      { path: 'params.defaultScaleId', label: 'Default scale', type: 'text' },
      { path: 'params.grooves', label: 'Grooves', type: 'csv' },
    ],
    formKeys: ['id', 'title', 'genre', 'level', 'params', 'version'],
    jsonLabel: 'Sections and steps',
  },

  fundamentals_flow: {
    label: 'Fundamentals',
    singular: 'fundamentals lesson',
    blurb:
      'The Piano Fundamentals lesson. Steps are evaluated by MIDI criteria rather than target notes, which is why it is a separate kind.',
    fields: [
      { path: 'id', label: 'Id / slug', type: 'text' },
      { path: 'title', label: 'Title', type: 'text', wide: true },
    ],
    formKeys: ['id', 'title'],
    jsonLabel: 'Sections and steps',
  },

  artist_location: {
    label: 'Artist locations',
    singular: 'artist location',
    blurb:
      'Where an artist is placed on the globe. An artist with no entry here has their songs silently pinned to New York — see Globe placement on the Publishing page.',
    fields: [
      {
        path: 'id',
        label: 'Artist (lowercase)',
        type: 'text',
        wide: true,
        help: 'The lookup key. Must be the artist name in lowercase.',
      },
      { path: 'city', label: 'City', type: 'text' },
      { path: 'country', label: 'Country', type: 'text' },
      { path: 'lat', label: 'Latitude', type: 'number' },
      { path: 'lng', label: 'Longitude', type: 'number' },
    ],
    formKeys: ['id', 'city', 'country', 'lat', 'lng'],
  },

  globe_city: {
    label: 'Globe cities',
    singular: 'city',
    blurb: 'City pins on the globe.',
    fields: [
      { path: 'id', label: 'Id / slug', type: 'text' },
      { path: 'name', label: 'Name', type: 'text' },
      { path: 'country', label: 'Country', type: 'text' },
      { path: 'genres', label: 'Genres', type: 'csv', wide: true },
      {
        path: 'description',
        label: 'Description',
        type: 'textarea',
        wide: true,
      },
    ],
    formKeys: ['id', 'name', 'country', 'genres', 'description'],
  },
};

/** Tab order in the console. */
export const KIND_ORDER: ContentKind[] = [
  'activity_flow',
  'fundamentals_flow',
  'song',
  'globe_event',
  'artist_location',
  'globe_city',
];

export const isContentKind = (
  value: string | undefined,
): value is ContentKind => value !== undefined && value in CONTENT_KINDS;

// ── Dot-path helpers, so FieldSpec.path can address nested body fields ───────

export const getPath = (body: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)[key]
          : undefined,
      body,
    );

/** Immutably set a dot path, creating intermediate objects as needed. */
export const setPath = <T extends Record<string, unknown>>(
  body: T,
  path: string,
  value: unknown,
): T => {
  const [head, ...rest] = path.split('.');
  if (rest.length === 0) return { ...body, [head]: value };

  const child = (body[head] ?? {}) as Record<string, unknown>;
  return { ...body, [head]: setPath(child, rest.join('.'), value) };
};

/** The part of the body the typed form does NOT own, for the JSON editor. */
export const jsonRemainder = (
  body: Record<string, unknown>,
  formKeys: string[],
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(body).filter(([key]) => !formKeys.includes(key)),
  );
