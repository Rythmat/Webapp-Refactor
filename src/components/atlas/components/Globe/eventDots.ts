import type { Feature, FeatureCollection, Point, Position } from 'geojson';

/**
 * One dot per event over the lifted region (owner, 2026-10-30, after the DHCS
 * map), pure. Events in one place spread round it in a sunflower spiral, each
 * taking the next free seat inside the region, so a busy city fills the land
 * round it rather than piling up. Seats don't depend on the years shown: a
 * dot stays put as the era rail moves.
 */

export interface DotEvent {
  id: string;
  year: number;
  lat: number;
  lng: number;
}

export interface DotSeat {
  eventId: string;
  year: number;
  coordinates: [number, number];
}

/** The golden angle: successive seats never line up. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
/** How many seats an event tries before it sits on its place, as a last resort. */
const MAX_TRIES = 1200;

type Ring = readonly Position[];

interface BoxedRing {
  ring: Ring;
  west: number;
  east: number;
  south: number;
  north: number;
}

const boxed = (ring: Ring): BoxedRing => {
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return {
    ring,
    west: Math.min(...lngs),
    east: Math.max(...lngs),
    south: Math.min(...lats),
    north: Math.max(...lats),
  };
};

const inRing = (lng: number, lat: number, ring: Ring): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
};

/** Inside the region: in an odd number of its rings, so a hole is out. */
const inRegion = (lng: number, lat: number, rings: readonly BoxedRing[]) => {
  let count = 0;
  for (const r of rings) {
    if (lng < r.west || lng > r.east || lat < r.south || lat > r.north)
      continue;
    if (inRing(lng, lat, r.ring)) count += 1;
  }
  return count % 2 === 1;
};

/**
 * Each event's seat. `rings` are the region's outlines as drawn (carried east
 * of 180° if it crosses the antimeridian); `spacingDeg` the distance between
 * neighbours. Busiest place first, each place's events oldest first.
 */
export function seatEvents(
  events: readonly DotEvent[],
  rings: readonly Ring[],
  spacingDeg: number,
): DotSeat[] {
  const regions = rings.filter((r) => r.length >= 4).map(boxed);
  const crossed = regions.some((r) => r.east > 180);
  const groups = new Map<string, DotEvent[]>();
  for (const e of events) {
    const key = `${e.lat.toFixed(2)},${e.lng.toFixed(2)}`;
    const group = groups.get(key);
    if (group) group.push(e);
    else groups.set(key, [e]);
  }
  const ordered = [...groups.entries()].sort(
    ([a, ga], [b, gb]) => gb.length - ga.length || a.localeCompare(b),
  );
  const taken = new Set<string>();
  const seats: DotSeat[] = [];
  for (const [, group] of ordered) {
    const { lat, lng: rawLng } = group[0];
    const lng = crossed && rawLng < 0 ? rawLng + 360 : rawLng;
    const stretch = 1 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    const sorted = [...group].sort(
      (a, b) => a.year - b.year || a.id.localeCompare(b.id),
    );
    let k = 0;
    for (const e of sorted) {
      let seat: [number, number] = [lng, lat];
      for (let tries = 0; tries < MAX_TRIES; tries++, k++) {
        const r = spacingDeg * Math.sqrt(k);
        const x = lng + r * Math.cos(k * GOLDEN) * stretch;
        const y = lat + r * Math.sin(k * GOLDEN);
        const cell = `${Math.round(x / (spacingDeg * stretch))},${Math.round(y / spacingDeg)}`;
        if (taken.has(cell) || !inRegion(x, y, regions)) continue;
        taken.add(cell);
        seat = [x, y];
        k++;
        break;
      }
      seats.push({ eventId: e.id, year: e.year, coordinates: seat });
    }
  }
  return seats.sort(
    (a, b) => a.year - b.year || a.eventId.localeCompare(b.eventId),
  );
}

export interface DotProps {
  eventId: string;
  /** Its era's colour: the rim that reads on any part of the gradient. */
  rim: string;
  /** Another place's, at a city's stop. */
  dim: boolean;
  /** The pinned event. */
  hot: boolean;
}

/** The seats as the dots' source. */
export function dotCollection(
  seats: readonly DotSeat[],
  look: (eventId: string, year: number) => Omit<DotProps, 'eventId'>,
): FeatureCollection<Point, DotProps> {
  return {
    type: 'FeatureCollection',
    features: seats.map(
      (seat): Feature<Point, DotProps> => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: seat.coordinates },
        properties: { eventId: seat.eventId, ...look(seat.eventId, seat.year) },
      }),
    ),
  };
}

/** Degrees of longitude a number of px spans at a zoom (MapLibre's 512 px world). */
export const pxToDeg = (px: number, zoom: number): number =>
  px / ((512 * 2 ** zoom) / 360);
