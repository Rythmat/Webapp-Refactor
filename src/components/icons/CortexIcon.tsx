import { createLucideIcon } from 'lucide-react';

/**
 * The Cortex icon: the console sidebar's mark for Cortex, the section that
 * holds the Atlas as a graph and as tables (owner, 1 Oct 2026, after
 * `~/Desktop/References/519151.png`).
 *
 * It is drawn like that reference: six nodes on a hexagon around a centre
 * node, the hexagon's outer edges, a spoke from the centre to each of the
 * six, and an inner triangle from the top node to the lower-left and
 * lower-right nodes and back. The hexagon stands on a point, 8 units from
 * the centre, so its nodes reach the 2-unit margin every lucide icon keeps.
 *
 * It is made with lucide's own `createLucideIcon`, so it behaves exactly
 * like the lucide icons beside it in the sidebar: a 24 by 24 view box, no
 * fill, a `currentColor` stroke 2 units wide by default, round caps and
 * joins, and the same props (`size`, `strokeWidth`, `absoluteStrokeWidth`,
 * `className`, `color`, and `aria-hidden` set for you when no label is
 * given). It also fits the sidebar's `icon` prop, which takes a lucide icon.
 *
 * Each node is a small circle (radius 2), and every line stops at a
 * circle's edge rather than running to its centre, so the nodes stay open
 * rings at the sidebar's 20 px. Everything is one path, not a path plus
 * seven circles: the sidebar draws its icons in a translucent white, and
 * separate shapes would paint twice where a line meets a node, leaving
 * brighter spots there. One path is stroked as a single shape, so it keeps
 * one even tone.
 */

/** Where each line runs, from one node's edge to the other's. */
const LINES = [
  // The hexagon's outer edges, clockwise from the top.
  'M13.73 5 17.2 7',
  'M18.93 10v4',
  'M17.2 17l-3.47 2',
  'M10.27 19 6.8 17',
  'M5.07 14v-4',
  'M6.8 7l3.47-2',
  // The spokes, from the centre node to each of the six.
  'M12 10V6',
  'M13.73 11 17.2 9',
  'M13.73 13 17.2 15',
  'M12 14v4',
  'M10.27 13 6.8 15',
  'M10.27 11 6.8 9',
  // The inner triangle: top to lower-left, lower-left to lower-right, and
  // lower-right back to the top.
  'M11 5.73 6.07 14.27',
  'M7.07 16h9.86',
  'M17.93 14.27 13 5.73',
];

/**
 * A circle of radius 2 as two half arcs, from its left edge: `left` is the
 * point 2 units left of the node's centre, written out so the path holds
 * exact numbers (5.07 − 2 in floating point is 3.0700000000000003).
 */
const node = (left: string) => `M${left}a2 2 0 1 0 4 0a2 2 0 1 0-4 0`;

/**
 * The seven nodes, by centre: the top (12, 4), then clockwise round the
 * hexagon (18.93, 8), (18.93, 16), (12, 20), (5.07, 16), (5.07, 8), and the
 * centre (12, 12).
 */
const NODES = [
  node('10 4'),
  node('16.93 8'),
  node('16.93 16'),
  node('10 20'),
  node('3.07 16'),
  node('3.07 8'),
  node('10 12'),
];

export const CortexIcon = createLucideIcon('cortex', [
  ['path', { d: [...LINES, ...NODES].join(''), key: 'cortex' }],
]);
