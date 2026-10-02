import { getPath, setPath } from '@/content/bodyPaths';
import type { Graph } from '@/content/graph/deriveGraph';
import { SONG_TAG_TO_GENRE } from '@/content/graph/genres';
import { normalizeArtistName } from '@/content/graph/slugs';
import type { EntityId, EntityKind } from '@/content/graph/types';
import type { CreditRole } from '@/curriculum/types/songLibrary';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import {
  influenceRefusal,
  memberRefusal,
  parentLabelRefusal,
} from '../../content/recordEditors/refusals';
import type { TableId } from '../tableIds';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Link… and Unlink — writing a connection on the item that owns it
 * ══════════════════════════════════════════════════════════════════════════
 *
 * One owner per fact (decision 4): an artist's songs are stated by the songs,
 * the events about them by the events, a record's songs by the songs, a
 * studio's songs by their sessions, a label's records by the records, a
 * group's members by the group. The Table shows those columns on the artist,
 * the record, the studio, the place, and a one-step cell there offers
 * **Link…**, which writes the fact where it lives, and **Unlink**, which takes
 * it out again (design §3.4, `ConfirmConnectionDialog`). This file says, for
 * each such column, which item and field that is, what the field becomes
 * either way, and what undoes it — pure, so the dialog, the grid's cells and
 * their tests share one answer.
 *
 * Six shapes of field:
 *
 *  - `ids` — a list of ids on the owner (an event's `artistIds`, a
 *    progression's `songIds`, an artist's `labelIds`). A link writes the
 *    whole list: on an event that stores none yet, the graph's guesses stand
 *    in until one is stored (decision 5), so storing one artist alone would
 *    drop every other guess. The dialog lists them to keep or leave out, and
 *    an unlink there has to go through it as well.
 *  - `one` — one id (a song's `session.studioId`, a record's `labelId`, an
 *    artist's `basedInPlaceId`), with the display text that follows it where
 *    the schema has one (C20: filled from the record's name when empty, never
 *    overwritten; cleared with the id while it still says the record's name,
 *    because the graph reads the text as a guess once the id is gone).
 *  - `song-artist` — who a song is by: its lead act (`origin.artistGlobeId`)
 *    or a credit (`credits[]`), linking a credit that already names the
 *    artist rather than adding a second. An unlink says which of those ways
 *    goes.
 *  - `releases` — a song's records (`releases[]`, song v2), one row each.
 *  - `refs` — a list of objects, each naming the target by `key` (a group's
 *    `members[].artistId`, an artist's `influencedBy[].artistId`). A link
 *    adds a bare entry; the rest of an entry (years, instruments, source) is
 *    the row panel's to fill.
 *  - `genre-tags` — a song's genres: a taught genre is one of the song's
 *    twelve `genreTags`, a subgenre one of its `subgenreIds` (song v2); a
 *    genre the tags do not spell is reached only through its subgenres.
 *
 * Most links write the row onto an item the author picks (Artist → a song).
 * One goes the other way (`picks`): a song's Label, when the song is on a
 * record, is that record's `labelId` — the song names the record, and the
 * author picks the label.
 */

export type LinkId =
  | 'artist-song'
  | 'artist-event'
  | 'song-event'
  | 'song-progression'
  | 'record-song'
  | 'studio-song'
  | 'label-record'
  | 'song-label'
  | 'artist-group'
  | 'artist-influenced'
  | 'artist-record'
  | 'place-artist'
  | 'place-song'
  | 'place-event'
  | 'place-studio'
  | 'place-label'
  | 'label-artist'
  | 'label-imprint'
  | 'label-song'
  | 'genre-artist'
  | 'instrument-artist'
  | 'genre-song';

export type LinkShape =
  | 'ids'
  | 'one'
  | 'song-artist'
  | 'releases'
  | 'refs'
  | 'genre-tags';

/** A content body, as the API stores it. */
export type Body = Readonly<Record<string, unknown>>;

/** A body level a field needs before the server takes it. */
export interface LinkNeeds {
  level: number;
  what: string;
}

export interface LinkSpec {
  id: LinkId;
  /** The table and column that offer it. */
  table: TableId;
  column: string;
  /**
   * The column's part the owner states (`ConnectionPart.id`): its guesses
   * are what Confirm stores, its stated entries what is linked already and
   * what Unlink can take out. A column's other parts (a song's influence
   * arcs, a genre's artists via songs) are someone else's.
   */
  part?: string;
  /** The item that states the fact: its content kind and its node kind. */
  owner: { kind: ContentKind; node: EntityKind };
  /**
   * The field written, as a dot path on the owner's body. For `refs`, the
   * list; its entries name the target by `key`. For `genre-tags`, the taught
   * tags' list (`genreTagField` gives a subgenre's).
   */
  path: string;
  /** The node kind the field's ids name: the row's, or what `picks` picks. */
  target: EntityKind;
  /**
   * Other node kinds the same ids can name, when the field holds either (an
   * artist's `genreIds`: genres and subgenres): for labelling what it holds.
   */
  targets?: readonly EntityKind[];
  shape: LinkShape;
  /** `refs`: the field of each entry that names the target (`artistId`). */
  key?: string;
  /**
   * The value is picked, not the row (`song-label`: the song's record gets a
   * label): the node kind to pick from. The owner is then reached from the
   * row, never picked.
   */
  picks?: EntityKind;
  /** A display text that follows the id (C20), as a dot path. */
  text?: string;
  /**
   * The owner's text the graph guesses the connection from while the field
   * says nothing (a song's billing line for its lead act, an event's city
   * for its place): after an unlink, a text that still names the row brings
   * it back as a guess, which the dialog says.
   */
  guessedFrom?: string;
  /**
   * Absent means the graph infers it (an `evt-` event's artists and songs):
   * the guesses are the field until one is stored.
   */
  inferred?: boolean;
  /**
   * The owner's body level the field needs: the event body v2's ids, song
   * v2's session ids and records. Below it the server refuses the save.
   */
  needs?: LinkNeeds;
  /**
   * The edge the link adds, which may not close a loop (REF_PATHS
   * `acyclic`): a group among its own members, a label under its own
   * imprint. `linkRefusal` walks the graph before anything is written.
   */
  acyclic?: 'member_of' | 'imprint_of';
  /**
   * A `one` field the owner holds for one row at a time: linking it here
   * takes it from wherever it is now, which the editor says ("Moves Africa
   * from Sunset Sound") before it writes.
   */
  moves?: true;
  /** What the dialog calls the owner: "song", "event". */
  noun: string;
}

const EVENT_V2: LinkNeeds = { level: 2, what: 'the event body v2' };
const SONG_V2: LinkNeeds = { level: 2, what: 'song schema v2' };

export const LINKS: readonly LinkSpec[] = [
  {
    id: 'artist-song',
    table: 'artists',
    column: 'songs',
    part: 'songs',
    owner: { kind: 'song', node: 'song' },
    path: 'origin.artistGlobeId',
    target: 'artist',
    shape: 'song-artist',
    guessedFrom: 'artist',
    noun: 'song',
  },
  {
    id: 'artist-event',
    table: 'artists',
    column: 'events',
    part: 'events',
    owner: { kind: 'globe_event', node: 'event' },
    path: 'artistIds',
    target: 'artist',
    shape: 'ids',
    inferred: true,
    needs: EVENT_V2,
    noun: 'event',
  },
  {
    id: 'song-event',
    table: 'songs',
    column: 'events',
    part: 'events',
    owner: { kind: 'globe_event', node: 'event' },
    path: 'songIds',
    target: 'song',
    shape: 'ids',
    inferred: true,
    needs: EVENT_V2,
    noun: 'event',
  },
  {
    id: 'song-progression',
    table: 'songs',
    column: 'progression',
    part: 'progressions',
    owner: { kind: 'chord_progression', node: 'progression' },
    path: 'songIds',
    target: 'song',
    shape: 'ids',
    noun: 'progression',
  },
  {
    id: 'record-song',
    table: 'records',
    column: 'songs',
    part: 'songs',
    owner: { kind: 'song', node: 'song' },
    path: 'releases',
    target: 'release',
    shape: 'releases',
    needs: SONG_V2,
    noun: 'song',
  },
  {
    id: 'studio-song',
    table: 'studios',
    column: 'songs',
    part: 'songs',
    owner: { kind: 'song', node: 'song' },
    path: 'session.studioId',
    target: 'studio',
    shape: 'one',
    text: 'session.studio',
    moves: true,
    needs: SONG_V2,
    noun: 'song',
  },
  {
    id: 'label-record',
    table: 'labels',
    column: 'records',
    part: 'records',
    owner: { kind: 'release', node: 'release' },
    path: 'labelId',
    target: 'label',
    shape: 'one',
    moves: true,
    noun: 'record',
  },
  {
    id: 'song-label',
    table: 'songs',
    column: 'label',
    owner: { kind: 'release', node: 'release' },
    path: 'labelId',
    target: 'label',
    shape: 'one',
    picks: 'label',
    noun: 'record',
  },
  // ── Artists ──
  {
    id: 'artist-group',
    table: 'artists',
    column: 'memberOf',
    part: 'groups',
    owner: { kind: 'artist', node: 'artist' },
    path: 'members',
    key: 'artistId',
    target: 'artist',
    shape: 'refs',
    acyclic: 'member_of',
    noun: 'group',
  },
  {
    id: 'artist-influenced',
    table: 'artists',
    column: 'influenced',
    part: 'artists',
    owner: { kind: 'artist', node: 'artist' },
    path: 'influencedBy',
    key: 'artistId',
    target: 'artist',
    shape: 'refs',
    noun: 'artist',
  },
  {
    id: 'artist-record',
    table: 'artists',
    column: 'records',
    part: 'records',
    owner: { kind: 'release', node: 'release' },
    path: 'artistIds',
    target: 'artist',
    shape: 'ids',
    noun: 'record',
  },
  // ── Locations ──
  {
    id: 'place-artist',
    table: 'locations',
    column: 'artists',
    part: 'based',
    owner: { kind: 'artist', node: 'artist' },
    path: 'basedInPlaceId',
    target: 'place',
    shape: 'one',
    moves: true,
    noun: 'artist',
  },
  {
    id: 'place-song',
    table: 'locations',
    column: 'songs',
    part: 'recorded',
    owner: { kind: 'song', node: 'song' },
    path: 'session.placeId',
    target: 'place',
    shape: 'one',
    text: 'session.city',
    moves: true,
    needs: SONG_V2,
    noun: 'song',
  },
  {
    id: 'place-event',
    table: 'locations',
    column: 'events',
    part: 'events',
    owner: { kind: 'globe_event', node: 'event' },
    path: 'placeId',
    target: 'place',
    shape: 'one',
    // The pin stays where `location` puts it; the city is what the graph
    // places an event by until it stores a place.
    guessedFrom: 'location.city',
    moves: true,
    needs: EVENT_V2,
    noun: 'event',
  },
  {
    id: 'place-studio',
    table: 'locations',
    column: 'studios',
    part: 'studios',
    owner: { kind: 'studio', node: 'studio' },
    path: 'placeId',
    target: 'place',
    shape: 'one',
    moves: true,
    noun: 'studio',
  },
  {
    id: 'place-label',
    table: 'locations',
    column: 'labels',
    part: 'labels',
    owner: { kind: 'label', node: 'label' },
    path: 'placeId',
    target: 'place',
    shape: 'one',
    moves: true,
    noun: 'label',
  },
  // ── Labels ──
  {
    id: 'label-artist',
    table: 'labels',
    column: 'artists',
    part: 'signed',
    owner: { kind: 'artist', node: 'artist' },
    path: 'labelIds',
    target: 'label',
    shape: 'ids',
    noun: 'artist',
  },
  {
    id: 'label-imprint',
    table: 'labels',
    column: 'imprints',
    part: 'imprints',
    owner: { kind: 'label', node: 'label' },
    path: 'parentLabelId',
    target: 'label',
    shape: 'one',
    acyclic: 'imprint_of',
    moves: true,
    noun: 'label',
  },
  {
    id: 'label-song',
    table: 'labels',
    column: 'songs',
    part: 'songs',
    owner: { kind: 'song', node: 'song' },
    path: 'session.labelId',
    target: 'label',
    shape: 'one',
    text: 'session.label',
    moves: true,
    needs: SONG_V2,
    noun: 'song',
  },
  // ── Genres and instruments: the artist or song states them ──
  {
    id: 'genre-artist',
    table: 'genres',
    column: 'artists',
    part: 'stated',
    owner: { kind: 'artist', node: 'artist' },
    path: 'genreIds',
    target: 'genre',
    targets: ['subgenre'],
    shape: 'ids',
    noun: 'artist',
  },
  {
    // The part the registry splits out of the column: what the artist
    // states (`instrumentIds[]`), apart from what they played on records or
    // in a group, which stays read-only.
    id: 'instrument-artist',
    table: 'instruments',
    column: 'artists',
    part: 'stated',
    owner: { kind: 'artist', node: 'artist' },
    path: 'instrumentIds',
    target: 'instrument',
    shape: 'ids',
    noun: 'artist',
  },
  {
    id: 'genre-song',
    table: 'genres',
    column: 'songs',
    part: 'songs',
    owner: { kind: 'song', node: 'song' },
    path: 'genreTags',
    target: 'genre',
    targets: ['subgenre'],
    shape: 'genre-tags',
    noun: 'song',
  },
];

/**
 * A link the Table will offer once what it writes can be saved, and why not
 * yet: declared here so the column's cell and panel can say so, and so the
 * coverage test counts it as answered rather than forgotten.
 */
export interface WaitingLink {
  id: 'genre-subgenre';
  table: TableId;
  column: string;
  part: string;
  /** The item that will state it, as a node kind: it has no content kind yet. */
  owner: EntityKind;
  path: string;
  shape: LinkShape;
  moves?: true;
  /** Why it is not offered yet. */
  waiting: string;
  /** Why it will never be unlinked, only moved. */
  noUnlink?: string;
}

export const WAITING_LINKS: readonly WaitingLink[] = [
  {
    id: 'genre-subgenre',
    table: 'genres',
    column: 'subgenres',
    part: 'subgenres',
    owner: 'subgenre',
    path: 'parent',
    shape: 'one',
    moves: true,
    waiting:
      'Waits for the genre and subgenre kinds: until the console saves the vocabulary, a subgenre’s parent is edited in src/content/vocabulary/subgenres.json.',
    noUnlink:
      'Every subgenre needs a parent: link it to another genre to move it.',
  },
];

/** The Link… a table's column offers, if any. */
export const linkFor = (table: TableId, column: string): LinkSpec | undefined =>
  LINKS.find((link) => link.table === table && link.column === column);

/** The link a column will offer once it can be saved, and why not yet. */
export const waitingLinkFor = (
  table: TableId,
  column: string,
): WaitingLink | undefined =>
  WAITING_LINKS.find((link) => link.table === table && link.column === column);

/**
 * The links that write one part of a column: its chips of that part are
 * what Unlink can take out and Confirm can store. Empty for a part stated
 * elsewhere (song pins, rollups, arcs), whose chips are read-only here.
 */
export const linksForPart = (
  table: TableId,
  column: string,
  part: string,
): readonly LinkSpec[] =>
  LINKS.filter(
    (link) =>
      link.table === table && link.column === column && link.part === part,
  );

/**
 * The path an `owner` column names for the spec (`ColumnEdit.path`): a
 * list's `[]`, a ref list's `[].key`, a one-value field as it is.
 */
export function editPathOf(spec: LinkSpec): string {
  switch (spec.shape) {
    case 'ids':
    case 'releases':
    case 'genre-tags':
      return `${spec.path}[]`;
    case 'refs':
      return `${spec.path}[].${spec.key ?? ''}`;
    case 'one':
    case 'song-artist':
      return spec.path;
  }
}

/* ── Reading the field ───────────────────────────────────────────────── */

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v !== '')
    : [];

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (v): v is Record<string, unknown> =>
          Boolean(v) && typeof v === 'object' && !Array.isArray(v),
      )
    : [];

/** The id an entry of a `refs` list names. */
const keyOf = (spec: LinkSpec, entry: Record<string, unknown>) =>
  text(entry[spec.key ?? '']);

/** Is the field there at all (absent is "inferred" for an event's ids)? */
export const isStated = (spec: LinkSpec, body: Body): boolean =>
  getPath(body, spec.path) !== undefined;

/**
 * The ids a list field stores, in order; empty when absent. An `ids` list's
 * strings, a `refs` list's keys, a `releases` list's record ids.
 */
export function storedIds(spec: LinkSpec, body: Body): string[] {
  const value = getPath(body, spec.path);
  switch (spec.shape) {
    case 'refs':
      return records(value)
        .map((entry) => keyOf(spec, entry))
        .filter((id): id is string => !!id);
    case 'releases':
      return records(value)
        .map((entry) => text(entry.releaseId))
        .filter((id): id is string => !!id);
    default:
      return strings(value);
  }
}

/** The id a `one` field (or a lead act) holds. */
export const storedId = (spec: LinkSpec, body: Body): string | undefined =>
  text(getPath(body, spec.path));

/** Which level of the genre vocabulary a genre row is. */
export type GenreLevel = 'genre' | 'subgenre';

/**
 * Where a song states a genre, and how it spells it: a taught genre is one
 * of its `genreTags` (the tag that maps to it), a subgenre one of its
 * `subgenreIds` (song v2). Null for a genre no tag spells — Classical, the
 * regional umbrellas — which songs reach only through its subgenres.
 */
export function genreTagField(
  level: GenreLevel,
  id: string,
): { path: 'genreTags' | 'subgenreIds'; value: string } | null {
  if (level === 'subgenre') return { path: 'subgenreIds', value: id };
  const tag = Object.keys(SONG_TAG_TO_GENRE).find(
    (key) => SONG_TAG_TO_GENRE[key] === id,
  );
  return tag ? { path: 'genreTags', value: tag } : null;
}

/** The genre level of a row's node, for a `genre-tags` link. */
export const levelOf = (node: EntityId): GenreLevel =>
  node.startsWith('subgenre:') ? 'subgenre' : 'genre';

/**
 * The body level the field needs for this row: a subgenre is stated on a
 * song by `subgenreIds`, which song v2 brings, where a taught genre's tag is
 * there already.
 */
export function needsOf(
  spec: LinkSpec,
  level: GenreLevel = 'genre',
): LinkNeeds | undefined {
  if (spec.shape === 'genre-tags' && level === 'subgenre') return SONG_V2;
  return spec.needs;
}

/**
 * What the field waits for on a server whose owner kind is at `version`, or
 * undefined once it is saved there like any other field.
 */
export const waitsFor = (
  spec: LinkSpec,
  version: number,
  level?: GenreLevel,
): LinkNeeds | undefined => {
  const needs = needsOf(spec, level);
  return needs && version < needs.level ? needs : undefined;
};

/**
 * The paths whose values a link rests on: when any has changed between what
 * the dialog showed and what is stored at the moment of the write, the write
 * is not made (the precondition, as a bulk accept's). They are also what an
 * undo puts back (`inverse`).
 */
export const watchedPaths = (spec: LinkSpec): readonly string[] => {
  switch (spec.shape) {
    case 'ids':
    case 'releases':
    case 'refs':
      return [spec.path];
    case 'one':
      return spec.text ? [spec.path, spec.text] : [spec.path];
    case 'song-artist':
      return ['origin.artistGlobeId', 'credits'];
    case 'genre-tags':
      return ['genreTags', 'subgenreIds'];
  }
};

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The paths a link rests on that say something else in `now` than in `seen`. */
export const changedSince = (spec: LinkSpec, seen: Body, now: Body): string[] =>
  watchedPaths(spec).filter(
    (path) => !same(getPath(seen, path), getPath(now, path)),
  );

/* ── Writing a path away ─────────────────────────────────────────────── */

/**
 * The body without the value at a dot path, as a copy. An object the
 * removal leaves empty goes too (a session that held only its studio, an
 * origin that held only its lead act), so an unlink undoes a link that
 * created it rather than leaving `session: {}` behind.
 */
export function unsetPath<T extends Record<string, unknown>>(
  body: T,
  path: string,
): T {
  const [head, ...rest] = path.split('.');
  if (!Object.prototype.hasOwnProperty.call(body, head)) return body;
  const copy = { ...body } as Record<string, unknown>;
  if (rest.length === 0) {
    delete copy[head];
    return copy as T;
  }
  const child = body[head];
  if (!child || typeof child !== 'object' || Array.isArray(child)) return body;
  const next = unsetPath(child as Record<string, unknown>, rest.join('.'));
  if (next === child) return body;
  if (Object.keys(next).length === 0) delete copy[head];
  else copy[head] = next;
  return copy as T;
}

/** A value written at a path, or taken away when it is undefined. */
const writePath = <T extends Record<string, unknown>>(
  body: T,
  path: string,
  value: unknown,
): T =>
  value === undefined ? unsetPath(body, path) : setPath(body, path, value);

/* ── What the field becomes: a link ──────────────────────────────────── */

/** A credit a song-artist link writes or links. */
export interface CreditChoice {
  role: CreditRole;
  /**
   * An existing credit that names the artist without linking them: its
   * index, to link it rather than add a second credit.
   */
  index?: number;
}

/**
 * What the author chose to write:
 *
 *  - `ids` — the whole list, in order (the row among it, or for an unlink,
 *    left out of it);
 *  - `one` — the id, with its record's name for the text that follows it;
 *  - `lead` — the song's lead act; `credit` — a credit, new or linked;
 *  - `release` — one more record for the song;
 *  - `ref` — one more entry naming the row (`refs`);
 *  - `genre` — the row, a genre or a subgenre, on a song (`genre-tags`).
 */
export type LinkChoice =
  | { as: 'ids'; ids: readonly string[] }
  | { as: 'one'; id: string; name?: string; previousName?: string }
  | { as: 'lead'; id: string }
  | { as: 'credit'; id: string; name: string; credit: CreditChoice }
  | { as: 'release'; id: string }
  | { as: 'ref'; id: string }
  | { as: 'genre'; id: string; level: GenreLevel };

/**
 * The owner's body with the link written: nothing else in it changes. Pure;
 * never mutates `body`. A link that is there already gives the body back as
 * it was (a copy).
 */
export function applyLink(
  spec: LinkSpec,
  body: Body,
  choice: LinkChoice,
): Record<string, unknown> {
  const base = { ...body } as Record<string, unknown>;
  switch (choice.as) {
    case 'ids':
      return setPath(base, spec.path, [...new Set(choice.ids)]);
    case 'one': {
      let next = setPath(base, spec.path, choice.id);
      if (spec.text && choice.name) {
        // C20: the text follows the record while it is the record's own —
        // empty, or the name of the record linked before.
        const current = text(getPath(body, spec.text));
        const follows =
          !current ||
          (choice.previousName !== undefined &&
            current === choice.previousName.trim());
        if (follows) next = setPath(next, spec.text, choice.name);
      }
      return next;
    }
    case 'lead':
      return setPath(base, 'origin.artistGlobeId', choice.id);
    case 'credit': {
      const credits = records(body.credits);
      if (choice.credit.index !== undefined && credits[choice.credit.index]) {
        return {
          ...base,
          credits: credits.map((credit, n) =>
            n === choice.credit.index
              ? { ...credit, artistGlobeId: choice.id }
              : credit,
          ),
        };
      }
      return {
        ...base,
        credits: [
          ...credits,
          {
            name: choice.name,
            role: choice.credit.role,
            artistGlobeId: choice.id,
          },
        ],
      };
    }
    case 'release': {
      const releases = records(body.releases);
      if (releases.some((r) => r.releaseId === choice.id)) return base;
      return { ...base, releases: [...releases, { releaseId: choice.id }] };
    }
    case 'ref': {
      const list = records(getPath(body, spec.path));
      if (list.some((entry) => keyOf(spec, entry) === choice.id)) return base;
      return setPath(base, spec.path, [
        ...list,
        { [spec.key ?? 'id']: choice.id },
      ]);
    }
    case 'genre': {
      const field = genreTagField(choice.level, choice.id);
      if (!field) return base;
      const list = strings(getPath(body, field.path));
      if (list.includes(field.value)) return base;
      return setPath(base, field.path, [...list, field.value]);
    }
  }
}

/**
 * Is the row already linked there, so nothing needs writing (or, for an
 * unlink, something to take out)? For a picked value (`song-label`),
 * whether the owner holds it; for a genre row, at its level.
 */
export function alreadyLinked(
  spec: LinkSpec,
  body: Body,
  id: string,
  level: GenreLevel = 'genre',
): boolean {
  switch (spec.shape) {
    case 'ids':
      return isStated(spec, body) && storedIds(spec, body).includes(id);
    case 'one':
      return storedId(spec, body) === id;
    case 'releases':
    case 'refs':
      return storedIds(spec, body).includes(id);
    case 'song-artist':
      return (
        storedId(spec, body) === id ||
        records(body.credits).some((c) => text(c.artistGlobeId) === id)
      );
    case 'genre-tags': {
      const field = genreTagField(level, id);
      return (
        !!field && strings(getPath(body, field.path)).includes(field.value)
      );
    }
  }
}

/* ── What the field becomes: an unlink ───────────────────────────────── */

/**
 * How an unlink goes, where the shape leaves a choice:
 *
 *  - `name` — `one`: the linked record's name. The text that follows the id
 *    (C20) goes with it while it still says this, since the graph would
 *    read it as the same record, guessed; a text of the owner's own stays.
 *  - `lead`, `credits` — `song-artist`: the ways the song names the artist
 *    that go (its lead act; the credits, by index, that link them). Absent,
 *    every way goes (`songArtistWays`). A credit taken out goes whole: kept
 *    without its link, its name would guess the same artist again.
 *  - `level` — `genre-tags`: whether the row is a genre or a subgenre.
 *  - `keep` — `ids` on an owner that stores nothing yet (an event's guessed
 *    artists): the guesses the author keeps, which become the stored list.
 *    Without it such an unlink cannot be written (`unlinkEscalates`).
 */
export interface UnlinkHow {
  name?: string;
  lead?: boolean;
  credits?: readonly number[];
  level?: GenreLevel;
  keep?: readonly string[];
}

/**
 * The ways a song names an artist it links: as its lead act, and by the
 * credits (their indexes) whose `artistGlobeId` is theirs. What the unlink
 * chooser lists.
 */
export function songArtistWays(
  body: Body,
  id: string,
): { lead: boolean; credits: number[] } {
  const credits: number[] = [];
  records(body.credits).forEach((credit, n) => {
    if (text(credit.artistGlobeId) === id) credits.push(n);
  });
  return {
    lead: text(getPath(body, 'origin.artistGlobeId')) === id,
    credits,
  };
}

/**
 * Whether an unlink of `id` has to go through the dialog: the field is one
 * the graph infers and the owner stores nothing yet, so what stays is the
 * guesses the author keeps, which only the dialog shows.
 */
export const unlinkEscalates = (spec: LinkSpec, body: Body): boolean =>
  spec.shape === 'ids' && !!spec.inferred && !isStated(spec, body);

/**
 * The owner's body with the row unlinked: nothing else in it changes. Pure;
 * never mutates `body`. Unlinking what is not linked gives the body back as
 * it was (a copy).
 *
 * Throws for an unlink `unlinkEscalates` names when `how.keep` does not say
 * which guesses stay: storing an empty list there would drop every other
 * guess, and storing nothing would leave the row guessed.
 */
export function applyUnlink(
  spec: LinkSpec,
  body: Body,
  id: string,
  how: UnlinkHow = {},
): Record<string, unknown> {
  const base = { ...body } as Record<string, unknown>;
  switch (spec.shape) {
    case 'ids': {
      if (!isStated(spec, body)) {
        if (!spec.inferred) return base;
        if (!how.keep)
          throw new Error(
            `The ${spec.noun} stores no ${spec.path} yet: say which of the map’s guesses stay (Link… lists them).`,
          );
        return setPath(base, spec.path, [
          ...new Set(how.keep.filter((kept) => kept !== id)),
        ]);
      }
      const list = storedIds(spec, body);
      if (!list.includes(id)) return base;
      return setPath(
        base,
        spec.path,
        list.filter((stored) => stored !== id),
      );
    }
    case 'one': {
      if (storedId(spec, body) !== id) return base;
      let next = unsetPath(base, spec.path);
      if (spec.text && how.name) {
        // C20 in reverse: the text goes while it is still the record's own.
        const current = text(getPath(body, spec.text));
        if (current && current === how.name.trim())
          next = unsetPath(next, spec.text);
      }
      return next;
    }
    case 'song-artist': {
      const ways = songArtistWays(body, id);
      const lead = how.lead ?? ways.lead;
      const drop = new Set(
        (how.credits ?? ways.credits).filter((n) => ways.credits.includes(n)),
      );
      let next = base;
      if (lead && ways.lead) next = unsetPath(next, 'origin.artistGlobeId');
      // By the same indexes `songArtistWays` and a credit link count.
      if (drop.size) {
        next = {
          ...next,
          credits: records(body.credits).filter((_, n) => !drop.has(n)),
        };
      }
      return next;
    }
    case 'releases':
    case 'refs': {
      const list = getPath(body, spec.path);
      if (!Array.isArray(list)) return base;
      const keyName = spec.shape === 'releases' ? 'releaseId' : spec.key;
      const kept = list.filter(
        (entry) =>
          !(
            entry &&
            typeof entry === 'object' &&
            text((entry as Record<string, unknown>)[keyName ?? '']) === id
          ),
      );
      if (kept.length === list.length) return base;
      return setPath(base, spec.path, kept);
    }
    case 'genre-tags': {
      const field = genreTagField(how.level ?? 'genre', id);
      if (!field) return base;
      const list = strings(getPath(body, field.path));
      if (!list.includes(field.value)) return base;
      return setPath(
        base,
        field.path,
        list.filter((tag) => tag !== field.value),
      );
    }
  }
}

/**
 * The owner's text that will still name the row once it is unlinked, so the
 * map guesses it back (dotted): the path, or null. A song's billing line
 * still spelling the lead act; an event's city still the place's name; a
 * display text of the owner's own that happens to say the record's name.
 * `names` are the row's name and aliases.
 */
export function guessedAgain(
  spec: LinkSpec,
  after: Body,
  names: readonly string[],
): string | null {
  const folded = new Set(names.map(fold).filter(Boolean));
  for (const path of [spec.guessedFrom, spec.text]) {
    if (!path) continue;
    // The billing line guesses a lead act only while nothing else says who.
    if (spec.shape === 'song-artist' && storedId(spec, after)) continue;
    const said = fold(getPath(after, path));
    if (said && folded.has(said)) return path;
  }
  return null;
}

/* ── Undoing it ──────────────────────────────────────────────────────── */

/**
 * One path an undo puts back: `value` is what it held before the write
 * (undefined: nothing), `seen` what the write left there.
 */
export interface PathRestore {
  path: string;
  value: unknown;
  seen: unknown;
}

/**
 * What undoes a link or an unlink: each path it rests on that the write
 * changed, back to what it was (the design's undo stack; the grid turns
 * each into a `set` with `seen` as its precondition).
 */
export const inverse = (
  spec: LinkSpec,
  before: Body,
  after: Body,
): PathRestore[] =>
  watchedPaths(spec)
    .map((path) => ({
      path,
      value: getPath(before, path),
      seen: getPath(after, path),
    }))
    .filter((restore) => !same(restore.value, restore.seen));

const identity = (value: unknown) => JSON.stringify(value ?? null);

/**
 * `restores` applied to the body as it is now. A path still holding what
 * the write left goes back whole; a list someone has changed since is
 * merged — what the write added comes out, what it took out goes back in,
 * everything else stays — so an undo never drops another person's entry;
 * a value that says something else now (and not what the undo would put
 * there) is a conflict, and nothing is written.
 */
export function applyRestore(
  body: Body,
  restores: readonly PathRestore[],
): { body: Record<string, unknown> } | { conflicts: string[] } {
  let next = { ...body } as Record<string, unknown>;
  const conflicts: string[] = [];
  for (const { path, value, seen } of restores) {
    const now = getPath(body, path);
    if (same(now, value)) continue;
    if (same(now, seen)) {
      next = writePath(next, path, value);
      continue;
    }
    if (Array.isArray(now) && Array.isArray(seen)) {
      const was = Array.isArray(value) ? value : [];
      const wasKeys = new Set(was.map(identity));
      const seenKeys = new Set(seen.map(identity));
      const added = new Set(
        seen.map(identity).filter((key) => !wasKeys.has(key)),
      );
      const merged = now.filter((entry) => !added.has(identity(entry)));
      const nowKeys = new Set(merged.map(identity));
      for (const entry of was) {
        const key = identity(entry);
        if (!seenKeys.has(key) && !nowKeys.has(key)) merged.push(entry);
      }
      next = setPath(next, path, merged);
      continue;
    }
    conflicts.push(path);
  }
  return conflicts.length ? { conflicts } : { body: next };
}

/* ── Why not ─────────────────────────────────────────────────────────── */

/** The row a link is made from: its slug and its node. */
export interface LinkRowRef {
  key: string;
  node: EntityId;
}

/**
 * A walk over one stored edge kind between nodes of one kind, for the loop
 * checks: from a slug to the slugs at the edges' `far` end, over the edges
 * whose other end is the slug. `member_of` runs from the member to the
 * group, so a group's members are the `from` ends of its edges; `imprint_of`
 * runs from the imprint to its parent, so a label's parent is the `to` end.
 * Guessed edges are passed over: only what is stored can close a loop.
 */
function walk(
  graph: Graph,
  kind: 'member_of' | 'imprint_of',
  node: EntityKind,
  far: 'from' | 'to',
): (slug: string) => string[] {
  return (slug) => {
    const self = `${node}:${slug}` as EntityId;
    const out: string[] = [];
    for (const edge of graph.adjacency.get(self) ?? []) {
      if (edge.kind !== kind || edge.inferred) continue;
      const near = far === 'from' ? edge.to : edge.from;
      if (near !== self) continue;
      const other = slugIn(node, far === 'from' ? edge.from : edge.to);
      if (other) out.push(other);
    }
    return out;
  };
}

/**
 * Why the row cannot be linked on that owner, or null. Said before anything
 * is written, in the record editors' words:
 *
 *  - a link that would loop (`acyclic`): a group made a member of itself or
 *    of a group among its own members; a label made an imprint of itself or
 *    of one of its own imprints — walked over the graph's stored edges;
 *  - an artist named as their own influence;
 *  - a song's session label, on a song on a record (a record names its own
 *    label, so the session's is not read);
 *  - a genre on a song, when no song tag spells it.
 *
 * Before an owner is picked (`owner` absent) only what the row alone
 * decides is said: a genre no tag spells is refused whichever song it is.
 */
export function linkRefusal(
  spec: LinkSpec,
  {
    graph,
    owner,
    ownerBody,
    row,
  }: {
    graph: Graph;
    owner?: string;
    ownerBody?: Body;
    row: LinkRowRef;
  },
): string | null {
  if (spec.id === 'genre-song')
    return genreTagField(levelOf(row.node), row.key)
      ? null
      : 'No song tag spells this genre: songs are tagged with the twelve taught genres, and reach the others through their subgenres.';
  if (!owner) return null;
  switch (spec.id) {
    case 'artist-group':
      return memberRefusal(
        owner,
        [],
        row.key,
        walk(graph, 'member_of', 'artist', 'from'),
      );
    case 'artist-influenced':
      return influenceRefusal(owner, [], row.key);
    case 'label-imprint':
      return parentLabelRefusal(
        owner,
        row.key,
        walk(graph, 'imprint_of', 'label', 'to'),
      );
    case 'label-song':
      return ownerBody && records(ownerBody.releases).length > 0
        ? 'The song is on a record, and a record names its own label: set the label on the record (Records → Label).'
        : null;
    default:
      return null;
  }
}

/* ── A song's artist: lead act or credit ─────────────────────────────── */

const fold = (value: unknown) =>
  typeof value === 'string' ? normalizeArtistName(value) : '';

/**
 * How a song most likely names an artist it does not link: its billing line
 * ("Toto") makes them the lead act; a credit by their name ("Marvin Gaye ·
 * vocals") is that credit, linked. Otherwise the lead act when the song has
 * none yet, else a new performer credit.
 */
export function songArtistDefault(
  body: Body,
  names: readonly string[],
): { as: 'lead' } | { as: 'credit'; credit: CreditChoice } {
  const folded = new Set(names.map(fold).filter(Boolean));
  const lead = text(getPath(body, 'origin.artistGlobeId'));
  if (!lead && folded.has(fold(body.artist))) return { as: 'lead' };
  const index = records(body.credits).findIndex(
    (credit) => !text(credit.artistGlobeId) && folded.has(fold(credit.name)),
  );
  if (index >= 0) {
    const role = records(body.credits)[index].role;
    return {
      as: 'credit',
      credit: {
        role: (typeof role === 'string' ? role : 'performer') as CreditRole,
        index,
      },
    };
  }
  return lead
    ? { as: 'credit', credit: { role: 'performer' } }
    : { as: 'lead' };
}

/** The credit, unlinked, that already names the artist, if one does. */
export function unlinkedCreditFor(
  body: Body,
  names: readonly string[],
): number | undefined {
  const folded = new Set(names.map(fold).filter(Boolean));
  const index = records(body.credits).findIndex(
    (credit) => !text(credit.artistGlobeId) && folded.has(fold(credit.name)),
  );
  return index >= 0 ? index : undefined;
}

/* ── What the graph guesses for an owner ─────────────────────────────── */

/** One of an event's guessed subjects, for the dialog's checkboxes. */
export interface Guessed {
  id: string;
  label: string;
  /**
   * Nothing puts the name in doubt, so it starts ticked: not one word ("Eve",
   * "The Roots"), and not also a place's or a genre's name ("Chicago").
   */
  sure: boolean;
}

/**
 * A name a tag can mean something else by: one word, or "The" and one word
 * (as the event artists' planner reads it).
 */
export const isOneWordName = (name: string): boolean =>
  name
    .trim()
    .replace(/^the\s+(?=\S)/i, '')
    .split(/\s+/).length === 1;

/** The folded names of every place and genre: an artist's name among them is in doubt. */
export function placeAndGenreNames(graph: Graph): ReadonlySet<string> {
  const names = new Set<string>();
  for (const node of graph.nodes.values()) {
    if (
      node.kind === 'place' ||
      node.kind === 'genre' ||
      node.kind === 'subgenre'
    )
      names.add(normalizeArtistName(node.label));
  }
  return names;
}

/**
 * What the graph guesses an owner states in this field, which it does not
 * store: an event's matched artists or songs, in the graph's order. Empty
 * for a field that is stored, or never inferred.
 */
export function guessesFor(
  spec: LinkSpec,
  graph: Graph,
  owner: EntityId,
  doubtful: ReadonlySet<string>,
): Guessed[] {
  if (!spec.inferred) return [];
  const { target } = spec;
  const out: Guessed[] = [];
  const seen = new Set<string>();
  for (const edge of graph.adjacency.get(owner) ?? []) {
    if (edge.kind !== 'about' || edge.from !== owner || !edge.inferred)
      continue;
    if (!edge.to.startsWith(`${target}:`)) continue;
    const id = edge.to.slice(target.length + 1);
    if (seen.has(id)) continue;
    seen.add(id);
    const label = graph.nodes.get(edge.to)?.label ?? id;
    out.push({
      id,
      label,
      sure:
        target === 'song' ||
        (!isOneWordName(label) && !doubtful.has(normalizeArtistName(label))),
    });
  }
  return out;
}

/** The id of a node of a kind, or null for another kind's. */
export const slugIn = (kind: EntityKind, node: string): string | null =>
  node.startsWith(`${kind}:`) ? node.slice(kind.length + 1) : null;

/**
 * The node an id in the field names: of the spec's target kind, or of one
 * of its other kinds (`targets`) when the graph has it there instead.
 */
export function targetNode(spec: LinkSpec, graph: Graph, id: string): EntityId {
  const first = `${spec.target}:${id}` as EntityId;
  if (graph.nodes.has(first)) return first;
  for (const kind of spec.targets ?? []) {
    const other = `${kind}:${id}` as EntityId;
    if (graph.nodes.has(other)) return other;
  }
  return first;
}
