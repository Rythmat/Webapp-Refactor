import type {
  ExpressionSpecification,
  LayerSpecification,
  SourceSpecification,
  StyleSpecification,
} from 'maplibre-gl';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import type { LandColor } from '@/components/atlas/types';
import {
  LAND_LAYER,
  LAND_SOURCE,
  landLabelLayers,
  landLayers,
  landSources,
} from './landLayers';
import { mapFontFaces } from './mapFonts';
import { PLACE_LAYER, SUN_SOURCE, placeLayers } from './placeLayers';

/**
 * The map's style, built in code: the Globe's own layers (the coloured
 * countries, the state outlines, the city names, an artist's points and the
 * influence arcs) on the sea, with no basemap under them. Pure: the same
 * inputs give the same style, and the tests read it without a map.
 */

/* ── Ids ─────────────────────────────────────────────────────────────────── */

export const SOURCE = {
  countries: LAND_SOURCE.countries,
  states: LAND_SOURCE.states,
  countryLabels: LAND_SOURCE.countryLabels,
  regionLabels: LAND_SOURCE.regionLabels,
  cityPoints: 'atlas-city-points',
  artistPoints: 'atlas-artist-points',
  arcs: 'atlas-arcs',
} as const;

export const LAYER = {
  countriesFill: LAND_LAYER.countriesFill,
  countriesGlow: LAND_LAYER.countriesGlow,
  countriesLine: LAND_LAYER.countriesLine,
  statesFill: LAND_LAYER.statesFill,
  statesGlow: LAND_LAYER.statesGlow,
  statesLine: LAND_LAYER.statesLine,
  regionLabels: LAND_LAYER.regionLabels,
  arcsCasing: 'atlas-arcs-casing',
  arcsTrace: 'atlas-arcs-trace',
  arcsDash: 'atlas-arcs-dash',
  arcsHit: 'atlas-arcs-hit',
  placeHalo: PLACE_LAYER.halo,
  placeDot: PLACE_LAYER.dot,
  placeHit: PLACE_LAYER.hit,
  cityLabels: PLACE_LAYER.labels,
  artistPoints: 'atlas-artist-points',
} as const;

/** What a click can land on, most specific first: the first hit wins. */
export const CLICK_LAYERS = [
  LAYER.arcsHit,
  LAYER.artistPoints,
  LAYER.cityLabels,
  LAYER.placeHit,
  LAYER.statesFill,
  LAYER.countriesFill,
] as const;

/* ── The Globe's own layers ──────────────────────────────────────────────── */

const zoomRamp = (
  ...stops: (readonly [number, number])[]
): ExpressionSpecification =>
  [
    'interpolate',
    ['linear'],
    ['zoom'],
    ...stops.flat(),
  ] as unknown as ExpressionSpecification;

const emptyCollection = (): SourceSpecification => ({
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
});

/** The Globe's sources, empty until MapLibreGlobe feeds them. */
export function overlaySources(): Record<string, SourceSpecification> {
  return {
    ...landSources(),
    // Ids by city, for the hover feature-state on a city's name.
    [SOURCE.cityPoints]: {
      ...emptyCollection(),
      promoteId: 'cityId',
    } as SourceSpecification,
    [SOURCE.artistPoints]: emptyCollection(),
    [SOURCE.arcs]: emptyCollection(),
    [SUN_SOURCE]: emptyCollection(),
  };
}

/** The links and points over the land: an event's arcs and an artist's points. */
export function overlayLayersBelowLabels(): LayerSpecification[] {
  return [
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

/* ── The style ───────────────────────────────────────────────────────────── */

export interface StyleOptions {
  /** The page's origin, which serves the map's font files (mapFonts.ts). */
  origin: string;
  /** How the land is coloured to start with (Layers; the map follows it). */
  land?: LandColor;
  /** The page's rem over 16 px, so the map's text keeps the app's scale. */
  textScale?: number;
}

export function buildStyle({
  origin,
  land = 'music',
  textScale = 1,
}: StyleOptions): StyleSpecification {
  return {
    version: 8,
    projection: { type: 'globe' },
    // Outside the globe the canvas stays clear, so the page's ground (its
    // dot grid) shows; a faint halo at the limb from orbit, gone by zoom
    // 4.5.
    sky: {
      'sky-color': 'rgba(0, 0, 0, 0)',
      'horizon-color': ATLAS_SCENE.atmosphere,
      'fog-color': ATLAS_SCENE.atmosphere,
      'atmosphere-blend': zoomRamp([0, 0.3], [3, 0.15], [4.5, 0]) as never,
    },
    'font-faces': mapFontFaces(origin),
    sources: overlaySources(),
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': ATLAS_SCENE.ocean },
      },
      ...landLayers(land),
      ...overlayLayersBelowLabels(),
      ...landLabelLayers(textScale),
      ...placeLayers(SOURCE.cityPoints, textScale),
    ],
  };
}
