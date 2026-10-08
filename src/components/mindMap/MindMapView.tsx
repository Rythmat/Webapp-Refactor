import { useMemo } from 'react';
import { cortexColor } from '@/content/graph/cortexPalette';
import {
  edgeLabelFrom,
  edgesOnMap,
  type MindMapBoard,
  type MindMapEdge,
  type MindMapKind,
  type MindMapNode,
} from '@/content/graph/mindMapBoard';
import type { EntityId } from '@/content/graph/types';

/**
 * A small mind map, drawn the way the console's Cortex colours its graph:
 * the focus in the middle, what a student added in rings around it (one ring
 * per step out), and a labelled line for every connection the board knows
 * among them ("born in", "performed by").
 *
 * Shared by the Globe's mind-map panel (where nodes can be clicked to fly
 * there) and the teacher's view of a submitted map. Laid out in pixels at the
 * size it is drawn, so its text is never scaled below 12px.
 */

export const KIND_COLOR: Readonly<Record<MindMapKind, string>> = {
  artist: cortexColor('Artists'),
  place: cortexColor('Location'),
  event: cortexColor('Events'),
  song: cortexColor('Songs'),
};

export const KIND_NAME: Readonly<Record<MindMapKind, string>> = {
  artist: 'Artist',
  place: 'Place',
  event: 'Event',
  song: 'Song',
};

const FOCUS_RADIUS = 22;
const NODE_RADIUS = 15;
const MARGIN = 44;
const LABEL_MAX = 18;

const truncate = (text: string, max = LABEL_MAX): string =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

interface Placed {
  node: MindMapNode;
  x: number;
  y: number;
  depth: number;
}

interface DrawnEdge {
  edge: MindMapEdge;
  from: Placed;
  to: Placed;
  /** The wording, read from `reader` (the end nearer the focus). */
  label: string;
  reader: Placed;
  other: Placed;
}

/** Ring positions for the focus and the added nodes. Pure; exported for tests. */
export const layoutMindMap = (
  board: MindMapBoard,
  added: readonly EntityId[],
  width: number,
  height: number,
): { placed: Map<EntityId, Placed>; edges: DrawnEdge[] } => {
  const byId = new Map(board.nodes.map((n) => [n.id, n]));
  const onMap = new Set<EntityId>([board.focus, ...added]);
  const edges = edgesOnMap(board, onMap);

  // Steps out from the focus, along the map's own lines.
  const depth = new Map<EntityId, number>([[board.focus, 0]]);
  const parent = new Map<EntityId, EntityId>();
  let frontier: EntityId[] = [board.focus];
  while (frontier.length > 0) {
    const next: EntityId[] = [];
    for (const id of frontier)
      for (const edge of edges) {
        const other =
          edge.from === id ? edge.to : edge.to === id ? edge.from : null;
        if (!other || depth.has(other)) continue;
        depth.set(other, (depth.get(id) ?? 0) + 1);
        parent.set(other, id);
        next.push(other);
      }
    frontier = next;
  }
  // Anything the lines don't reach (a teacher-view oddity) goes outermost.
  const reachedDepth = Math.max(1, ...depth.values());
  for (const id of added) if (!depth.has(id)) depth.set(id, reachedDepth + 1);
  const maxDepth = Math.max(1, ...depth.values());

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(40, Math.min(width, height) / 2 - MARGIN);
  const placed = new Map<EntityId, Placed>();
  const focusNode = byId.get(board.focus);
  if (focusNode)
    placed.set(board.focus, { node: focusNode, x: cx, y: cy, depth: 0 });

  for (let ring = 1; ring <= maxDepth; ring++) {
    const members = added.filter(
      (id) => depth.get(id) === ring && byId.has(id),
    );
    // Children follow their parents round the circle.
    const angleOf = (id: EntityId): number => {
      const p = placed.get(parent.get(id) ?? board.focus);
      return p ? Math.atan2(p.y - cy, p.x - cx) : 0;
    };
    members.sort((a, b) => angleOf(a) - angleOf(b));
    const r = (radius * ring) / maxDepth;
    const step = (2 * Math.PI) / Math.max(1, members.length);
    const start = -Math.PI / 2 + (ring % 2 === 0 ? step / 2 : 0);
    members.forEach((id, i) => {
      const a = start + i * step;
      placed.set(id, {
        node: byId.get(id) as MindMapNode,
        x: cx + r * Math.cos(a),
        // Squash vertically to fit a wide panel.
        y: cy + r * Math.sin(a) * (height / Math.max(width, height)),
        depth: ring,
      });
    });
  }

  const drawn: DrawnEdge[] = [];
  for (const edge of edges) {
    const from = placed.get(edge.from);
    const to = placed.get(edge.to);
    if (!from || !to) continue;
    // Read from the end nearer the focus: "Ana Lux — born in — Motor City".
    const toFirst = to.depth < from.depth;
    const reader = toFirst ? to : from;
    drawn.push({
      edge,
      from,
      to,
      label: edgeLabelFrom(edge, reader.node.id),
      reader,
      other: toFirst ? from : to,
    });
  }
  return { placed, edges: drawn };
};

export interface MindMapViewProps {
  board: MindMapBoard;
  /** The nodes on the map besides the focus, in the order they were added. */
  added: readonly EntityId[];
  width: number;
  height: number;
  /** Click a node (the Globe flies there). Absent: a still picture. */
  onSelect?: (node: MindMapNode) => void;
  /** A node to ring, e.g. what the Globe is showing. */
  highlight?: EntityId | null;
  className?: string;
}

export const MindMapView = ({
  board,
  added,
  width,
  height,
  onSelect,
  highlight,
  className,
}: MindMapViewProps) => {
  const { placed, edges } = useMemo(
    () => layoutMindMap(board, added, width, height),
    [board, added, width, height],
  );
  const focusLabel = placed.get(board.focus)?.node.label ?? '';
  const sentences = edges.map(
    ({ label, reader, other }) =>
      `${reader.node.label} — ${label} — ${other.node.label}`,
  );

  return (
    <figure className={className}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Mind map of ${focusLabel}: ${added.length} connected`}
      >
        {edges.map(({ edge, from, to, label }) => {
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;
          const w = label.length * 6.6 + 10;
          return (
            <g key={`${edge.from}|${edge.kind}|${edge.to}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(255,255,255,0.28)"
                strokeWidth={1.5}
              />
              <rect
                x={mx - w / 2}
                y={my - 9}
                width={w}
                height={18}
                rx={9}
                fill="#151518"
                stroke="rgba(255,255,255,0.08)"
              />
              <text
                x={mx}
                y={my + 4}
                textAnchor="middle"
                fontSize={12}
                fill="rgba(255,255,255,0.55)"
              >
                {label}
              </text>
            </g>
          );
        })}
        {[...placed.values()].map(({ node, x, y, depth }) => {
          const r = depth === 0 ? FOCUS_RADIUS : NODE_RADIUS;
          const clickable = Boolean(onSelect);
          const select = () => onSelect?.(node);
          return (
            <g
              key={node.id}
              {...(clickable
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': `${KIND_NAME[node.kind]}: ${node.label}`,
                    onClick: select,
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        select();
                      }
                    },
                    style: { cursor: 'pointer' },
                  }
                : {})}
            >
              <title>{`${KIND_NAME[node.kind]}: ${node.label}`}</title>
              {highlight === node.id && (
                <circle
                  cx={x}
                  cy={y}
                  r={r + 5}
                  fill="none"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth={2}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={KIND_COLOR[node.kind]}
                stroke="#101012"
                strokeWidth={2}
              />
              <text
                x={x}
                y={y + r + 15}
                textAnchor="middle"
                fontSize={12}
                fontWeight={depth === 0 ? 700 : 400}
                fill="#e8e8f0"
              >
                {truncate(node.label)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        {sentences.length > 0 ? (
          <ul>
            {sentences.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          `${focusLabel}, with nothing connected yet.`
        )}
      </figcaption>
    </figure>
  );
};

/** The four kinds and their colours, as a row of labelled dots. */
export const MindMapLegend = ({ className }: { className?: string }) => (
  <ul className={`flex flex-wrap gap-x-3 gap-y-1 ${className ?? ''}`}>
    {(Object.keys(KIND_COLOR) as MindMapKind[]).map((kind) => (
      <li
        key={kind}
        className="inline-flex items-center gap-1.5 text-xs text-white/55"
      >
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: KIND_COLOR[kind] }}
          aria-hidden
        />
        {KIND_NAME[kind]}
      </li>
    ))}
  </ul>
);
