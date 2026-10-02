import type { MutableRefObject } from 'react';
import type { CellValues, ScalarEditor } from '../cellValues';

/**
 * What the grid and a cell's editor say to each other. Types only, so the
 * grid can name them without loading the editors: those are the Table's
 * third chunk, loaded on the first edit (`CellEditorHost`).
 *
 * The editor keeps its draft to itself — typing re-renders the editor and
 * nothing else — and hands the grid a way to read it (`handle`), for an
 * edit that ends without its own keys: focus moving elsewhere on the page,
 * or the row scrolling out of the rendered range.
 */

/** Where the active cell goes once an edit is written. */
export type EditMove = 'down' | 'up' | 'right' | 'left' | 'none';

/** What an editor holds, as the grid reads it. */
export type EditorRead =
  /** Values to write: the draft reads as the cell's field(s). */
  | { type: 'commit'; values: CellValues }
  /** The draft cannot be written, and why. */
  | { type: 'invalid'; message: string }
  /** Nothing to write: a choice is written when it is picked. */
  | { type: 'cancel' };

export interface EditorHandle {
  read(): EditorRead;
}

export interface CellEditorProps {
  editor: ScalarEditor;
  /** The column's label, for what the editor says: "Year". */
  name: string;
  /** The editor's accessible name: "‹Column›, ‹Row›". */
  label: string;
  /** What the cell holds now (the overlay's, else the row's). */
  values: CellValues;
  /**
   * The key that started the edit, which replaces the value (a text cell)
   * or starts the search (a choice).
   */
  seed?: string;
  /** Where the editor leaves its draft for the grid to read. */
  handle: MutableRefObject<EditorHandle | null>;
  /** Enter, Tab and their Shift twins with a draft that reads, or a pick. */
  onCommit(values: CellValues, move: EditMove): void;
  /** Esc: the cell goes back to what it held. */
  onCancel(): void;
  /**
   * Focus left the editor for somewhere else on the page (never another
   * window or tab): the grid reads the draft and writes it if it can.
   */
  onLeave(): void;
}
