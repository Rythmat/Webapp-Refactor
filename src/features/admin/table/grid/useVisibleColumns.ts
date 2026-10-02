import { useCallback, useMemo, useState } from 'react';
import type { ColumnDef, TableDef } from '../model/types';
import type { TableId } from '../tableIds';

/**
 * Which columns a table shows: its defaults (the owner's list, or the
 * proposed columns of an "Etc." table) until the Columns menu says otherwise,
 * remembered per table in this browser.
 *
 * Stored as `{ [tableId]: columnIds }` under one key. Storage can be missing
 * or refuse (a private window, a full quota, a test), so every read and
 * write is guarded and a failure just means the defaults: the choice is a
 * convenience, never state anything depends on. A stored id the table no
 * longer has is dropped; one it gained since is off until chosen.
 */

export const COLUMNS_STORAGE_KEY = 'ma-console-table-columns-v1';

type Stored = Partial<Record<TableId, readonly string[]>>;

function readStored(): Stored {
  try {
    const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const stored: Stored = {};
    for (const [table, ids] of Object.entries(value)) {
      if (Array.isArray(ids) && ids.every((id) => typeof id === 'string')) {
        stored[table as TableId] = ids;
      }
    }
    return stored;
  } catch {
    return {};
  }
}

function writeStored(stored: Stored): void {
  try {
    if (Object.keys(stored).length === 0) {
      window.localStorage.removeItem(COLUMNS_STORAGE_KEY);
    } else {
      window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(stored));
    }
  } catch {
    // Not remembered this time; the choice still holds until the page closes.
  }
}

/** The non-title columns a table shows by default, in its order. */
const defaultIds = (def: TableDef): string[] =>
  def.columns
    .filter((c) => c.source.type !== 'title' && c.defaultVisible)
    .map((c) => c.id);

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

export interface VisibleColumns {
  /** The columns to draw: the title first, then the chosen ones in the table's order. */
  columns: readonly ColumnDef[];
  /** Every column id showing, the title's included. */
  shown: ReadonlySet<string>;
  /** Show a hidden column, or hide a shown one (never the title). */
  toggle(id: string): void;
  /** Back to the table's defaults. */
  reset(): void;
  /** Showing exactly the defaults. */
  isDefault: boolean;
}

export function useVisibleColumns(def: TableDef): VisibleColumns {
  const [stored, setStored] = useState<Stored>(readStored);

  const chosen = useMemo(() => {
    const ids = stored[def.id];
    if (!ids) return defaultIds(def);
    const wanted = new Set(ids);
    // The table's order, not the order they were ticked in.
    return def.columns
      .filter((c) => c.source.type !== 'title' && wanted.has(c.id))
      .map((c) => c.id);
  }, [stored, def]);

  const columns = useMemo(() => {
    const wanted = new Set(chosen);
    return def.columns.filter(
      (c) => c.source.type === 'title' || wanted.has(c.id),
    );
  }, [chosen, def]);

  const shown = useMemo(() => new Set(columns.map((c) => c.id)), [columns]);

  const save = useCallback(
    (ids: readonly string[]) => {
      setStored((current) => {
        const next: Stored = { ...current };
        if (sameIds(ids, defaultIds(def))) delete next[def.id];
        else next[def.id] = ids;
        writeStored(next);
        return next;
      });
    },
    [def],
  );

  const toggle = useCallback(
    (id: string) => {
      const column = def.columns.find((c) => c.id === id);
      if (!column || column.source.type === 'title') return;
      const on = chosen.includes(id);
      const wanted = new Set(
        on ? chosen.filter((c) => c !== id) : [...chosen, id],
      );
      save(
        def.columns
          .filter((c) => c.source.type !== 'title' && wanted.has(c.id))
          .map((c) => c.id),
      );
    },
    [chosen, def, save],
  );

  const reset = useCallback(() => save(defaultIds(def)), [def, save]);

  return {
    columns,
    shown,
    toggle,
    reset,
    isDefault: sameIds(chosen, defaultIds(def)),
  };
}
