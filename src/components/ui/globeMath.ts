/**
 * Small pure helpers shared by the cobe globe previews (dashboard `GlobeSection`
 * and the classroom pathway preview). cobe has no per-arc height, so we pick a
 * single global arc altitude from the longest arc's great-circle angle.
 */
import { colord } from 'colord';

const DEG = Math.PI / 180;

/** Convert an Atlas hex colour to cobe's 0–1 RGB triple. */
export const rgb = (hex: string): [number, number, number] => {
  const { r, g, b } = colord(hex).toRgb();
  return [r / 255, g / 255, b / 255];
};

/** Great-circle central angle (radians) between two [lat, lng] points. */
export const centralAngle = (
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number],
): number => {
  const p1 = lat1 * DEG;
  const p2 = lat2 * DEG;
  const dl = (lng2 - lng1) * DEG;
  const c =
    Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl);
  return Math.acos(Math.min(1, Math.max(-1, c)));
};

/** Pick a global arc altitude so the longest arc peaks well above the globe.
 *  Regional-only arcs stay low (~0.28); far, intercontinental arcs get a high
 *  arch instead of clipping through. */
export const arcHeightForAngle = (maxAngle: number): number =>
  Math.min(0.72, Math.max(0.28, 1.09 - 0.81 * Math.cos(maxAngle / 2)));
