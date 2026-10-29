import type { Feature, FeatureCollection, Point } from 'geojson';
import type {
  ExpressionSpecification,
  LayerSpecification,
  SourceSpecification,
} from 'maplibre-gl';
import { regionLabel } from '@/components/atlas/data/placeTree';
import { REGIONS } from '@/components/atlas/data/regions';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import type { LandColor } from '@/components/atlas/types';
import { featureName } from './globeLabels';
import { MAP_FONT } from './mapFonts';
import { outerRings, pointInRing, ringArea, type Ring } from './mapFraming';
import { STATES_MIN_ZOOM } from './mapGeometry';

/**
 * The land, as the map draws it (owner, 2026-10-29: "dark land, lit by
 * music"): the countries on a near-black sea, lit by how much music each
 * holds in the years shown, or in their continents' colours, or plain;
 * hairline borders, brighter where the pointer is, white with a warm glow
 * where the stop is; the world's regions named from orbit and the
 * countries closer in. Pure: the tests read the layers without a map.
 */

export const LAND_SOURCE = {
  countries: 'atlas-countries',
  states: 'atlas-states',
  countryLabels: 'atlas-country-labels',
  regionLabels: 'atlas-region-labels',
} as const;

export const LAND_LAYER = {
  countriesFill: 'atlas-countries-fill',
  statesFill: 'atlas-states-fill',
  countriesGlow: 'atlas-countries-glow',
  statesGlow: 'atlas-states-glow',
  countriesLine: 'atlas-countries-line',
  statesLine: 'atlas-states-line',
  regionLabels: 'atlas-region-labels',
  /** Country names come in three tiers by size, each from its own zoom. */
  countryLabels: [
    'atlas-country-labels-1',
    'atlas-country-labels-2',
    'atlas-country-labels-3',
  ],
} as const;

/** The zoom each tier of country names appears from, biggest first. */
export const COUNTRY_LABEL_ZOOMS = [2.5, 3.5, 4.5] as const;
/** How many countries are in the first two tiers; the rest are the third. */
const TIER_SIZES = [30, 50] as const;
/** The world's regions are named from orbit, until the countries take over. */
export const REGION_LABELS_UNTIL = 2.6;

const flag = (name: string): ExpressionSpecification => [
  'boolean',
  ['feature-state', name],
  false,
];
const selected = flag('selected');
const hover = flag('hover');

/** A country's music level, 0 (none) to 1 (the most), set by the map. */
const music: ExpressionSpecification = [
  'coalesce',
  ['feature-state', 'music'],
  0,
];

/** The fill for each way of colouring the land. */
export function landPaint(mode: LandColor): {
  'fill-color': ExpressionSpecification | string;
  'fill-opacity': number;
} {
  if (mode === 'continent') {
    return {
      'fill-color': ['get', 'color'],
      'fill-opacity': ATLAS_SCENE.continentOpacity,
    };
  }
  if (mode === 'plain') {
    return { 'fill-color': ATLAS_SCENE.landPlain, 'fill-opacity': 1 };
  }
  const [little, some, much, most] = ATLAS_SCENE.landLit;
  const ramp = (level: ExpressionSpecification): ExpressionSpecification => [
    'interpolate',
    ['linear'],
    level,
    0,
    ATLAS_SCENE.landPlain,
    0.12,
    little,
    0.4,
    some,
    0.7,
    much,
    1,
    most,
  ];
  // Close in, one country fills the view: its light dims, so the places'
  // halos and names carry what is there.
  return {
    'fill-color': [
      'interpolate',
      ['linear'],
      ['zoom'],
      LAND_LIGHT_FULL_UNTIL,
      ramp(music),
      LAND_LIGHT_DIM_FROM,
      ramp(['*', LAND_LIGHT_DIMMED, music]),
    ],
    'fill-opacity': 1,
  };
}

/** The land's light is whole until this zoom, and dimmed from this one. */
export const LAND_LIGHT_FULL_UNTIL = 4;
export const LAND_LIGHT_DIM_FROM = 6.5;
/** How much of its light a country keeps, close in. */
export const LAND_LIGHT_DIMMED = 0.45;

const emptyCollection = (): SourceSpecification => ({
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
});

/** The land's sources, empty until the map feeds them (the regions' names are fixed). */
export function landSources(): Record<string, SourceSpecification> {
  return {
    [LAND_SOURCE.countries]: emptyCollection(),
    [LAND_SOURCE.states]: emptyCollection(),
    [LAND_SOURCE.countryLabels]: emptyCollection(),
    [LAND_SOURCE.regionLabels]: {
      type: 'geojson',
      data: regionLabelCollection(),
    },
  };
}

const glow = (id: string, source: string, minzoom = 0): LayerSpecification => ({
  id,
  type: 'line',
  source,
  minzoom,
  layout: { 'line-join': 'round' },
  paint: {
    'line-color': ATLAS_SCENE.regionGlow,
    'line-width': 9,
    'line-blur': 7,
    'line-opacity': ['case', selected, 0.9, hover, 0.35, 0],
  },
});

/** The land and its borders, under everything else the map draws. */
export function landLayers(mode: LandColor): LayerSpecification[] {
  return [
    {
      id: LAND_LAYER.countriesFill,
      type: 'fill',
      source: LAND_SOURCE.countries,
      paint: landPaint(mode),
    },
    {
      // Clicks only: a state is its country's land.
      id: LAND_LAYER.statesFill,
      type: 'fill',
      source: LAND_SOURCE.states,
      minzoom: STATES_MIN_ZOOM,
      paint: { 'fill-color': ATLAS_SCENE.landPlain, 'fill-opacity': 0 },
    },
    glow(LAND_LAYER.countriesGlow, LAND_SOURCE.countries),
    glow(LAND_LAYER.statesGlow, LAND_SOURCE.states, STATES_MIN_ZOOM),
    {
      id: LAND_LAYER.statesLine,
      type: 'line',
      source: LAND_SOURCE.states,
      minzoom: STATES_MIN_ZOOM,
      paint: {
        'line-color': [
          'case',
          selected,
          ATLAS_SCENE.strokeSelected,
          hover,
          ATLAS_SCENE.strokeHover,
          ATLAS_SCENE.strokeState,
        ],
        'line-width': ['case', selected, 1.25, hover, 1, 0.5],
      },
    },
    {
      id: LAND_LAYER.countriesLine,
      type: 'line',
      source: LAND_SOURCE.countries,
      paint: {
        'line-color': [
          'case',
          selected,
          ATLAS_SCENE.strokeSelected,
          hover,
          ATLAS_SCENE.strokeHover,
          ATLAS_SCENE.strokeCountry,
        ],
        'line-width': ['case', selected, 1.5, hover, 1, 0.6],
      },
    },
  ];
}

const spacedCaps = (
  size: number | ExpressionSpecification,
  color: string,
  spacing: number,
) => ({
  layout: {
    'text-field': ['get', 'name'] as ExpressionSpecification,
    'text-font': [MAP_FONT.regular],
    'text-size': size,
    'text-transform': 'uppercase' as const,
    'text-letter-spacing': spacing,
    'text-max-width': 8,
    'text-padding': 6,
  },
  paint: {
    'text-color': color,
    'text-halo-color': ATLAS_SCENE.labelHalo,
    'text-halo-width': 1,
  },
});

/**
 * The names of the land: the world's regions from orbit, then the
 * countries, the biggest first. `textScale` is the page's rem over 16 px,
 * so the map's text follows the app's type scale.
 */
export function landLabelLayers(textScale = 1): LayerSpecification[] {
  const px = (n: number) => Math.round(n * textScale * 10) / 10;
  return [
    {
      id: LAND_LAYER.regionLabels,
      type: 'symbol',
      source: LAND_SOURCE.regionLabels,
      maxzoom: REGION_LABELS_UNTIL,
      ...spacedCaps(px(12), ATLAS_SCENE.regionLabel, 0.32),
    } as LayerSpecification,
    ...LAND_LAYER.countryLabels.map(
      (id, i) =>
        ({
          id,
          type: 'symbol',
          source: LAND_SOURCE.countryLabels,
          minzoom: COUNTRY_LABEL_ZOOMS[i],
          filter: ['==', ['get', 'tier'], i + 1],
          ...spacedCaps(
            [
              'interpolate',
              ['linear'],
              ['zoom'],
              COUNTRY_LABEL_ZOOMS[i],
              px(11.5),
              7,
              px(13),
            ],
            ATLAS_SCENE.countryLabel,
            0.24,
          ),
        }) as LayerSpecification,
    ),
  ];
}

/* ── Where the names go ──────────────────────────────────────────────────── */

/** Natural Earth's names the map shortens. */
const SHORT_NAMES: Record<string, string> = {
  'United States of America': 'United States',
  'Dem. Rep. Congo': 'DR Congo',
};

/**
 * A point inside a ring to write its name at: on the line of latitude
 * through the ring's centroid, the middle of the longest stretch that is
 * inside the ring (a crescent's centroid can be out at sea).
 */
export function labelPointIn(ring: Ring): [number, number] {
  let twice = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    const cross = x1 * y2 - x2 * y1;
    twice += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  const centroid: [number, number] =
    twice === 0
      ? [ring[0][0], ring[0][1]]
      : [cx / (3 * twice), cy / (3 * twice)];
  if (pointInRing(centroid[0], centroid[1], ring)) return centroid;
  // Where the ring's edges cross that latitude, in order.
  const y = centroid[1];
  const xs: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    if (y1 === y2 || y < Math.min(y1, y2) || y >= Math.max(y1, y2)) continue;
    xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
  }
  xs.sort((a, b) => a - b);
  let best: [number, number] | null = null;
  let widest = -1;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    if (xs[i + 1] - xs[i] > widest) {
      widest = xs[i + 1] - xs[i];
      best = [(xs[i] + xs[i + 1]) / 2, y];
    }
  }
  return best ?? centroid;
}

export interface CountryLabelProps {
  name: string;
  /** 1 for the biggest countries (named first), then 2, then 3. */
  tier: 1 | 2 | 3;
  /** Bigger first where names crowd. */
  rank: number;
}

/** Each country's name, at a point on its main landmass, tiered by size. */
export function countryLabelCollection(
  countries: readonly Feature[],
): FeatureCollection<Point, CountryLabelProps> {
  const placed = countries
    .map((feature) => {
      const rings = outerRings(feature.geometry).filter((r) => r.length >= 4);
      if (rings.length === 0) return null;
      const main = rings.reduce((a, b) => (ringArea(b) > ringArea(a) ? b : a));
      const name = featureName(feature);
      return name
        ? {
            name: SHORT_NAMES[name] ?? name,
            point: labelPointIn(main),
            area: ringArea(main),
          }
        : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.area - a.area || a.name.localeCompare(b.name));
  return {
    type: 'FeatureCollection',
    features: placed.map((c, rank) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: c.point },
      properties: {
        name: c.name,
        tier:
          rank < TIER_SIZES[0]
            ? 1
            : rank < TIER_SIZES[0] + TIER_SIZES[1]
              ? 2
              : 3,
        rank,
      },
    })),
  };
}

/** The world's regions, named at their centres. */
export function regionLabelCollection(): FeatureCollection<
  Point,
  { name: string }
> {
  return {
    type: 'FeatureCollection',
    features: REGIONS.map((region) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [region.center[1], region.center[0]],
      },
      properties: { name: regionLabel(region.id) },
    })),
  };
}
