import { REGIONS } from '@/components/atlas/data/regions';
import {
  CODE_OWNERS,
  type EdgeKind,
  type EntityKind,
} from '@/content/graph/types';
import type { ReleaseFormat } from '@/content/records/types';
import type { CreditRole } from '@/curriculum/types/songLibrary';
import type { TableId } from '../tableIds';
import { BORN_YEARS, PEOPLE, PEOPLE_TAGS } from './edges';
import type {
  CellEditDef,
  ChoiceOption,
  ColumnDef,
  ColumnEdit,
  ColumnSource,
  ConnectionPart,
  FilterDef,
  FilterRule,
  Hop,
  StatusFilter,
  TableDef,
} from './types';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  The thirteen tables, declared
 * ══════════════════════════════════════════════════════════════════════════
 *
 * One entry per table: its rows (a kind of graph node), its columns (a body
 * field, or a walk over the graph — see types.ts), its sort, search, filters
 * and where each empty cell's data will come from.
 *
 * THE OWNER'S COLUMNS
 *
 * For five categories the owner listed the fields himself (29 Sep 2026), and
 * those are the columns shown by default, in his order and his words — with
 * one spelling fixed: his Songs list says "Lable", shown as Label. Artist:
 * Artist Name, Born, City, Genres, Years Active, Songs, Events, Instruments.
 * Songs: Composers, Year, Album, Label, Studio, Credits, Producer, Genre,
 * Key, Chord Progression, Events. Genre: Artists, Songs, Year, Location,
 * Instruments. Location: Artists, Songs, Genre, Instruments. Events:
 * Artists, Songs, Genre. categories.test.ts pins them; a change is his call.
 *
 * The categories he left as "Etc." show the columns he has seen proposed on
 * the placeholder page, amended where the approved plan says so: Key gains
 * Modes (its rows are the key nodes, so the modes are a column), a
 * progression's Key is opt-in (683 of 695 have no path to one), and a
 * decade adds the artists active in it. Everything else is opt-in, from the
 * Columns menu.
 *
 * WHAT A CELL COUNTS
 *
 * A column's parts say who states each connection (types.ts, `PartRole`):
 * the row's own field, another item, or a two-step rollup with its
 * provenance. Some of the edges they walk come with later work — an event's
 * artists, songs and place, a city's scenes, song pins and the instruments'
 * genres are derived in C1; an artist's dates and the song and event ids
 * arrive with the stored fields in C2. A column walks whatever edges the
 * graph has, so it fills the day they exist; until then its empty cells say
 * where the data will come from.
 *
 * HOW A CELL IS EDITED
 *
 * A column's `edit` says who states what it shows. A cell of a column the
 * row states is edited in place, with the editor its field and path imply
 * (edit/editorFor.ts); `cell` names it where they would imply the wrong one
 * — a vocabulary of tags rather than every genre node, a closed list, one
 * role's credits, a value too long for a cell. A column another item states
 * (`ownedBy`) edits that item: a genre's Artists writes the artists'
 * `genreIds`, an instrument's the artists' `instrumentIds`.
 *
 * Pure data: the model builder, the grid and the panel read it. Nothing here
 * may import React, the store or the router (the purity test holds this).
 */

/* ── Node kinds ──────────────────────────────────────────────────────── */

const SONG: readonly EntityKind[] = ['song'];
const ARTIST: readonly EntityKind[] = ['artist'];
const GENRE: readonly EntityKind[] = ['genre', 'subgenre'];
const PLACE: readonly EntityKind[] = ['place'];
const EVENT: readonly EntityKind[] = ['event'];
const RELEASE: readonly EntityKind[] = ['release'];
const STUDIO: readonly EntityKind[] = ['studio'];
const LABEL: readonly EntityKind[] = ['label'];
const INSTRUMENT: readonly EntityKind[] = ['instrument'];
const YEAR: readonly EntityKind[] = ['year'];
const DECADE: readonly EntityKind[] = ['decade'];

/* ── Steps ───────────────────────────────────────────────────────────── */

type HopExtra = Pick<Hop, 'through' | 'via'>;

/** From the node along edges it is the `from` of. */
const out = (
  edges: readonly EdgeKind[],
  to: readonly EntityKind[],
  extra: HopExtra = {},
): Hop => ({ edges, dir: 'out', to, ...extra });

/** From the node along edges it is the `to` of. */
const into = (
  edges: readonly EdgeKind[],
  to: readonly EntityKind[],
  extra: HopExtra = {},
): Hop => ({ edges, dir: 'in', to, ...extra });

/** Either way round: influence arcs, covers. */
const either = (
  edges: readonly EdgeKind[],
  to: readonly EntityKind[],
): Hop => ({
  edges,
  dir: 'both',
  to,
});

// The steps most columns share.
const songsOfArtist = into(PEOPLE, SONG);
const artistsOfSong = out(PEOPLE, ARTIST);
const genresOf = out(['in_genre'], GENRE);
const yearOf = out(['from_year'], YEAR);
/** The instruments played on a song: credits hang them off the player, `on` the song. */
const instrumentsOnSong = out(['plays_instrument'], INSTRUMENT, {
  through: 'on',
});
/** An artist's stated City, not the city their songs are pinned to. */
const statedCity = out(['based_in'], PLACE, { via: ['basedInPlaceId'] });
/**
 * The city an artist's songs are pinned to: the Artist locations item's
 * `city`, drawn as a guess until a City is accepted.
 */
const songPinCity = out(['based_in'], PLACE, { via: ['city'] });
/**
 * An artist's city either way, for rollups: a stated City solid, song pins
 * dotted, and the rollup takes the weaker style — so a genre's places show
 * the artists' song pins as the guesses they are rather than nothing.
 */
const cityOf = out(['based_in'], PLACE);
/** The artists a place is the city of, stated or by song pins (see `cityOf`). */
const artistsBasedIn = into(['based_in'], ARTIST);

/* ── Parts ───────────────────────────────────────────────────────────── */

type PartExtra = Pick<ConnectionPart, 'tag' | 'tags'>;

/** What the row's own body states. */
const stated = (hop: Hop, extra: PartExtra = {}): ConnectionPart => ({
  id: 'stated',
  label: 'stated',
  role: 'stated',
  hops: [hop],
  ...extra,
});

/** One step, stated by another item or by code. */
const fact = (
  id: string,
  label: string,
  hop: Hop,
  extra: PartExtra = {},
): ConnectionPart => ({ id, label, role: 'fact', hops: [hop], ...extra });

/** Two steps, counted with its provenance. */
const rollup = (
  id: string,
  label: string,
  first: Hop,
  second: Hop,
  extra: PartExtra = {},
): ConnectionPart => ({
  id,
  label,
  role: 'rollup',
  hops: [first, second],
  ...extra,
});

/** Shown muted beside the stated value, never counted as stated. */
const hint = (
  id: string,
  label: string,
  hops: readonly [Hop] | readonly [Hop, Hop],
  extra: PartExtra = {},
): ConnectionPart => ({ id, label, role: 'hint', hops, ...extra });

/** The years of what `first` reaches: for a `years` column. */
const yearsVia = (id: string, label: string, first: Hop): ConnectionPart =>
  rollup(id, label, first, yearOf);

/* ── Columns ─────────────────────────────────────────────────────────── */

const WIDTH = {
  title: 260,
  connections: 220,
  field: 140,
  years: 140,
} as const;

type ColumnOptions = {
  /** On the owner's own list: shown by default, pinned by the test. */
  owner?: true;
  /** A proposed column of an "Etc." table, shown by default. */
  shown?: true;
  width?: number;
  help?: string;
};

const widthFor = (source: ColumnSource): number =>
  source.type === 'field'
    ? WIDTH.field
    : source.type === 'years'
      ? WIDTH.years
      : WIDTH.connections;

const column = (
  id: string,
  label: string,
  source: ColumnSource,
  edit: ColumnEdit,
  empty: string,
  { owner, shown, width, help }: ColumnOptions = {},
): ColumnDef => ({
  id,
  label,
  source,
  ...(owner ? { owner } : {}),
  defaultVisible: Boolean(owner || shown),
  width: width ?? widthFor(source),
  edit,
  empty,
  ...(help ? { help } : {}),
});

/** The identity column: always first, always shown. */
const title = (
  label: string,
  source: Extract<ColumnSource, { type: 'title' }>,
  edit: ColumnEdit,
  { owner, width }: Pick<ColumnOptions, 'owner' | 'width'> = {},
): ColumnDef => ({
  id: 'title',
  label,
  source,
  ...(owner ? { owner } : {}),
  defaultVisible: true,
  width: width ?? WIDTH.title,
  edit,
  // The title is the row itself; it is never empty.
  empty: '',
});

const connections = (
  parts: readonly ConnectionPart[],
  extra: Pick<
    Extract<ColumnSource, { type: 'connections' }>,
    'unlinkedText' | 'noExpand'
  > = {},
): ColumnSource => ({ type: 'connections', parts, ...extra });

const years = (parts: readonly ConnectionPart[]): ColumnSource => ({
  type: 'years',
  parts,
});

const field = (
  path: string,
  format: Extract<ColumnSource, { type: 'field' }>['format'],
  extra: Pick<Extract<ColumnSource, { type: 'field' }>, 'to' | 'hint'> = {},
): ColumnSource => ({ type: 'field', path, format, ...extra });

/** One role's credits on a song: the role's own column (`ColumnEdit.roles`). */
const credited = (role: CreditRole): ColumnSource => ({
  type: 'credits',
  path: 'credits',
  roles: [role],
});

// Who edits a column.
const row = (
  path: string,
  extra: Pick<
    Extract<ColumnEdit, { by: 'row' }>,
    'also' | 'since' | 'roles' | 'cell'
  > = {},
): ColumnEdit => ({ by: 'row', path, ...extra });

const ownedBy = (
  kind: Extract<ColumnEdit, { by: 'owner' }>['kind'],
  path: string,
  since?: Extract<ColumnEdit, { by: 'owner' }>['since'],
): ColumnEdit => ({ by: 'owner', kind, path, ...(since ? { since } : {}) });

const byCode = (file: string): ColumnEdit => ({ by: 'code', file });
const derived: ColumnEdit = { by: 'none' };

/**
 * An opt-in column of a song's credits in one role, which its cell adds
 * and removes: Performers, Engineer.
 */
const roleCredits = (
  id: string,
  label: string,
  role: CreditRole,
  empty: string,
  help?: string,
): ColumnDef =>
  column(
    id,
    label,
    credited(role),
    row('credits[]', { roles: [role], cell: { editor: 'credits', role } }),
    empty,
    help ? { help } : {},
  );

/* ── Cell editors the path alone would get wrong ─────────────────────── */

// Most cells' editors follow from the column (edit/editorFor.ts): a year
// field edits as a year, a list of ids as a picker of those ids. These are
// the exceptions (types.ts, `CellEditDef`), named once here.

/** Too long or too structured for a cell: Enter opens the row there. */
const inPanel: CellEditDef = { editor: 'panel' };

/** Free text, not ids: a place's scene genres, an event's genres. */
const freeText: CellEditDef = { editor: 'textChips' };

const toggles = (
  vocabulary: Extract<CellEditDef, { editor: 'tags' }>['vocabulary'],
): CellEditDef => ({ editor: 'tags', vocabulary });

const oneOf = (options: readonly ChoiceOption[]): CellEditDef => ({
  editor: 'choice',
  options,
});

/** A record's formats, in the record editor's order; keyed so none is missed. */
const FORMAT_LABEL: Record<ReleaseFormat, string> = {
  album: 'Album',
  single: 'Single',
  ep: 'EP',
  compilation: 'Compilation',
  live: 'Live',
  soundtrack: 'Soundtrack',
};

const FORMATS: readonly ChoiceOption[] = Object.entries(FORMAT_LABEL).map(
  ([value, label]) => ({ value, label }),
);

/** A progression's levels, as the progression editor lists them. */
const COMPLEXITIES: readonly ChoiceOption[] = ['triad', '7th', 'extended'].map(
  (value) => ({ value, label: value }),
);

/** The globe's regions: a place's `region` is one of their ids. */
const REGION_CHOICES: readonly ChoiceOption[] = REGIONS.map((region) => ({
  value: region.id,
  label: region.label,
}));

/* ── Filters ─────────────────────────────────────────────────────────── */

const missing = (column: string): FilterRule => ({ type: 'missing', column });
const empty = (column: string): FilterRule => ({ type: 'empty', column });
const flag = (value: Extract<FilterRule, { type: 'flag' }>['flag']) =>
  ({ type: 'flag', flag: value }) as const satisfies FilterRule;

const gap = (id: string, label: string, rule: FilterRule): FilterDef => ({
  id,
  label,
  group: 'gaps',
  rule,
});

const subset = (id: string, label: string, rule: FilterRule): FilterDef => ({
  id,
  label,
  group: 'kind',
  rule,
});

/**
 * The filters every table offers, after its own: review work first, then the
 * rows that connect to nothing or are found nowhere.
 */
export const COMMON_FILTERS: readonly FilterDef[] = [
  {
    id: 'has-suggestions',
    label: 'Has suggestions',
    group: 'review',
    rule: flag('suggestions'),
  },
  {
    id: 'bulk-unreviewed',
    label: 'Accepted in bulk, not reviewed',
    group: 'review',
    rule: flag('bulk-unreviewed'),
    help: 'Values accepted many at a time that nobody has marked reviewed yet.',
  },
  {
    id: 'unconfirmed',
    label: 'Unconfirmed',
    group: 'review',
    rule: flag('unconfirmed'),
    help: 'The record, or a connection it shows, is marked unconfirmed.',
  },
  {
    id: 'guesses',
    label: 'Guesses',
    group: 'review',
    rule: flag('guesses'),
    help: 'A connection it shows was guessed from a name, not linked.',
  },
  {
    id: 'orphan',
    label: 'No connections',
    group: 'gaps',
    rule: flag('orphan'),
  },
  {
    id: 'missing',
    label: 'Missing',
    group: 'gaps',
    rule: flag('missing'),
    help: 'Something names it, but it is found nowhere.',
  },
];

const withCommon = (own: readonly FilterDef[]): readonly FilterDef[] => [
  ...own,
  ...COMMON_FILTERS,
];

/** The status control's choices, in order. */
export const STATUS_FILTERS: readonly { value: StatusFilter; label: string }[] =
  [
    { value: 'all', label: 'All' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending review' },
    { value: 'rejected', label: 'Sent back' },
    { value: 'code', label: 'In code' },
    { value: 'missing', label: 'Missing' },
    { value: 'archived', label: 'Archived' },
  ];

/* ── Artist ──────────────────────────────────────────────────────────── */

const ARTISTS: TableDef = {
  id: 'artists',
  title: 'Artists',
  singular: 'artist',
  rows: { kind: 'artist' },
  contentKind: 'artist',
  panel: 'record',
  create: 'dialog',
  columns: [
    title(
      'Artist Name',
      { type: 'title', sublabel: 'artist' },
      row('name', { also: ['aliases', 'group'] }),
      { owner: true, width: 240 },
    ),
    column(
      'born',
      'Born',
      field('born', 'born'),
      row('born', { since: 'artist-born', cell: { editor: 'born' } }),
      'No birth date yet. The import may suggest one, or type it in the row.',
      {
        owner: true,
        width: 200,
        help: 'The date and place of birth; for a group, the year and city it formed.',
      },
    ),
    column(
      'city',
      'City',
      connections([
        stated(statedCity),
        fact('pins', 'song pins', songPinCity, { tag: 'song pins' }),
      ]),
      row('basedInPlaceId'),
      'No city yet. The city their songs are pinned to shows here as a guess; the import suggests the rest.',
      {
        owner: true,
        help: 'Their hometown or scene; for a group, where it formed. Song pins are where their songs sit on the globe, shown as a guess until a City is accepted.',
      },
    ),
    column(
      'genres',
      'Genres',
      connections([
        stated(genresOf),
        hint('songs', 'from songs', [songsOfArtist, genresOf]),
        hint('events', 'from events', [into(['about'], EVENT), genresOf]),
      ]),
      row('genreIds[]'),
      'No genres yet. Pick them in the row; the genres of their songs and events are offered first.',
      { owner: true },
    ),
    column(
      'years',
      'Years Active',
      field('activeFrom', 'yearRange', {
        to: 'activeTo',
        hint: {
          label: 'events',
          parts: [hint('events', 'events', [into(['about'], EVENT), yearOf])],
        },
      }),
      row('activeFrom', { also: ['activeTo'] }),
      'No years yet. The import suggests them.',
      { owner: true },
    ),
    column(
      'songs',
      'Songs',
      connections([
        fact('songs', 'songs', songsOfArtist, { tags: PEOPLE_TAGS }),
      ]),
      ownedBy('song', 'origin.artistGlobeId'),
      'No song credits them yet. Link… adds them to a song’s credits.',
      { owner: true },
    ),
    column(
      'events',
      'Events',
      connections([fact('events', 'events', into(['about'], EVENT))]),
      ownedBy('globe_event', 'artistIds[]', 'event-v2'),
      'No globe event names them yet. Events are matched by name as the map derives them; Link… confirms one.',
      { owner: true },
    ),
    column(
      'instruments',
      'Instruments',
      connections([
        stated(
          out(['plays_instrument'], INSTRUMENT, { via: ['instrumentIds[]'] }),
        ),
        // A person's instruments in the groups they are a member of (the
        // group states them, on its member), and a group's: what its members
        // play, in it or on their own records.
        hint(
          'members',
          'in a group',
          [
            out(['plays_instrument'], INSTRUMENT, {
              via: ['members[].instrumentIds[]'],
            }),
          ],
          { tag: 'in a group' },
        ),
        hint(
          'group',
          'from members',
          [
            into(['member_of'], ARTIST),
            out(['plays_instrument'], INSTRUMENT, {
              via: ['members[].instrumentIds[]', 'instrumentIds[]'],
            }),
          ],
          { tag: 'members' },
        ),
        hint(
          'credits',
          'on records',
          [
            out(['plays_instrument'], INSTRUMENT, {
              via: ['credits[].instrument'],
            }),
          ],
          { tag: 'on a record' },
        ),
      ]),
      row('instrumentIds[]'),
      'No instrument data yet: the import suggests them, or pick them in the row.',
      { owner: true },
    ),
    // ── Opt-in ──
    column(
      'aliases',
      'Aliases',
      field('aliases', 'list'),
      row('aliases'),
      'No other spellings.',
    ),
    column(
      'group',
      'Group',
      field('group', 'flag'),
      // A yes or no: the panel's checkbox.
      row('group', { cell: inPanel }),
      'Not marked a group.',
      {
        width: 90,
        help: 'Whether the artist is a group (a band, a duo, an ensemble) rather than one person.',
      },
    ),
    column(
      'members',
      'Members',
      connections([stated(into(['member_of'], ARTIST))]),
      row('members[]'),
      'Not a group, or no members listed yet.',
    ),
    column(
      'memberOf',
      'Member of',
      connections([fact('groups', 'groups', out(['member_of'], ARTIST))]),
      ownedBy('artist', 'members[].artistId'),
      'Not listed as a member of a group.',
    ),
    column(
      'labels',
      'Labels',
      connections([stated(out(['signed_to'], LABEL))]),
      row('labelIds[]'),
      'No labels yet. They come with the records in the import, or pick them in the row.',
    ),
    column(
      'influencedBy',
      'Influenced by',
      connections([stated(into(['influenced'], ARTIST))]),
      row('influencedBy[]'),
      'No influences stated yet.',
    ),
    column(
      'influenced',
      'Influenced',
      connections([fact('artists', 'artists', out(['influenced'], ARTIST))]),
      ownedBy('artist', 'influencedBy[].artistId'),
      'No artist names them as an influence.',
    ),
    column(
      'records',
      'Records',
      connections([
        fact('records', 'records', into(['performed_by'], RELEASE)),
      ]),
      ownedBy('release', 'artistIds[]'),
      'No record bills them yet. Records come in the import.',
    ),
    column(
      'bio',
      'Bio',
      field('bio', 'text'),
      row('bio', { cell: inPanel }),
      'No bio yet.',
      { width: 260 },
    ),
  ],
  defaultSort: { column: 'title', dir: 'asc' },
  search: [
    { from: 'label' },
    { from: 'key' },
    { from: 'field', path: 'aliases[]' },
  ],
  filters: withCommon([
    gap('missing-born', 'Missing Born', missing('born')),
    gap('missing-city', 'Missing City', missing('city')),
    gap('missing-genres', 'Missing Genres', missing('genres')),
    gap('missing-years', 'Missing Years Active', missing('years')),
    gap('missing-instruments', 'Missing Instruments', missing('instruments')),
    gap('no-songs', 'No songs', empty('songs')),
    gap('only-guessed-songs', 'Only guessed songs', {
      type: 'guessed',
      column: 'songs',
    }),
    subset('groups', 'Groups', flag('group')),
    subset('people', 'People', flag('person')),
    // Opt-in columns' own gaps, so their coverage can be toggled too.
    gap('missing-aliases', 'Missing Aliases', missing('aliases')),
    gap('missing-group', 'Not marked a group', missing('group')),
    gap('missing-members', 'Missing Members', missing('members')),
    gap('missing-labels', 'Missing Labels', missing('labels')),
    gap('missing-influences', 'Missing Influenced by', missing('influencedBy')),
    gap('missing-bio', 'Missing Bio', missing('bio')),
  ]),
  // An act is billed on something, an event is about it, or it is a group;
  // credited people only wrote, produced or played on songs (C30).
  views: [
    {
      id: 'acts',
      label: 'Acts',
      rule: { type: 'not', rule: flag('credited') },
    },
    { id: 'credited', label: 'Credited people', rule: flag('credited') },
  ],
};

/* ── Songs ───────────────────────────────────────────────────────────── */

const SONGS: TableDef = {
  id: 'songs',
  title: 'Songs',
  singular: 'song',
  rows: { kind: 'song' },
  contentKind: 'song',
  panel: 'song',
  create: 'page',
  columns: [
    title('Title', { type: 'title', sublabel: 'lead-act' }, row('title')),
    column(
      'composers',
      'Composers',
      connections([stated(out(['written_by'], ARTIST))]),
      row('credits[]', {
        also: ['composer'],
        roles: ['songwriter'],
        cell: { editor: 'credits', role: 'songwriter' },
      }),
      'No songwriter yet. The import suggests them, or add a credit in the row.',
      {
        owner: true,
        help: 'Songwriter credits. The composer line is a guess until a credit links the writer.',
      },
    ),
    column(
      'year',
      'Year',
      field('year', 'year'),
      row('year'),
      'No year yet. Where the song’s globe event has one it is offered to accept; the import suggests the rest.',
      { owner: true, width: 90 },
    ),
    column(
      'album',
      'Album',
      connections([stated(out(['on_release'], RELEASE))]),
      row('releases[]', { since: 'song-v2' }),
      'No album yet. Albums come in the import.',
      { owner: true },
    ),
    column(
      'label',
      // The owner's list says "Lable".
      'Label',
      connections([
        stated(out(['released_on'], LABEL)),
        rollup(
          'records',
          'via its record',
          out(['on_release'], RELEASE),
          out(['released_on'], LABEL),
        ),
      ]),
      // The session's label while the song is on no record; on a record,
      // that record's label, written through the song-label link.
      row('session.labelId', {
        since: 'song-v2',
        also: ['session.label'],
        cell: { editor: 'one', kinds: LABEL, onRecord: 'song-label' },
      }),
      'No label yet. It comes from the song’s record, or from its session; the import fills most.',
      {
        owner: true,
        help: 'The label of the record the song is on, or the session’s label when it is on none.',
      },
    ),
    column(
      'studio',
      'Studio',
      connections([stated(out(['recorded_at'], STUDIO))]),
      row('session.studioId', { since: 'song-v2', also: ['session.studio'] }),
      'No studio yet. The import suggests one, or set it in the row.',
      { owner: true },
    ),
    column(
      'credits',
      'Credits',
      { type: 'credits', path: 'credits' },
      row('credits[]', { cell: inPanel }),
      'No credits yet. Credits come in the import, or add them in the row.',
      { owner: true, width: 240 },
    ),
    column(
      'producer',
      'Producer',
      connections([stated(out(['produced_by'], ARTIST))]),
      row('credits[]', {
        roles: ['producer'],
        cell: { editor: 'credits', role: 'producer' },
      }),
      'No producer yet. The import suggests one, or add a credit in the row.',
      { owner: true },
    ),
    column(
      'genre',
      'Genre',
      connections([stated(genresOf)]),
      row('genreTags[]', { cell: toggles('song-genre-tags') }),
      'No genre tags. Add them in the row.',
      { owner: true },
    ),
    column(
      'key',
      'Key',
      field('key', 'songKey', { to: 'mode' }),
      { by: 'page' },
      'No key on the chart. Set it in the page editor.',
      {
        owner: true,
        width: 110,
        help: 'The key belongs to the chart: change it in the page editor.',
      },
    ),
    column(
      'progression',
      'Chord Progression',
      connections([
        fact(
          'progressions',
          'progressions',
          out(['uses_progression'], ['progression']),
        ),
      ]),
      ownedBy('chord_progression', 'songIds[]'),
      'No progression lists this song. Link… adds it to a progression’s songs.',
      { owner: true },
    ),
    column(
      'events',
      'Events',
      connections([
        fact('events', 'events', into(['about'], EVENT)),
        fact('arcs', 'arcs', either(['influenced'], EVENT), { tag: 'arc' }),
      ]),
      ownedBy('globe_event', 'songIds[]', 'event-v2'),
      'No globe event names this song yet. Events are matched by title as the map derives them; Link… confirms one.',
      {
        owner: true,
        help: 'The events about the song, and the influence arcs to and from it.',
      },
    ),
    // ── Opt-in ──
    column(
      'artist',
      'Artist',
      connections([stated(out(['performed_by'], ARTIST))]),
      row('origin.artistGlobeId', { also: ['artist'] }),
      'No lead act. Link it in the row.',
      {
        help: 'The lead act and every billed artist; the billing line is a guess until linked.',
      },
    ),
    // Each other role's credits on its own, as Composers and Producer have
    // theirs: every credit the song holds shows in a column of its role.
    roleCredits(
      'performers',
      'Performers',
      'performer',
      'No performer credited yet. Add one in the row.',
      'Who played on the recording, with their instruments.',
    ),
    roleCredits(
      'vocals',
      'Vocals',
      'vocals',
      'No vocalist credited yet. Add one in the row.',
    ),
    roleCredits(
      'engineer',
      'Engineer',
      'engineer',
      'No engineer credited yet. Add one in the row.',
    ),
    roleCredits(
      'arranger',
      'Arranger',
      'arranger',
      'No arranger credited yet. Add one in the row.',
    ),
    roleCredits(
      'conductor',
      'Conductor',
      'conductor',
      'No conductor credited yet. Add one in the row.',
    ),
    column(
      'mode',
      'Mode',
      field('mode', 'text'),
      { by: 'page' },
      'No mode on the chart.',
      { width: 110 },
    ),
    column(
      'vibes',
      'Vibes',
      connections([
        rollup(
          'progressions',
          'via progressions',
          out(['uses_progression'], ['progression']),
          out(['has_vibe'], ['vibe']),
        ),
      ]),
      derived,
      'No vibes: they come through the song’s progressions.',
    ),
    column(
      'recordedIn',
      'Recorded in',
      connections([
        stated(out(['recorded_in'], PLACE)),
        // A session that names a studio but no city is in the studio's.
        fact('studio', 'its studio’s city', out(['recorded_in'], PLACE), {
          tag: 'studio',
        }),
      ]),
      row('session.placeId', { since: 'song-v2', also: ['session.city'] }),
      'No recording city yet: the session’s city, or its studio’s.',
    ),
    column(
      'covers',
      'Covers',
      connections([
        stated(either(['covers'], ['song', 'artist'])),
        fact(
          'others',
          'stated by others',
          either(['covers'], ['song', 'artist']),
        ),
      ]),
      row('relatedRecordings[]', { cell: inPanel }),
      'No other recordings listed.',
    ),
    column(
      'teachDays',
      'Teach days',
      connections([
        fact('days', 'Teach days', into(['uses_song'], ['teach_day'])),
      ]),
      byCode(CODE_OWNERS.teachYear),
      'No Teach day uses this song.',
    ),
    column(
      'pathways',
      'Pathways',
      connections([
        fact('pathways', 'pathways', out(['part_of'], ['pathway'])),
      ]),
      byCode(CODE_OWNERS.pathways),
      'Not a stop on any globe pathway.',
    ),
    column(
      'popularity',
      'Popularity',
      field('popularity', 'number'),
      row('popularity', { cell: { editor: 'number', min: 0, max: 100 } }),
      'No popularity set.',
      { width: 100 },
    ),
  ],
  defaultSort: { column: 'title', dir: 'asc' },
  search: [
    { from: 'label' },
    { from: 'key' },
    { from: 'field', path: 'artist' },
    { from: 'column', column: 'album' },
  ],
  filters: withCommon([
    gap('missing-year', 'Missing Year', missing('year')),
    gap('missing-composers', 'Missing Composers', missing('composers')),
    gap('no-album', 'No album', missing('album')),
    gap('missing-label', 'Missing Label', missing('label')),
    gap('missing-studio', 'Missing Studio', missing('studio')),
    gap('no-credits', 'No credits', missing('credits')),
    gap('missing-producer', 'Missing Producer', missing('producer')),
    gap('missing-genre', 'Missing Genre', missing('genre')),
    gap('unlinked-lead-act', 'Lead act not linked', {
      type: 'guessed',
      column: 'artist',
    }),
    gap('no-progression', 'No progression', empty('progression')),
    gap('missing-artist', 'No lead act', missing('artist')),
    gap('missing-performers', 'Missing Performers', missing('performers')),
    gap('missing-vocals', 'Missing Vocals', missing('vocals')),
    gap('missing-engineer', 'Missing Engineer', missing('engineer')),
    gap('missing-arranger', 'Missing Arranger', missing('arranger')),
    gap('missing-conductor', 'Missing Conductor', missing('conductor')),
    gap('missing-recorded-in', 'Missing Recorded in', missing('recordedIn')),
    gap('missing-covers', 'No other recordings', missing('covers')),
    gap('missing-popularity', 'Missing Popularity', missing('popularity')),
  ]),
};

/* ── Genre ───────────────────────────────────────────────────────────── */

// The rows' own files since the vocabulary moved to data (Amendment 6). The
// graph still names the modules that load them (`CODE_OWNERS`), so the
// Subgenres and Parent cells do too.
const GENRES_FILE = 'src/content/vocabulary/genres.json';

const GENRES: TableDef = {
  id: 'genres',
  title: 'Genres',
  singular: 'genre',
  // A genre counts through its subgenres, so rock's Songs include acid
  // rock's.
  rows: {
    kind: 'genre',
    vocabulary: 'genres',
    more: {
      kind: 'subgenre',
      vocabulary: 'subgenres',
      label: 'Show subgenres',
    },
    expand: 'subgenres',
  },
  code: {
    files: [
      GENRES_FILE,
      'src/content/vocabulary/subgenres.json',
      'src/content/vocabulary/genreTagLists.json',
    ],
    note: 'Vocabularies live in the repo: the genres, the subgenres and the tags that place them are edited in these files, one record per line.',
  },
  panel: 'code',
  columns: [
    title('Genre', { type: 'title', sublabel: 'genre' }, byCode(GENRES_FILE)),
    column(
      'artists',
      'Artists',
      connections([
        fact('stated', 'stated', into(['in_genre'], ARTIST)),
        rollup('songs', 'via songs', into(['in_genre'], SONG), artistsOfSong),
        rollup(
          'events',
          'via events',
          into(['in_genre'], EVENT),
          out(['about'], ARTIST),
        ),
      ]),
      // The artist states it: only the stated chips are theirs to take out;
      // what comes through songs and events is read-only here.
      ownedBy('artist', 'genreIds[]'),
      'No artists in this genre yet. They come from artists’ genres, and through its songs and events.',
      { owner: true },
    ),
    column(
      'songs',
      'Songs',
      connections([fact('songs', 'songs', into(['in_genre'], SONG))]),
      // A song's taught tag, or at song v2 its subgenre (links.ts,
      // 'genre-song').
      ownedBy('song', 'genreTags[]'),
      'No song is tagged with this genre.',
      { owner: true },
    ),
    column(
      'year',
      'Year',
      years([
        yearsVia('songs', 'songs', into(['in_genre'], SONG)),
        yearsVia('events', 'events', into(['in_genre'], EVENT)),
      ]),
      derived,
      'No dated songs or events in this genre.',
      { owner: true },
    ),
    column(
      'location',
      'Location',
      connections([
        fact('scenes', 'scenes', into(['scene_of'], PLACE), { tag: 'scene' }),
        rollup(
          'events',
          'via events',
          into(['in_genre'], EVENT),
          out(['took_place_in'], PLACE),
        ),
        rollup('artists', 'via artists', into(['in_genre'], ARTIST), cityOf),
      ]),
      derived,
      'No places yet. City scenes, event places and artists’ cities come in as the map derives them.',
      { owner: true },
    ),
    column(
      'instruments',
      'Instruments',
      connections([
        fact('typical', 'typical', into(['typical_in'], INSTRUMENT), {
          tag: 'typical',
        }),
        rollup(
          'artists',
          'via artists',
          into(['in_genre'], ARTIST),
          out(['plays_instrument'], INSTRUMENT),
        ),
        rollup(
          'credits',
          'via credits',
          into(['in_genre'], SONG),
          instrumentsOnSong,
        ),
      ]),
      derived,
      'No instruments yet. The typical instruments of each genre come with the derived map; credits add more.',
      { owner: true },
    ),
    // ── Opt-in ──
    column(
      'events',
      'Events',
      connections([fact('events', 'events', into(['in_genre'], EVENT))]),
      derived,
      'No globe events in this genre.',
    ),
    column(
      'progressions',
      'Progressions',
      connections([
        fact(
          'progressions',
          'progressions',
          into(['in_genre'], ['progression']),
        ),
      ]),
      derived,
      'No progression lists this style.',
    ),
    column(
      'subgenres',
      'Subgenres',
      connections(
        [fact('subgenres', 'subgenres', into(['in_genre'], ['subgenre']))],
        {
          noExpand: true,
        },
      ),
      byCode(CODE_OWNERS.subgenres),
      'No subgenres.',
    ),
    column(
      'parent',
      'Parent',
      connections([fact('parent', 'parent', out(['in_genre'], ['genre']))], {
        noExpand: true,
      }),
      byCode(CODE_OWNERS.subgenres),
      'A genre, not a subgenre.',
    ),
    column(
      'keys',
      'Keys',
      connections([
        rollup(
          'songs',
          'via songs',
          into(['in_genre'], SONG),
          out(['in_key'], ['key']),
        ),
      ]),
      derived,
      'No songs in this genre have a key.',
    ),
    column(
      'vibes',
      'Vibes',
      connections([
        rollup(
          'progressions',
          'via progressions',
          into(['in_genre'], ['progression']),
          out(['has_vibe'], ['vibe']),
        ),
      ]),
      derived,
      'No vibes: they come through the genre’s progressions.',
    ),
  ],
  defaultSort: { column: 'songs', dir: 'desc' },
  search: [{ from: 'label' }, { from: 'key' }],
  filters: withCommon([
    subset('taught', 'Taught', flag('taught')),
    gap('no-artists', 'No artists', empty('artists')),
    gap('no-songs', 'No songs', empty('songs')),
  ]),
};

/* ── Location ────────────────────────────────────────────────────────── */

const LOCATIONS: TableDef = {
  id: 'locations',
  title: 'Locations',
  singular: 'place',
  rows: { kind: 'place' },
  contentKind: 'globe_city',
  panel: 'record',
  create: 'dialog',
  columns: [
    title('Location', { type: 'title', sublabel: 'place' }, row('name')),
    column(
      'artists',
      'Artists',
      connections([
        fact(
          'based',
          'based',
          into(['based_in'], ARTIST, { via: ['basedInPlaceId'] }),
          {
            tag: 'based',
          },
        ),
        fact('born', 'born', into(['born_in'], ARTIST), { tag: 'born' }),
        fact(
          'pins',
          'song pins',
          into(['based_in'], ARTIST, { via: ['city'] }),
          {
            tag: 'song pins',
          },
        ),
      ]),
      ownedBy('artist', 'basedInPlaceId'),
      'No artists here yet. Song pins show as guesses as the map derives them; cities and birthplaces come from the rows and the import.',
      {
        owner: true,
        help: 'Artists based here or born here, and artists whose songs are pinned here (a guess until their City is accepted).',
      },
    ),
    column(
      'songs',
      'Songs',
      connections([
        fact('recorded', 'recorded here', into(['recorded_in'], SONG)),
        rollup('artists', 'via artists', artistsBasedIn, songsOfArtist),
      ]),
      ownedBy('song', 'session.placeId', 'song-v2'),
      'No songs recorded here yet. Recording cities come from song sessions and the import.',
      { owner: true },
    ),
    column(
      'genre',
      'Genre',
      connections([
        stated(out(['scene_of'], GENRE), { tag: 'scene' }),
        rollup(
          'events',
          'via events',
          into(['took_place_in'], EVENT),
          genresOf,
        ),
        rollup('artists', 'via artists', artistsBasedIn, genresOf),
      ]),
      row('genres[]', { cell: freeText }),
      'No scene genres listed for this place.',
      { owner: true },
    ),
    column(
      'instruments',
      'Instruments',
      connections([
        rollup(
          'artists',
          'via artists',
          artistsBasedIn,
          out(['plays_instrument'], INSTRUMENT),
        ),
        rollup(
          'songs',
          'via songs',
          into(['recorded_in'], SONG),
          instrumentsOnSong,
        ),
      ]),
      derived,
      'No instrument data yet. Instruments come through the artists based here and the songs recorded here, as credits fill in.',
      { owner: true },
    ),
    // ── Opt-in ──
    column(
      'events',
      'Events',
      connections([fact('events', 'events', into(['took_place_in'], EVENT))]),
      ownedBy('globe_event', 'placeId', 'event-v2'),
      'No globe events here.',
    ),
    column(
      'studios',
      'Studios',
      connections([fact('studios', 'studios', into(['based_in'], STUDIO))]),
      ownedBy('studio', 'placeId'),
      'No studios here.',
    ),
    column(
      'labels',
      'Labels',
      connections([fact('labels', 'labels', into(['based_in'], LABEL))]),
      ownedBy('label', 'placeId'),
      'No labels here.',
    ),
    column(
      'years',
      'Years',
      years([yearsVia('events', 'events', into(['took_place_in'], EVENT))]),
      derived,
      'No dated events here.',
    ),
    column(
      'sceneDecades',
      'Scene decades',
      connections([stated(out(['scene_active_in'], DECADE))]),
      row('activeDecades[]', { cell: toggles('scene-decades') }),
      'No scene decades listed.',
    ),
    column(
      'region',
      'Region',
      connections([stated(out(['located_in'], PLACE))]),
      row('region', { cell: oneOf(REGION_CHOICES) }),
      'Not in a region.',
    ),
    column(
      'country',
      'Country',
      field('country', 'text'),
      row('country'),
      'No country.',
    ),
    column(
      'subdivision',
      'State or province',
      field('subdivision', 'text'),
      row('subdivision'),
      'No state or province.',
    ),
    column(
      'coordinates',
      'Coordinates',
      field('coordinates', 'coordinates'),
      row('coordinates'),
      'No coordinates.',
    ),
  ],
  defaultSort: { column: 'artists', dir: 'desc' },
  search: [
    { from: 'label' },
    { from: 'key' },
    { from: 'field', path: 'aliases[]' },
    { from: 'field', path: 'subdivision' },
    { from: 'field', path: 'country' },
  ],
  filters: withCommon([
    subset('cities', 'Cities', flag('city')),
    subset('regions', 'Regions', flag('region')),
    subset('hometowns', 'Hometowns', flag('hometown')),
    gap('no-artists', 'No artists', empty('artists')),
    gap('missing-genre', 'Missing Genre', missing('genre')),
    gap(
      'missing-scene-decades',
      'Missing Scene decades',
      missing('sceneDecades'),
    ),
    gap('missing-region', 'Missing Region', missing('region')),
    gap('missing-country', 'Missing Country', missing('country')),
    gap(
      'missing-subdivision',
      'Missing State or province',
      missing('subdivision'),
    ),
    gap('missing-coordinates', 'Missing Coordinates', missing('coordinates')),
  ]),
};

/* ── Instruments ─────────────────────────────────────────────────────── */

// The rows' own file since the vocabulary moved to data (Amendment 6).
const INSTRUMENTS_FILE = 'src/content/vocabulary/instruments.json';

/** The songs an instrument was played on: credits' `on`. */
const songsPlayedOn = into(['plays_instrument'], SONG, { through: 'on' });

const INSTRUMENTS: TableDef = {
  id: 'instruments',
  title: 'Instruments',
  singular: 'instrument',
  rows: { kind: 'instrument', vocabulary: 'instruments' },
  code: {
    files: [INSTRUMENTS_FILE],
    note: 'Vocabularies live in the repo: the session instruments and the genres they are typical in are edited in this file, one record per line.',
  },
  panel: 'code',
  columns: [
    title(
      'Instrument',
      { type: 'title', sublabel: 'section' },
      byCode(INSTRUMENTS_FILE),
    ),
    column(
      'artists',
      'Artists',
      connections([
        // What the artist states (`instrumentIds`): the chips Unlink can
        // take out. What they played on records or in a group is the song's
        // credits' and the group's, read-only here.
        fact(
          'stated',
          'stated',
          into(['plays_instrument'], ARTIST, { via: ['instrumentIds[]'] }),
        ),
        fact(
          'played',
          'on records or in a group',
          into(['plays_instrument'], ARTIST, {
            via: ['credits[].instrument', 'members[].instrumentIds[]'],
          }),
        ),
      ]),
      ownedBy('artist', 'instrumentIds[]'),
      'No artist is known to play it yet. Credits and the import fill this.',
      { shown: true },
    ),
    column(
      'songs',
      'Songs',
      connections([fact('songs', 'songs', songsPlayedOn)]),
      derived,
      'No song credits it yet. Credits in the import fill this.',
      { shown: true },
    ),
    column(
      'genre',
      'Genre',
      connections([
        fact('typical', 'typical', out(['typical_in'], GENRE), {
          tag: 'typical',
        }),
        rollup(
          'artists',
          'via artists',
          into(['plays_instrument'], ARTIST),
          genresOf,
        ),
        rollup('songs', 'via songs', songsPlayedOn, genresOf),
      ]),
      derived,
      'No genres yet. The genres each instrument is typical in come with the derived map.',
      { shown: true },
    ),
    column(
      'location',
      'Location',
      connections([
        rollup(
          'artists',
          'via artists',
          into(['plays_instrument'], ARTIST),
          cityOf,
        ),
      ]),
      derived,
      'No places yet: they come through the artists who play it.',
      { shown: true },
    ),
    column(
      'year',
      'Year',
      years([yearsVia('songs', 'songs', songsPlayedOn)]),
      derived,
      'No dated song credits it yet.',
      { shown: true },
    ),
    // ── Opt-in ──
    column(
      'world',
      'World instrument',
      field('worldInstrumentId', 'text'),
      byCode(INSTRUMENTS_FILE),
      'Not among the Instruments of the World.',
    ),
  ],
  defaultSort: { column: 'artists', dir: 'desc' },
  search: [{ from: 'label' }, { from: 'key' }],
  filters: withCommon([
    gap('no-artists', 'No artists', empty('artists')),
    gap('no-genre', 'No genre', empty('genre')),
  ]),
};

/* ── Events ──────────────────────────────────────────────────────────── */

/**
 * What an event's title and tags name: until the event stores its artists
 * and songs (`artistIds`, `songIds`), the graph matches them from these,
 * dotted. Kept apart from the stored ids so the coverage strip counts only
 * what the event states ("Artists 0/1083 · matched 688").
 */
const MATCHED = ['title', 'tags[]'];

const EVENTS: TableDef = {
  id: 'events',
  title: 'Events',
  singular: 'event',
  // `evt-` events only: a song's own globe event is the song, in Songs.
  rows: { kind: 'event' },
  contentKind: 'globe_event',
  panel: 'event',
  create: 'page',
  columns: [
    title('Event', { type: 'title', sublabel: 'event' }, row('title')),
    column(
      'artists',
      'Artists',
      connections([
        stated(out(['about'], ARTIST, { via: ['artistIds[]'] })),
        fact('matched', 'matched', out(['about'], ARTIST, { via: MATCHED })),
      ]),
      row('artistIds[]', { since: 'event-v2' }),
      'No artist named yet. Artists are matched from the title and tags as the map derives them; accepted ones are stored on the event.',
      {
        owner: true,
        help: 'Solid when the event stores them; dotted when matched from its title and tags.',
      },
    ),
    column(
      'songs',
      'Songs',
      connections([
        stated(out(['about'], SONG, { via: ['songIds[]'] })),
        fact('matched', 'matched', out(['about'], SONG, { via: MATCHED })),
        fact('arcs', 'arcs', either(['influenced'], SONG), { tag: 'arc' }),
      ]),
      row('songIds[]', { since: 'event-v2' }),
      'No song named yet. Songs are matched from the title as the map derives them.',
      { owner: true },
    ),
    column(
      'genre',
      'Genre',
      connections([stated(genresOf)], { unlinkedText: 'genre[]' }),
      row('genre[]', { cell: freeText }),
      'No genre on this event.',
      {
        owner: true,
        help: 'Its genres, through the genre table; a name the table does not know is shown muted.',
      },
    ),
    // ── Opt-in ──
    column('year', 'Year', field('year', 'year'), row('year'), 'No year.', {
      width: 90,
    }),
    column(
      'place',
      'Place',
      connections(
        [
          stated(out(['took_place_in'], PLACE, { via: ['placeId'] })),
          fact(
            'matched',
            'matched',
            out(['took_place_in'], PLACE, { via: ['location.city'] }),
          ),
        ],
        { unlinkedText: 'location.city' },
      ),
      row('placeId', { since: 'event-v2', also: ['location.city'] }),
      'No place yet. The event’s city is matched as the map derives it.',
    ),
    column(
      'records',
      'Records',
      connections([stated(out(['about'], RELEASE))]),
      row('releaseIds[]', { since: 'event-v2' }),
      'No records named.',
    ),
    column(
      'studios',
      'Studios',
      connections([stated(out(['about'], STUDIO))]),
      row('studioIds[]', { since: 'event-v2' }),
      'No studios named.',
    ),
    column(
      'labels',
      'Labels',
      connections([stated(out(['about'], LABEL))]),
      row('labelIds[]', { since: 'event-v2' }),
      'No labels named.',
    ),
    column(
      'pathways',
      'Pathways',
      connections([
        fact('pathways', 'pathways', out(['part_of'], ['pathway'])),
      ]),
      byCode(CODE_OWNERS.pathways),
      'Not a stop on any globe pathway.',
    ),
    column(
      'teachDays',
      'Teach days',
      connections([
        fact('days', 'Teach days', into(['references_event'], ['teach_day'])),
      ]),
      byCode(CODE_OWNERS.teachYear),
      'No Teach day references it.',
    ),
    column(
      'influence',
      'Influence',
      connections([
        fact('arcs', 'arcs', either(['influenced'], ['event', 'song']), {
          tag: 'arc',
        }),
      ]),
      byCode(CODE_OWNERS.influenceArcs),
      'No influence arcs.',
    ),
    column(
      'video',
      'Video',
      field('videoId', 'text'),
      // A pasted YouTube address is stored as its video id.
      row('videoId', { cell: { editor: 'text', parse: 'youtube-id' } }),
      'No video.',
      {
        width: 120,
      },
    ),
  ],
  defaultSort: { column: 'year', dir: 'asc' },
  search: [
    { from: 'label' },
    { from: 'key' },
    { from: 'field', path: 'year' },
    { from: 'field', path: 'location.city' },
    { from: 'field', path: 'location.country' },
  ],
  filters: withCommon([
    gap('unresolved-place', 'Place not found', {
      type: 'all',
      rules: [{ type: 'field', path: 'location.city' }, empty('place')],
    }),
    gap('no-artists', 'No artists', empty('artists')),
    gap('no-genre', 'No genre', missing('genre')),
    gap('missing-artists', 'Artists not stored', missing('artists')),
    gap('missing-songs', 'Songs not stored', missing('songs')),
    gap('missing-year', 'Missing Year', missing('year')),
    gap('missing-place', 'Place not stored', missing('place')),
    gap('missing-records', 'No records named', missing('records')),
    gap('missing-studios', 'No studios named', missing('studios')),
    gap('missing-labels', 'No labels named', missing('labels')),
    gap('missing-video', 'No video', missing('video')),
  ]),
};

/* ── Recording: Records | Studios | Labels ───────────────────────────── */

const RECORDS: TableDef = {
  id: 'records',
  title: 'Records',
  singular: 'record',
  rows: { kind: 'release' },
  contentKind: 'release',
  panel: 'record',
  create: 'dialog',
  empty:
    'The import suggests each song’s album; accepting one makes its record.',
  columns: [
    title('Record', { type: 'title', sublabel: 'format' }, row('title')),
    column(
      'artist',
      'Artist',
      connections([stated(out(['performed_by'], ARTIST))]),
      row('artistIds[]'),
      'No artist billed yet.',
      { shown: true },
    ),
    column(
      'year',
      'Year',
      field('year', 'year'),
      row('year'),
      'No release year yet.',
      {
        shown: true,
        width: 90,
      },
    ),
    column(
      'label',
      'Label',
      connections([stated(out(['released_on'], LABEL))]),
      row('labelId'),
      'No label yet. The import suggests one.',
      { shown: true },
    ),
    column(
      'studio',
      'Studio',
      connections([
        rollup(
          'songs',
          'via its tracks',
          into(['on_release'], SONG),
          out(['recorded_at'], STUDIO),
        ),
      ]),
      derived,
      'No studio yet: it comes from where its tracks were recorded.',
      {
        shown: true,
        help: 'Where its tracks were recorded, from their sessions.',
      },
    ),
    column(
      'songs',
      'Songs',
      connections([fact('songs', 'songs', into(['on_release'], SONG))]),
      ownedBy('song', 'releases[]', 'song-v2'),
      'No song lists this record yet. Link… adds it to a song’s records.',
      { shown: true },
    ),
    // ── Opt-in ──
    column(
      'format',
      'Format',
      field('format', 'text'),
      row('format', { cell: oneOf(FORMATS) }),
      'No format.',
      {
        width: 110,
      },
    ),
    column(
      'catalog',
      'Catalog #',
      field('catalogNumber', 'text'),
      row('catalogNumber'),
      'No catalog number.',
      { width: 120 },
    ),
    column(
      'genres',
      'Genres',
      connections([
        rollup('songs', 'via its tracks', into(['on_release'], SONG), genresOf),
      ]),
      derived,
      'No genres: they come through its tracks.',
    ),
    column(
      'producers',
      'Producers',
      connections([
        rollup(
          'songs',
          'via its tracks',
          into(['on_release'], SONG),
          out(['produced_by'], ARTIST),
        ),
      ]),
      derived,
      'No producers: they come through its tracks’ credits.',
    ),
    column(
      'recordedIn',
      'Recorded in',
      connections([
        rollup(
          'songs',
          'via its tracks',
          into(['on_release'], SONG),
          out(['recorded_in'], PLACE),
        ),
      ]),
      derived,
      'No recording city: it comes through its tracks.',
    ),
  ],
  defaultSort: { column: 'title', dir: 'asc' },
  search: [
    { from: 'label' },
    { from: 'key' },
    { from: 'column', column: 'artist' },
  ],
  filters: withCommon([
    gap('missing-artist', 'No artist', missing('artist')),
    gap('missing-year', 'Missing Year', missing('year')),
    gap('missing-label', 'Missing Label', missing('label')),
    gap('no-songs', 'No songs', empty('songs')),
    gap('missing-format', 'Missing Format', missing('format')),
    gap('missing-catalog', 'Missing Catalog #', missing('catalog')),
  ]),
};

const STUDIOS: TableDef = {
  id: 'studios',
  title: 'Studios',
  singular: 'studio',
  rows: { kind: 'studio' },
  contentKind: 'studio',
  panel: 'record',
  create: 'dialog',
  empty: 'The import suggests them, with the songs recorded there.',
  columns: [
    title(
      'Studio',
      { type: 'title', sublabel: 'years' },
      row('name', { also: ['aliases'] }),
    ),
    column(
      'city',
      'City',
      connections([stated(out(['based_in'], PLACE))]),
      row('placeId'),
      'No city yet. Pick the place in the row.',
      { shown: true },
    ),
    column(
      'artists',
      'Artists',
      connections([
        rollup(
          'songs',
          'via songs',
          into(['recorded_at'], SONG),
          artistsOfSong,
        ),
      ]),
      derived,
      'No artists yet: they come through the songs recorded here.',
      { shown: true },
    ),
    column(
      'songs',
      'Songs',
      connections([fact('songs', 'songs', into(['recorded_at'], SONG))]),
      ownedBy('song', 'session.studioId', 'song-v2'),
      'No song was recorded here yet. Link… sets a song’s studio.',
      { shown: true },
    ),
    // ── Opt-in ──
    column(
      'years',
      'Years',
      field('openedYear', 'yearRange', { to: 'closedYear' }),
      row('openedYear', { also: ['closedYear'] }),
      'No years.',
    ),
    column(
      'coordinates',
      'Coordinates',
      field('coordinates', 'coordinates'),
      // Optional for a studio (a place needs its pin): set or cleared in the
      // row, where the box says so.
      row('coordinates', { cell: inPanel }),
      'No coordinates of its own.',
      { help: 'The building, when it has a pin of its own.' },
    ),
    column(
      'records',
      'Records',
      connections([
        rollup(
          'songs',
          'via songs',
          into(['recorded_at'], SONG),
          out(['on_release'], RELEASE),
        ),
      ]),
      derived,
      'No records: they come through its songs.',
    ),
    column(
      'labels',
      'Labels',
      connections([
        rollup(
          'songs',
          'via songs',
          into(['recorded_at'], SONG),
          out(['released_on'], LABEL),
        ),
      ]),
      derived,
      'No labels: they come through its songs.',
    ),
    column(
      'genres',
      'Genres',
      connections([
        rollup('songs', 'via songs', into(['recorded_at'], SONG), genresOf),
      ]),
      derived,
      'No genres: they come through its songs.',
    ),
  ],
  defaultSort: { column: 'title', dir: 'asc' },
  search: [
    { from: 'label' },
    { from: 'key' },
    { from: 'field', path: 'aliases[]' },
  ],
  filters: withCommon([
    gap('missing-city', 'Missing City', missing('city')),
    gap('no-songs', 'No songs', empty('songs')),
    gap('missing-years', 'Missing Years', missing('years')),
    gap('missing-coordinates', 'Missing Coordinates', missing('coordinates')),
  ]),
};

const LABELS: TableDef = {
  id: 'labels',
  title: 'Labels',
  singular: 'label',
  rows: { kind: 'label' },
  contentKind: 'label',
  panel: 'record',
  create: 'dialog',
  empty: 'They come with the records in the import.',
  columns: [
    title(
      'Label',
      { type: 'title', sublabel: 'years' },
      row('name', { also: ['aliases'] }),
    ),
    column(
      'city',
      'City',
      connections([stated(out(['based_in'], PLACE))]),
      row('placeId'),
      'No city yet. Pick the place in the row.',
      { shown: true },
    ),
    column(
      'artists',
      'Artists',
      connections([
        fact('signed', 'signed', into(['signed_to'], ARTIST), {
          tag: 'signed',
        }),
        rollup(
          'records',
          'via records',
          into(['released_on'], RELEASE),
          out(['performed_by'], ARTIST),
        ),
        rollup(
          'songs',
          'via songs',
          into(['released_on'], SONG),
          artistsOfSong,
        ),
      ]),
      ownedBy('artist', 'labelIds[]'),
      'No artists yet: they come from signings, its records and its songs.',
      { shown: true },
    ),
    column(
      'records',
      'Records',
      connections([fact('records', 'records', into(['released_on'], RELEASE))]),
      ownedBy('release', 'labelId'),
      'No record is on this label yet. Link… sets a record’s label.',
      { shown: true },
    ),
    // ── Opt-in ──
    column(
      'parent',
      'Parent label',
      connections([stated(out(['imprint_of'], LABEL))]),
      row('parentLabelId'),
      'Not an imprint.',
    ),
    column(
      'imprints',
      'Imprints',
      connections([fact('imprints', 'imprints', into(['imprint_of'], LABEL))]),
      ownedBy('label', 'parentLabelId'),
      'No imprints.',
    ),
    column(
      'years',
      'Years',
      field('foundedYear', 'yearRange', { to: 'defunctYear' }),
      row('foundedYear', { also: ['defunctYear'] }),
      'No years.',
    ),
    column(
      'songs',
      'Songs',
      connections([fact('songs', 'songs', into(['released_on'], SONG))]),
      ownedBy('song', 'session.labelId', 'song-v2'),
      'No song names this label.',
    ),
    column(
      'genres',
      'Genres',
      connections([
        rollup('songs', 'via songs', into(['released_on'], SONG), genresOf),
      ]),
      derived,
      'No genres: they come through its songs.',
    ),
  ],
  defaultSort: { column: 'title', dir: 'asc' },
  search: [
    { from: 'label' },
    { from: 'key' },
    { from: 'field', path: 'aliases[]' },
  ],
  filters: withCommon([
    gap('missing-city', 'Missing City', missing('city')),
    gap('no-records', 'No records', empty('records')),
    gap('missing-parent', 'Not an imprint', missing('parent')),
    gap('missing-years', 'Missing Years', missing('years')),
  ]),
};

/* ── Key ─────────────────────────────────────────────────────────────── */

/** A key's songs: the key node is the tonic alone (`key:c`). */
const songsInKey = into(['in_key'], SONG);

const KEYS: TableDef = {
  id: 'keys',
  title: 'Keys',
  singular: 'key',
  rows: { kind: 'key' },
  code: {
    files: [],
    note: 'Keys come from the songs’ charts: change a song’s key in its page editor.',
  },
  panel: 'code',
  columns: [
    title('Key', { type: 'title' }, derived),
    column(
      'modes',
      'Modes',
      connections([
        rollup('songs', 'via songs', songsInKey, out(['in_mode'], ['mode'])),
      ]),
      derived,
      'No song in this key has a mode.',
      {
        shown: true,
        help: 'How many of its songs are in each mode: "major 120 · minor 38".',
      },
    ),
    column(
      'songs',
      'Songs',
      connections([fact('songs', 'songs', songsInKey)]),
      derived,
      'No songs in this key.',
      { shown: true },
    ),
    column(
      'artists',
      'Artists',
      connections([rollup('songs', 'via songs', songsInKey, artistsOfSong)]),
      derived,
      'No artists: they come through its songs.',
      { shown: true },
    ),
    column(
      'genre',
      'Genre',
      connections([rollup('songs', 'via songs', songsInKey, genresOf)]),
      derived,
      'No genres: they come through its songs.',
      { shown: true },
    ),
    column(
      'progression',
      'Chord Progression',
      connections([
        rollup(
          'songs',
          'via songs',
          songsInKey,
          out(['uses_progression'], ['progression']),
        ),
      ]),
      derived,
      'No progressions: they come through its songs.',
      { shown: true },
    ),
    column(
      'year',
      'Year',
      years([yearsVia('songs', 'songs', songsInKey)]),
      derived,
      'No dated songs in this key.',
      { shown: true },
    ),
    // ── Opt-in ──
    column(
      'progressions',
      'Written in this key',
      connections([
        fact('progressions', 'progressions', into(['in_key'], ['progression'])),
      ]),
      derived,
      'No progression is written in this key.',
    ),
  ],
  defaultSort: { column: 'songs', dir: 'desc' },
  search: [{ from: 'label' }, { from: 'key' }],
  filters: withCommon([]),
  // "a mode filter narrows every count": pick minor, and every column counts
  // only the minor songs.
  narrow: { label: 'Mode', hop: out(['in_mode'], ['mode']) },
};

/* ── Chord Progression ───────────────────────────────────────────────── */

const songsOfProgression = into(['uses_progression'], SONG);

const PROGRESSIONS: TableDef = {
  id: 'progressions',
  title: 'Progressions',
  singular: 'progression',
  rows: { kind: 'progression' },
  contentKind: 'chord_progression',
  panel: 'record',
  create: 'page',
  columns: [
    title('Progression', { type: 'title', sublabel: 'shape' }, derived),
    column(
      'songs',
      'Songs',
      // The progression states its songs (`songIds`), not the songs it.
      connections([stated(songsOfProgression)], { unlinkedText: 'song' }),
      row('songIds[]'),
      'No songs linked. Where the source sheet named a song, it shows here to link.',
      { shown: true },
    ),
    column(
      'artists',
      'Artists',
      connections(
        [rollup('songs', 'via songs', songsOfProgression, artistsOfSong)],
        {
          unlinkedText: 'artist',
        },
      ),
      derived,
      'No artists: they come through the linked songs.',
      { shown: true },
    ),
    column(
      'genre',
      'Genre',
      connections([stated(genresOf)]),
      row('styles[]', { cell: toggles('progression-styles') }),
      'No styles listed.',
      { shown: true },
    ),
    column(
      'year',
      'Year',
      years([yearsVia('songs', 'songs', songsOfProgression)]),
      derived,
      'No dated song uses it.',
      { shown: true },
    ),
    // ── Opt-in ──
    column(
      'key',
      'Key',
      connections([
        rollup(
          'songs',
          'via songs',
          songsOfProgression,
          out(['in_key'], ['key']),
        ),
      ]),
      derived,
      'No keys: they come through its songs.',
      {
        help: 'The keys of the songs that use it; most progressions have none yet.',
      },
    ),
    column(
      'vibes',
      'Vibes',
      connections([stated(out(['has_vibe'], ['vibe']))]),
      row('vibes[]', { cell: toggles('vibes') }),
      'No vibes.',
    ),
    column(
      'complexity',
      'Complexity',
      field('complexity', 'text'),
      row('complexity', { cell: oneOf(COMPLEXITIES) }),
      'No complexity.',
      { width: 110 },
    ),
    // The chords are the progression: edited in the cell as chips, a write
    // setting the fields that follow from them too.
    column(
      'chords',
      'Chords',
      field('chords', 'list'),
      row('chords', {
        also: ['progression', 'chordCount', 'startingChord', 'startingDegree'],
        cell: { editor: 'chords' },
      }),
      'No chords.',
      { width: 240 },
    ),
    column(
      'startingDegree',
      'Starting degree',
      field('startingDegree', 'text'),
      derived,
      'No starting degree.',
      { width: 110 },
    ),
    column(
      'legacy',
      'Legacy text',
      field('song', 'text'),
      derived,
      'The source sheet named no song.',
      { help: 'The song as the source sheet wrote it, before it was linked.' },
    ),
  ],
  defaultSort: { column: 'songs', dir: 'desc' },
  search: [
    { from: 'label' },
    { from: 'key' },
    { from: 'field', path: 'song' },
    { from: 'field', path: 'artist' },
  ],
  filters: withCommon([
    gap('names-song-unlinked', 'Names a song, not linked', {
      type: 'all',
      rules: [{ type: 'field', path: 'song' }, missing('songs')],
    }),
    gap('no-songs', 'No songs linked', missing('songs')),
    gap('missing-genre', 'No styles', missing('genre')),
    gap('missing-vibes', 'No vibes', missing('vibes')),
    gap('missing-complexity', 'No complexity', missing('complexity')),
    gap('missing-chords', 'No chords', missing('chords')),
  ]),
};

/* ── Year: Years | Decades ───────────────────────────────────────────── */

const fromYear = (to: readonly EntityKind[]) => into(['from_year'], to);

/**
 * A year's columns, and a decade's through its years. The order is the one
 * the owner has seen: Songs · Artists · Events · Genre · Location · Records.
 */
const calendarColumns = (): ColumnDef[] => [
  column(
    'songs',
    'Songs',
    connections([fact('songs', 'songs', fromYear(SONG))]),
    derived,
    'No songs from then.',
    { shown: true },
  ),
  column(
    'artists',
    'Artists',
    connections([
      rollup('songs', 'via songs', fromYear(SONG), artistsOfSong),
      rollup('events', 'via events', fromYear(EVENT), out(['about'], ARTIST)),
    ]),
    derived,
    'No artists: they come through its songs and events.',
    { shown: true },
  ),
  column(
    'events',
    'Events',
    connections([fact('events', 'events', fromYear(EVENT))]),
    derived,
    'No globe events then.',
    { shown: true },
  ),
  column(
    'genre',
    'Genre',
    connections([
      rollup('songs', 'via songs', fromYear(SONG), genresOf),
      rollup('events', 'via events', fromYear(EVENT), genresOf),
    ]),
    derived,
    'No genres: they come through its songs and events.',
    { shown: true },
  ),
  column(
    'location',
    'Location',
    connections([
      rollup(
        'events',
        'via events',
        fromYear(EVENT),
        out(['took_place_in'], PLACE),
      ),
      rollup('songs', 'via songs', fromYear(SONG), out(['recorded_in'], PLACE)),
    ]),
    derived,
    'No places: they come through its events and songs.',
    { shown: true },
  ),
  column(
    'records',
    'Records',
    connections([fact('records', 'records', fromYear(RELEASE))]),
    derived,
    'No records from then.',
    { shown: true },
  ),
];

/** The Year category's opt-in columns, the same on years and decades. */
const calendarExtras = (): ColumnDef[] => [
  column(
    'born',
    'Born / Formed',
    connections([fact('born', 'born or formed', into(BORN_YEARS, ARTIST))]),
    derived,
    'No one born or formed then yet. Birth dates come with the import.',
  ),
  column(
    'labels',
    'Labels founded',
    connections([fact('labels', 'labels', fromYear(LABEL))]),
    derived,
    'No label founded then.',
  ),
  column(
    'studios',
    'Studios opened',
    connections([fact('studios', 'studios', fromYear(STUDIO))]),
    derived,
    'No studio opened then.',
  ),
  column(
    'era',
    'Era',
    connections([fact('era', 'era', out(['from_era'], ['era']))]),
    byCode(CODE_OWNERS.eras),
    'Before the first era.',
  ),
  column(
    'instruments',
    'Instruments',
    connections([
      rollup('songs', 'via songs', fromYear(SONG), instrumentsOnSong),
    ]),
    derived,
    'No instruments: they come through its songs’ credits.',
  ),
];

const YEARS: TableDef = {
  id: 'years',
  title: 'Years',
  singular: 'year',
  rows: { kind: 'year' },
  code: {
    files: [CODE_OWNERS.calendar],
    note: 'Years come from the dates on songs, records and events; the calendar is code.',
  },
  panel: 'code',
  columns: [
    title(
      'Year',
      { type: 'title', sublabel: 'calendar' },
      byCode(CODE_OWNERS.calendar),
      {
        width: 140,
      },
    ),
    ...calendarColumns(),
    ...calendarExtras(),
  ],
  defaultSort: { column: 'title', dir: 'asc' },
  search: [{ from: 'label' }],
  filters: withCommon([]),
};

const DECADES: TableDef = {
  id: 'decades',
  title: 'Decades',
  singular: 'decade',
  // A decade counts through its years: its Songs are its years' songs.
  rows: { kind: 'decade', expand: 'decadeYears' },
  code: {
    files: [CODE_OWNERS.calendar],
    note: 'Decades are the calendar’s: every year in use walks up to its decade.',
  },
  panel: 'code',
  columns: [
    title(
      'Decade',
      { type: 'title', sublabel: 'calendar' },
      byCode(CODE_OWNERS.calendar),
      {
        width: 140,
      },
    ),
    ...calendarColumns(),
    column(
      'active',
      'Active',
      connections([fact('active', 'active', into(['active_in'], ARTIST))], {
        noExpand: true,
      }),
      derived,
      'No artist is known to be active then yet. Years active come with the import.',
      { shown: true },
    ),
    ...calendarExtras(),
    column(
      'sceneDecades',
      'Scene decades',
      connections(
        [fact('scenes', 'scenes', into(['scene_active_in'], PLACE))],
        {
          noExpand: true,
        },
      ),
      derived,
      'No city lists this as a scene decade.',
      { help: 'Cities whose scene was active in this decade.' },
    ),
    column(
      'years',
      'Years',
      connections([fact('years', 'years', into(['in_decade'], YEAR))], {
        noExpand: true,
      }),
      byCode(CODE_OWNERS.calendar),
      'No year of it is in use.',
    ),
  ],
  defaultSort: { column: 'title', dir: 'asc' },
  search: [{ from: 'label' }],
  filters: withCommon([]),
};

/* ── The registry ────────────────────────────────────────────────────── */

/** Every table, by id. */
export const TABLES: Readonly<Record<TableId, TableDef>> = {
  artists: ARTISTS,
  songs: SONGS,
  genres: GENRES,
  locations: LOCATIONS,
  instruments: INSTRUMENTS,
  events: EVENTS,
  records: RECORDS,
  studios: STUDIOS,
  labels: LABELS,
  keys: KEYS,
  progressions: PROGRESSIONS,
  years: YEARS,
  decades: DECADES,
};

/** A table's definition. */
export const tableDef = (id: TableId): TableDef => TABLES[id];

/**
 * The columns a table shows until the Columns menu says otherwise, title
 * first.
 */
export const defaultColumns = (def: TableDef): readonly ColumnDef[] =>
  def.columns.filter((c) => c.defaultVisible);

/**
 * The columns the owner listed for a table, in his order — empty for a
 * category he left as "Etc.".
 */
export const ownerColumns = (def: TableDef): readonly ColumnDef[] =>
  def.columns.filter((c) => c.owner);

/**
 * The columns a table's row states itself: what the coverage strip counts
 * ("Born 0/907 · City 0/907"), title aside.
 */
export const storedColumns = (def: TableDef): readonly ColumnDef[] =>
  def.columns.filter((c) => c.edit.by === 'row' && c.source.type !== 'title');
