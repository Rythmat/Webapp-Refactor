import type {
  ExpressionSpecification,
  LayerSpecification,
  SourceSpecification,
  StyleSpecification,
} from 'maplibre-gl';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { MAP_FONT, mapFontFaces } from './mapFonts';
import { STATES_MIN_ZOOM } from './mapGeometry';

/**
 * The map's style, built in code: the Globe's own layers (the coloured
 * countries, the state outlines, the city names, an artist's points and the
 * influence arcs) on the sea, with no basemap under them. Pure: the same
 * inputs give the same style, and the tests read it without a map.
 */

/* ── Ids ─────────────────────────────────────────────────────────────────── */

export const SOURCE = {
  countries: 'atlas-countries',
  states: 'atlas-states',
  cityPoints: 'atlas-city-points',
  /** The selected city's outline (data/cityOutlines.ts), or nothing. */
  cityOutline: 'atlas-city-outline',
  artistPoints: 'atlas-artist-points',
  arcs: 'atlas-arcs',
} as const;

export const LAYER = {
  countriesFill: 'atlas-countries-fill',
  countriesLine: 'atlas-countries-line',
  statesFill: 'atlas-states-fill',
  statesLine: 'atlas-states-line',
  cityOutline: 'atlas-city-outline',
  arcsCasing: 'atlas-arcs-casing',
  arcsTrace: 'atlas-arcs-trace',
  arcsDash: 'atlas-arcs-dash',
  arcsHit: 'atlas-arcs-hit',
  cityLabels: 'atlas-city-labels',
  artistPoints: 'atlas-artist-points',
} as const;

/** What a click can land on, most specific first: the first hit wins. */
export const CLICK_LAYERS = [
  LAYER.arcsHit,
  LAYER.artistPoints,
  LAYER.cityLabels,
  LAYER.statesFill,
  LAYER.countriesFill,
] as const;

/* ── The Globe's own layers ──────────────────────────────────────────────── */

/** Where the towns events make cities of get their names on the map. */
export const TOWN_NAMES_FROM = 5;

const zoomRamp = (
  ...stops: (readonly [number, number])[]
): ExpressionSpecification =>
  [
    'interpolate',
    ['linear'],
    ['zoom'],
    ...stops.flat(),
  ] as unknown as ExpressionSpecification;

const selected: ExpressionSpecification = [
  'boolean',
  ['feature-state', 'selected'],
  false,
];

const emptyCollection = (): SourceSpecification => ({
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
});

/** The Globe's sources, empty until MapLibreGlobe feeds them. */
export function overlaySources(): Record<string, SourceSpecification> {
  return {
    [SOURCE.countries]: emptyCollection(),
    [SOURCE.states]: emptyCollection(),
    // Ids by city, for the hover feature-state on a city's name.
    [SOURCE.cityPoints]: {
      ...emptyCollection(),
      promoteId: 'cityId',
    } as SourceSpecification,
    [SOURCE.cityOutline]: emptyCollection(),
    [SOURCE.artistPoints]: emptyCollection(),
    [SOURCE.arcs]: emptyCollection(),
  };
}

/** The countries, in their continent colours. */
export function countryFillLayer(): LayerSpecification {
  return {
    id: LAYER.countriesFill,
    type: 'fill',
    source: SOURCE.countries,
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.86 },
  };
}

/**
 * The layers between the countries and the city names: outlines, arcs and
 * an artist's points.
 */
export function overlayLayersBelowLabels(): LayerSpecification[] {
  return [
    {
      // Clicks only: the states keep their country's colour, as before.
      id: LAYER.statesFill,
      type: 'fill',
      source: SOURCE.states,
      minzoom: STATES_MIN_ZOOM,
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0 },
    },
    {
      id: LAYER.statesLine,
      type: 'line',
      source: SOURCE.states,
      minzoom: STATES_MIN_ZOOM,
      paint: {
        'line-color': [
          'case',
          selected,
          ATLAS_SCENE.strokeSelected,
          ATLAS_SCENE.strokeState,
        ],
        'line-width': ['case', selected, 2, 0.75],
      },
    },
    {
      id: LAYER.countriesLine,
      type: 'line',
      source: SOURCE.countries,
      paint: {
        'line-color': [
          'case',
          selected,
          ATLAS_SCENE.strokeSelected,
          ATLAS_SCENE.strokeCountry,
        ],
        'line-width': ['case', selected, 2.25, 0.75],
      },
    },
    {
      // The selected city's boundary, in the selected country's or state's
      // bright, warm line.
      id: LAYER.cityOutline,
      type: 'line',
      source: SOURCE.cityOutline,
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': ATLAS_SCENE.strokeSelected,
        'line-width': 2.25,
      },
    },
    {
      // A dark edge, so a white arc still reads on the palest land.
      id: LAYER.arcsCasing,
      type: 'line',
      source: SOURCE.arcs,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ATLAS_SCENE.pointRim,
        'line-width': 5,
        'line-opacity': 0.55,
      },
    },
    {
      // The whole arc, faint, in its tail's colour…
      id: LAYER.arcsTrace,
      type: 'line',
      source: SOURCE.arcs,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'tail'], 'line-width': 2 },
    },
    {
      // …with dashes in its head's colour walking along it (MapLibreGlobe
      // steps line-dasharray through ARC_DASH_STEPS).
      id: LAYER.arcsDash,
      type: 'line',
      source: SOURCE.arcs,
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': ['get', 'head'],
        'line-width': 3,
        'line-dasharray': [0, 4, 3],
      },
    },
    {
      // A wide, invisible band, so a 2 px line is easy to hover and click.
      id: LAYER.arcsHit,
      type: 'line',
      source: SOURCE.arcs,
      paint: {
        'line-color': ATLAS_SCENE.highlight,
        'line-width': 14,
        'line-opacity': 0,
      },
    },
    // An artist's points go last, under the city names, so a name reads
    // over a point rather than under it.
    {
      id: LAYER.artistPoints,
      type: 'circle',
      source: SOURCE.artistPoints,
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': zoomRamp([0, 4], [8, 7]),
        'circle-stroke-color': ATLAS_SCENE.pointRim,
        'circle-stroke-width': 1.5,
        'circle-pitch-alignment': 'map',
      },
    },
  ];
}

/**
 * The cities, as their names: no dot, the name is the city, and it is what
 * a click selects. Over everything, in the app's font (mapFonts.ts). A name
 * turns warm while hovered, and while its city is selected or holds the
 * pinned event. Where names crowd, the selected city's wins, then the music
 * cities', then the towns events make cities of, which appear only from
 * TOWN_NAMES_FROM.
 */
export function overlayLayersOnTop(): LayerSpecification[] {
  const highlight: ExpressionSpecification = [
    'any',
    ['boolean', ['get', 'highlight'], false],
    ['boolean', ['feature-state', 'hover'], false],
  ];
  return [
    {
      id: LAYER.cityLabels,
      type: 'symbol',
      source: SOURCE.cityPoints,
      filter: [
        'any',
        ['!', ['boolean', ['get', 'town'], false]],
        ['boolean', ['get', 'highlight'], false],
        ['>=', ['zoom'], TOWN_NAMES_FROM],
      ],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': [MAP_FONT.bold],
        'text-size': zoomRamp([2, 12], [8, 14], [12, 16]),
        'symbol-sort-key': [
          'case',
          ['boolean', ['get', 'highlight'], false],
          0,
          ['boolean', ['get', 'town'], false],
          2,
          1,
        ],
        'text-padding': 4,
      },
      paint: {
        'text-color': [
          'case',
          highlight,
          ATLAS_SCENE.strokeSelected,
          ATLAS_SCENE.label,
        ],
        'text-halo-color': ATLAS_SCENE.labelHalo,
        'text-halo-width': ['case', highlight, 2, 1.5],
      },
    },
  ];
}

/* ── The style ───────────────────────────────────────────────────────────── */

export interface StyleOptions {
  /** The page's origin, which serves the map's font files (mapFonts.ts). */
  origin: string;
}

export function buildStyle({ origin }: StyleOptions): StyleSpecification {
  return {
    version: 8,
    projection: { type: 'globe' },
    // The halo around the planet, gone once the camera is in close (by
    // zoom 7).
    sky: {
      'sky-color': ATLAS_SCENE.space,
      'horizon-color': ATLAS_SCENE.atmosphere,
      'fog-color': ATLAS_SCENE.atmosphere,
      'atmosphere-blend': zoomRamp([0, 1], [5, 1], [7, 0]) as never,
    },
    'font-faces': mapFontFaces(origin),
    sources: overlaySources(),
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': ATLAS_SCENE.ocean },
      },
      countryFillLayer(),
      ...overlayLayersBelowLabels(),
      ...overlayLayersOnTop(),
    ],
  };
}
