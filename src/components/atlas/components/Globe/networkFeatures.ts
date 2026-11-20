import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import type { ArcDatum } from '@/components/atlas/data';
import { encodePlace } from '@/components/atlas/navigation/atlasStop';
import type { NetworkIndex } from '@/components/atlas/network/networkIndex';
import type { PlaceLink, ScopeLinks } from '@/components/atlas/network/types';
import {
  ROOTS_RAMP,
  ROUTES_RAMP,
  WEAK_LINK_MAX,
  edgeWidth,
  withAlpha,
} from '@/components/atlas/theme/marks';
import type { JourneyLeg } from './journeyLeg';
import { greatCircle } from './mapGeometry';

/**
 * The links on the map as GeoJSON, pure: what the stop's music came from
 * and went to; a pinned event's own influences. Each is its great circle
 * here; the arc layer (arcLayer.ts) lifts it into a flight path. Its far
 * end has a pulsing dot. Strong links are solid lines that take
 * the roots' or routes' gradient (their own source, for line-progress);
 * weak ties are dotted and flow (another source: a
 * dashed line can't take a gradient). Each carries what its hover card
 * says and what a click opens.
 */

/** Came from (into the stop), or went to (out of it). */
export type LinkSide = 'in' | 'out';

export interface LinkProps {
  /** The link's id (PlaceLink.id, or the arc's event's), for feature-state. */
  id: string;
  side: LinkSide;
  /** Its width in px at the middle zooms. */
  w: number;
  /** A dotted line's colour (a solid one takes its side's gradient). */
  color: string;
  weight: number;
  /** The hover card's lines: "New Orleans → Chicago", "14 influences · 1917–1965". */
  title: string;
  detail: string;
  /** What a click opens: the far place (encodePlace), or an arc's event. */
  place: string;
  eventId: string;
}

/** A link's far end: the place or event it came from or went to. */
export interface EndProps {
  id: string;
  side: LinkSide;
  color: string;
  /** Where in the pulse it starts (0–1), so the rings don't beat as one. */
  phase: number;
}

export interface LinkFeatures {
  solid: FeatureCollection<LineString, LinkProps>;
  dotted: FeatureCollection<LineString, LinkProps>;
  /** The far ends' pulsing dots (networkLayers.ts). */
  ends: FeatureCollection<Point, EndProps>;
}

/** How many of each side's links a stop draws, strongest first. */
export const LINKS_PER_SIDE = 40;
const DOTTED: Record<LinkSide, string> = {
  in: withAlpha(ROOTS_RAMP[1], 0.85),
  out: withAlpha(ROUTES_RAMP[2], 0.85),
};

/** A far end's dot: its side's colour, full. */
const END: Record<LinkSide, string> = {
  in: ROOTS_RAMP[1],
  out: ROUTES_RAMP[2],
};

/** The golden ratio's fraction: phases spread evenly, however many. */
const PHASE_STEP = 0.618;

/**
 * Each line's far end once (two links may meet at one place): the start of
 * a line coming in, the end of one going out.
 */
export function endsOf(
  lines: readonly Feature<LineString, LinkProps>[],
): FeatureCollection<Point, EndProps> {
  const seen = new Set<string>();
  const features: Feature<Point, EndProps>[] = [];
  for (const line of lines) {
    const c = line.geometry.coordinates;
    const [lng, lat] = line.properties.side === 'in' ? c[0] : c[c.length - 1];
    const key = `${lng.toFixed(3)},${lat.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const side = line.properties.side;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        id: key,
        side,
        color: END[side],
        phase: (features.length * PHASE_STEP) % 1,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

const influences = (n: number) => (n === 1 ? '1 influence' : `${n} influences`);
const yearsOf = ([a, b]: readonly [number, number]) =>
  a === b ? String(a) : `${a}–${b}`;

const empty = <G extends LineString | Point, P>(): FeatureCollection<G, P> => ({
  type: 'FeatureCollection',
  features: [],
});

function linkFeature(
  ix: NetworkIndex,
  link: PlaceLink,
  side: LinkSide,
): Feature<LineString, LinkProps> | null {
  const from = ix.node(link.from);
  const to = ix.node(link.to);
  if (!from || !to) return null;
  const far = side === 'in' ? from : to;
  return {
    type: 'Feature',
    id: link.id,
    geometry: { type: 'LineString', coordinates: greatCircle(from, to) },
    properties: {
      id: link.id,
      side,
      w: edgeWidth(link.weight),
      color: DOTTED[side],
      weight: link.weight,
      title: `${from.label} → ${to.label}`,
      detail: `${influences(link.weight)} · ${yearsOf(link.years)}`,
      place: far.place ? encodePlace(far.place) : '',
      eventId: '',
    },
  };
}

function split(lines: Feature<LineString, LinkProps>[]): LinkFeatures {
  const solid = lines.filter((l) => l.properties.weight > WEAK_LINK_MAX);
  const dotted = lines.filter((l) => l.properties.weight <= WEAK_LINK_MAX);
  return {
    solid: { type: 'FeatureCollection', features: solid },
    dotted: { type: 'FeatureCollection', features: dotted },
    ends: endsOf(lines),
  };
}

/** A stop's links: the strongest it came from and went to. */
export function scopeLinkFeatures(
  ix: NetworkIndex,
  scope: ScopeLinks,
  perSide = LINKS_PER_SIDE,
): LinkFeatures {
  const lines = [
    ...scope.roots.slice(0, perSide).map((l) => linkFeature(ix, l, 'in')),
    ...scope.routes.slice(0, perSide).map((l) => linkFeature(ix, l, 'out')),
  ].filter((f): f is Feature<LineString, LinkProps> => !!f);
  return split(lines);
}

/**
 * A pinned event's influences (data/eventConnections: each from the
 * influencer to the influenced): what shaped it came in, what it shaped went
 * out, each a solid line that opens its event.
 */
export function arcLinkFeatures(arcs: readonly ArcDatum[]): LinkFeatures {
  const solid: Feature<LineString, LinkProps>[] = arcs.map((arc, i) => {
    const side: LinkSide = arc.direction === 'upstream' ? 'in' : 'out';
    const id = `arc:${arc.eventId}:${i}`;
    return {
      type: 'Feature',
      id,
      geometry: {
        type: 'LineString',
        coordinates: greatCircle(
          { lat: arc.startLat, lng: arc.startLng },
          { lat: arc.endLat, lng: arc.endLng },
        ),
      },
      properties: {
        id,
        side,
        w: edgeWidth(2),
        color: DOTTED[side],
        weight: 1,
        title: arc.label,
        detail: side === 'in' ? 'Shaped this' : 'Shaped by this',
        place: '',
        eventId: arc.eventId,
      },
    };
  });
  return {
    solid: { type: 'FeatureCollection', features: solid },
    dotted: empty(),
    ends: endsOf(solid),
  };
}

/**
 * A running tour's or pathway's one link: from the stop shown on to the next
 * (owner, 2026-11-09), a solid line going out. A click opens nothing; the
 * card steps the journey.
 */
export function legLinkFeatures(leg: JourneyLeg): LinkFeatures {
  const id = `leg:${leg.key}`;
  const line: Feature<LineString, LinkProps> = {
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      coordinates: greatCircle(leg.from, leg.to),
    },
    properties: {
      id,
      side: 'out',
      w: edgeWidth(4),
      color: DOTTED.out,
      weight: 1,
      title: `${leg.from.label} → ${leg.to.label}`,
      detail: `Next stop: ${leg.next}`,
      place: '',
      eventId: '',
    },
  };
  return {
    solid: { type: 'FeatureCollection', features: [line] },
    dotted: empty(),
    ends: endsOf([line]),
  };
}

export const NO_LINKS: LinkFeatures = {
  solid: empty(),
  dotted: empty(),
  ends: empty(),
};
