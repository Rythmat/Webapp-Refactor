/**
 * Where the globe is on screen, from the camera's public numbers (zoom,
 * centre, height, field of view), in MapLibre's own terms: which points
 * face the viewer, and the disc the globe fills. Pure, so it is tested
 * against MapLibre's numbers without a map.
 */

const rad = (deg: number) => (deg * Math.PI) / 180;

/** MapLibre's widest latitude, where Mercator's scale stops. */
const MAX_LAT = 85.051129;

/**
 * The globe's radius in px (MapLibre's getGlobeRadiusPixels): the world's
 * width at this zoom over 2π, over the cosine of the centre's latitude (a
 * zoom names the same scale at the centre as Mercator's would, so the globe
 * is drawn bigger looking toward the poles).
 */
export function globeRadiusPx(zoom: number, centerLat: number): number {
  const worldSize = 512 * 2 ** zoom;
  return (
    worldSize /
    (2 * Math.PI) /
    Math.cos(rad(Math.min(Math.abs(centerLat), MAX_LAT)))
  );
}

/** The camera's distance to the map's centre in px: half the height over tan(fov/2). */
export function cameraToCenterPx(heightPx: number, fovDeg: number): number {
  return heightPx / 2 / Math.tan(rad(fovDeg) / 2);
}

/** The camera's distance from the globe's centre, in globe radii (above 1). */
export function cameraRadii(
  zoom: number,
  centerLat: number,
  heightPx: number,
  fovDeg: number,
): number {
  const r = globeRadiusPx(zoom, centerLat);
  return (cameraToCenterPx(heightPx, fovDeg) + r) / r;
}

/** The cosine of the angle between two places, seen from the globe's centre. */
export function cosAngle(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return (
    Math.sin(rad(a.lat)) * Math.sin(rad(b.lat)) +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(a.lng - b.lng))
  );
}

/**
 * How squarely a place faces the viewer looking at `center` from
 * `cameraR` radii out: 1 at the centre of the view, 0 on the limb, below 0
 * on the far side (hidden).
 */
export function facing(
  center: { lat: number; lng: number },
  point: { lat: number; lng: number },
  cameraR: number,
): number {
  const limb = 1 / cameraR;
  return (cosAngle(center, point) - limb) / (1 - limb);
}

/**
 * The disc the globe fills on screen: its centre, in the middle of the map
 * area the padding leaves (where MapLibre puts the map's centre), and its
 * radius, the limb as the camera sees it.
 */
export function globeDisc(view: {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  zoom: number;
  centerLat: number;
  fovDeg: number;
}): { cx: number; cy: number; r: number } {
  const { width, height, padding } = view;
  const d = cameraToCenterPx(height, view.fovDeg);
  const D = cameraRadii(view.zoom, view.centerLat, height, view.fovDeg);
  return {
    cx: padding.left + (width - padding.left - padding.right) / 2,
    cy: padding.top + (height - padding.top - padding.bottom) / 2,
    r: d / Math.sqrt(D * D - 1),
  };
}

/**
 * How visible the globe's rim is: whole while the globe fits well inside
 * the view, gone once it fills the view's diagonal (there is no limb left
 * to draw a rim on).
 */
export function rimOpacity(r: number, width: number, height: number): number {
  const full = 0.55 * Math.min(width, height);
  const gone = 0.5 * Math.hypot(width, height);
  if (r <= full) return 1;
  if (r >= gone) return 0;
  return 1 - (r - full) / (gone - full);
}
