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
const LABEL_MAX = 16;
const EDGE_LABEL_MAX = 22;
/** Rough width of one character of 12px text, for fitting labels. */
const CHAR_PX = 6.6;
/** Room under a node for its name. */
const NODE_LABEL_BELOW = NODE_RADIUS + 19;
/** Where along a line its label may sit, best first. */
const LABEL_ALONG = [0.5, 0.4, 0.6, 0.3, 0.7] as const;

const truncate = (text: string, max = LABEL_MAX): string =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

const textWidth = (text: string): number => text.length * CHAR_PX;

/** "wrote · played on", or "performed +2" when the wordings don't fit. */
const lineLabel = (labels: readonly string[]): string => {
  const all = labels.join(' · ');
  if (all.length <= EDGE_LABEL_MAX) return all;
  const [first] = labels;
  return labels.length > 1
    ? `${truncate(first, EDGE_LABEL_MAX - 3)} +${labels.length - 1}`
    : truncate(first, EDGE_LABEL_MAX);
};

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

/** One line between two nodes, however many connections it stands for. */
interface DrawnLine {
  key: string;
  reader: Placed;
  other: Placed;
  /** Every connection's wording, read from `reader`: "wrote · played on". */
  label: string;
}

/**
 * Ring positions for the focus and the added nodes. The rings are ellipses
 * that fill the box, leaving room for the names, so a wide panel is used
 * edge to edge. Pure; exported for tests.
 */
export const layoutMindMap = (
  board: MindMapBoard,
  added: readonly EntityId[],
  width: number,
  height: number,
): {
  placed: Map<EntityId, Placed>;
  edges: DrawnEdge[];
  lines: DrawnLine[];
} => {
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
  const rx = Math.max(40, width / 2 - textWidth('x'.repeat(LABEL_MAX)) / 2);
  const ry = Math.max(30, height / 2 - NODE_LABEL_BELOW);
  const placed = new Map<EntityId, Placed>();
  const focusNode = byId.get(board.focus);
  if (focusNode)
    placed.set(board.focus, { node: focusNode, x: cx, y: cy, depth: 0 });

  // A crowded ring gets more of the radius: each ring's share grows with the
  // square root of how many it holds, so eight on the first ring and one on
  // the second don't squeeze the eight into the middle.
  const ringWeights = Array.from({ length: maxDepth }, (_, i) =>
    Math.sqrt(
      Math.max(1, added.filter((id) => depth.get(id) === i + 1).length),
    ),
  );
  const totalWeight = ringWeights.reduce((a, b) => a + b, 0);
  let sofar = 0;
  const ringScale = ringWeights.map((w) => (sofar += w) / totalWeight);

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
    const scale = ringScale[ring - 1];
    const step = (2 * Math.PI) / Math.max(1, members.length);
    const start = -Math.PI / 2 + (ring % 2 === 0 ? step / 2 : 0);
    members.forEach((id, i) => {
      const a = start + i * step;
      placed.set(id, {
        node: byId.get(id) as MindMapNode,
        x: cx + rx * scale * Math.cos(a),
        y: cy + ry * scale * Math.sin(a),
        depth: ring,
      });
    });
  }

  const drawn: DrawnEdge[] = [];
  const lines = new Map<string, DrawnLine & { labels: string[] }>();
  for (const edge of edges) {
    const from = placed.get(edge.from);
    const to = placed.get(edge.to);
    if (!from || !to) continue;
    // Read from the end nearer the focus: "Ana Lux — born in — Motor City".
    const toFirst = to.depth < from.depth;
    const reader = toFirst ? to : from;
    const other = toFirst ? from : to;
    const label = edgeLabelFrom(edge, reader.node.id);
    drawn.push({ edge, from, to, label, reader, other });
    // Two connections between the same pair share one line.
    const key = [edge.from, edge.to].sort().join('|');
    const line = lines.get(key);
    if (!line) lines.set(key, { key, reader, other, label, labels: [label] });
    else {
      const wording = edgeLabelFrom(edge, line.reader.node.id);
      if (!line.labels.includes(wording)) line.labels.push(wording);
    }
  }
  return {
    placed,
    edges: drawn,
    lines: [...lines.values()].map(({ labels, ...line }) => ({
      ...line,
      label: lineLabel(labels),
    })),
  };
};

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const touches = (line: DrawnLine, id: EntityId | undefined): boolean =>
  line.reader.node.id === id || line.other.node.id === id;

const overlaps = (a: Box, b: Box): boolean =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Where a 12px label of `text` centred on `x` sits, kept inside the width. */
const clampX = (x: number, text: string, width: number): number => {
  const half = textWidth(text) / 2 + 2;
  return Math.min(width - half, Math.max(half, x));
};

/**
 * Where each line's wording goes: halfway along it if there is room, else a
 * little nearer one end or just beside it, but only where the pill covers no
 * node, no name and no other pill. Lines are tried in order, so
 * put the ones that matter most first; a line that finds no room is drawn
 * unlabelled (the connection is still listed below the picture). Pure;
 * exported for tests.
 */
export const edgeLabelSpots = (
  placed: ReadonlyMap<EntityId, Placed>,
  lines: readonly DrawnLine[],
  width: number,
): Map<string, { x: number; y: number }> => {
  const taken: Box[] = [];
  for (const { node, x, y, depth } of placed.values()) {
    const r = depth === 0 ? FOCUS_RADIUS : NODE_RADIUS;
    const name = truncate(node.label);
    const nx = clampX(x, name, width);
    const half = textWidth(name) / 2;
    taken.push({ x0: x - r, y0: y - r, x1: x + r, y1: y + r });
    taken.push({ x0: nx - half, y0: y + r + 3, x1: nx + half, y1: y + r + 19 });
  }
  const spots = new Map<string, { x: number; y: number }>();
  for (const { key, reader, other, label } of lines) {
    const half = (textWidth(label) + 10) / 2;
    const fits = (t: number, [dx, dy]: readonly [number, number]) => {
      const x = clampX(reader.x + (other.x - reader.x) * t + dx, label, width);
      const y = reader.y + (other.y - reader.y) * t + dy;
      const box = { x0: x - half, y0: y - 9, x1: x + half, y1: y + 9 };
      return taken.some((b) => overlaps(b, box)) ? null : { x, y, box };
    };
    // On the line first (halfway, then nearer either end), then beside it.
    const beside = [
      [0, 0],
      [0, -14],
      [0, 14],
      [half + 4, 0],
      [-(half + 4), 0],
    ] as const;
    let found: ReturnType<typeof fits> = null;
    for (const offset of beside) {
      for (const t of LABEL_ALONG) if ((found = fits(t, offset))) break;
      if (found) break;
    }
    if (!found) continue;
    taken.push(found.box);
    spots.set(key, { x: found.x, y: found.y });
  }
  return spots;
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
  /**
   * Which lines carry their wording. `around` keeps a small map readable:
   * only the lines of the highlighted node (or, with none, the last one
   * added) are labelled; every connection is still listed for screen readers.
   */
  edgeLabels?: 'all' | 'around';
  /** Show every connection as a sentence under the picture (teacher view). */
  listConnections?: boolean;
  className?: string;
}

export const MindMapView = ({
  board,
  added,
  width,
  height,
  onSelect,
  highlight,
  edgeLabels = 'all',
  listConnections = false,
  className,
}: MindMapViewProps) => {
  const { placed, edges, lines } = useMemo(
    () => layoutMindMap(board, added, width, height),
    [board, added, width, height],
  );
  const focusLabel = placed.get(board.focus)?.node.label ?? '';
  const around =
    edgeLabels === 'around'
      ? ((highlight && placed.has(highlight) && highlight !== board.focus
          ? highlight
          : null) ?? added.at(-1))
      : undefined;
  const spots = useMemo(
    () =>
      edgeLabelSpots(
        placed,
        around === undefined
          ? // Lines out of the focus first: they say why each node is there.
            [...lines].sort(
              (a, b) =>
                Number(touches(b, board.focus)) -
                Number(touches(a, board.focus)),
            )
          : lines.filter((line) => touches(line, around)),
        width,
      ),
    [placed, lines, around, board.focus, width],
  );
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
        {lines.map(({ key, reader, other }) => (
          <line
            key={key}
            x1={reader.x}
            y1={reader.y}
            x2={other.x}
            y2={other.y}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth={1.5}
          />
        ))}
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
                x={clampX(x, truncate(node.label), width)}
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
        {lines.map(({ key, label }) => {
          const spot = spots.get(key);
          if (!spot) return null;
          const w = textWidth(label) + 10;
          return (
            <g key={key} aria-hidden>
              <rect
                x={spot.x - w / 2}
                y={spot.y - 9}
                width={w}
                height={18}
                rx={9}
                fill="#151518"
                stroke="rgba(255,255,255,0.12)"
              />
              <text
                x={spot.x}
                y={spot.y + 4}
                textAnchor="middle"
                fontSize={12}
                fill="rgba(255,255,255,0.7)"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption
        className={
          listConnections
            ? 'mt-3 max-h-40 overflow-y-auto text-sm text-white/70'
            : 'sr-only'
        }
      >
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
