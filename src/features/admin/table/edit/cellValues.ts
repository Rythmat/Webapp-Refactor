import { getPath, setPath } from '@/content/bodyPaths';
import type { Graph } from '@/content/graph/deriveGraph';
import { CHORD_FIELD_PATHS } from '@/curriculum/engine/progressionValidation';
import { sameValue } from '../../content/itemEditor/rebase';
import { formatField } from '../model/buildTableModel';
import type { CellValue, ColumnDef } from '../model/types';
import type { CellOverlay } from './cellEditStore';
import type { CellOp } from './cellOps';
import { type CellEditor, SCALAR_EDITORS } from './editorFor';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  A scalar cell's values: what it holds, what an edit writes, what it shows
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A cell that edits in place (a title, a year, a span of years, a number,
 * coordinates, one of a list, a progression's chords) holds one or more
 * body fields: its editor's `path`, a span's end (`to`), and the fields a
 * progression derives from its chords (`CHORD_FIELD_PATHS`), which a chords
 * write sets with them. This module speaks of them as values by
 * path — `{ year: 1983 }`, `{ activeFrom: 1961, activeTo: 1984 }` — which
 * is what an editor hands back, what a commit writes (one `set` op per
 * field that changed, resting on what the author saw) and what the cell
 * shows while the write is on its way (the store's overlay, formatted the
 * way the next model will format it: `formatField`).
 *
 * What the author saw is the overlay where the cell has one (their own
 * edit, not yet in the rows), else the row's body. The row's body is lean
 * (a song's chart is left out of the export), but every scalar field is in
 * it, and it is never written back: the write queue re-reads the item whole.
 *
 * Pure: no React (the purity test holds this).
 */

/** The editors that edit in the cell in this release (`SCALAR_EDITORS`). */
export type ScalarEditor = Extract<
  CellEditor,
  {
    type: 'text' | 'number' | 'year' | 'range' | 'coords' | 'choice' | 'chords';
  }
>;

export const isScalarEditor = (editor: CellEditor): editor is ScalarEditor =>
  SCALAR_EDITORS.has(editor.type);

/** A cell's values, by body path. A value taken away is `undefined`. */
export type CellValues = Readonly<Record<string, unknown>>;

type Body = Readonly<Record<string, unknown>>;

/**
 * The body fields a scalar cell holds: its path, a span's end, and what a
 * progression's chords derive.
 */
export const pathsOf = (editor: ScalarEditor): readonly string[] =>
  editor.type === 'range'
    ? [editor.path, editor.to]
    : editor.type === 'chords'
      ? CHORD_FIELD_PATHS
      : [editor.path];

const has = (record: object, key: string) =>
  Object.prototype.hasOwnProperty.call(record, key);

/**
 * What the cell holds now: the overlay's value where the cell has one (an
 * edit not yet in the rows), else the row body's.
 */
export function valuesOf(
  editor: ScalarEditor,
  body: Body | undefined,
  overlay?: CellOverlay,
): CellValues {
  return Object.fromEntries(
    pathsOf(editor).map((path) => [
      path,
      overlay && has(overlay, path) ? overlay[path] : getPath(body, path),
    ]),
  );
}

/** Nothing in any of the cell's fields. */
export const isBlank = (values: CellValues): boolean =>
  Object.values(values).every(
    (value) => value === undefined || value === null || value === '',
  );

/** The values that clear the cell: every field it holds taken away. */
export const clearedValues = (editor: ScalarEditor): CellValues =>
  Object.fromEntries(pathsOf(editor).map((path) => [path, undefined]));

/**
 * Why Delete cannot clear this cell, or null when it can. A required name
 * or title cannot be emptied; every list the choice cells pick from today
 * (a record's format, a place's region, a progression's complexity) is a
 * field the schema requires; and a place without coordinates has no pin.
 * `name` is the column's label.
 */
export function clearRefusal(
  editor: ScalarEditor,
  name: string,
): string | null {
  switch (editor.type) {
    case 'text':
      return editor.required ? `${name} cannot be empty.` : null;
    case 'choice':
      return `${name} cannot be empty: pick another with Enter.`;
    case 'coords':
      return `${name} cannot be empty: a place needs its pin.`;
    case 'chords':
      return `${name} cannot be empty: a progression is its chords.`;
    default:
      return null;
  }
}

/**
 * The ops that write `values` over what the author saw: one `set` per
 * field that changed, resting on what they saw there. None when nothing
 * did.
 */
export function opsFor(seen: CellValues, values: CellValues): CellOp[] {
  return Object.keys(values)
    .filter((path) => !sameValue(values[path], seen[path]))
    .map((path) => ({
      op: 'set' as const,
      path,
      value: values[path],
      seen: seen[path],
    }));
}

/** The body with the cell's values laid over it, for formatting them. */
export function bodyWith(
  body: Body | undefined,
  values: CellValues,
): Record<string, unknown> {
  let next: Record<string, unknown> = { ...body };
  for (const [path, value] of Object.entries(values))
    next = setPath(next, path, value);
  return next;
}

/**
 * The cell's values as its column shows them: a title as it reads, a
 * choice by its option's label, a field as the model formats it. Undefined
 * when the cell shows nothing.
 */
export function displayOf(
  column: ColumnDef,
  editor: ScalarEditor,
  values: CellValues,
  body: Body | undefined,
  graph: Graph | undefined,
): string | undefined {
  const value = values[editor.path];
  if (editor.type === 'choice') {
    if (value === undefined || value === null || value === '') return undefined;
    return (
      editor.options.find((option) => option.value === value)?.label ??
      String(value)
    );
  }
  if (column.source.type === 'field')
    return formatField(graph, column.source, bodyWith(body, values)).text;
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

/**
 * What a cell with an edit on its way shows instead of the model's value:
 * the overlay's values, formatted as the next model will format them. The
 * title's is a label (TitleCell draws the rest of the row as it is); any
 * other cell becomes a plain field — its hint kept, its suggestions gone,
 * since the edit states the value.
 */
export function overlaidCell(
  cell: CellValue | undefined,
  column: ColumnDef,
  editor: ScalarEditor,
  overlay: CellOverlay,
  body: Body | undefined,
  graph: Graph | undefined,
): { label: string } | { cell: CellValue } {
  const values = valuesOf(editor, body, overlay);
  const text = displayOf(column, editor, values, body, graph);
  if (column.source.type === 'title') return { label: text ?? '' };
  return {
    cell: {
      type: 'field',
      ...(text !== undefined ? { text } : {}),
      sort: text ?? null,
      filled: text !== undefined,
      ...(text === undefined ? { note: column.empty } : {}),
      ...(cell?.type === 'field' && cell.hint ? { hint: cell.hint } : {}),
    },
  };
}

/**
 * One line for the toast and the live region: "Year of Africa: 1982 →
 * 1983", "Title: Africa → Africa (live)". A field emptied reads "—".
 */
export function summaryOf(
  column: ColumnDef,
  rowLabel: string,
  before: string | undefined,
  after: string | undefined,
): string {
  const what =
    column.source.type === 'title'
      ? column.label
      : `${column.label} of ${rowLabel}`;
  return `${what}: ${before ?? '—'} → ${after ?? '—'}`;
}
