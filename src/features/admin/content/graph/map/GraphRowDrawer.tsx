import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { EntityId } from '@/content/graph/types';
import { useTableModel } from '../../../table/data/useTableModel';
import { useTableSuggestions } from '../../../table/data/useTableSuggestions';
import { tableDef } from '../../../table/model/categories';
import { PanelFrame } from '../../../table/panel/PanelFrame';
import { TableDetailPanel } from '../../../table/panel/TableDetailPanel';
import type { TableId } from '../../../table/tableIds';
import { ConsoleCallout } from '../../../ui/ConsoleCallout';
import { TryAgain } from '../WorkingGraphNotice';

/**
 * A dot's Table row, open beside the Atlas graph (owner decision 3): the
 * Table's own row panel (`TableDetailPanel`, in its graph context), so the
 * item is read and edited here exactly as in the Table — Details, its
 * suggestions, its connections in full, Save — without leaving the map.
 *
 * The rows are the table's model over the working graph (`useTableModel`,
 * the same build the Table and the map read, so nothing is built twice for
 * the graph), with the table's suggestions (`useTableSuggestions`) for each
 * row's count. The first row opened from a table builds that table's model
 * once; after that, switching rows costs nothing.
 *
 * Its header offers the row's local graph, its page in the app, its row in
 * the Table and the full editor (beside Tesseract, which opens the same
 * drawer for a progression, Show in Cortex in place of the local graph);
 * closing goes back to the graph as it was
 * (`useGraphUrlState().closeRow`). The graph's own URL parameters (focus,
 * depth, list, node) are none of the Table's (q, sort, f, status, view,
 * more, narrow, field, link, new), so the panel never reads the graph's
 * state as a table query.
 *
 * Lazy, and the default export, for `lazy(() => import(...))`: the panel,
 * the table's model and the editors load with the first dot clicked, not
 * with the map (GraphDrawerOutlet.tsx).
 */

export interface GraphRowDrawerProps {
  /** The row's table, as the path names it (already checked). */
  table: TableId;
  /** The row's key, as the path names it. */
  row: string;
  /** Close the drawer, back to the graph. */
  onClose(): void;
  /**
   * Centre the graph on the row's node, keeping the drawer open. Beside
   * Tesseract the header links to Cortex instead and this is not called.
   */
  onLocalGraph?(node: EntityId): void;
  /**
   * Beside Cortex's graph (the default) or beside Tesseract, whose header
   * offers Show in Cortex in place of Local graph.
   */
  context?: 'graph' | 'tesseract';
  /** The drawer's width beside the graph (PanelFrame). */
  width?: number;
  /** Given, the drawer's left edge resizes it (PanelFrame). */
  onWidthChange?(width: number): void;
}

export default function GraphRowDrawer({
  table,
  row,
  onClose,
  onLocalGraph,
  context = 'graph',
  width,
  onWidthChange,
}: GraphRowDrawerProps) {
  const suggested = useTableSuggestions(tableDef(table));
  const { model, graph, narrow, mode, pins, isLoading, error } = useTableModel(
    table,
    suggested.suggestions,
  );

  if (!model || !graph) {
    // While the table's rows are built, or when the Atlas could not be.
    return (
      <PanelFrame onClose={onClose} width={width} onWidthChange={onWidthChange}>
        {(heading, close) => (
          <>
            <header className="flex shrink-0 items-start gap-3 border-b border-white/[0.08] px-5 pb-4 pt-5">
              <div className="min-w-0 flex-1">
                {heading(isLoading || !error ? 'Opening the row…' : 'No row')}
              </div>
              {close && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Close"
                  className="-mr-2 -mt-1 size-8 shrink-0 text-white/60 hover:text-white"
                  onClick={close}
                >
                  <X />
                </Button>
              )}
            </header>
            <div className="flex flex-col gap-3 px-5 py-5">
              {isLoading || !error ? (
                <div aria-busy className="flex flex-col gap-3">
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-1/2" />
                </div>
              ) : (
                <ConsoleCallout
                  tone="danger"
                  title="The Atlas could not be loaded"
                >
                  {error instanceof Error ? error.message : String(error)}.{' '}
                  <TryAgain />
                </ConsoleCallout>
              )}
            </div>
          </>
        )}
      </PanelFrame>
    );
  }

  return (
    <TableDetailPanel
      context={context}
      model={model}
      rowKey={row}
      graph={graph}
      mode={mode}
      narrow={narrow}
      pins={pins}
      onClose={onClose}
      onLocalGraph={onLocalGraph}
      width={width}
      onWidthChange={onWidthChange}
    />
  );
}
