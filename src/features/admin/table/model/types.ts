import type {
  EdgeKind,
  EntityId,
  EntityKind,
  NodeStatus,
} from '@/content/graph/types';
import type { CreditRole } from '@/curriculum/types/songLibrary';
import type {
  ContentEditState,
  ContentKind,
} from '@/hooks/data/admin/useAdminContent';
import type { LinkId } from '../link/links';
import type { TableId } from '../tableIds';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  The Table's model — what a table is, declared as data
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A table's rows are graph nodes, joined with the item that stores each one
 * (its body, status and review state). Its columns are either a field of that
 * body or a path over the graph's adjacency: from the row, along these edge
 * kinds, in this direction, landing on these node kinds — and optionally one
 * step further. So the Table and the mind map read the same graph and can
 * never disagree about what connects to what; a cell is the mind map's first
 * or second ring around the row, counted.
 *
 * This file is the contract between the registry (`categories.ts`, which
 * declares all thirteen tables), the model builder that turns a graph into
 * rows and cells, and the grid and panel that draw them. It holds no data and
 * no logic beyond a few constants, and it stays pure: no React, no store, no
 * router (the purity test in table/__tests__ holds this for all of model/*).
 */

/* ── Walking the graph ───────────────────────────────────────────────── */

/**
 * One step from a node to its neighbours along the graph's edges.
 *
 * `dir` says which end of the edge the walk stands on: `out` stands on the
 * edge's `from` and lands on its `to`; `in` stands on the `to` and lands on
 * the `from`; `both` takes either (influence arcs and covers read both ways).
 *
 * `through: 'on'` walks a credit's `on` — the song an instrument was played
 * on — in place of the edge's `from`: `in` goes from an instrument to the
 * songs it was played on, `out` from a song to the instruments played on it.
 * The graph's adjacency holds an edge under its two ends only (`on` is
 * context, not an end), so the model indexes edges by `on` for this.
 */
export interface Hop {
  /** The edge kinds this step follows. */
  edges: readonly EdgeKind[];
  dir: 'out' | 'in' | 'both';
  /** The node kinds the step lands on; any other neighbour is passed over. */
  to: readonly EntityKind[];
  through?: 'on';
  /**
   * Only edges one of these body fields states (an `EdgeVia.path`), when an
   * edge kind has more than one source that must be told apart: an artist's
   * stated City (`basedInPlaceId`) and the city their songs are pinned to
   * (the Artist locations item's `city`) are both `based_in`; an event's
   * stored place (`placeId`) and the one matched from its city
   * (`location.city`) are both `took_place_in`.
   */
  via?: readonly string[];
}

/**
 * Who states what a part counts, which decides how it is shown and counted.
 *
 *  - `stated` — the row's own body states it (an artist's `genreIds`, a
 *    progression's `songIds`): edited in the row's panel, and what the
 *    coverage strip and the `missing-*` filters count. One step, and only
 *    edges whose `via` names the row itself: a song's recording city is
 *    stated by its session, the city its studio is in by the studio.
 *  - `fact` — one step that is not the row's stored field: stated by
 *    another item or by code (the songs that credit an artist, the events
 *    about them), or guessed from the row's own text (an event's artists
 *    matched from its title, drawn dotted). Link… or Confirm writes the
 *    field that owns it.
 *  - `rollup` — two steps, counted with its provenance ("via songs 12"): the
 *    artists of a genre's songs.
 *  - `hint` — shown muted beside the stated value, never counted as stated:
 *    the genres an artist's songs are in, the instruments they played on
 *    records. One owner per fact: a hint is what a picker offers first, not
 *    a value.
 */
export type PartRole = 'stated' | 'fact' | 'rollup' | 'hint';

/** One source of a connections cell, counted apart from the others. */
export interface ConnectionPart {
  /**
   * The provenance key ('stated', 'songs', 'events', 'pins'), unique within
   * the column: "stated 3 · via songs 12 · via events 4".
   */
  id: string;
  /** How the provenance line names it: 'stated', 'via songs', 'song pins'. */
  label: string;
  role: PartRole;
  /** One step for `stated` and `fact`, two for `rollup`; a hint may be either. */
  hops: readonly [Hop] | readonly [Hop, Hop];
  /** A word on every chip this part reaches: 'born', 'song pins', 'arc'. */
  tag?: string;
  /**
   * A word per edge kind, for a part that follows several: an artist's songs
   * say "wrote" or "produced" where the role is not performing.
   */
  tags?: Readonly<Partial<Record<EdgeKind, string>>>;
}

/* ── Columns ─────────────────────────────────────────────────────────── */

/**
 * How a stored field is written in a cell:
 *
 *  - `text` — as written; `list` — an array's items joined;
 *  - `year` — a year; `number` — a number;
 *  - `born` — `born.date` and `born.placeId`'s name: "1939-04-02 ·
 *    Washington", or for a group "Formed 1977 · Los Angeles";
 *  - `yearRange` — `path`–`to`: "1961–1984", "1970–" while open;
 *  - `songKey` — a song's `key` and `mode`: "C major";
 *  - `coordinates` — "42.33, -83.05";
 *  - `flag` — a yes or no: "Yes" when true, "No" when false, nothing
 *    while unset (an artist's Group);
 *  - `ids` — how many outside ids it holds, never whose: "2 outside ids".
 */
export type FieldFormat =
  | 'text'
  | 'list'
  | 'year'
  | 'number'
  | 'born'
  | 'yearRange'
  | 'songKey'
  | 'coordinates'
  | 'flag'
  | 'ids';

/**
 * The line under a row's title, by table:
 *
 *  - `artist` — aliases, and "Group" for a group;
 *  - `lead-act` — a song's lead act, dotted when only its billing names it;
 *  - `genre` — a subgenre's genre; "Taught" for a genre the curriculum has;
 *  - `place` — "Michigan, US · North America"; "No pin" for a hometown;
 *  - `section` — an instrument's section (Keys, Guitar…);
 *  - `event` — "1969 · Bethel, US";
 *  - `format` — a record's format;
 *  - `years` — a studio's or label's years: "1969–2005";
 *  - `calendar` — a year's decade and era, a decade's first and last year;
 *  - `shape` — a progression's complexity and chord count.
 */
export type Sublabel =
  | 'artist'
  | 'lead-act'
  | 'genre'
  | 'place'
  | 'section'
  | 'event'
  | 'format'
  | 'years'
  | 'calendar'
  | 'shape';

/**
 * Where a column's cells come from.
 *
 *  - `title` — the identity column: the node's label, a sublabel, and the
 *    row's badges (status, review, unconfirmed, suggestions).
 *  - `field` — a value of the row's body (or, for a code table, of its
 *    vocabulary entry), at `path`; `to` is a range's end. `hint` is shown
 *    muted when useful: Years Active's "events 1964–1983".
 *  - `connections` — chips for the nodes the parts reach. `unlinkedText`
 *    is a body path whose text is shown muted where no chip came from it:
 *    an event's genre string that resolves to no genre, a city the
 *    registry cannot place ("Gary, US?").
 *  - `years` — the same walk, where every part ends on `year` nodes: a
 *    decade histogram and the first and last year.
 *  - `credits` — a song's `credits[]` summarised: "7 · 3 performers, 2
 *    vocals", with a chip per name. With `roles`, only the credits in
 *    those roles, and no summary: the Engineer column's engineers.
 *
 * `noExpand` keeps a column on the row's own node when the table expands a
 * row over others (a genre over its subgenres, a decade over its years): a
 * genre's Parent column must not find the genre itself through a subgenre.
 */
export type ColumnSource =
  | { type: 'title'; sublabel?: Sublabel }
  | {
      type: 'field';
      path: string;
      to?: string;
      format: FieldFormat;
      hint?: { label: string; parts: readonly ConnectionPart[] };
    }
  | {
      type: 'connections';
      parts: readonly ConnectionPart[];
      unlinkedText?: string;
      noExpand?: true;
    }
  | { type: 'years'; parts: readonly ConnectionPart[]; noExpand?: true }
  | { type: 'credits'; path: string; roles?: readonly CreditRole[] };

/**
 * A body field the contract does not have yet: it arrives with the stored
 * fields (C2) — song schema v2 (`releases[]`, `session.studioId`, …), the
 * event body v2 (`artistIds`, `placeId`, …) and the artist's `born`. Until
 * then the panel shows it disabled and says why.
 */
export type SchemaStep = 'song-v2' | 'event-v2' | 'artist-born';

/** One value a `choice` cell offers: what is stored, and what the list says. */
export interface ChoiceOption {
  value: string;
  label: string;
}

/**
 * A fixed list a `tags` cell toggles values of, by name; the cell's editor
 * reads the list itself, from where the app keeps it:
 *
 *  - `song-genre-tags` — the taught genre tags a song carries
 *    (`SONG_TAG_TO_GENRE`'s keys);
 *  - `progression-styles` — a progression's library styles
 *    (`PROGRESSION_STYLE_TO_GENRE`'s keys, and the ones left unmapped);
 *  - `vibes` — a progression's vibes (`VIBE_ALGORITHMS`' keys);
 *  - `scene-decades` — the decades a city's scene was active ("1960s").
 */
export type TagVocabulary =
  | 'song-genre-tags'
  | 'progression-styles'
  | 'vibes'
  | 'scene-decades';

/**
 * The editor a cell of a `row` column opens, declared where the column's
 * source and path alone would pick the wrong one. Every other column's is
 * derived (edit/editorFor.ts): a year field gets `year`, a list of ids
 * gets `many`, and so on.
 *
 *  - `panel` — the value is too long or too structured for a cell (a bio,
 *    all of a song's credits, its other recordings): Enter opens the row's
 *    panel at the field.
 *  - `born` — a date or year and a birthplace, in one popover.
 *  - `textChips` — a list of free text, not of ids: a place's scene genres
 *    and an event's genres are names as written.
 *  - `text` with `parse: 'youtube-id'` — a pasted YouTube address is
 *    stored as its video id.
 *  - `number` with bounds — Popularity is 0–100.
 *  - `choice` — one of a closed list: a record's format, a progression's
 *    complexity, a place's region.
 *  - `tags` — toggles over a fixed vocabulary (see `TagVocabulary`), where
 *    the graph would otherwise offer every genre node.
 *  - `credits` — the song's `credits[]` filtered to one role: the Composers
 *    column adds and removes songwriter credits, Producer producer ones.
 *  - `one` with `onRecord` — a song's Label: the session's own label while
 *    the song is on no record, else its record's `labelId`, written through
 *    that link (`links.ts`, 'song-label').
 *  - `chords` — a progression's chords, as ordered chips in a popover: a
 *    write sets the fields that follow from them (`progression`,
 *    `chordCount`, `startingChord`, `startingDegree`) with them.
 */
export type CellEditDef =
  | { editor: 'panel' }
  | { editor: 'born' }
  | { editor: 'textChips' }
  | { editor: 'text'; parse: 'youtube-id' }
  | { editor: 'number'; min: number; max: number }
  | { editor: 'choice'; options: readonly ChoiceOption[] }
  | { editor: 'tags'; vocabulary: TagVocabulary }
  | { editor: 'credits'; role: CreditRole }
  | { editor: 'one'; kinds: readonly EntityKind[]; onRecord: LinkId }
  | { editor: 'chords' };

/**
 * Who edits what a column shows (one owner per fact):
 *
 *  - `row` — this row's own body, in its panel and in its cell; `path` is
 *    the field the panel anchors to, `also` the other fields it edits with
 *    it (a range's end, the display text a v2 id replaces). `since` marks a
 *    `path` the contract does not accept yet; `also` paths exist today.
 *    `roles` splits a list several columns edit (a song's credits) by its
 *    elements' `role`: a songwriter credit is the Composers column's, any
 *    other the column with no `roles` (Credits). `cell` names the cell's
 *    editor where it cannot be derived (`CellEditDef`).
 *  - `owner` — another item's field says it (a song's progression is the
 *    progression's `songIds`): read-only here, and a one-step cell offers
 *    Link…, which writes that field on that item.
 *  - `code` — a repo file says it; the cell names the file.
 *  - `page` — edited on the page it belongs to: a song's key is its chart's.
 *  - `none` — not edited in the Table: rolled up or computed from other rows
 *    (it changes when they do).
 */
export type ColumnEdit =
  | {
      by: 'row';
      path: string;
      also?: readonly string[];
      since?: SchemaStep;
      roles?: readonly string[];
      cell?: CellEditDef;
    }
  | { by: 'owner'; kind: ContentKind; path: string; since?: SchemaStep }
  | { by: 'code'; file: string }
  | { by: 'page' }
  | { by: 'none' };

export interface ColumnDef {
  /** Unique within its table; the URL's `sort`, filters and the Columns menu use it. */
  id: string;
  /** The header, in the owner's words where he gave them. */
  label: string;
  source: ColumnSource;
  /**
   * On the owner's own list for this table (29 Sep 2026). Visible by
   * default, in his order, and pinned by categories.test.ts.
   */
  owner?: true;
  /**
   * Shown until the Columns menu says otherwise. For the owner's five
   * tables, only his columns (and the title); for the ones he left as
   * "Etc.", the proposed columns he has seen on the placeholder page.
   * Everything else is opt-in.
   */
  defaultVisible: boolean;
  /** Width in px at first paint. */
  width: number;
  edit: ColumnEdit;
  /**
   * What an empty cell says: where its data will come from ("No instrument
   * data yet: the import suggests them"). Every column but the title
   * has one, so a blank never reads as "none".
   */
  empty: string;
  /** The header's tooltip, when the label alone could mislead. */
  help?: string;
}

/* ── Rows ────────────────────────────────────────────────────────────── */

/**
 * A code vocabulary whose entries are rows even when nothing links to them
 * yet, so a table lists them all: the 29 genres, the 582 subgenres (with
 * "Show subgenres"), the 59 session instruments.
 */
export type VocabularyId = 'genres' | 'subgenres' | 'instruments';

/**
 * Which rows a table has: every graph node of `kind` (plus the entries of
 * `vocabulary`, and the API's items the graph does not draw — archived ones,
 * under the archived status, and in repo mode those only the API has). A
 * row's key in the URL is its node's slug.
 *
 * `more` is a second set of rows behind a toggle (Genre: "Show subgenres").
 * `expand` makes a row stand on more nodes than its own, so every column
 * counts through them: a genre through its subgenres (`in_genre` from the
 * subgenre), a decade through its years (`in_decade` from the year).
 */
export interface RowSource {
  kind: EntityKind;
  vocabulary?: VocabularyId;
  more?: { kind: EntityKind; vocabulary?: VocabularyId; label: string };
  expand?: 'subgenres' | 'decadeYears';
}

/**
 * What the model knows about a row beyond its cells, for filters and views:
 *
 *  - `unverified` — the row's own record is marked unconfirmed;
 *  - `unconfirmed` — the record, or a connection the row shows, is;
 *  - `guesses` — a connection the row shows is guessed from text (dotted);
 *  - `orphan` — the node has no edge at all;
 *  - `missing` — something references it, but it is found nowhere;
 *  - `suggestions` — it has open suggestions;
 *  - `bulk-unreviewed` — a value on it was accepted in bulk and nobody has
 *    marked it reviewed yet;
 *  - `group` / `person` — an artist record's `group` flag;
 *  - `credited` — an artist who is only credited (wrote, produced, played
 *    on) and never billed on a song or record (its billing line included),
 *    the subject of an event, or a group (an ensemble credit included): the
 *    Artist table's "Credited people" view; everyone else is an act;
 *  - `city` / `region` / `hometown` — a globe city, a region, a place with
 *    no pin (`pin: false`);
 *  - `subgenre` / `taught` — a genre-table row that is a subgenre; a genre
 *    the curriculum teaches.
 */
export type RowFlag =
  | 'unverified'
  | 'unconfirmed'
  | 'guesses'
  | 'orphan'
  | 'missing'
  | 'suggestions'
  | 'bulk-unreviewed'
  | 'group'
  | 'person'
  | 'credited'
  | 'city'
  | 'region'
  | 'hometown'
  | 'subgenre'
  | 'taught';

/**
 * A filter's test, as data, so the registry can be checked and the toolbar
 * can count each filter's rows:
 *
 *  - `missing` — the row's own field states nothing in that column (what
 *    the coverage strip counts);
 *  - `empty` — the cell has no chip at all, guessed ones included (text no
 *    chip came from does not count: an event whose city matched no place is
 *    empty);
 *  - `guessed` — the cell shows something, and all of it is guessed;
 *  - `flag` — the row has the flag;
 *  - `field` — the row's body has a value at the path;
 *  - `not`, `all` — the usual.
 */
export type FilterRule =
  | { type: 'missing'; column: string }
  | { type: 'empty'; column: string }
  | { type: 'guessed'; column: string }
  | { type: 'flag'; flag: RowFlag }
  | { type: 'field'; path: string }
  | { type: 'not'; rule: FilterRule }
  | { type: 'all'; rules: readonly FilterRule[] };

export interface FilterDef {
  /** Unique within its table; the URL's `f` lists these. */
  id: string;
  label: string;
  /** Where the toolbar puts it: gaps to fill, kinds of row, review work. */
  group: 'gaps' | 'kind' | 'review';
  rule: FilterRule;
  help?: string;
}

/** A named subset a table opens on (Artist: Acts | Credited people). */
export interface ViewDef {
  id: string;
  label: string;
  rule: FilterRule;
}

/** A row's state: its node's, or `archived` for an item archived in the API. */
export type RowStatus = NodeStatus | 'archived';

/** The status control's values; `all` leaves archived items out. */
export type StatusFilter = 'all' | RowStatus | 'rejected';

/**
 * What the search box matches, besides the row's title:
 *
 *  - `key` — the URL row (an id or slug);
 *  - `field` — a body field, arrays flattened (`aliases[]`, `location.city`);
 *  - `column` — the chip labels of one of the table's columns (a song's
 *    album titles).
 */
export type SearchKey =
  | { from: 'label' }
  | { from: 'key' }
  | { from: 'field'; path: string }
  | { from: 'column'; column: string };

export interface SortState {
  column: string;
  dir: 'asc' | 'desc';
}

/** Which panel a row opens in. */
export type PanelKind = 'record' | 'song' | 'event' | 'code';

export interface TableDef {
  id: TableId;
  /** The toolbar's title: "Artists 907 · 12 drafts". */
  title: string;
  /** One row, for "New artist". */
  singular: string;
  rows: RowSource;
  /** The content kind that stores the rows; absent for a code table. */
  contentKind?: ContentKind;
  /**
   * For a table no content item stores: the repo files that say what it
   * holds, and what the panel says instead of editing ("Vocabularies stay in
   * code").
   */
  code?: { files: readonly string[]; note: string };
  panel: PanelKind;
  /** How a new row is made: a dialog in the Table, or the item's own page. */
  create?: 'dialog' | 'page';
  /**
   * Where the rows will come from, said when there are none yet — as an
   * empty cell says where its data will come from.
   */
  empty?: string;
  /** The title column first, then the rest in their default order. */
  columns: readonly ColumnDef[];
  defaultSort: SortState;
  search: readonly SearchKey[];
  /** Every filter the toolbar offers, the common ones included. */
  filters: readonly FilterDef[];
  /** Named subsets, the first being where the table opens. */
  views?: readonly ViewDef[];
  /**
   * A value that narrows every count in the table (Key: one mode). The
   * toolbar lists the nodes `hop` reaches from the rows' first-step
   * neighbours; picking one keeps, in every column, only the paths whose
   * first step lands on a node that connects to it.
   */
  narrow?: { label: string; hop: Hop };
}

/* ── Cells ───────────────────────────────────────────────────────────── */

/**
 * How a chip is drawn — the mind map's conventions:
 *
 *  - `solid` — linked: a stored id, or code;
 *  - `dashed` — unconfirmed (`unverified`): stated, not yet checked;
 *  - `dotted` — guessed from text (`inferred`): a name, a city as written;
 *  - `hollow` — the node it names is missing (found nowhere);
 *  - `ghost` — a suggestion not yet accepted, with its source tag.
 *
 * Listed strongest first. A two-step chip takes its weakest step's style; a
 * chip reached by several paths takes its strongest path's — as the graph
 * merges edges, where one linked source is enough to make an edge solid.
 * `hollow` is the node's state, so a missing node is hollow whatever the
 * path.
 */
export const CHIP_STYLES = [
  'solid',
  'dashed',
  'dotted',
  'hollow',
  'ghost',
] as const;

export type ChipStyle = (typeof CHIP_STYLES)[number];

/** The weaker of two styles: a rollup through a guessed step is a guess. */
export const weakerStyle = (a: ChipStyle, b: ChipStyle): ChipStyle =>
  CHIP_STYLES.indexOf(a) >= CHIP_STYLES.indexOf(b) ? a : b;

/** The stronger of two styles: one linked path makes the chip solid. */
export const strongerStyle = (a: ChipStyle, b: ChipStyle): ChipStyle =>
  CHIP_STYLES.indexOf(a) <= CHIP_STYLES.indexOf(b) ? a : b;

/** The most chips a cell carries; "+N" says how many more there are. */
export const CHIP_LIMIT = 12;

export interface Chip {
  node: EntityId;
  label: string;
  style: ChipStyle;
  /** The part that reached it by its strongest path. */
  part: string;
  /** Distinct paths to it across the cell's parts: an artist's songs in a genre. */
  weight: number;
  /** A hint's chip: shown muted, not a value of the row. */
  muted?: true;
  /** Its part's word: 'wrote', 'born', 'song pins', 'arc'. */
  tag?: string;
  /** The tooltip: the field that states it, or "via 12 songs". */
  title?: string;
}

/** One entry of a cell's provenance line: "via songs 12". */
export interface PartCount {
  part: string;
  label: string;
  count: number;
}

/**
 * A suggestion for the row's own field, shown in its cell before anyone has
 * accepted it: the faint dashed `ghost` chip. Never a value of the row — the
 * coverage strip and the `missing` filters count only what is stated — but
 * what accepting it would state.
 */
export interface GhostChip {
  label: string;
  /** The tooltip: what is suggested, by whom, and how sure. */
  title: string;
  /** In a connections cell, the node the value names. */
  node?: EntityId;
}

/** What every cell carries, whatever it shows. */
interface CellBase {
  /**
   * What sorting by the column compares; null sorts last. A connections
   * cell sorts by its stated facts — solid or unconfirmed neighbours one
   * step away — with everything it shows as the tie-break; guesses and
   * rollups never outrank a stated fact.
   */
  sort: number | string | null;
  /**
   * The row's own field states a value here: what the coverage strip and
   * the `missing` rule count. Always true for a column the row does not own.
   */
  filled: boolean;
  /** Set when the cell shows nothing: the column's `empty`, or a reason of this row's. */
  note?: string;
  /** Open suggestions for this field (a field or connections cell of the row's own). */
  ghosts?: readonly GhostChip[];
}

export type CellValue =
  | (CellBase & {
      type: 'title';
      label: string;
      sublabel?: string;
    })
  | (CellBase & {
      type: 'field';
      /** The formatted value; absent when the field is empty. */
      text?: string;
      /** The value is marked unconfirmed: shown muted and italic. */
      unverified?: true;
      /** The muted hint beside it: "events 1964–1983". */
      hint?: string;
    })
  | (CellBase & {
      type: 'connections';
      /** Every distinct neighbour the cell shows. */
      total: number;
      /** Distinct neighbours per part, in the column's order; parts that reached none are left out. */
      parts: readonly PartCount[];
      /** Distinct neighbours per style. */
      styles: Readonly<Record<ChipStyle, number>>;
      /** Strongest style first, then weight, then label; at most `CHIP_LIMIT`. */
      chips: readonly Chip[];
      /** Body text no chip came from, shown muted: "Gary, US?". */
      unlinked?: readonly string[];
    })
  | (CellBase & {
      type: 'years';
      /**
       * How many of the things walked are from each decade, oldest first:
       * a genre's songs and events by decade ('1980s' → 12).
       */
      decades: readonly { decade: string; count: number }[];
      first?: number;
      last?: number;
      parts: readonly PartCount[];
    })
  | (CellBase & {
      type: 'credits';
      /** "7 · 3 performers, 2 vocals". */
      summary?: string;
      chips: readonly Chip[];
    });

/** One row of a built table. */
export interface TableRow {
  /** The URL row: the node's slug. */
  key: string;
  node: EntityId;
  kind: EntityKind;
  label: string;
  sublabel?: string;
  status: RowStatus;
  editState: ContentEditState;
  /** The record itself is marked unconfirmed: the title is muted and italic. */
  unverified: boolean;
  /**
   * The body the row was built from: the working item's, the repo's copy,
   * or the vocabulary entry for a code table. Absent for a missing node.
   */
  body?: Readonly<Record<string, unknown>>;
  /** The API item's id, when the API holds the row (the panel saves by it). */
  itemId?: string;
  /** One per column id. */
  cells: Readonly<Record<string, CellValue>>;
  flags: ReadonlySet<RowFlag>;
  /** Everything the search keys name, folded the way `normalizeArtistName` folds. */
  haystack: string;
  /** Open suggestions for this row. */
  suggestions: number;
  /** Edges touching the node, solid and guessed (the opt-in Connections column). */
  degree: { solid: number; guessed: number };
}

/** A table built from one graph. */
export interface TableModel {
  def: TableDef;
  rows: readonly TableRow[];
  /** Row key → its index in `rows`. */
  byKey: ReadonlyMap<string, number>;
  /** Per stored column: how many rows fill it, of how many. */
  coverage: Readonly<Record<string, { filled: number; total: number }>>;
}

/** What the URL holds for a table: `?q=&sort=&f=&status=` and the toggles. */
export interface TableQueryState {
  q: string;
  sort: SortState;
  /** Filter ids, all of which a row must pass. */
  filters: readonly string[];
  status: StatusFilter;
  /** A `views` id; the first view when absent. */
  view?: string;
  /** `rows.more` is showing ("Show subgenres"). */
  more?: boolean;
  /** The `narrow` node chosen, as an id. */
  narrow?: EntityId;
}
