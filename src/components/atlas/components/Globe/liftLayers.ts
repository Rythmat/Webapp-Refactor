import type {
  ExpressionSpecification,
  LayerSpecification,
  SourceSpecification,
} from 'maplibre-gl';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';

/**
 * The selected region's layers (regionLift.ts cuts its shape): a glow on the
 * ground, walls, the lid in its strips, and its edge. Everything but the
 * ground glow rises by its viewport translate, a constant the map animates
 * with a paint transition and lays nothing out again for. Lines can't sit on a
 * `fill-extrusion`'s lid, so this is how the edge and the dots stay on top.
 */

export const LIFT_SOURCE = {
  strips: 'atlas-lift-strips',
  outline: 'atlas-lift-outline',
  dots: 'atlas-lift-dots',
} as const;

/** How far the lid rises, px; how many fills make the walls. */
export const LIFT_PX = 22;
const WALLS = 7;
/** How long the lid takes to rise, and the dots to populate after it, ms. */
export const RISE_MS = 500;
export const DOTS_MS = 700;
/** The camera's tilt over a lifted region, degrees. */
export const LIFT_PITCH = 35;

const wallIds = Array.from(
  { length: WALLS },
  (_, k) => `atlas-lift-wall-${k + 1}`,
);

export const LIFT_LAYER = {
  ground: 'atlas-lift-ground',
  walls: wallIds as readonly string[],
  lid: 'atlas-lift-lid',
  edgeGlow: 'atlas-lift-edge-glow',
  edge: 'atlas-lift-edge',
  dots: 'atlas-lift-dots',
  dotsHit: 'atlas-lift-dots-hit',
} as const;

export function liftSources(): Record<string, SourceSpecification> {
  return {
    [LIFT_SOURCE.strips]: {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    },
    [LIFT_SOURCE.outline]: {
      type: 'geojson',
      lineMetrics: true,
      data: { type: 'FeatureCollection', features: [] },
    },
    [LIFT_SOURCE.dots]: {
      type: 'geojson',
      promoteId: 'eventId',
      data: { type: 'FeatureCollection', features: [] },
    },
  };
}

/** A dot's shown when its year is (useRegionLift writes `on`, live). */
const dotOn = ['boolean', ['feature-state', 'on'], false];
const dotHover = ['boolean', ['feature-state', 'hover'], false];
const dotHot = ['boolean', ['get', 'hot'], false];
const dotOpacity = [
  'case',
  dotOn,
  ['case', ['boolean', ['get', 'dim'], false], 0.4, 1],
  0,
] as unknown as ExpressionSpecification;

/** A strip's colour, written per strip (useRegionLift), so years move it live. */
const stripColor = [
  'to-color',
  ['coalesce', ['feature-state', 'c'], ATLAS_SCENE.liftNeutral],
] as unknown as ExpressionSpecification;

export function liftLayerSpecs(): LayerSpecification[] {
  return [
    {
      id: LIFT_LAYER.ground,
      type: 'line',
      source: LIFT_SOURCE.outline,
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': ATLAS_SCENE.liftNeutral,
        'line-width': 26,
        'line-blur': 22,
        'line-opacity': 0.8,
      },
    },
    ...LIFT_LAYER.walls.map(
      (id): LayerSpecification => ({
        id,
        type: 'fill',
        source: LIFT_SOURCE.strips,
        paint: {
          'fill-color': ATLAS_SCENE.liftWall,
          'fill-antialias': false,
        },
      }),
    ),
    {
      id: LIFT_LAYER.lid,
      type: 'fill',
      source: LIFT_SOURCE.strips,
      paint: { 'fill-color': stripColor, 'fill-antialias': false },
    },
    {
      id: LIFT_LAYER.edgeGlow,
      type: 'line',
      source: LIFT_SOURCE.outline,
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': ATLAS_SCENE.liftNeutral,
        'line-width': 9,
        'line-blur': 8,
      },
    },
    {
      id: LIFT_LAYER.edge,
      type: 'line',
      source: LIFT_SOURCE.outline,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-width': 2,
        'line-gradient': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0,
          ATLAS_SCENE.label,
          1,
          ATLAS_SCENE.label,
        ] as unknown as ExpressionSpecification,
      },
    },
    {
      id: LIFT_LAYER.dots,
      type: 'circle',
      source: LIFT_SOURCE.dots,
      paint: {
        'circle-radius': [
          'case',
          dotOn,
          ['case', ['any', dotHot, dotHover], 4.5, 2.75],
          0,
        ] as unknown as ExpressionSpecification,
        'circle-color': ATLAS_SCENE.dot,
        'circle-opacity': dotOpacity,
        'circle-stroke-color': ['get', 'rim'],
        'circle-stroke-width': 1.25,
        'circle-stroke-opacity': dotOpacity,
      },
    },
    {
      // A wider, invisible circle, so a small dot is easy to hover and click.
      id: LIFT_LAYER.dotsHit,
      type: 'circle',
      source: LIFT_SOURCE.dots,
      paint: {
        'circle-radius': [
          'case',
          dotOn,
          7,
          0,
        ] as unknown as ExpressionSpecification,
        'circle-opacity': 0,
      },
    },
  ];
}

/** Which share of the lift a layer rises by: the walls step up to the lid. */
export function liftShare(id: string): number {
  const k = LIFT_LAYER.walls.indexOf(id);
  return k >= 0 ? (k + 1) / WALLS : 1;
}
