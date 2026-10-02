import {
  optionalYear,
  parseCoordinates,
  yearsBackwards,
} from '../../../content/recordEditors/parse';
import { extractYouTubeId } from '../../../content/visual/youTubeId';
import type { CellValues, ScalarEditor } from '../cellValues';
import type { EditorRead } from './types';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  A cell's draft: the text it starts from, and what the typed text writes
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The inline editors are one text box each, whatever the field: a year, a
 * span ("1961–1984"), coordinates ("42.33, -83.05"). `draftOf` writes the
 * cell's values as that text; `readDraft` reads the text back as values,
 * or says why it cannot be written — by the same rules the row panel's
 * fields check (`recordEditors/parse.ts`, the YouTube link field's reader).
 *
 *  - `text` — trimmed; blank takes an optional field away, and a required
 *    name or title cannot be emptied. A Video cell takes a YouTube address
 *    and stores its id.
 *  - `number` — a whole number, within the column's bounds (Popularity
 *    0–100); blank takes it away.
 *  - `year` — a whole year (read by `optionalYear`); blank takes it away.
 *  - `range` — "1961–1984", "1961–" while it lasts, "–1984" when only the
 *    end is known, or one year for the start; a span that ends before it
 *    starts is refused (`yearsBackwards`); blank takes both away.
 *  - `coords` — "lat, lng", read by the panel's own parser. The only
 *    coordinates a cell edits are a place's, which the globe requires, so
 *    blank is refused, and so is 0, 0 (a new place's placeholder).
 *
 * A choice has no draft to read: it is written when an option is picked.
 *
 * Pure: no React (the purity test holds this).
 */

/** The editors that are a text box. */
export type InlineEditor = Exclude<
  ScalarEditor,
  { type: 'choice' } | { type: 'chords' }
>;

const DASH = '–';

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === '';

const plain = (value: unknown): string => (isEmpty(value) ? '' : String(value));

/** The text an editor starts from: the cell's values as typed. */
export function draftOf(editor: InlineEditor, values: CellValues): string {
  switch (editor.type) {
    case 'range': {
      const from = plain(values[editor.path]);
      const to = plain(values[editor.to]);
      return from || to ? `${from}${DASH}${to}` : '';
    }
    case 'coords': {
      const value = values[editor.path];
      return Array.isArray(value) && value.length === 2
        ? `${plain(value[0])}, ${plain(value[1])}`
        : '';
    }
    default:
      return plain(values[editor.path]);
  }
}

const commit = (values: CellValues): EditorRead => ({
  type: 'commit',
  values,
});

const invalid = (message: string): EditorRead => ({
  type: 'invalid',
  message,
});

/** A whole year as typed: up to four digits. */
const YEAR = /^\d{1,4}$/;

/** "1961–1984", "1961-", "–1984", "1961 to 1984". */
const SPAN = /^(\d{1,4})?\s*(?:[-–—]|to)\s*(\d{1,4})?$/i;

function readText(
  editor: Extract<InlineEditor, { type: 'text' }>,
  typed: string,
  name: string,
): EditorRead {
  if (editor.parse === 'youtube-id') {
    if (!typed) return commit({ [editor.path]: undefined });
    const id = extractYouTubeId(typed);
    return id
      ? commit({ [editor.path]: id })
      : invalid(`${name} takes a YouTube address or an 11-character video id.`);
  }
  if (!typed && editor.required) return invalid(`${name} cannot be empty.`);
  return commit({ [editor.path]: typed || undefined });
}

function readNumber(
  editor: Extract<InlineEditor, { type: 'number' }>,
  typed: string,
  name: string,
): EditorRead {
  if (!typed) return commit({ [editor.path]: undefined });
  const { min, max } = editor;
  const bounds =
    min !== undefined && max !== undefined
      ? ` from ${min} to ${max}`
      : min !== undefined
        ? ` from ${min} up`
        : max !== undefined
          ? ` up to ${max}`
          : '';
  const refused = invalid(`${name} is a whole number${bounds}.`);
  if (!/^-?\d+$/.test(typed)) return refused;
  const n = Number(typed);
  if ((min !== undefined && n < min) || (max !== undefined && n > max))
    return refused;
  return commit({ [editor.path]: n });
}

function readYear(path: string, typed: string, name: string): EditorRead {
  if (!typed) return commit({ [path]: undefined });
  const year = YEAR.test(typed) ? optionalYear(typed) : undefined;
  return year === undefined
    ? invalid(`${name} is a year, like 1983.`)
    : commit({ [path]: year });
}

function readRange(
  editor: Extract<InlineEditor, { type: 'range' }>,
  typed: string,
  name: string,
): EditorRead {
  if (!typed)
    return commit({ [editor.path]: undefined, [editor.to]: undefined });
  // One year alone is where the span starts: "1970" reads as "1970–".
  const span = YEAR.test(typed) ? { 1: typed, 2: undefined } : SPAN.exec(typed);
  if (!span || (!span[1] && !span[2]))
    return invalid(
      `${name} is a span of years, like 1961–1984, or 1961– while it lasts.`,
    );
  const from = span[1] ? optionalYear(span[1]) : undefined;
  const to = span[2] ? optionalYear(span[2]) : undefined;
  if (yearsBackwards(from, to))
    return invalid(`${name} ends before it starts: ${from}–${to}.`);
  return commit({ [editor.path]: from, [editor.to]: to });
}

function readCoords(path: string, typed: string, name: string): EditorRead {
  if (!typed) return invalid(`${name} cannot be empty: a place needs its pin.`);
  const halves = typed.split(/\s*[,;]\s*|\s+/).filter(Boolean);
  const pair =
    halves.length === 2 ? parseCoordinates([halves[0], halves[1]]) : undefined;
  if (!pair)
    return invalid(
      'Needs both: latitude −90 to 90, then longitude −180 to 180, like 42.33, -83.05.',
    );
  if (pair[0] === 0 && pair[1] === 0)
    return invalid('0, 0 is not a place: set its coordinates.');
  return commit({ [path]: pair });
}

/**
 * What the typed text writes, or why it cannot be written. `name` is the
 * column's label, for the message.
 */
export function readDraft(
  editor: InlineEditor,
  text: string,
  name: string,
): EditorRead {
  const typed = text.trim();
  switch (editor.type) {
    case 'text':
      return readText(editor, typed, name);
    case 'number':
      return readNumber(editor, typed, name);
    case 'year':
      return readYear(editor.path, typed, name);
    case 'range':
      return readRange(editor, typed, name);
    case 'coords':
      return readCoords(editor.path, typed, name);
  }
}
