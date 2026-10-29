import type { FeatureCollection, Point } from 'geojson';
import type { ExpressionSpecification, LayerSpecification } from 'maplibre-gl';
import { ERA_HEX, MUSICAL_ERAS } from '@/components/atlas/data/musicalEras';
import type { MusicWeights } from '@/components/atlas/stats/musicWeights';
import { HALO } from '@/components/atlas/theme/marks';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import type { CityPoint } from './globeLayers';
import { CHIP } from './mapChips';
import { MAP_FONT } from './mapFonts';

/**
 * The places on the map (owner, 2026-10-29, after the network-graph
 * reference): each music city or town a white dot, with a halo sized by how
 * much music it holds in the years shown and tinted by its busiest era, and
 * its name on a dark chip with its events under it; the busiest named first,
 * more as the map comes closer. Pure: the tests read it without a map.
 */

export const PLACE_LAYER = {
  halo: 'atlas-place-halo',
  dot: 'atlas-place-dot',
  hit: 'atlas-place-hit',
  sunBloom: 'atlas-sun-bloom',
  sunCore: 'atlas-sun-core',
  /** The chips: the city names' layer, as it always was. */
  labels: 'atlas-city-labels',
} as const;

/** Towns' dots and names only from here in; a music city shows from orbit. */
export const TOWNS_FROM = 4;
export const TOWN_NAMES_FROM = 5;

/**
 * How many places are named from each zoom, busiest first: a handful from
 * orbit, more over a continent, all close in.
 */
export const NAMED_BY_ZOOM: readonly (readonly [
  rankBelow: number,
  zoom: number,
])[] = [
  [6, 0],
  [14, 2],
  [28, 3],
  [56, 4],
  [120, 5],
];
const NAMED_LAST_ZOOM = 6;
/** Never: a place with no music in the years shown has no name chip. */
const NEVER = 99;

const flag = (name: string): ExpressionSpecification => [
  'boolean',
  ['feature-state', name],
  false,
];
const hover = flag('hover');
const highlight: ExpressionSpecification = [
  'boolean',
  ['get', 'highlight'],
  false,
];
/** The place's halo level, 0 to 1 (haloLevel), set by the map. */
const w: ExpressionSpecification = ['coalesce', ['feature-state', 'w'], 0];

/** Its busiest era's colour (feature-state `era`, an index into MUSICAL_ERAS). */
const eraColor: ExpressionSpecification = [
  'match',
  ['coalesce', ['feature-state', 'era'], -1],
  ...MUSICAL_ERAS.flatMap((era, i) => [i, ERA_HEX[era.id]]),
  ATLAS_SCENE.dot,
] as unknown as ExpressionSpecification;

/** A halo's radius in px from its level, at a given scale. */
const haloRadius = (scale: number): ExpressionSpecification => [
  '*',
  scale,
  ['+', HALO.minPx, ['*', HALO.maxPx - HALO.minPx, w]],
];

const townFilter: ExpressionSpecification = [
  'any',
  ['!', ['boolean', ['get', 'town'], false]],
  highlight,
  ['>=', ['zoom'], TOWNS_FROM],
];

/** The selected place's light: one point, where the stop is. */
export const SUN_SOURCE = 'atlas-sun';

/**
 * The places' layers: halos, dots, the hit areas, the selected place's
 * light (its "sun": a bloom and a white core, still; its burst and pulse are
 * the page's, SunFx), then the chips on top.
 */
export function placeLayers(
  source: string,
  textScale = 1,
): LayerSpecification[] {
  const px = (n: number) => Math.round(n * textScale * 10) / 10;
  return [
    {
      id: PLACE_LAYER.halo,
      type: 'circle',
      source,
      filter: townFilter,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          1,
          haloRadius(0.9),
          6,
          haloRadius(1.6),
        ],
        'circle-color': eraColor,
        'circle-opacity': ['case', ['>', w, 0], ['case', hover, 0.6, 0.42], 0],
        'circle-blur': 0.65,
        'circle-pitch-alignment': 'map',
      },
    },
    {
      id: PLACE_LAYER.dot,
      type: 'circle',
      source,
      filter: townFilter,
      paint: {
        'circle-radius': ['case', highlight, 3.5, hover, 3.2, 2.4],
        'circle-color': ATLAS_SCENE.dot,
        'circle-opacity': ['case', ['>', w, 0], 1, ['case', highlight, 1, 0.4]],
        'circle-stroke-width': ['case', highlight, 1.5, 1],
        'circle-stroke-color': [
          'case',
          highlight,
          ATLAS_SCENE.dotRing,
          ATLAS_SCENE.dotRim,
        ],
        'circle-pitch-alignment': 'map',
      },
    },
    {
      // A wide, invisible circle, so a 5 px dot is easy to hover and click.
      id: PLACE_LAYER.hit,
      type: 'circle',
      source,
      filter: townFilter,
      paint: { 'circle-radius': 12, 'circle-opacity': 0 },
    },
    {
      id: PLACE_LAYER.sunBloom,
      type: 'circle',
      source: SUN_SOURCE,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 18, 6, 30],
        'circle-color': ATLAS_SCENE.sunBloom,
        'circle-blur': 1,
        'circle-pitch-alignment': 'map',
      },
    },
    {
      id: PLACE_LAYER.sunCore,
      type: 'circle',
      source: SUN_SOURCE,
      paint: {
        'circle-radius': 5,
        'circle-color': ATLAS_SCENE.sunCore,
        'circle-stroke-width': 2,
        'circle-stroke-color': ATLAS_SCENE.dotRing,
        'circle-pitch-alignment': 'map',
      },
    },
    {
      id: PLACE_LAYER.labels,
      type: 'symbol',
      source,
      filter: ['>=', ['zoom'], ['get', 'minzoom']],
      layout: {
        'text-field': [
          'format',
          ['get', 'name'],
          { 'text-font': ['literal', [MAP_FONT.bold]] },
          '\n',
          {},
          ['get', 'sub'],
          {
            'text-font': ['literal', [MAP_FONT.regular]],
            'font-scale': 0.86,
            'text-color': ATLAS_SCENE.labelSub,
          },
        ],
        'text-font': [MAP_FONT.bold],
        'text-size': px(12.5),
        'text-line-height': 1.25,
        'text-justify': 'left',
        'text-variable-anchor-offset': [
          'left',
          [0.9, 0],
          'right',
          [-0.9, 0],
          'top',
          [0, 0.9],
          'bottom',
          [0, -0.9],
        ],
        'icon-image': ['case', highlight, CHIP.on, CHIP.plain],
        'icon-text-fit': 'both',
        'icon-text-fit-padding': [2, 4, 2, 4],
        'symbol-sort-key': ['get', 'priority'],
        'text-padding': 2,
      },
      paint: {
        'text-color': [
          'case',
          highlight,
          ATLAS_SCENE.labelHot,
          ATLAS_SCENE.label,
        ],
      },
    },
  ];
}

/* ── The places' data ────────────────────────────────────────────────────── */

export interface PlaceProps {
  cityId: string;
  name: string;
  /** Its events in the years shown, as its chip's second line. */
  sub: string;
  town: boolean;
  /** Selected, or holding the pinned event. */
  highlight: boolean;
  /** Lower is named first where names crowd (labelPriority). */
  priority: number;
  /** The zoom its name shows from (NAMED_BY_ZOOM). */
  minzoom: number;
}

/**
 * Who is named first where names crowd: the selected place, the pinned
 * event's, a place connected to the stop, then by how busy it is.
 */
export function labelPriority(p: {
  selected: boolean;
  pinned: boolean;
  connected: boolean;
  rank: number;
}): number {
  if (p.selected) return 0;
  if (p.pinned) return 1;
  if (p.connected) return 2;
  return 10 + p.rank;
}

/** The zoom a place's name shows from, by how busy it is (its rank). */
export function namedFrom(rank: number): number {
  for (const [below, zoom] of NAMED_BY_ZOOM) if (rank < below) return zoom;
  return NAMED_LAST_ZOOM;
}

const NAME_MAX = 18;
const shortName = (name: string) =>
  name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1).trimEnd()}…` : name;

const eventsLine = (n: number) =>
  n === 0 ? 'No events in these years' : n === 1 ? '1 event' : `${n} events`;

/**
 * The places as the map's source: each with its name and events in the
 * years shown, and when its name shows. Rebuilt when the years settle or
 * the stop changes; the halos follow the years live (feature-state).
 */
export function placeCollection(
  points: readonly CityPoint[],
  weights: MusicWeights,
  selectedCityId: string | null,
  pinnedCityId: string | null,
  connected: ReadonlySet<string> = new Set(),
): FeatureCollection<Point, PlaceProps> {
  const ranked = points
    .map((p) => p.id)
    .filter((id) => (weights.places.get(id)?.events ?? 0) > 0)
    .sort(
      (a, b) =>
        (weights.places.get(b)?.events ?? 0) -
          (weights.places.get(a)?.events ?? 0) || a.localeCompare(b),
    );
  const rankOf = new Map(ranked.map((id, i) => [id, i]));
  return {
    type: 'FeatureCollection',
    features: points.map((point) => {
      const events = weights.places.get(point.id)?.events ?? 0;
      const selected = point.id === selectedCityId;
      const pinned = point.id === pinnedCityId;
      const rank = rankOf.get(point.id) ?? Infinity;
      const priority = labelPriority({
        selected,
        pinned,
        connected: connected.has(point.id),
        rank: Number.isFinite(rank) ? rank : 9999,
      });
      const town = point.town ?? false;
      const minzoom =
        priority < 10
          ? 0
          : events === 0
            ? NEVER
            : Math.max(namedFrom(rank), town ? TOWN_NAMES_FROM : 0);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
        properties: {
          cityId: point.id,
          name: shortName(point.name),
          sub: eventsLine(events),
          town,
          highlight: selected || pinned,
          priority,
          minzoom,
        },
      };
    }),
  };
}
