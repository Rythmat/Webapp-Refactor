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
import { greatCircle } from './mapGeometry';

/**
 * The links on the map as GeoJSON, pure: what the stop's music came from
 * and went to, or with nothing chosen the strongest links between regions;
 * a pinned event's own influences. Strong links are solid lines that take
 * the roots' or routes' gradient (their own source, for line-progress);
 * weak ties and the world's links are dotted and flow (another source: a
 * dashed line can't take a gradient). Each carries what its hover card
 * says and what a click opens.
 */

/** Came from (into the stop), went to (out of it), or the world's. */
export type LinkSide = 'in' | 'out' | 'world';

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

export interface PillProps {
  id: string;
  /** The count, short: 14, 2.1K. */
  count: string;
  /** Lower is placed first where pills crowd. */
  rank: number;
}

export interface LinkFeatures {
  solid: FeatureCollection<LineString, LinkProps>;
  dotted: FeatureCollection<LineString, LinkProps>;
  pills: FeatureCollection<Point, PillProps>;
}

/** How many of each side's links a stop draws, strongest first. */
export const LINKS_PER_SIDE = 40;
/** How many links carry a count pill, strongest first (weak ties none). */
export const PILLS_MAX = 8;

const DOTTED: Record<LinkSide, string> = {
  in: withAlpha(ROOTS_RAMP[1], 0.85),
  out: withAlpha(ROUTES_RAMP[2], 0.85),
  world: withAlpha(ROUTES_RAMP[0], 0.4),
};

/** A count in at most four characters: 14, 999, 2.1K, 12K. */
export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${Math.round(n / 1000)}K`;
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
      w:
        side === 'world'
          ? Math.min(3, edgeWidth(link.weight) / 2)
          : edgeWidth(link.weight),
      color: DOTTED[side],
      weight: link.weight,
      title: `${from.label} → ${to.label}`,
      detail: `${influences(link.weight)} · ${yearsOf(link.years)}`,
      place: far.place ? encodePlace(far.place) : '',
      eventId: '',
    },
  };
}

/** The point halfway along a line, where its pill sits. */
function midpoint(line: Feature<LineString, LinkProps>): [number, number] {
  const c = line.geometry.coordinates;
  return c[Math.floor(c.length / 2)] as [number, number];
}

function pillsFor(
  lines: readonly Feature<LineString, LinkProps>[],
  max: number,
): FeatureCollection<Point, PillProps> {
  // A weak tie's "1" would only be noise.
  const top = lines
    .filter((l) => l.properties.weight > WEAK_LINK_MAX)
    .sort(
      (a, b) =>
        b.properties.weight - a.properties.weight ||
        a.properties.id.localeCompare(b.properties.id),
    )
    .slice(0, max);
  return {
    type: 'FeatureCollection',
    features: top.map((line, rank) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: midpoint(line) },
      properties: {
        id: line.properties.id,
        count: compactCount(line.properties.weight),
        rank,
      },
    })),
  };
}

function split(lines: Feature<LineString, LinkProps>[]): LinkFeatures {
  const solid = lines.filter(
    (l) => l.properties.side !== 'world' && l.properties.weight > WEAK_LINK_MAX,
  );
  const dotted = lines.filter(
    (l) =>
      l.properties.side === 'world' || l.properties.weight <= WEAK_LINK_MAX,
  );
  return {
    solid: { type: 'FeatureCollection', features: solid },
    dotted: { type: 'FeatureCollection', features: dotted },
    pills: pillsFor(lines, PILLS_MAX),
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

/** With nothing chosen: the strongest links between regions, dotted. */
export function worldLinkFeatures(
  ix: NetworkIndex,
  links: readonly PlaceLink[],
): LinkFeatures {
  const lines = links
    .map((l) => linkFeature(ix, l, 'world'))
    .filter((f): f is Feature<LineString, LinkProps> => !!f);
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
    pills: empty(),
  };
}

export const NO_LINKS: LinkFeatures = {
  solid: empty(),
  dotted: empty(),
  pills: empty(),
};
