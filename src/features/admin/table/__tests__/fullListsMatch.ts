import { expect } from 'vitest';
import type { EntityId } from '@/content/graph/types';
import { walkContext } from '../model/aggregate';
import type { TableInput } from '../model/buildTableModel';
import { CHIP_LIMIT, type TableModel } from '../model/types';
import { columnInFull, entryOrder, startsFor } from '../panel/fullConnections';

/**
 * Every connections column of every row, walked in full, against the cell
 * the model built: the same total, and its first `CHIP_LIMIT` entries in chip
 * order are the cell's chips.
 */
export function expectFullListsMatchCells(
  input: TableInput,
  model: TableModel,
  narrow?: EntityId,
): number {
  const { def } = model;
  const ctx = walkContext(
    input.graph,
    narrow && def.narrow ? { hop: def.narrow.hop, node: narrow } : undefined,
  );
  let checked = 0;
  for (const row of model.rows) {
    for (const column of def.columns) {
      if (column.source.type !== 'connections') continue;
      const cell = row.cells[column.id];
      if (cell.type !== 'connections') throw new Error(column.id);
      const full = columnInFull(
        ctx,
        startsFor(input.graph, def, row.node, column.source),
        column.source.parts,
      );
      const where = `${def.id} ${row.key} ${column.id}`;
      const entries = full.parts.flatMap((part) =>
        part.entries.map((entry) => ({ ...entry, part: part.id })),
      );
      expect(entries, where).toHaveLength(full.total);
      expect(full.total, where).toBe(cell.total);
      expect(
        [...entries]
          .sort(entryOrder)
          .slice(0, CHIP_LIMIT)
          .map(({ node, label, style, part, weight, muted, tag, title }) => ({
            node,
            label,
            style,
            part,
            weight,
            ...(muted ? { muted } : {}),
            ...(tag ? { tag } : {}),
            title,
          })),
        where,
      ).toEqual(cell.chips);
      checked += 1;
    }
  }
  return checked;
}
