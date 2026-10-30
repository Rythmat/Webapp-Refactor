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
} as const;

/** How far the lid rises, px; how many fills make the walls. */
export const LIFT_PX = 22;
const WALLS = 7;
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
  };
}

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
  ];
}

/** Which share of the lift a layer rises by: the walls step up to the lid. */
export function liftShare(id: string): number {
  const k = LIFT_LAYER.walls.indexOf(id);
  return k >= 0 ? (k + 1) / WALLS : 1;
}
