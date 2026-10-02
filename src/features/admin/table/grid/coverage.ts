import { storedColumns } from '../model/categories';
import { coverageOf } from '../model/query';
import type { TableModel } from '../model/types';

/**
 * The coverage strip's entries: for each stored column showing, how many of
 * the listed rows state it — "City 0/907" — and, of the rows that do not,
 * how many show something that could become the value: "song pins ≈250".
 *
 * The "≈" counts are what the other parts of the column reach on a row with
 * nothing stated: the song-pin city of an artist with no City, the genres
 * of their songs, the years of their events — and the rows with a
 * suggestion waiting for it ("suggested ≈40"). They are candidates, not
 * values (one owner per fact), so they are counted apart and never added to
 * the filled count — that only moves when a value is stated, a suggestion
 * accepted.
 */

/** The stand-in the open suggestions for a column are counted under. */
export const SUGGESTED = 'suggested';

export interface StandIn {
  /** The part's own name, as the provenance line uses it: 'song pins'. */
  label: string;
  /** Rows with nothing stated that this part shows something for. */
  count: number;
}

export interface CoverageEntry {
  column: string;
  label: string;
  filled: number;
  total: number;
  standIns: readonly StandIn[];
  /** The column's missing-value filter, which clicking the entry toggles. */
  filter?: string;
}

/**
 * The strip over the rows a query shows (`order`), for the stored columns in
 * `shown` (the Columns menu's choice), in the table's column order. Missing
 * and archived rows are left out, as `coverageOf` leaves them out.
 */
export function coverageEntries(
  model: TableModel,
  order: Int32Array,
  shown: ReadonlySet<string>,
): CoverageEntry[] {
  const { def, rows } = model;
  const columns = storedColumns(def).filter((c) => shown.has(c.id));
  if (columns.length === 0) return [];
  const counts = coverageOf(model, order);

  const standIns = new Map<string, Map<string, number>>();
  for (const column of columns) standIns.set(column.id, new Map());
  // Rows with a suggestion for the column: said last, after what the
  // column's own parts reach.
  const suggested = new Map<string, number>();
  for (const index of order) {
    const row = rows[index];
    if (row.status === 'missing' || row.status === 'archived') continue;
    for (const column of columns) {
      const cell = row.cells[column.id];
      if (!cell || cell.filled) continue;
      const byLabel = standIns.get(column.id)!;
      if (cell.ghosts?.length)
        suggested.set(column.id, (suggested.get(column.id) ?? 0) + 1);
      if (cell.type === 'connections') {
        for (const part of cell.parts) {
          if (part.part === 'stated') continue;
          byLabel.set(part.label, (byLabel.get(part.label) ?? 0) + 1);
        }
      } else if (
        cell.type === 'field' &&
        cell.hint &&
        column.source.type === 'field' &&
        column.source.hint
      ) {
        const label = column.source.hint.label;
        byLabel.set(label, (byLabel.get(label) ?? 0) + 1);
      }
    }
  }

  return columns.map((column) => {
    const filter = def.filters.find(
      (f) => f.rule.type === 'missing' && f.rule.column === column.id,
    );
    return {
      column: column.id,
      label: column.label,
      filled: counts[column.id]?.filled ?? 0,
      total: counts[column.id]?.total ?? 0,
      standIns: [
        ...[...standIns.get(column.id)!].map(([label, count]) => ({
          label,
          count,
        })),
        ...(suggested.get(column.id)
          ? [{ label: SUGGESTED, count: suggested.get(column.id)! }]
          : []),
      ],
      ...(filter ? { filter: filter.id } : {}),
    };
  });
}
