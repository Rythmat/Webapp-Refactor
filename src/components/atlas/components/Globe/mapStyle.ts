import { layers as basemapLayers, namedFlavor } from '@protomaps/basemaps';
import type {
  ExpressionSpecification,
  LayerSpecification,
  SourceSpecification,
  StyleSpecification,
} from 'maplibre-gl';
import { ATLAS_BASEMAP, ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { BASEMAP_ATTRIBUTION, type Basemap } from './basemapConfig';
import { COUNTRY_TINT, STATES_MIN_ZOOM } from './mapGeometry';

/**
 * The MapLibre engine's style, built in code: a Protomaps vector basemap
 * (when one is configured) with the Globe's own layers on it — the coloured
 * countries, the state outlines, the city dots, an artist's points and
 * the influence arcs. Pure: the same inputs give the same style, and the
 * tests read it without a map.
 */

/* ── Where the basemap comes from (basemapConfig.ts) ───────────────────── */

export {
  BASEMAP_ATTRIBUTION,
  DEFAULT_ASSETS_URL,
  assetsUrlFromEnv,
  basemapFromEnv,
  basemapLang,
  type Basemap,
  type BasemapEnv,
} from './basemapConfig';

export function basemapSource(
  basemap: NonNullable<Basemap>,
): SourceSpecification {
  return {
    type: 'vector',
    url:
      basemap.kind === 'pmtiles'
        ? `pmtiles://${basemap.url}`
        : `https://api.protomaps.com/tiles/v4.json?key=${encodeURIComponent(basemap.key)}`,
    attribution: BASEMAP_ATTRIBUTION,
  };
}

/* ── Ids ─────────────────────────────────────────────────────────────────── */

export const SOURCE = {
  basemap: 'protomaps',
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
  cityCircles: 'atlas-city-circles',
  cityLabels: 'atlas-city-labels',
  artistPoints: 'atlas-artist-points',
} as const;

/** What a click can land on, most specific first: the first hit wins. */
export const CLICK_LAYERS = [
  LAYER.arcsHit,
  LAYER.artistPoints,
  LAYER.cityCircles,
  LAYER.statesFill,
  LAYER.countriesFill,
] as const;

/* ── The Globe's own layers ──────────────────────────────────────────────── */

/** Where the city dots get their names. */
export const CITY_LABELS_FROM = 6;

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
    [SOURCE.cityPoints]: emptyCollection(),
    [SOURCE.cityOutline]: emptyCollection(),
    [SOURCE.artistPoints]: emptyCollection(),
    [SOURCE.arcs]: emptyCollection(),
  };
}

/**
 * The country colours: from orbit the whole land, as on the three.js globe;
 * with a basemap, a tint on its land at every zoom, drawn just under its sea
 * (whose detailed coastline trims the coarse outlines) and its roads,
 * buildings and labels.
 */
export function countryTintLayer(withBasemap: boolean): LayerSpecification {
  return {
    id: LAYER.countriesFill,
    type: 'fill',
    source: SOURCE.countries,
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': withBasemap ? zoomRamp(...COUNTRY_TINT) : 0.86,
    },
  };
}

/**
 * The layers that sit under the basemap's labels: outlines, arcs, the city
 * dots and an artist's points.
 */
export function overlayLayersBelowLabels(): LayerSpecification[] {
  const highlight: ExpressionSpecification = ['get', 'highlight'];
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
    // The marks go last, still under the basemap's labels, so a city's name
    // reads over its dot rather than under it.
    {
      // A dot on each city at every zoom; the selected one white, larger
      // and on top.
      id: LAYER.cityCircles,
      type: 'circle',
      source: SOURCE.cityPoints,
      layout: { 'circle-sort-key': ['case', highlight, 1, 0] },
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          1,
          ['case', highlight, 5, 2.5],
          CITY_LABELS_FROM,
          ['case', highlight, 9, 6],
          12,
          ['case', highlight, 11, 8],
        ],
        'circle-stroke-color': ATLAS_SCENE.pointRim,
        'circle-stroke-width': ['case', highlight, 2, 1],
        'circle-pitch-alignment': 'map',
      },
    },
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
 * The Globe's city names, over everything, only on the plain map without a
 * basemap. With one, a city's name is the basemap's to show, so a name is
 * never shown twice.
 */
export function overlayLayersOnTop(withBasemap: boolean): LayerSpecification[] {
  if (withBasemap) return [];
  const cityLabels: LayerSpecification = {
    id: LAYER.cityLabels,
    type: 'symbol',
    source: SOURCE.cityPoints,
    minzoom: CITY_LABELS_FROM,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Medium'],
      'text-size': 13,
      'text-offset': [0, 1.1],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      'text-color': ATLAS_SCENE.label,
      'text-halo-color': ATLAS_SCENE.labelHalo,
      'text-halo-width': 1.5,
    },
  };
  return [cityLabels];
}

/* ── The style ───────────────────────────────────────────────────────────── */

export interface StyleOptions {
  basemap: Basemap;
  lang: 'en' | 'es';
  assetsUrl: string;
}

/**
 * The basemap's layers, in the Atlas flavor (ATLAS_BASEMAP in tokens.ts).
 * Some of its labels (countries, places of interest) take their halo from
 * the land colour; on tinted land that halo is lost, so they get the dark
 * label halo too.
 */
function basemapLayersFor(lang: 'en' | 'es'): LayerSpecification[] {
  const flavor = { ...namedFlavor('dark'), ...ATLAS_BASEMAP };
  const base = basemapLayers(SOURCE.basemap, flavor, {
    lang,
  }) as LayerSpecification[];
  return base.map((layer) =>
    layer.type === 'symbol' &&
    layer.paint?.['text-halo-color'] === ATLAS_BASEMAP.earth
      ? {
          ...layer,
          paint: { ...layer.paint, 'text-halo-color': ATLAS_SCENE.labelHalo },
        }
      : layer,
  );
}

export function buildStyle({
  basemap,
  lang,
  assetsUrl,
}: StyleOptions): StyleSpecification {
  const tint = countryTintLayer(basemap !== null);
  const below = overlayLayersBelowLabels();
  const onTop = overlayLayersOnTop(basemap !== null);
  let layers: LayerSpecification[];
  if (basemap) {
    const base = basemapLayersFor(lang);
    // The tint goes over the basemap's land and land use, under its sea;
    // the outlines and arcs between its shapes and its labels.
    const sea = base.findIndex((layer) => layer.id === 'water');
    const firstLabel = base.findIndex((layer) => layer.type === 'symbol');
    const cut = firstLabel === -1 ? base.length : firstLabel;
    layers = [
      ...base.slice(0, sea),
      tint,
      ...base.slice(sea, cut),
      ...below,
      ...base.slice(cut),
      ...onTop,
    ];
  } else {
    layers = [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': ATLAS_SCENE.ocean },
      },
      tint,
      ...below,
      ...onTop,
    ];
  }
  return {
    version: 8,
    projection: { type: 'globe' },
    // The halo around the planet, gone once the camera is down among the
    // streets (by zoom 7).
    sky: {
      'sky-color': ATLAS_SCENE.space,
      'horizon-color': ATLAS_SCENE.atmosphere,
      'fog-color': ATLAS_SCENE.atmosphere,
      'atmosphere-blend': zoomRamp([0, 1], [5, 1], [7, 0]) as never,
    },
    glyphs: `${assetsUrl}/fonts/{fontstack}/{range}.pbf`,
    ...(basemap ? { sprite: `${assetsUrl}/sprites/v4/dark` } : {}),
    sources: {
      ...(basemap ? { [SOURCE.basemap]: basemapSource(basemap) } : {}),
      ...overlaySources(),
    },
    layers,
  };
}
