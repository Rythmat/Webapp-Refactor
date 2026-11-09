import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import { SPIN_DEGREES_PER_SECOND } from './mapGeometry';
import type { MotionGate } from './useMotionGate';

/**
 * Spin: the centre drifts west at the earlier globe's pace while nothing
 * else moves the map. A drag, a zoom or a flight pauses it (MapLibre is
 * moving), and it carries on from wherever that left the globe. Only the
 * Spin control starts it; it starts off for everyone.
 */
export function useSpin(map: MapLibreMap | null, gate: MotionGate) {
  const globeRotating = useAtlasSelector((s) => s.globeRotating);
  useEffect(() => {
    if (!map || !globeRotating) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      if (gate.moving() && !map.isMoving()) {
        const center = map.getCenter();
        map.jumpTo({
          center: [center.lng - SPIN_DEGREES_PER_SECOND * dt, center.lat],
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [map, globeRotating, gate]);
}
