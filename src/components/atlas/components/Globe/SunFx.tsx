import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import { useStageSignals } from '@/components/atlas/state/stageSignals';
import { cameraRadii, facing } from './globeGeometry';

/**
 * The selected place's light, moving: a burst when it is chosen, then two
 * slow pulses, as the network-graph reference's selected node (the still
 * bloom and core are the map's, placeLayers.ts). CSS animates only transform
 * and opacity, so the map never redraws for it; it follows the place as the
 * camera moves and hides on the globe's far side. Remounted for each new
 * place, so the burst plays again, once the map has flown there (a moment
 * for a flight to start, then its end). None under reduced motion.
 */
export function SunFx({
  map,
  lat,
  lng,
}: {
  map: MapLibreMap;
  lat: number;
  lng: number;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const phase = useStageSignals().mapPhase;
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const land = () => setLanded(true);
    const grace = window.setTimeout(() => {
      if (phase.get() !== 'flying') land();
    }, 150);
    const cap = window.setTimeout(land, 2600);
    const off = phase.subscribe(() => {
      if (phase.get() === 'settled') land();
    });
    return () => {
      off();
      window.clearTimeout(grace);
      window.clearTimeout(cap);
    };
  }, [phase]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const place = () => {
      raf = 0;
      const center = map.getCenter();
      const r = cameraRadii(
        map.getZoom(),
        center.lat,
        map.getContainer().clientHeight,
        map.getVerticalFieldOfView(),
      );
      const seen = facing(center, { lat, lng }, r) > 0;
      const { x, y } = map.project([lng, lat]);
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.visibility = seen ? 'visible' : 'hidden';
    };
    place();
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(place);
    };
    map.on('move', schedule);
    map.on('resize', schedule);
    return () => {
      map.off('move', schedule);
      map.off('resize', schedule);
      cancelAnimationFrame(raf);
    };
  }, [map, lat, lng]);
  if (reducedMotion) return null;
  return (
    <div ref={ref} aria-hidden className="atlas-sun-fx" data-atlas-sun>
      {landed && (
        <>
          <span className="atlas-sun-burst" />
          <span className="atlas-sun-pulse" />
          <span className="atlas-sun-pulse atlas-sun-pulse-late" />
        </>
      )}
    </div>
  );
}
