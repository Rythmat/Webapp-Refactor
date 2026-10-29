import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, type MutableRefObject } from 'react';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import { isMapView } from '@/components/atlas/navigation/atlasFrame';
import { useAtlasFrame } from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import type { MapInsets } from '@/components/atlas/types';

/**
 * The page's overlays cover the map's edges (the Inspector, the cards, the
 * phone's sheet; MapInsets, measured by the layout); the map's padding keeps
 * its centre in what is left. Flights land with the same padding
 * (mapFraming.ts), so once a panel they opened is measured, nothing moves. A
 * component of its own, subscribed to the insets alone, so dragging the
 * Inspector's edge re-renders this and not the map's owner (the measuring
 * script counts those renders).
 */
export function MapPadding({
  map,
  paddingRef,
}: {
  map: MapLibreMap;
  /** Where flights read the padding to land with. */
  paddingRef: MutableRefObject<MapInsets>;
}) {
  const { top, right, bottom, left } = useAtlasSelector((s) => s.mapInsets);
  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  useEffect(() => {
    paddingRef.current = { top, right, bottom, left };
    const apply = () => {
      const now = map.getPadding();
      const to = paddingRef.current;
      if (
        now.top === to.top &&
        now.right === to.right &&
        now.bottom === to.bottom &&
        now.left === to.left
      ) {
        return;
      }
      map.easeTo({
        padding: to,
        duration: reducedMotionRef.current ? 0 : 500,
        essential: false,
      });
    };
    // A flight in progress carries the padding with it; any change after it
    // set off is applied once it lands.
    if (map.isMoving()) {
      map.once('moveend', apply);
      return () => {
        map.off('moveend', apply);
      };
    }
    apply();
  }, [map, paddingRef, top, right, bottom, left]);

  return null;
}

/**
 * Whether something covers the map (the page keeps the map mounted under the
 * timeline), told to the map's motion through a ref so the map never
 * re-renders for it; drawn again as it comes back into view.
 */
export function MapCovered({
  map,
  coveredRef,
}: {
  map: MapLibreMap;
  coveredRef: MutableRefObject<boolean>;
}) {
  const covered = useAtlasFrame((frame) => !isMapView(frame));
  useEffect(() => {
    const uncovered = coveredRef.current && !covered;
    coveredRef.current = covered;
    if (uncovered) map.triggerRepaint();
  }, [covered, map, coveredRef]);
  return null;
}
