import type {
  ExpressionSpecification,
  LayerSpecification,
  SourceSpecification,
} from 'maplibre-gl';
import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';

/**
 * The links' far ends on the map (networkFeatures.ts makes their data): a
 * dot each, with a ring that pulses out of it. The links themselves are
 * flight paths off the globe, drawn by the arc layer (arcLayer.ts), which
 * MapLibre's line layers can't do; the pointer picks those in JS.
 */

export const NETWORK_SOURCE = {
  ends: 'atlas-link-ends',
} as const;

export const NETWORK_LAYER = {
  endRing: 'atlas-link-end-ring',
  endDot: 'atlas-link-end-dot',
  /**
   * Not map layers: the names a picked arc goes by (useMapPointer), so the
   * picking's order and targets (mapPicking.ts) read it as they read any
   * layer. A weak tie and a strong link open the same way.
   */
  solidHit: 'atlas-links-hit',
  dottedHit: 'atlas-links-dotted-hit',
} as const;

/**
 * A far end's pulse (owner, 2026-11-16, after a route globe): a ring leaves
 * its dot, grows and fades, every PULSE.periodMs, each end at its own phase.
 * useNetworkLayers sets the ring's paint from the clock.
 */
export const PULSE = {
  periodMs: 2200,
  /** The ring's radius, px, as it leaves the dot and as it fades out. */
  from: 4,
  to: 15,
  /** Its opacity as it leaves. */
  opacity: 0.85,
  /** At rest (reduced motion): half grown, faint. */
  rest: 0.45,
} as const;

/** The ring's radius and opacity at clock `t` (0–1 through a period). */
export function pulsePaint(t: number): {
  radius: ExpressionSpecification;
  opacity: ExpressionSpecification;
} {
  const progress = ['%', ['+', t, ['get', 'phase']], 1];
  return {
    radius: [
      '+',
      PULSE.from,
      ['*', PULSE.to - PULSE.from, progress],
    ] as unknown as ExpressionSpecification,
    opacity: [
      '*',
      PULSE.opacity,
      ['-', 1, progress],
    ] as unknown as ExpressionSpecification,
  };
}

export function networkSources(): Record<string, SourceSpecification> {
  return {
    [NETWORK_SOURCE.ends]: {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    },
  };
}

/** The far ends, under the places and their names. */
export function networkLineLayers(): LayerSpecification[] {
  return [
    {
      // Each far end's ring, leaving its dot (the pulse: useNetworkLayers).
      id: NETWORK_LAYER.endRing,
      type: 'circle',
      source: NETWORK_SOURCE.ends,
      paint: {
        'circle-radius': PULSE.from + (PULSE.to - PULSE.from) * PULSE.rest,
        'circle-opacity': 0,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-opacity': PULSE.opacity * (1 - PULSE.rest),
        'circle-pitch-alignment': 'map',
        'circle-radius-transition': { duration: 0, delay: 0 },
        'circle-stroke-opacity-transition': { duration: 0, delay: 0 },
      },
    },
    {
      // The far end itself: a solid dot in its side's colour.
      id: NETWORK_LAYER.endDot,
      type: 'circle',
      source: NETWORK_SOURCE.ends,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          1,
          3,
          6,
          4.5,
        ] as unknown as ExpressionSpecification,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': ATLAS_SCENE.ocean,
        'circle-pitch-alignment': 'map',
      },
    },
  ];
}
