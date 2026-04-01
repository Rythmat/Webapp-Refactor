// --- HEX GRID MATH (Source of Truth) ---

/** Radius of a pointy-topped hexagon in pixels. Scale this to resize the board. */
export const HEX_SIZE = 42;

/** Gap between hexes in pixels. */
export const HEX_SPACING = 3;

/** Width of a pointy-topped hex = sqrt(3) * size */
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;

/** Height of a pointy-topped hex = 2 * size */
export const HEX_HEIGHT = 2 * HEX_SIZE;

/** Vertical distance between hex centers = 3/4 * height */
export const VERT_DIST = HEX_HEIGHT * 0.75;

/** Horizontal distance between hex centers = width */
export const HORIZ_DIST = HEX_WIDTH;

/** Grid dimensions */
export const GRID_ROWS = 7;
export const GRID_COLS = 9;

/** Derived spacing steps */
export const HORIZ_STEP = HEX_WIDTH + HEX_SPACING;
export const VERT_STEP = VERT_DIST + HEX_SPACING * 0.8;

/** Padding around the grid content */
const BOARD_PADDING = 24;

/** Grid content span (center-to-center, including odd-row offset) */
const GRID_CONTENT_WIDTH = (GRID_COLS - 1) * HORIZ_STEP + HORIZ_STEP / 2;
const GRID_CONTENT_HEIGHT = (GRID_ROWS - 1) * VERT_STEP;

/** Offsets position the first hex center so edges clear the padding */
export const BOARD_OFFSET_X = BOARD_PADDING + HEX_WIDTH / 2;
export const BOARD_OFFSET_Y = BOARD_PADDING + HEX_HEIGHT / 2;

/** Board container = grid content + one full hex (half on each side) + padding */
export const BOARD_WIDTH = Math.ceil(
  GRID_CONTENT_WIDTH + HEX_WIDTH + BOARD_PADDING * 2,
);

/** Power rail sits below the grid with a margin */
const POWER_RAIL_MARGIN = 40;
export const POWER_RAIL_Y =
  BOARD_OFFSET_Y + GRID_CONTENT_HEIGHT + HEX_HEIGHT / 2 + POWER_RAIL_MARGIN;

/** Board height accommodates grid + power rail + bottom padding */
export const BOARD_HEIGHT = Math.ceil(POWER_RAIL_Y + BOARD_PADDING);

/** CSS clip-path for a pointy-topped hexagon */
export const HEX_CLIP_PATH =
  'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

/**
 * Convert odd-R offset coordinates to pixel position.
 * Odd rows are shifted right by half a hex width.
 */
export function getHexPos(col: number, row: number) {
  const isOddRow = row % 2 !== 0;
  const x =
    col * (HEX_WIDTH + HEX_SPACING) +
    (isOddRow ? (HEX_WIDTH + HEX_SPACING) / 2 : 0) +
    BOARD_OFFSET_X;
  const y = row * (VERT_DIST + HEX_SPACING * 0.8) + BOARD_OFFSET_Y;
  return { x, y };
}

/**
 * Snap a pixel position to the nearest hex grid cell.
 * Returns the pixel center of that cell via getHexPos.
 */
export function snapToHex(px: number, py: number) {
  const row = Math.round((py - BOARD_OFFSET_Y) / VERT_STEP);
  const isOddRow = row % 2 !== 0;
  const xOffset = isOddRow ? HORIZ_STEP / 2 : 0;
  const col = Math.round((px - BOARD_OFFSET_X - xOffset) / HORIZ_STEP);
  return getHexPos(col, row);
}

/** Convert pixel position to hex grid col/row (inverse of getHexPos). */
export function pixelToHex(
  px: number,
  py: number,
): { col: number; row: number } {
  const row = Math.round((py - BOARD_OFFSET_Y) / VERT_STEP);
  const isOddRow = row % 2 !== 0;
  const xOffset = isOddRow ? HORIZ_STEP / 2 : 0;
  const col = Math.round((px - BOARD_OFFSET_X - xOffset) / HORIZ_STEP);
  return { col, row };
}

/** Get the 6 neighboring hex cells in odd-R offset coordinates. */
export function getHexNeighbors(
  col: number,
  row: number,
): { col: number; row: number }[] {
  if (row % 2 === 0) {
    // Even row
    return [
      { col: col + 1, row }, // E
      { col: col - 1, row }, // W
      { col: col, row: row - 1 }, // NE
      { col: col - 1, row: row - 1 }, // NW
      { col: col, row: row + 1 }, // SE
      { col: col - 1, row: row + 1 }, // SW
    ];
  }
  // Odd row
  return [
    { col: col + 1, row }, // E
    { col: col - 1, row }, // W
    { col: col + 1, row: row - 1 }, // NE
    { col: col, row: row - 1 }, // NW
    { col: col + 1, row: row + 1 }, // SE
    { col: col, row: row + 1 }, // SW
  ];
}

/** BFS shortest path between two hex cells. Returns array of {col, row} from start to end. */
export function findHexPath(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
): { col: number; row: number }[] {
  if (startCol === endCol && startRow === endRow) {
    return [{ col: startCol, row: startRow }];
  }

  const key = (c: number, r: number) => `${c},${r}`;
  const visited = new Set<string>();
  const parent = new Map<string, { col: number; row: number } | null>();

  const startKey = key(startCol, startRow);
  visited.add(startKey);
  parent.set(startKey, null);

  const queue: { col: number; row: number }[] = [
    { col: startCol, row: startRow },
  ];
  let found = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.col === endCol && current.row === endRow) {
      found = true;
      break;
    }

    for (const neighbor of getHexNeighbors(current.col, current.row)) {
      const nk = key(neighbor.col, neighbor.row);
      if (!visited.has(nk)) {
        visited.add(nk);
        parent.set(nk, current);
        queue.push(neighbor);
      }
    }
  }

  if (!found) {
    // Fallback: direct line (should never happen on an unbounded grid)
    return [
      { col: startCol, row: startRow },
      { col: endCol, row: endRow },
    ];
  }

  // Reconstruct path
  const path: { col: number; row: number }[] = [];
  let cur: { col: number; row: number } | null = { col: endCol, row: endRow };
  while (cur) {
    path.push(cur);
    cur = parent.get(key(cur.col, cur.row)) ?? null;
  }
  path.reverse();
  return path;
}

// ── Hex edge-routing geometry ──────────────────────────────────────────────

/** Get the 6 vertices of a pointy-topped hex at pixel center (cx, cy), clockwise from top. */
export function getHexVertices(cx: number, cy: number) {
  const w2 = HEX_WIDTH / 2;
  return [
    { x: cx, y: cy - HEX_SIZE }, // V0 top
    { x: cx + w2, y: cy - HEX_SIZE / 2 }, // V1 top-right
    { x: cx + w2, y: cy + HEX_SIZE / 2 }, // V2 bottom-right
    { x: cx, y: cy + HEX_SIZE }, // V3 bottom
    { x: cx - w2, y: cy + HEX_SIZE / 2 }, // V4 bottom-left
    { x: cx - w2, y: cy - HEX_SIZE / 2 }, // V5 top-left
  ];
}

/** Midpoint of edge i (between vertex i and vertex (i+1)%6). */
export function getEdgeMidpoint(cx: number, cy: number, edgeIndex: number) {
  const verts = getHexVertices(cx, cy);
  const a = verts[edgeIndex];
  const b = verts[(edgeIndex + 1) % 6];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Opposite edge index: edge 0↔3, 1↔4, 2↔5. */
const OPPOSITE_EDGE = [3, 4, 5, 0, 1, 2];

/**
 * Determine which edge of hex A the cable exits through to reach adjacent hex B.
 * getHexNeighbors returns [E, W, NE, NW, SE, SW] — map each to its edge index.
 */
export function getExitEdge(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): number {
  const neighbors = getHexNeighbors(fromCol, fromRow);
  // neighbors order: E(0), W(1), NE(2), NW(3), SE(4), SW(5)
  const dirToEdge = [1, 4, 0, 5, 2, 3];
  for (let i = 0; i < neighbors.length; i++) {
    if (neighbors[i].col === toCol && neighbors[i].row === toRow) {
      return dirToEdge[i];
    }
  }
  return 0;
}

/** Trace a hex perimeter arc from entryEdge midpoint to exitEdge midpoint.
 *  preferCW controls direction: true = clockwise first, false = counter-clockwise first.
 *  When both arcs are equal length, the preference wins. */
function perimeterWaypoints(
  cx: number,
  cy: number,
  entryEdge: number,
  exitEdge: number,
  preferCW: boolean,
) {
  const verts = getHexVertices(cx, cy);
  const entry = getEdgeMidpoint(cx, cy, entryEdge);
  const exit = getEdgeMidpoint(cx, cy, exitEdge);

  // Clockwise: entry midpoint → V[(entryEdge+1)%6] → ... → V[exitEdge] → exit midpoint
  const cwStart = (entryEdge + 1) % 6;
  const cwEnd = exitEdge;
  const cwDist = (cwEnd - cwStart + 6) % 6;

  const cwPath = [entry];
  for (let i = 0; i <= cwDist; i++) {
    cwPath.push(verts[(cwStart + i) % 6]);
  }
  cwPath.push(exit);

  // Counter-clockwise: entry midpoint → V[entryEdge] → ... → V[(exitEdge+1)%6] → exit midpoint
  const ccwStart = entryEdge;
  const ccwEnd = (exitEdge + 1) % 6;
  const ccwSteps = (ccwStart - ccwEnd + 6) % 6;

  const ccwPath = [entry];
  for (let i = 0; i <= ccwSteps; i++) {
    ccwPath.push(verts[(ccwStart - i + 6) % 6]);
  }
  ccwPath.push(exit);

  if (cwPath.length === ccwPath.length) return preferCW ? cwPath : ccwPath;
  return preferCW
    ? cwPath.length <= ccwPath.length
      ? cwPath
      : ccwPath
    : ccwPath.length <= cwPath.length
      ? ccwPath
      : cwPath;
}

export interface EdgeRoute {
  points: { x: number; y: number }[];
  /** Indices into points that land on hex vertices (corners). */
  vertexIndices: number[];
}

/** Convert a BFS hex path into pixel waypoints that follow hex edges. */
export function buildEdgeRoute(
  hexPath: { col: number; row: number }[],
): EdgeRoute {
  if (hexPath.length <= 1) {
    return {
      points: hexPath.map((h) => getHexPos(h.col, h.row)),
      vertexIndices: [],
    };
  }

  const points: { x: number; y: number }[] = [];
  const vertexIndices: number[] = [];

  for (let i = 0; i < hexPath.length - 1; i++) {
    const curr = hexPath[i];
    const next = hexPath[i + 1];
    const exitEdge = getExitEdge(curr.col, curr.row, next.col, next.row);
    const currCenter = getHexPos(curr.col, curr.row);

    if (i === 0) {
      // First hex: start at the clockwise vertex of the exit edge
      const verts = getHexVertices(currCenter.x, currCenter.y);
      vertexIndices.push(points.length);
      points.push(verts[(exitEdge + 1) % 6]);
    } else {
      // Intermediate hex: trace perimeter from entry edge to exit edge
      const prevExitEdge = getExitEdge(
        hexPath[i - 1].col,
        hexPath[i - 1].row,
        curr.col,
        curr.row,
      );
      const myEntryEdge = OPPOSITE_EDGE[prevExitEdge];
      const perim = perimeterWaypoints(
        currCenter.x,
        currCenter.y,
        myEntryEdge,
        exitEdge,
        i % 2 === 0,
      );
      // Skip first point (edge midpoint already in points array).
      // Points at indices 1..perim.length-2 are vertices; last is edge midpoint.
      for (let j = 1; j < perim.length; j++) {
        if (j > 0 && j < perim.length - 1) {
          vertexIndices.push(points.length);
        }
        points.push(perim[j]);
      }
    }

    // Last step: end at the counter-clockwise vertex of the entry edge
    if (i === hexPath.length - 2) {
      const nextCenter = getHexPos(next.col, next.row);
      const entryEdge = OPPOSITE_EDGE[exitEdge];
      const endVerts = getHexVertices(nextCenter.x, nextCenter.y);
      vertexIndices.push(points.length);
      points.push(endVerts[entryEdge]);
    }
  }

  return { points, vertexIndices };
}

/** Cable color by required cable type */
export const CABLE_COLOR_MAP: Record<string, string> = {
  iec_cable: '#fbbf24',
  xlr_cable: '#6366f1',
  ts_cable: '#10b981',
  usb_b_cable: '#38bdf8',
  usb_c_cable: '#bae6fd',
  snake_multi: '#a855f7',
};
