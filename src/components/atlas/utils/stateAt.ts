import {
  STATE_BOUNDARIES,
  type StateBoundary,
} from '@/components/atlas/data/stateBoundaries';

export interface Subdivision {
  name: string;
  country: 'United States' | 'Canada';
}

interface Indexed {
  boundary: StateBoundary;
  /** [minLng, minLat, maxLng, maxLat] per ring, to skip most rings cheaply. */
  boxes: [number, number, number, number][];
}

let index: Indexed[] | null = null;

function getIndex(): Indexed[] {
  if (index) return index;
  index = STATE_BOUNDARIES.map((boundary) => ({
    boundary,
    boxes: boundary.rings.map((ring) => {
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;
      for (let i = 0; i < ring.length; i += 2) {
        minLng = Math.min(minLng, ring[i]);
        maxLng = Math.max(maxLng, ring[i]);
        minLat = Math.min(minLat, ring[i + 1]);
        maxLat = Math.max(maxLat, ring[i + 1]);
      }
      return [minLng, minLat, maxLng, maxLat];
    }),
  }));
  return index;
}

/** Even–odd ray cast against a flat [lng, lat, …] ring. */
function inRing(ring: number[], lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i];
    const yi = ring[i + 1];
    const xj = ring[j];
    const yj = ring[j + 1];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Max squared-degree distance to a coastline vertex for the near-shore fallback. */
const SHORE_DIST_SQ = 0.3 * 0.3;

/**
 * The US state or Canadian province containing a point.
 *
 * Coastal and island towns (Nantucket, Virginia Beach) can sit just outside an
 * outline simplified to ~4km, so a point inside none of them takes the state
 * with the nearest vertex — within ~30km, so a point out at sea stays unknown.
 */
export function stateAt(lat: number, lng: number): Subdivision | undefined {
  const regions = getIndex();
  for (const { boundary, boxes } of regions) {
    for (let r = 0; r < boundary.rings.length; r++) {
      const [minLng, minLat, maxLng, maxLat] = boxes[r];
      if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat)
        continue;
      if (inRing(boundary.rings[r], lng, lat)) {
        return { name: boundary.name, country: boundary.country };
      }
    }
  }

  let best: StateBoundary | undefined;
  let bestDist = SHORE_DIST_SQ;
  for (const { boundary } of regions) {
    for (const ring of boundary.rings) {
      for (let i = 0; i < ring.length; i += 2) {
        const d = (ring[i] - lng) ** 2 + (ring[i + 1] - lat) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = boundary;
        }
      }
    }
  }
  return best ? { name: best.name, country: best.country } : undefined;
}
