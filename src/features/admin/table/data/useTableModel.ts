import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Graph } from '@/content/graph/deriveGraph';
import type { EntityId } from '@/content/graph/types';
import {
  useWorkingGraph,
  type WorkingGraphMode,
} from '../../content/graph/useWorkingGraph';
import {
  useWorkingGraphStatus,
  type WorkingGraphStatus,
} from '../../content/graph/workingGraphStatus';
import type { NarrowChoice } from '../grid/TableToolbar';
import { parseTableQuery } from '../grid/tableQuery';
import {
  getTableModel,
  narrowChoices,
  type TableInput,
  type TableSuggestions,
} from '../model/buildTableModel';
import { tableDef } from '../model/categories';
import type { TableModel } from '../model/types';
import type { TableId } from '../tableIds';

/**
 * One table's model, from the working graph (Table design §3.3): the graph
 * the Table, the mind map and Integrity share (`useWorkingGraph`), built into
 * the table's rows and cells for the narrowing the URL asks for.
 *
 * The build is cached per graph (`getTableModel`), so switching tables and
 * back, or re-rendering while typing, costs nothing after the first time,
 * and a save's rebuilt graph starts afresh. While a rebuild is under way the
 * last graph's model keeps showing (`isRefreshing`).
 */

export interface TableModelState {
  /** Absent until a graph has been built. */
  model?: TableModel;
  /** The graph the model was built from; the row panel walks it in full. */
  graph?: Graph;
  /** The node the counts are narrowed to (Key: a mode), when the URL names a real one. */
  narrow?: EntityId;
  /** What the table can be narrowed to, for a table that can be. */
  narrowChoices?: readonly NarrowChoice[];
  /** The working copy, or the repo's snapshot (read-only). */
  mode: WorkingGraphMode;
  /**
   * Which copy shows and why — the same answer the mind map and Integrity
   * give (`workingGraphStatus`), for the toolbar's badge and the notice:
   * with `/export` served, repo mode is a wait or a failure; without it,
   * repo mode is all this API offers (production today).
   */
  status: WorkingGraphStatus;
  /** A song pin's key → its item's id, for the row panel's links to a pin. */
  pins?: ReadonlyMap<string, string>;
  /** Nothing to show yet. */
  isLoading: boolean;
  /** What shows is the last build's; a newer one is on its way. */
  isRefreshing: boolean;
  error: unknown;
}

/**
 * `suggestions` are the table's open suggestions (`useTableSuggestions`):
 * each row's count, its ghosts and its bulk accepts waiting for review. A
 * change to them rebuilds the table's model, not the graph.
 */
export function useTableModel(
  table: TableId,
  suggestions?: TableSuggestions,
): TableModelState {
  const working = useWorkingGraph();
  const status = useWorkingGraphStatus(working);
  const { graph, snapshot, items } = working;
  const def = tableDef(table);
  const [params] = useSearchParams();
  const asked = parseTableQuery(def, params).narrow;

  // One input per build: the model's cache checks the snapshot and items it
  // was built with by identity, so a new object each render would rebuild.
  const input = useMemo<TableInput | null>(
    () => (graph ? { graph, snapshot, items, suggestions } : null),
    [graph, snapshot, items, suggestions],
  );

  const choices = useMemo(
    () => (input && def.narrow ? narrowChoices(input, table) : undefined),
    [input, def.narrow, table],
  );

  // A link to a mode the graph no longer has would count nothing in every
  // column; the table shows unnarrowed instead.
  const narrow =
    asked && choices?.some((choice) => choice.node === asked)
      ? asked
      : undefined;

  const model = useMemo(
    () => (input ? getTableModel(input, table, { narrow }) : undefined),
    [input, table, narrow],
  );

  return {
    model,
    graph,
    narrow,
    narrowChoices: choices,
    mode: working.mode,
    status,
    pins: working.pins,
    isLoading: working.isLoading,
    isRefreshing: working.isRefreshing,
    error: working.error,
  };
}
