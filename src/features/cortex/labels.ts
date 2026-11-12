import type { WebNode } from './buildWeb';
import { dotRadius, labelPx } from './graphStyle';
import type { Positions, View } from './layout';

/**
 * Which names fit. They're drawn in screen space, in the console's type (a
 * size that grows with the dot and the zoom), under their dot or else beside
 * it; the most important go first, and a name that would touch one already
 * placed, or another dot, is left out until a zoom makes room. Pure.
 */

/** Glacial's average glyph, as a share of the type size. */
const CHAR_EM = 0.55;
const LINE_EM = 1.3;
const LABEL_MAX = 24;
/** The console's gap between a dot and its name. */
const LABEL_GAP = 5;
const EDGE = 4;

export interface PlacedLabel {
  id: string;
  text: string;
  x: number;
  /** The text's baseline. */
  y: number;
  /** The type size, in CSS pixels. */
  size: number;
}

export const truncateLabel = (text: string, max = LABEL_MAX): string =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/** A node's radius on screen, at zoom `k`: the console's, by its links. */
export const nodeRadius = (degree: number, k = 1, dpr = 1): number =>
  dotRadius(degree, k, dpr);

/** Lower goes first: concepts name the clusters, then what's finished. */
const rank = (node: WebNode, degree: number): number => {
  if (node.role === 'concept') return node.hollow ? 2 : 0 - degree / 100;
  return node.done ? 1 : 3;
};

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const overlaps = (a: Box, b: Box) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

export const placeLabels = (
  nodes: readonly WebNode[],
  positions: Positions,
  degrees: ReadonlyMap<string, number>,
  view: View,
  width: number,
  boxHeight: number,
  /** Named first: what's hovered and its neighbours. */
  first: ReadonlySet<string> = new Set(),
  /** Named whatever else is there: what's hovered itself. */
  forced: string | null = null,
  dpr = 1,
): PlacedLabel[] => {
  const screen = (id: string) => {
    const p = positions[id];
    return p ? { x: p.x * view.k + view.x, y: p.y * view.k + view.y } : null;
  };
  const dots: Box[] = [];
  for (const node of nodes) {
    const s = screen(node.id);
    if (!s) continue;
    const r = nodeRadius(degrees.get(node.id) ?? 0, view.k, dpr);
    dots.push({ x0: s.x - r, y0: s.y - r, x1: s.x + r, y1: s.y + r });
  }
  const order = [...nodes].sort((a, b) => {
    const own = Number(b.id === forced) - Number(a.id === forced);
    if (own !== 0) return own;
    const pinned = Number(first.has(b.id)) - Number(first.has(a.id));
    if (pinned !== 0) return pinned;
    return (
      rank(a, degrees.get(a.id) ?? 0) - rank(b, degrees.get(b.id) ?? 0) ||
      b.lastAt - a.lastAt ||
      (a.id < b.id ? -1 : 1)
    );
  });

  const taken: Box[] = [];
  const placed: PlacedLabel[] = [];
  for (const node of order) {
    const s = screen(node.id);
    if (!s) continue;
    if (s.x < 0 || s.x > width || s.y < 0 || s.y > boxHeight) continue;
    const text = truncateLabel(node.label);
    const degree = degrees.get(node.id) ?? 0;
    const size = labelPx(degree, view.k, dpr);
    const height = size * LINE_EM;
    const half = (text.length * size * CHAR_EM) / 2;
    const r = nodeRadius(degree, view.k, dpr);
    const clampX = (x: number) =>
      Math.min(width - half - EDGE, Math.max(half + EDGE, x));
    const beside = s.y - height / 2;
    const under = { x: clampX(s.x), y: s.y + r + LABEL_GAP };
    // Under the dot, over it, then either side, as long as it stays in the box.
    const spots = [
      under,
      { x: clampX(s.x), y: s.y - r - LABEL_GAP - height },
      { x: s.x + r + LABEL_GAP + half, y: beside },
      { x: s.x - r - LABEL_GAP - half, y: beside },
    ]
      .filter(({ x }) => x - half >= EDGE && x + half <= width - EDGE)
      .filter(({ y }) => y >= 0 && y + height <= boxHeight);
    const boxOf = ({ x, y }: { x: number; y: number }): Box => ({
      x0: x - half,
      y0: y,
      x1: x + half,
      y1: y + height,
    });
    const free = spots.find((spot) => {
      const box = boxOf(spot);
      return (
        !taken.some((t) => overlaps(t, box)) &&
        !dots.some((d) => overlaps(d, box))
      );
    });
    const spot = free ?? (node.id === forced ? under : undefined);
    if (!spot) continue;
    taken.push(boxOf(spot));
    placed.push({ id: node.id, text, x: spot.x, y: spot.y + size, size });
  }
  return placed;
};
