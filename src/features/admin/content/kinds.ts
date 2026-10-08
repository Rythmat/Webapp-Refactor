import { INSTRUMENT_SECTIONS } from '@/curriculum/data/instruments';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import type { ContentPreview, StructuredEditor } from './editorTypes';
import { RECORD_EDITORS } from './recordEditors';
import { SongPageEditor } from './songEditor/SongPageEditor';
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

/**
 * A record kind's identity field, the one key its editor does not write: the
 * slug other records link by, set when the record is made and kept after.
 */
const slugField = (what: string): FieldSpec => ({
  path: 'slug',
  label: 'Slug',
  type: 'text',
  help: `Unique: lowercase words joined by hyphens. ${what} link to it by this, so it stays when the name changes.`,
});

/**
 * A vocabulary record's id: set when it is made and never changed, since
 * other records and code name it by this.
 */
const vocabularyId = (what: string): FieldSpec => ({
  path: 'id',
  label: 'Id',
  type: 'text',
  help: `Unique: lowercase words joined by hyphens, and never changed once made. ${what} name it by this.`,
});

/** The globe's own spellings that resolve to a genre or subgenre. */
const globeTags: FieldSpec = {
  path: 'tags',
  label: 'Globe tags',
  type: 'csv',
  wide: true,
  help: 'How the globe’s events and scenes spell it, separated by commas: “Hip Hop, Hip-Hop”. Each tag names one genre or subgenre.',
};

// Every content kind has a spec. The record kinds (artist, release, studio,
// label, chord_progression, and globe_city's place body) are edited by their
// record editor (`recordEditors/`), the same component the Table's row panel
// shows in its Details; the typed form keeps only the identity field, which
// the record editors leave alone, and the JSON pane the keys neither owns.
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
    // The song kind is edited on the song page itself (SongDetailView with
    // its fields as inputs) — no scalar form, no JSON pane.
    FullEditor: SongPageEditor,
    makeDefault: () => makeEmptySong() as unknown as Record<string, unknown>,
    jsonLabel: 'Audio sources, time signature and cross-references',
    // credits/session/relatedRecordings are edited in the song editor's
    // ConnectionsPanel, so they stay out of the JSON pane.
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
    blurb:
      'Places: the globe’s city pins, and the hometowns and studio towns it draws no pin for. Artists, studios, labels and events name a place by its id.',
    // The place fields are PlaceFields' (the whole City plus aliases and the
    // pin switch); the form keeps only the id, so the two never both edit a key.
    fields: [
      {
        path: 'id',
        label: 'Id / slug',
        type: 'text',
        help: 'Unique. Artists, studios, labels and events link to it by this.',
      },
    ],
    formKeys: ['id'],
    StructuredEditor: RECORD_EDITORS.globe_city.Editor,
    structuralKeys: [...RECORD_EDITORS.globe_city.keys],
  },

  artist: {
    label: 'Artists',
    singular: 'artist',
    blurb:
      'Acts and people: a band, a solo artist, someone credited on a song. Songs, records and events name an artist by slug.',
    fields: [slugField('Songs, records and events')],
    formKeys: ['slug'],
    StructuredEditor: RECORD_EDITORS.artist.Editor,
    structuralKeys: [...RECORD_EDITORS.artist.keys],
  },

  release: {
    label: 'Records',
    singular: 'record',
    blurb:
      'Albums, singles and EPs: who made each, when, and on which label. Songs name the records they appear on.',
    fields: [slugField('Songs and events')],
    formKeys: ['slug'],
    StructuredEditor: RECORD_EDITORS.release.Editor,
    structuralKeys: [...RECORD_EDITORS.release.keys],
  },

  studio: {
    label: 'Studios',
    singular: 'studio',
    blurb:
      'Recording studios: where each one is and the years it ran. Songs name the studio they were recorded in.',
    fields: [slugField('Songs and events')],
    formKeys: ['slug'],
    StructuredEditor: RECORD_EDITORS.studio.Editor,
    structuralKeys: [...RECORD_EDITORS.studio.keys],
  },

  label: {
    label: 'Labels',
    singular: 'label',
    blurb:
      'Record labels, their city and the label above them. Records name their label; artists name the labels they signed to.',
    fields: [slugField('Records, artists and songs')],
    formKeys: ['slug'],
    StructuredEditor: RECORD_EDITORS.label.Editor,
    structuralKeys: [...RECORD_EDITORS.label.keys],
  },

  chord_progression: {
    label: 'Progressions',
    singular: 'progression',
    blurb:
      'The progression library. Its chords are the library’s own; the songs that use a progression, its styles, vibes and complexity are edited here.',
    fields: [
      {
        path: 'id',
        label: 'Id',
        type: 'number',
        help: 'The library’s number for it.',
      },
    ],
    formKeys: ['id'],
    StructuredEditor: RECORD_EDITORS.chord_progression.Editor,
    structuralKeys: [...RECORD_EDITORS.chord_progression.keys],
    jsonLabel: 'The progression as the library has it',
  },

  // The vocabulary kinds: the repo's own data (src/content/vocabulary/),
  // which only the dev repo content server serves.
  genre: {
    label: 'Genres',
    singular: 'genre',
    blurb:
      'The umbrella genres every subgenre sits under. Artists, songs and subgenres name a genre by its id. Not shown to students.',
    fields: [
      vocabularyId('Artists, songs and subgenres'),
      { path: 'name', label: 'Name', type: 'text' },
      globeTags,
      {
        path: 'note',
        label: 'Note',
        type: 'text',
        wide: true,
        help: 'Why it is here though the curriculum does not teach it.',
      },
    ],
    formKeys: ['id', 'name', 'tags', 'note'],
    jsonLabel: 'Set in code: whether the curriculum teaches it',
  },

  subgenre: {
    label: 'Subgenres',
    singular: 'subgenre',
    blurb:
      'The styles under each genre. Artists and songs name a subgenre by its id, and instruments name the styles they define. Not shown to students.',
    fields: [
      vocabularyId('Artists, songs and instruments'),
      { path: 'name', label: 'Name', type: 'text' },
      {
        path: 'parent',
        label: 'Genre',
        type: 'text',
        help: 'The id of the genre it sits under.',
      },
      globeTags,
    ],
    formKeys: ['id', 'name', 'parent', 'tags'],
  },

  instrument: {
    label: 'Instruments',
    singular: 'instrument',
    blurb:
      'Session instruments: what a credit says someone played. Students see an instrument’s name and section on song pages once the change is deployed.',
    fields: [
      vocabularyId('Song credits and artists'),
      { path: 'name', label: 'Name', type: 'text' },
      {
        path: 'section',
        label: 'Section',
        type: 'select',
        options: INSTRUMENT_SECTIONS.map((entry) => entry.section),
      },
      {
        path: 'worldInstrumentId',
        label: 'Instruments of the World entry',
        type: 'text',
        help: 'The id of the same instrument on the globe’s Instruments of the World, when there is one.',
      },
      {
        path: 'typicalIn',
        label: 'Typical in',
        type: 'csv',
        wide: true,
        help: 'Ids of the genres or subgenres it defines, separated by commas.',
      },
    ],
    formKeys: ['id', 'name', 'section', 'worldInstrumentId', 'typicalIn'],
  },

  // ── Instrument content (docs/instrument-content-kinds.md) ──
  // Grooves and parts are edited on their own pages (instrumentPages.ts);
  // these specs name them for the lists, labels and templates.
  drum_groove: {
    label: 'Drum grooves',
    singular: 'drum groove',
    blurb:
      'The grooves lesson play-alongs, Practice Tracks and the Studio’s Grooves tab play. Edited in the Drum Grooves designer.',
    fields: [
      { path: 'id', label: 'Id', type: 'text' },
      { path: 'name', label: 'Name', type: 'text' },
      { path: 'genre', label: 'Genre', type: 'text' },
      { path: 'style', label: 'Style', type: 'text' },
      {
        path: 'status',
        label: 'Status',
        type: 'select',
        options: ['draft', 'live'],
      },
    ],
    formKeys: ['id', 'name', 'genre', 'style', 'status'],
  },

  instrument_part: {
    label: 'Parts',
    singular: 'part',
    blurb:
      'Instrumental parts — piano, bass, guitar — lessons and the Studio draw on. Edited in the Parts Library.',
    fields: [
      { path: 'id', label: 'Id', type: 'text' },
      { path: 'name', label: 'Name', type: 'text' },
      { path: 'genre', label: 'Genre', type: 'text' },
      { path: 'style', label: 'Style', type: 'text' },
      {
        path: 'status',
        label: 'Status',
        type: 'select',
        options: ['draft', 'live'],
      },
    ],
    formKeys: ['id', 'name', 'genre', 'style', 'status'],
  },

  feel_profile: {
    label: 'Feels',
    singular: 'feel',
    blurb:
      'How a style places each 16th against the grid, measured from a player. Saved from a played part in the Parts Library.',
    fields: [
      { path: 'id', label: 'Id', type: 'text' },
      { path: 'name', label: 'Name', type: 'text' },
      {
        path: 'description',
        label: 'Description',
        type: 'textarea',
        wide: true,
      },
      { path: 'source', label: 'Measured from', type: 'text', wide: true },
      { path: 'step', label: 'Step (ticks)', type: 'number' },
      { path: 'positions', label: 'Positions per cycle', type: 'number' },
    ],
    formKeys: ['id', 'name', 'description', 'source', 'step', 'positions'],
    jsonLabel: 'Offsets and accents per position',
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
  'artist',
  'release',
  'studio',
  'label',
  'chord_progression',
  'genre',
  'subgenre',
  'instrument',
  'feel_profile',
  'drum_groove',
  'instrument_part',
];

// Own keys only: `in` also accepts inherited ones, so a URL of
// /console/content/constructor/… passed as a kind.
export const isContentKind = (
  value: string | undefined,
): value is ContentKind =>
  value !== undefined &&
  Object.prototype.hasOwnProperty.call(CONTENT_KINDS, value);

// ── Dot-path helpers, so FieldSpec.path can address nested body fields ───────
// They live in src/content/bodyPaths.ts, which is pure, so code that only
// reads a body need not load every kind's editor; re-exported for the pages
// that have always found them here.

export { getPath, jsonRemainder, setPath } from '@/content/bodyPaths';
