import { songIdForEvent } from '@/components/atlas/data/songEventAliases';
import { artistSlug } from '@/content/graph/slugs';
import type { EntityKind } from '@/content/graph/types';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';

/**
 * The Table's ids: which tables exist, how the bar groups them into the
 * owner's ten categories, and which table and row a content kind, a graph
 * node or an app page belongs to.
 *
 * Route-free on purpose. The Table's model (`model/*`) is pure — no React,
 * no router — and needs these ids, while `tablePaths.ts` builds hrefs from
 * the route constants, which bring react-router with them. So the ids live
 * here and `tablePaths.ts` re-exports them.
 *
 * Safe to load eagerly too: the sidebar, the route tree and the content
 * area's bar load with the console's routes, which ship in the bundle every
 * student downloads. This file imports only the import-free slug helpers, the
 * import-free song event aliases and types (eagerBoundary.test.ts holds this).
 */

/**
 * Every table the Table can show, one per URL. Most categories are one table;
 * Recording is three (records, studios, labels) and Year is two (years,
 * decades), each a view of its own with its own columns.
 */
export const TABLE_IDS = [
  'artists',
  'songs',
  'genres',
  'locations',
  'instruments',
  'events',
  'records',
  'studios',
  'labels',
  'keys',
  'progressions',
  'years',
  'decades',
] as const;

export type TableId = (typeof TABLE_IDS)[number];

/** Is this URL segment one of the tables? */
export const isTableId = (value: string | undefined): value is TableId =>
  (TABLE_IDS as readonly string[]).includes(value ?? '');

/** One of the bar's category pills. */
export type TableCategory = {
  /** The pill's label, in the owner's wording. */
  label: string;
  /** The tables the category spans; its pill is active on any of them. */
  tables: readonly TableId[];
  /** Where the pill goes. */
  defaultTable: TableId;
  /**
   * The sub-view control's labels, for a category that spans more than one
   * table (Records | Studios | Labels, Years | Decades).
   */
  views?: readonly { table: TableId; label: string }[];
};

/**
 * The bar's ten pills, in the owner's order and wording (29 Sep 2026):
 * "Artist, Songs, Genre, Location, Instruments, Events, Recording, Key,
 * Chord Progression, Year".
 */
export const CATEGORY_NAV: readonly TableCategory[] = [
  { label: 'Artist', tables: ['artists'], defaultTable: 'artists' },
  { label: 'Songs', tables: ['songs'], defaultTable: 'songs' },
  { label: 'Genre', tables: ['genres'], defaultTable: 'genres' },
  { label: 'Location', tables: ['locations'], defaultTable: 'locations' },
  {
    label: 'Instruments',
    tables: ['instruments'],
    defaultTable: 'instruments',
  },
  { label: 'Events', tables: ['events'], defaultTable: 'events' },
  {
    label: 'Recording',
    tables: ['records', 'studios', 'labels'],
    defaultTable: 'records',
    views: [
      { table: 'records', label: 'Records' },
      { table: 'studios', label: 'Studios' },
      { table: 'labels', label: 'Labels' },
    ],
  },
  { label: 'Key', tables: ['keys'], defaultTable: 'keys' },
  {
    label: 'Chord Progression',
    tables: ['progressions'],
    defaultTable: 'progressions',
  },
  {
    label: 'Year',
    tables: ['years', 'decades'],
    defaultTable: 'years',
    views: [
      { table: 'years', label: 'Years' },
      { table: 'decades', label: 'Decades' },
    ],
  },
];

/** The category a table is in: Recording for studios, Year for decades. */
export const categoryOf = (table: TableId): TableCategory =>
  // Every id is in exactly one category (tablePaths.test.ts), so one is found.
  CATEGORY_NAV.find((category) => category.tables.includes(table))!;

/**
 * The table that holds each content kind's items. The other three kinds —
 * lessons, fundamentals and artist locations — belong to no category and
 * stay in the content area's "Other records" list.
 */
export const TABLE_FOR_CONTENT_KIND: Readonly<
  Partial<Record<ContentKind, TableId>>
> = {
  song: 'songs',
  globe_event: 'events',
  globe_city: 'locations',
  artist: 'artists',
  release: 'records',
  studio: 'studios',
  label: 'labels',
  chord_progression: 'progressions',
};

/**
 * The table whose rows are each kind of graph node. A subgenre is a row of
 * the genres table (shown with "Show subgenres"); the kinds with no table —
 * vibes, modes, eras, scenes, Teach days, pathways — open in the mind map
 * instead.
 */
export const TABLE_FOR_NODE_KIND: Readonly<
  Partial<Record<EntityKind, TableId>>
> = {
  artist: 'artists',
  song: 'songs',
  genre: 'genres',
  subgenre: 'genres',
  place: 'locations',
  instrument: 'instruments',
  event: 'events',
  release: 'records',
  studio: 'studios',
  label: 'labels',
  key: 'keys',
  progression: 'progressions',
  year: 'years',
  decade: 'decades',
};

/** A table and, when one is open, its row. */
export type TableTarget = { table: TableId; row?: string };

/**
 * The row a graph node is, by its id (`artist:toto`, `year:1982`). A row's
 * key is its node's slug, so the URL reads like the id. A song's own globe
 * event (`event:song-africa`) is the song — the graph folds the two into one
 * node — so it opens the song's row, as a second recording's event opens the
 * row of the song it names (`songEventAliases.ts`). Null for a kind no table
 * holds, and for anything that is not an id.
 */
export function tableRowForNode(id: string): Required<TableTarget> | null {
  const at = id.indexOf(':');
  if (at < 1) return null;
  const kind = id.slice(0, at);
  const slug = id.slice(at + 1);
  if (!slug || slug.includes(':')) return null;
  const song = kind === 'event' ? songIdForEvent(slug) : null;
  if (song !== null) return song ? { table: 'songs', row: song } : null;
  const table = TABLE_FOR_NODE_KIND[kind as EntityKind];
  return table ? { table, row: slug } : null;
}

/**
 * The node kind a content kind's items define, for the kinds a table holds:
 * the other way round from `TABLE_FOR_NODE_KIND`, through the node, so an
 * item's row and its node's row are always the same row.
 */
const NODE_KIND_FOR_CONTENT_KIND: Readonly<
  Partial<Record<ContentKind, EntityKind>>
> = {
  song: 'song',
  globe_event: 'event',
  globe_city: 'place',
  artist: 'artist',
  release: 'release',
  studio: 'studio',
  label: 'label',
  chord_progression: 'progression',
};

/**
 * The row a content item is, by its kind and slug (`artist`, `toto` →
 * artists/toto). A song's own globe event is the song's row, as its node
 * is. Null for a kind no table holds (lessons, fundamentals, artist
 * locations), which stay under "Other records".
 */
export function tableRowForItem(
  kind: ContentKind,
  slug: string,
): Required<TableTarget> | null {
  // Own keys only, so a kind spelt `constructor` is not a node kind.
  const node = Object.prototype.hasOwnProperty.call(
    NODE_KIND_FOR_CONTENT_KIND,
    kind,
  )
    ? NODE_KIND_FOR_CONTENT_KIND[kind]
    : undefined;
  return node ? tableRowForNode(`${node}:${slug}`) : null;
}

/**
 * The node a row is, from the URL alone — for a focus in Cortex's graph
 * before the table has loaded. Null for a genres row: genres and subgenres
 * share that table and a slug does not say which it is (the model knows).
 * Only the tests use it since the section bar's old "Mind map" link, which
 * opened on the open row, became the Cortex pill (1 Oct 2026); a row's own
 * "Open in Cortex" reads its node from the model instead.
 */
export function nodeIdForRow(table: TableId, row: string): string | null {
  if (table === 'genres' || !row) return null;
  const kind = (Object.keys(TABLE_FOR_NODE_KIND) as EntityKind[]).find(
    (k) => TABLE_FOR_NODE_KIND[k] === table,
  );
  return kind ? `${kind}:${row}` : null;
}

/**
 * The table that holds what an app page shows, and its row when the page is
 * about one thing: a song page is its song's row, the globe with an event,
 * an artist or a city open is that row, the song list is the songs table,
 * the rest of the globe is the events table.
 *
 * Null for a page no table holds. The curriculum is one: lessons are not a
 * category, so its content stays under the content area's "Other records".
 */
export function tableForAppPage(
  appPath: string,
  search: URLSearchParams | string = '',
): TableTarget | null {
  const song = /^\/songs\/([^/]+)$/.exec(appPath);
  if (song && song[1] !== 'setlists') return { table: 'songs', row: song[1] };
  if (/^\/(learn|songs)(\/|$)/.test(appPath)) return { table: 'songs' };
  if (!/^\/atlas(\/|$)/.test(appPath)) return null;

  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;
  if (appPath === '/atlas/globe') {
    const event = params.get('event');
    if (event) return tableRowForNode(`event:${event}`) ?? { table: 'events' };
    const artist = params.get('artist');
    // The globe names an artist as it is written; the row is its slug.
    if (artist && artistSlug(artist)) {
      return { table: 'artists', row: artistSlug(artist) };
    }
    const place = params.get('place');
    if (place?.startsWith('city:') && place.length > 'city:'.length) {
      return { table: 'locations', row: place.slice('city:'.length) };
    }
  }
  return { table: 'events' };
}
