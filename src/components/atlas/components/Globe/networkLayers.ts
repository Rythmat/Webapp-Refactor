import type {
  ExpressionSpecification,
  LayerSpecification,
  SourceSpecification,
} from 'maplibre-gl';
import { ROOTS_RAMP, ROUTES_RAMP } from '@/components/atlas/theme/marks';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';
import { CHIP } from './mapChips';
import { MAP_FONT } from './mapFonts';

/**
 * The links' layers (networkFeatures.ts makes their data). Solid links take
 * the roots' or routes' gradient over a soft glow; dotted ones flow.
 *
 * The flow, without restyling a dash 16 times a second (MapLibre lays the
 * whole source out again for a line-dasharray change): six copies of the
 * dotted links, each dashed a sixth of a period further on, and every
 * FLOW_STEP_MS one is shown and the last hidden. A constant line-opacity is
 * a cheap change; nothing is laid out again.
 */

export const NETWORK_SOURCE = {
  solid: 'atlas-links',
  dotted: 'atlas-links-dotted',
  draw: 'atlas-links-draw',
  pills: 'atlas-link-pills',
} as const;

export const FLOW_PHASES = 6;
export const FLOW_STEP_MS = 70;

const flowIds = Array.from(
  { length: FLOW_PHASES },
  (_, k) => `atlas-links-flow-${k}`,
);

export const NETWORK_LAYER = {
  glow: 'atlas-links-glow',
  roots: 'atlas-links-roots',
  routes: 'atlas-links-routes',
  drawRoots: 'atlas-links-draw-roots',
  drawRoutes: 'atlas-links-draw-routes',
  flow: flowIds as readonly string[],
  solidHit: 'atlas-links-hit',
  dottedHit: 'atlas-links-dotted-hit',
  pills: 'atlas-link-pills',
} as const;

/** The dots: one width long, two apart, in line widths. */
const DOT = { dash: 1, gap: 2 } as const;

/**
 * Phase `k` of the flow's dash: the same dot and gap, its dot started k
 * sixths of the period along (a dot that runs past the period's end wraps
 * to its start). In MapLibre's line-dasharray terms: dash, gap, dash, gap.
 */
export function phaseDash(
  k: number,
  n = FLOW_PHASES,
  dash: number = DOT.dash,
  gap: number = DOT.gap,
): number[] {
  const period = dash + gap;
  const s = (((k % n) + n) % n) * (period / n);
  if (s + dash <= period) return [0, s, dash, period - s - dash];
  return [s + dash - period, period - dash, period - s, 0];
}

const focused = ['boolean', ['feature-state', 'focus'], false];
const hovered = ['boolean', ['feature-state', 'hover'], false];

/** A link's width: its own, wider when a card points at it, by zoom. */
const width = (scale = 1): ExpressionSpecification => {
  const base = [
    'case',
    ['any', focused, hovered],
    ['*', ['get', 'w'], 1.6 * scale],
    ['*', ['get', 'w'], scale],
  ];
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    1,
    ['*', base, 0.7],
    4,
    ['*', base, 1],
    7,
    ['*', base, 0.85],
  ] as unknown as ExpressionSpecification;
};

/**
 * Each line a little to its own right: a place both taken from and given
 * to has two lines on the same path, running opposite ways, so they part.
 */
const OFFSET = 1.5;

/** A ramp as a line-gradient: evenly along the line, start to end. */
const gradient = (ramp: readonly string[]): ExpressionSpecification =>
  [
    'interpolate',
    ['linear'],
    ['line-progress'],
    ...ramp.flatMap((color, i) => [i / (ramp.length - 1), color]),
  ] as unknown as ExpressionSpecification;

const lines = (): SourceSpecification =>
  ({
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    lineMetrics: true,
    promoteId: 'id',
  }) as SourceSpecification;

export function networkSources(): Record<string, SourceSpecification> {
  return {
    [NETWORK_SOURCE.solid]: lines(),
    [NETWORK_SOURCE.draw]: lines(),
    [NETWORK_SOURCE.dotted]: {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'id',
    } as SourceSpecification,
    [NETWORK_SOURCE.pills]: {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    },
  };
}

const sideIs = (side: string): ExpressionSpecification =>
  ['==', ['get', 'side'], side] as unknown as ExpressionSpecification;

const ROUND = { 'line-cap': 'round', 'line-join': 'round' } as const;

/** The links, under the places and their names. */
export function networkLineLayers(): LayerSpecification[] {
  const gradientPair = (
    source: string,
    roots: string,
    routes: string,
  ): LayerSpecification[] => [
    {
      id: roots,
      type: 'line',
      source,
      filter: sideIs('in'),
      layout: ROUND,
      paint: {
        'line-gradient': gradient(ROOTS_RAMP),
        'line-width': width(),
        'line-offset': OFFSET,
      },
    },
    {
      id: routes,
      type: 'line',
      source,
      filter: sideIs('out'),
      layout: ROUND,
      paint: {
        'line-gradient': gradient(ROUTES_RAMP),
        'line-width': width(),
        'line-offset': OFFSET,
      },
    },
  ];
  return [
    {
      // A soft light under each solid link, in the middle of its ramp.
      id: NETWORK_LAYER.glow,
      type: 'line',
      source: NETWORK_SOURCE.solid,
      layout: ROUND,
      paint: {
        'line-color': [
          'match',
          ['get', 'side'],
          'in',
          ROOTS_RAMP[2],
          ROUTES_RAMP[2],
        ],
        'line-width': width(3),
        'line-blur': 6,
        'line-offset': OFFSET,
        'line-opacity': [
          'case',
          ['any', focused, hovered],
          0.55,
          0.28,
        ] as unknown as ExpressionSpecification,
      },
    },
    ...gradientPair(
      NETWORK_SOURCE.solid,
      NETWORK_LAYER.roots,
      NETWORK_LAYER.routes,
    ),
    ...gradientPair(
      NETWORK_SOURCE.draw,
      NETWORK_LAYER.drawRoots,
      NETWORK_LAYER.drawRoutes,
    ),
    ...NETWORK_LAYER.flow.map(
      (id, k): LayerSpecification => ({
        id,
        type: 'line',
        source: NETWORK_SOURCE.dotted,
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': width(),
          'line-dasharray': phaseDash(k),
          'line-offset': OFFSET,
          // The flow (useNetworkLayers) shows one phase at a time, cut
          // from one to the next (MapLibre would fade them over 300 ms).
          'line-opacity': k === 0 ? 1 : 0,
          'line-opacity-transition': { duration: 0, delay: 0 },
        },
      }),
    ),
    {
      // Wide, invisible bands, so a thin line is easy to hover and click.
      id: NETWORK_LAYER.solidHit,
      type: 'line',
      source: NETWORK_SOURCE.solid,
      paint: {
        'line-color': ATLAS_SCENE.label,
        'line-width': 14,
        'line-opacity': 0,
      },
    },
    {
      id: NETWORK_LAYER.dottedHit,
      type: 'line',
      source: NETWORK_SOURCE.dotted,
      paint: {
        'line-color': ATLAS_SCENE.label,
        'line-width': 10,
        'line-opacity': 0,
      },
    },
  ];
}

/** The count pills at the strongest links' middles, over the lines. */
export function networkPillLayer(textScale = 1): LayerSpecification {
  return {
    id: NETWORK_LAYER.pills,
    type: 'symbol',
    source: NETWORK_SOURCE.pills,
    layout: {
      'text-field': ['get', 'count'],
      'text-font': [MAP_FONT.bold],
      'text-size': 11 * textScale,
      'icon-image': CHIP.plain,
      'icon-text-fit': 'both',
      'icon-text-fit-padding': [1, 5, 1, 5],
      'symbol-sort-key': ['get', 'rank'],
      'text-padding': 2,
    },
    paint: { 'text-color': ATLAS_SCENE.label },
  };
}
