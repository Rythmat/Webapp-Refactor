import { Network, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/components/utilities';
import type { Graph } from '@/content/graph/deriveGraph';
import { canonicalId } from '@/content/graph/ids';
import type { EntityId, NodeStatus } from '@/content/graph/types';
import { PanelFrame } from '../../../table/panel/PanelFrame';
import { tableHrefForNode } from '../../../table/tablePaths';
import { ConsoleBadge, type ConsoleBadgeTone } from '../../../ui/ConsoleBadge';
import { ConsoleCallout } from '../../../ui/ConsoleCallout';
import { CONSOLE_LABEL, consoleTabClass } from '../../../ui/styles';
import { ConnectionsTable } from '../ConnectionsTable';
import { appPageFor, kindLabel } from '../graphVocabulary';

/**
 * An item with no Table row, open beside the Atlas graph (`?node=`): a vibe,
 * a mode, an era, a scene, a teach day, a pathway. Nothing here edits it —
 * code owns these — so the panel only says what it is and what it connects
 * to: its kind and state, its page in the app where it has one, its local
 * graph, and every connection as the accessible "Connections of …" table,
 * each of which opens beside the graph in turn.
 *
 * It sits where a row's panel does (PanelFrame: beside the graph from xl
 * up, a sheet below), at the width the drawer was left at.
 */

const STATUS: Record<NodeStatus, { label: string; tone: ConsoleBadgeTone }> = {
  published: { label: 'Published', tone: 'success' },
  draft: { label: 'Draft', tone: 'warning' },
  pending: { label: 'Pending review', tone: 'info' },
  code: { label: 'In code', tone: 'muted' },
  missing: { label: 'Missing', tone: 'danger' },
};

export interface NodeSummaryPanelProps {
  /** The node, as the URL names it (`vibe:melancholy`). */
  nodeId: string;
  /** The graph the map draws; absent while it is being built. */
  graph?: Graph;
  /** A song pin's key → its item's id, for the links to a pin. */
  pins?: ReadonlyMap<string, string>;
  /** Close the panel, back to the graph. */
  onClose(): void;
  /** Centre the graph on the node, keeping the panel open. */
  onLocalGraph(node: EntityId): void;
  /** Open a connection beside the graph: its row, or its summary. */
  onOpen(node: string): void;
  /** The panel's width beside the graph (PanelFrame). */
  width?: number;
  /** Given, the panel's left edge resizes it (PanelFrame). */
  onWidthChange?(width: number): void;
  /**
   * Each connection's dot colour. Cortex passes its colour groups, so a dot
   * here matches the same item's dot on the graph.
   */
  colorOf?: (node: { id: string; kind: string }) => string;
}

export const NodeSummaryPanel = ({
  nodeId,
  graph,
  pins,
  colorOf,
  onClose,
  onLocalGraph,
  onOpen,
  width,
  onWidthChange,
}: NodeSummaryPanelProps) => {
  const id = canonicalId(nodeId as EntityId);
  const node = graph?.nodes.get(id);
  const edges = graph?.adjacency.get(id) ?? [];
  const page =
    node && node.status !== 'missing'
      ? appPageFor({ id: node.id, kind: node.kind, label: node.label })
      : null;
  const row = tableHrefForNode(id);

  return (
    <PanelFrame onClose={onClose} width={width} onWidthChange={onWidthChange}>
      {(heading, close) => (
        <>
          <header className="flex shrink-0 flex-col gap-3 border-b border-white/[0.08] px-5 pb-4 pt-5">
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {node && (
                  <>
                    <ConsoleBadge>{kindLabel(node.kind)}</ConsoleBadge>
                    <ConsoleBadge tone={STATUS[node.status].tone}>
                      {STATUS[node.status].label}
                    </ConsoleBadge>
                    {node.unverified && (
                      <ConsoleBadge
                        tone="warning"
                        title="The record is marked unconfirmed"
                      >
                        Unconfirmed
                      </ConsoleBadge>
                    )}
                  </>
                )}
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
            </div>

            <div className={cn('min-w-0', !close && 'pr-8')}>
              {heading(node?.label ?? (graph ? 'Not in the graph' : nodeId))}
            </div>

            {node && (
              <nav
                aria-label="Open elsewhere"
                className="flex flex-wrap gap-1.5"
              >
                <button
                  type="button"
                  onClick={() => onLocalGraph(node.id)}
                  className={consoleTabClass(false, 'sm')}
                >
                  <Network aria-hidden className="size-3.5" />
                  Local graph
                </button>
                {page && (
                  <Link to={page} className={consoleTabClass(false, 'sm')}>
                    Open page
                  </Link>
                )}
                {row && (
                  <Link to={row} className={consoleTabClass(false, 'sm')}>
                    Open in Table
                  </Link>
                )}
              </nav>
            )}
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            {!graph ? (
              <div aria-busy className="flex flex-col gap-3">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : !node ? (
              <p className="text-sm text-white/60">
                Nothing in the graph is called “{nodeId}”. It may have been
                renamed, or the link is wrong.
              </p>
            ) : (
              <>
                {node.status === 'missing' && (
                  <ConsoleCallout tone="warning" title="Found nowhere">
                    Something names “{node.id}”, but no record or code defines
                    it. The connections below say what names it.
                  </ConsoleCallout>
                )}
                {!row && node.status !== 'missing' && (
                  <p className="text-sm text-white/60">
                    Lives in code, so it is read here, not edited.
                  </p>
                )}
                <section aria-label="Connections" className="min-w-0">
                  <h3 className={cn(CONSOLE_LABEL, 'mb-3')}>
                    Connections of {node.label}
                  </h3>
                  <div className="overflow-x-auto">
                    <ConnectionsTable
                      focus={node}
                      edges={edges}
                      nodes={graph.nodes}
                      onFocus={onOpen}
                      pins={pins}
                      colorOf={colorOf}
                    />
                  </div>
                </section>
              </>
            )}
          </div>
        </>
      )}
    </PanelFrame>
  );
};
