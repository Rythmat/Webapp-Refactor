import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';
import type { ArcDatum } from '@/components/atlas/data';
import { feed } from './mapFeed';
import { ARC_DASH_STEPS, arcCollection } from './mapGeometry';
import { LAYER, SOURCE } from './mapStyle';
import type { MotionGate } from './useMotionGate';

/** How often the arcs' dashes step along (MapLibre's line-animation example). */
const DASH_STEP_MS = 60;

/**
 * The pinned event's influence arcs, their dashes walking from head to
 * tail; under reduced motion they hold.
 */
export function useArcLayers(
  map: MapLibreMap | null,
  influenceArcs: ArcDatum[],
  gate: MotionGate,
  reducedMotion: boolean,
) {
  useEffect(() => {
    if (map) feed(map, SOURCE.arcs, arcCollection(influenceArcs));
  }, [map, influenceArcs]);

  const hasArcs = influenceArcs.length > 0;
  useEffect(() => {
    if (!map || !hasArcs || reducedMotion) return;
    let step = 0;
    const timer = window.setInterval(() => {
      if (!gate.moving()) return;
      step = (step + 1) % ARC_DASH_STEPS.length;
      map.setPaintProperty(LAYER.arcsDash, 'line-dasharray', [
        ...ARC_DASH_STEPS[step],
      ]);
    }, DASH_STEP_MS);
    return () => window.clearInterval(timer);
  }, [map, hasArcs, reducedMotion, gate]);
}
