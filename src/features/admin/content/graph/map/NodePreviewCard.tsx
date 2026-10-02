import type { CSSProperties } from 'react';
import {
  EDGE_KINDS,
  EDGE_LABELS,
  type EdgeKind,
  type GraphEdge,
  type GraphNode,
  type NodeStatus,
} from '@/content/graph/types';
import { ConsoleBadge, type ConsoleBadgeTone } from '../../../ui/ConsoleBadge';
import { kindColor, kindLabel } from '../graphVocabulary';

/**
 * A quick look at one dot without opening it (design §5): what Obsidian
 * shows when Cmd or Ctrl is held over a note.
 *
 * It names the item, its kind and its status, says how many links it has,
 * and lists its first five connections in the words the connections table
 * uses (`EDGE_LABELS`): "performed by Toto", "in the key of B". Links that
 * are stated come before links guessed from a name or marked unconfirmed,
 * then they follow the table's order of kinds. The kind is written out, not
 * left to the dot's colour, because more than three colours cannot all be
 * told apart by everyone (design §4).
 *
 * The card only shows; it never takes the pointer, so moving on to the next
 * dot is not blocked by it. It is a tooltip, not a landmark: everything on
 * it is also in the List view and the row's panel, which is where keyboard
 * and screen-reader users read it.
 */

/** How many connections the card lists. */
const PREVIEW_CONNECTIONS = 5;

/** The card's width in CSS pixels, for placing it beside the pointer. */
const CARD_WIDTH = 256;
/** About how tall a full card is, for flipping it above the pointer. */
const CARD_HEIGHT = 200;
/** The gap between the pointer and the card. */
const OFFSET = 14;

const STATUS: Record<NodeStatus, { label: string; tone: ConsoleBadgeTone }> = {
  published: { label: 'Published', tone: 'success' },
  draft: { label: 'Draft', tone: 'warning' },
  pending: { label: 'Pending review', tone: 'info' },
  code: { label: 'In code', tone: 'muted' },
  missing: { label: 'Missing', tone: 'danger' },
};

export interface PreviewConnection {
  /** The connection in words: "performed by". */
  wording: string;
  otherId: string;
  otherLabel: string;
  otherKind: string;
  /** Guessed from a name, or marked unconfirmed. */
  doubt: 'guessed' | 'unconfirmed' | null;
}

/**
 * The node's connections as the card words them, one per item and wording
 * (a song stated twice as performed by the same act is one line), stated
 * links first, then in the connections table's order.
 */
export function previewConnections(
  nodeId: string,
  edges: readonly GraphEdge[],
  nodes: ReadonlyMap<string, GraphNode>,
): PreviewConnection[] {
  const seen = new Set<string>();
  const rows: (PreviewConnection & { order: number })[] = [];
  for (const edge of edges) {
    if (edge.from !== nodeId && edge.to !== nodeId) continue;
    const forward = edge.from === nodeId;
    const otherId = forward ? edge.to : edge.from;
    if (otherId === nodeId) continue;
    const kind = edge.kind as EdgeKind;
    const wording = EDGE_LABELS[kind]?.[forward ? 'forward' : 'inverse'];
    if (!wording) continue;
    const key = `${wording}|${otherId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const other = nodes.get(otherId);
    const doubt = edge.inferred
      ? 'guessed'
      : edge.unverified
        ? 'unconfirmed'
        : null;
    rows.push({
      wording,
      otherId,
      otherLabel: other?.label ?? otherId,
      otherKind: other?.kind ?? otherId.slice(0, otherId.indexOf(':')),
      doubt,
      order:
        (doubt ? 1_000 : 0) + EDGE_KINDS.indexOf(kind) * 2 + (forward ? 0 : 1),
    });
  }
  return rows
    .sort(
      (a, b) => a.order - b.order || a.otherLabel.localeCompare(b.otherLabel),
    )
    .map(({ order: _order, ...row }) => row);
}

/** How many different items the node is linked to. */
const linkCount = (nodeId: string, edges: readonly GraphEdge[]) => {
  const others = new Set<string>();
  for (const e of edges) {
    if (e.from === nodeId && e.to !== nodeId) others.add(e.to);
    else if (e.to === nodeId && e.from !== nodeId) others.add(e.from);
  }
  return others.size;
};

export interface NodePreviewCardProps {
  node: Pick<GraphNode, 'id' | 'kind' | 'label' | 'status'>;
  /** The node's connections: its adjacency in the graph. */
  edges: readonly GraphEdge[];
  /** Every node, to name the other ends. */
  nodes: ReadonlyMap<string, GraphNode>;
  /**
   * The links the graph draws for it (its weight after the filters);
   * counted from `edges` when absent.
   */
  links?: number;
  /** The graph's colour groups, for the dots; the kind's colour when absent. */
  colorOf?: (node: { id: string; kind: string }) => string;
  /**
   * The pointer, in the stage's own pixels. The card sits below and to the
   * right of it, flipping left or up near the stage's far edges. Without it
   * the card is placed by its parent.
   */
  at?: { x: number; y: number };
  /** The stage's size, for the flip. */
  bounds?: { width: number; height: number };
}

export const NodePreviewCard = ({
  node,
  edges,
  nodes,
  links,
  colorOf,
  at,
  bounds,
}: NodePreviewCardProps) => {
  const connections = previewConnections(node.id, edges, nodes);
  const shown = connections.slice(0, PREVIEW_CONNECTIONS);
  const count = links ?? linkCount(node.id, edges);
  const status = STATUS[node.status];
  const dot = (n: { id: string; kind: string }) =>
    colorOf ? colorOf(n) : kindColor(n.kind);

  let style: CSSProperties | undefined;
  if (at) {
    const flipX = bounds && at.x + OFFSET + CARD_WIDTH > bounds.width;
    const flipY = bounds && at.y + OFFSET + CARD_HEIGHT > bounds.height;
    style = {
      left: flipX ? undefined : at.x + OFFSET,
      right: flipX && bounds ? bounds.width - at.x + OFFSET : undefined,
      top: flipY ? undefined : at.y + OFFSET,
      bottom: flipY && bounds ? bounds.height - at.y + OFFSET : undefined,
    };
  }

  return (
    <div
      role="tooltip"
      aria-label={`Preview of ${node.label}`}
      style={style}
      className={`pointer-events-none z-30 flex w-64 flex-col gap-2 rounded-lg border border-border bg-popover/95 p-3 text-foreground shadow-xl ${
        at ? 'absolute' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-1.5 inline-block size-2.5 shrink-0 rounded-full"
          style={{ background: dot(node) }}
        />
        <p className="text-base leading-snug">{node.label}</p>
      </div>
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-white/55">
        <span>{kindLabel(node.kind)}</span>
        {status && (
          <ConsoleBadge tone={status.tone}>{status.label}</ConsoleBadge>
        )}
        <span aria-hidden>·</span>
        <span>
          {count} {count === 1 ? 'link' : 'links'}
        </span>
      </p>
      {shown.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-white/75">
          {shown.map((c) => (
            <li
              key={`${c.wording}|${c.otherId}`}
              className="flex items-baseline gap-1.5"
            >
              <span
                aria-hidden
                className="inline-block size-1.5 shrink-0 -translate-y-px rounded-full"
                style={{
                  background: dot({ id: c.otherId, kind: c.otherKind }),
                }}
              />
              <span>
                <span className="text-white/45">{c.wording}</span>{' '}
                {c.otherLabel}
                {c.doubt && (
                  <span className="text-white/40">
                    {' '}
                    ({c.doubt === 'guessed' ? 'guessed' : 'unconfirmed'})
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {connections.length > shown.length && (
        <p className="text-xs text-white/40">
          and {connections.length - shown.length} more
        </p>
      )}
    </div>
  );
};
