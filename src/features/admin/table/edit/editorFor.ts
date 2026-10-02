import type { EntityKind } from '@/content/graph/types';
import type { CreditRole } from '@/curriculum/types/songLibrary';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import type { WorkingGraphMode } from '../../content/graph/useWorkingGraph';
import type { ProposalOwner } from '../../content/itemEditor/useItemSession';
import { type LinkId, linkFor } from '../link/links';
import type {
  ChoiceOption,
  ColumnDef,
  ColumnEdit,
  ColumnSource,
  ConnectionPart,
  FieldFormat,
  SchemaStep,
  TableDef,
  TableRow,
  TagVocabulary,
} from '../model/types';
import { readOnlyReason, SCHEMA_STEP, waitingFor } from './editability';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  Which editor a cell opens, and whether it can be written now
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The registry (`categories.ts`) stays the one place a column is declared.
 * A cell's editor follows from its column: the source says what the cell
 * shows, the edit who states it.
 *
 *  - A field the row states edits as its format says: a year as a year, a
 *    number as a number, a list of text as free-text chips, a range as two
 *    years, coordinates as "lat, lng"; the catalogue ids open the panel.
 *  - A connections column the row states picks the nodes its stated part
 *    reaches: one (`basedInPlaceId`) or many (`genreIds[]`) — or, for a
 *    list of objects naming them (`members[].artistId`), refs.
 *  - The title edits the row's name or title, which cannot be emptied.
 *  - A column another item states is a relation: its cell writes that item
 *    (`links.ts`), as Link… does.
 *  - Code, the page editor and what is counted from other rows are not
 *    edited in a cell: Enter opens the row at the field, where it says who
 *    edits it.
 *
 * Where that would pick the wrong editor, the column says so (`cell`,
 * types.ts `CellEditDef`). `lockOf` then answers whether this row's cell
 * can be written at all, by the same rule the row panel uses
 * (`editability.ts`).
 *
 * Pure: the registry, the link specs and the rule, nothing else (the purity
 * test holds this).
 */

/** Every editor a cell can open (design §1, "Editor types"). */
export const EDITOR_TYPES = [
  'text',
  'number',
  'year',
  'range',
  'coords',
  'choice',
  'one',
  'many',
  'tags',
  'textChips',
  'refs',
  'credits',
  'born',
  'chords',
  'relation',
  'panel',
  'none',
] as const;

export type EditorType = (typeof EDITOR_TYPES)[number];

/**
 * The editors that edit in the cell itself in this release (owner, 30 Sep
 * 2026: scalar editing first), and a progression's chords (Amendment 8:
 * progressions are edited in Cortex), whose chip editor opens beside the
 * cell. The pickers, relations and the born popover come in a later phase;
 * until then their cells open the row at the field, as `panel` does.
 */
export const SCALAR_EDITORS: ReadonlySet<EditorType> = new Set([
  'text',
  'number',
  'year',
  'range',
  'coords',
  'choice',
  'chords',
]);

/**
 * Editors edit in place too, and every edit they make is a proposal for an
 * admin to review. Off, their cells lock with "Propose changes in the row
 * panel" (design §6).
 */
export const INLINE_EDIT_FOR_EDITORS = true;

interface EditorBase {
  /** The field the row panel anchors to (`?field=`): the column's path. */
  path: string;
  /** A field the contract does not take yet; `lockOf` holds it until then. */
  since?: SchemaStep;
}

/**
 * What a cell edits, and how. Every editor names its `path`; the rest is
 * what that editor needs:
 *
 *  - `text` — `required` for a name or title; `parse` for a YouTube id.
 *  - `number` — with bounds when the field has them (Popularity 0–100).
 *  - `range` — `path` is the first year, `to` the last.
 *  - `choice` — its `options`.
 *  - `one`, `many` — the node kinds it picks; a `one` whose display text
 *    follows the id (C20) names it (`text`), and the song's Label goes to
 *    its record's label through `onRecord` when the song is on one.
 *  - `refs` — a list of objects, each naming a node by `key`.
 *  - `tags` — toggles over a fixed vocabulary.
 *  - `credits` — the song's credits of one role.
 *  - `chords` — a progression's chords, as chips; a write sets the fields
 *    that follow from them too (`CHORD_FIELD_PATHS`).
 *  - `relation` — the item that states it (`owner`, its `path`), the link
 *    that writes it (`link`, when `links.ts` has one) and the column's part
 *    that owner states (`part`): the chips of other parts are read-only.
 *  - `panel`, `none` — no cell editor; `why` says so in words.
 */
export type CellEditor = EditorBase &
  (
    | {
        type: 'text';
        required?: true;
        parse?: 'youtube-id';
        also?: readonly string[];
      }
    | { type: 'number'; min?: number; max?: number }
    | { type: 'year' }
    | { type: 'range'; to: string }
    | { type: 'coords' }
    | { type: 'choice'; options: readonly ChoiceOption[] }
    | {
        type: 'one';
        kinds: readonly EntityKind[];
        text?: string;
        onRecord?: LinkId;
      }
    | { type: 'many'; kinds: readonly EntityKind[] }
    | { type: 'refs'; kinds: readonly EntityKind[]; key: string }
    | { type: 'tags'; vocabulary: TagVocabulary }
    | { type: 'textChips' }
    | { type: 'credits'; role: CreditRole }
    | { type: 'born' }
    | { type: 'chords' }
    | {
        type: 'relation';
        owner: ContentKind;
        link?: LinkId;
        part?: string;
      }
    | { type: 'panel'; why: string }
    | { type: 'none'; why: string }
  );

/* ── Deriving the editor ─────────────────────────────────────────────── */

/**
 * The lists of objects a refs cell adds and removes entries of, by the
 * field each entry names its node with (as `links.ts` and the suggestions'
 * identity rule name them).
 */
const REF_KEYS: Readonly<Record<string, string>> = {
  members: 'artistId',
  influencedBy: 'artistId',
  releases: 'releaseId',
};

/**
 * How each field format edits. A birth date and place is a composite a
 * column declares (`born`); a song's key is the chart's (edited on its
 * page, never here); the catalogue ids are several values with their own
 * checks, so the panel edits them.
 */
const BY_FORMAT: Readonly<
  Record<
    FieldFormat,
    'text' | 'textChips' | 'year' | 'number' | 'range' | 'coords' | 'panel'
  >
> = {
  text: 'text',
  list: 'textChips',
  year: 'year',
  number: 'number',
  yearRange: 'range',
  coordinates: 'coords',
  // A yes or no has no box of its own yet: the panel's checkbox sets it.
  flag: 'panel',
  born: 'panel',
  songKey: 'panel',
  ids: 'panel',
};

const PANEL_WHY =
  'Edited in the row’s panel: the value says more than a cell can.';

const fileName = (path: string) => path.split('/').pop() ?? path;

/** The column's part its row states: what a picker picks. */
const statedPart = (source: ColumnSource): ConnectionPart | undefined =>
  source.type === 'connections'
    ? source.parts.find((part) => part.role === 'stated')
    : undefined;

/** The one-step part another item states, for a relation's chips. */
const ownerPart = (source: ColumnSource): ConnectionPart | undefined =>
  source.type === 'connections'
    ? source.parts.find(
        (part) =>
          (part.role === 'fact' || part.role === 'stated') &&
          part.hops.length === 1,
      )
    : undefined;

type RowEdit = Extract<ColumnEdit, { by: 'row' }>;

/** A column's declared editor (`cell`), filled in from its edit. */
function declared(edit: RowEdit, base: EditorBase): CellEditor | undefined {
  const { cell } = edit;
  if (!cell) return undefined;
  switch (cell.editor) {
    case 'panel':
      return { ...base, type: 'panel', why: 'Edited in the row’s panel.' };
    case 'born':
      return { ...base, type: 'born' };
    case 'textChips':
      return { ...base, type: 'textChips' };
    case 'text':
      return { ...base, type: 'text', parse: cell.parse };
    case 'number':
      return { ...base, type: 'number', min: cell.min, max: cell.max };
    case 'choice':
      return { ...base, type: 'choice', options: cell.options };
    case 'tags':
      return { ...base, type: 'tags', vocabulary: cell.vocabulary };
    case 'credits':
      return { ...base, type: 'credits', role: cell.role };
    case 'chords':
      return { ...base, type: 'chords' };
    case 'one':
      return {
        ...base,
        type: 'one',
        kinds: cell.kinds,
        onRecord: cell.onRecord,
        ...followingText(edit),
      };
  }
}

/**
 * The display text a v2 id replaces (types.ts, `ColumnEdit.also`): it
 * follows the id while it is still the record's name (C20), as a link's
 * does. A `one` column's single `also`, on a field that waits for a schema
 * step.
 */
const followingText = (edit: RowEdit): { text?: string } =>
  edit.since && edit.also?.length === 1 ? { text: edit.also[0] } : {};

/** The editor a row column's source and path imply. */
function derived(
  column: ColumnDef,
  edit: RowEdit,
  base: EditorBase,
): CellEditor {
  const { source } = column;
  switch (source.type) {
    case 'title':
      return {
        ...base,
        type: 'text',
        required: true,
        ...(edit.also ? { also: edit.also } : {}),
      };
    case 'field': {
      const type = BY_FORMAT[source.format];
      // A range's end is the field's `to`, which its edit also names.
      const to = source.to ?? edit.also?.[0];
      if (type === 'range')
        return to
          ? { ...base, type, to }
          : { ...base, type: 'panel', why: PANEL_WHY };
      if (type === 'panel') return { ...base, type, why: PANEL_WHY };
      return { ...base, type };
    }
    case 'connections': {
      const part = statedPart(source);
      const kinds = part ? part.hops[0].to : [];
      if (!edit.path.endsWith('[]'))
        return { ...base, type: 'one', kinds, ...followingText(edit) };
      const list = edit.path.slice(0, -2);
      const key = Object.prototype.hasOwnProperty.call(REF_KEYS, list)
        ? REF_KEYS[list]
        : undefined;
      return key
        ? { ...base, type: 'refs', kinds, key }
        : { ...base, type: 'many', kinds };
    }
    case 'years':
    case 'credits':
      return { ...base, type: 'panel', why: PANEL_WHY };
  }
}

/**
 * The editor a table's column opens in its cells. Every column has one:
 * `panel` and `none` say, in words, where it is edited instead.
 */
export function editorFor(def: TableDef, column: ColumnDef): CellEditor {
  const { edit, source } = column;
  switch (edit.by) {
    case 'row': {
      const base: EditorBase = {
        path: edit.path,
        ...(edit.since ? { since: edit.since } : {}),
      };
      return declared(edit, base) ?? derived(column, edit, base);
    }
    case 'owner': {
      const link = linkFor(def.id, column.id);
      const part = link?.part ?? ownerPart(source)?.id;
      return {
        type: 'relation',
        path: edit.path,
        ...(edit.since ? { since: edit.since } : {}),
        owner: edit.kind,
        ...(link ? { link: link.id } : {}),
        ...(part ? { part } : {}),
      };
    }
    case 'code':
      return {
        type: 'none',
        path: column.id,
        why: `In code: ${fileName(edit.file)}.`,
      };
    case 'page':
      return { type: 'none', path: column.id, why: 'Edited on its page.' };
    case 'none':
      return {
        type: 'none',
        path: column.id,
        why: 'Counted from other rows: it changes when they do.',
      };
  }
}

/** Whether a cell edits in place in this release, or opens the row instead. */
export const editsInCell = (editor: CellEditor): boolean =>
  SCALAR_EDITORS.has(editor.type);

/* ── Whether it can be written now ───────────────────────────────────── */

/** What `lockOf` needs to know beyond the row and the column. */
export interface LockContext {
  def: TableDef;
  mode: WorkingGraphMode;
  /** The server's capabilities have loaded. */
  known: boolean;
  isServed: (kind: ContentKind) => boolean;
  schemaVersionOf: (kind: ContentKind) => number;
  isEditor: boolean;
  /**
   * Whose proposal the row's item carries. The rows alone cannot tell an
   * editor's own from another's (the export swaps their own in), so the
   * caller says; `adminProposalOf` is the answer for an admin.
   */
  proposalOf: (row: TableRow) => ProposalOwner;
  /** `INLINE_EDIT_FOR_EDITORS` unless a test says otherwise. */
  inlineForEditors?: boolean;
}

/** For an admin, any proposal on an item is someone else's. */
export const adminProposalOf = (row: TableRow): ProposalOwner =>
  row.editState ? 'other' : null;

/** Why a cell cannot be written now; `step` when a schema step holds it. */
export interface CellLock {
  /** Empty while the capabilities load: locked, with nothing to say yet. */
  reason: string;
  step?: SchemaStep;
}

/**
 * Why this row's cell cannot be written now, or null when it can: what
 * the column is (code, a page, a count), the item (repo mode, a kind the
 * API does not serve, a proposal on it — `readOnlyReason`, the row panel's
 * rule), then the field (`waitingFor`). A relation writes other items, so
 * only their kind and the mode hold it here; a proposal on one of them
 * stops that write when it is made.
 */
export function lockOf(
  row: TableRow,
  column: ColumnDef,
  ctx: LockContext,
): CellLock | null {
  const editor = editorFor(ctx.def, column);
  if (editor.type === 'none') return { reason: editor.why };
  if (ctx.isEditor && !(ctx.inlineForEditors ?? INLINE_EDIT_FOR_EDITORS))
    return { reason: 'Propose changes in the row panel.' };
  if (row.status === 'missing' || !row.body)
    return {
      reason:
        'Found nowhere: something names it, but there is no item to edit.',
    };
  const relation = editor.type === 'relation';
  const kind = relation ? editor.owner : ctx.def.contentKind;
  if (!kind)
    return {
      reason: 'Read-only: no content item stores these rows.',
    };
  const reason = readOnlyReason({
    mode: ctx.mode,
    kind,
    served: ctx.isServed(kind),
    known: ctx.known,
    proposal: relation ? null : ctx.proposalOf(row),
    sentBack: !relation && row.editState === 'rejected',
    isEditor: ctx.isEditor,
  });
  if (reason !== null) return { reason };
  const step = waitingFor(editor.since, ctx.schemaVersionOf);
  if (step)
    return {
      reason: `Not saveable yet: it comes with ${SCHEMA_STEP[step]}.`,
      step,
    };
  return null;
}
