/**
 * The Globe demo's one view of the Earth: an orthographic projection (the
 * globe as seen from far away) centred over the American South, so New
 * Orleans and Detroit — the two stories — sit near the middle where the map
 * is nearly flat when the demo flies in.
 *
 * Plain TypeScript with no imports: `scripts/buildLandingGlobe.mjs` (Node
 * strips the types) projects the outlines with it once, and the page projects
 * its places with the same math.
 */

/** The view: centre (degrees), and the disc in its square art board (px). */
export const GLOBE_VIEW = {
  lat: 32,
  lng: -88,
  /** The art board is `size` × `size`; the disc is centred in it. */
  size: 1000,
  r: 480,
} as const;

const RAD = Math.PI / 180;
const SIN0 = Math.sin(GLOBE_VIEW.lat * RAD);
const COS0 = Math.cos(GLOBE_VIEW.lat * RAD);

/**
 * A point on the unit sphere in view space: z > 0 faces the viewer, x runs
 * east and y north on screen.
 */
export const toView = (lat: number, lng: number): [number, number, number] => {
  const phi = lat * RAD;
  const dl = (lng - GLOBE_VIEW.lng) * RAD;
  const cosPhi = Math.cos(phi);
  return [
    cosPhi * Math.sin(dl),
    COS0 * Math.sin(phi) - SIN0 * cosPhi * Math.cos(dl),
    SIN0 * Math.sin(phi) + COS0 * cosPhi * Math.cos(dl),
  ];
};

/** A view-space point on the art board (y down). */
export const toBoard = (p: readonly number[]): [number, number] => {
  const c = GLOBE_VIEW.size / 2;
  return [c + GLOBE_VIEW.r * p[0], c - GLOBE_VIEW.r * p[1]];
};

/** Where a place lands on the art board, and whether it faces the viewer. */
export const project = (
  lat: number,
  lng: number,
): { x: number; y: number; visible: boolean } => {
  const p = toView(lat, lng);
  const [x, y] = toBoard(p);
  return { x, y, visible: p[2] > 0 };
};
