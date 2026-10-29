import 'maplibre-gl/dist/maplibre-gl.css';
import { useRef } from 'react';
import { useGeoData } from '@/components/atlas/hooks/useGeoData';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import type { MapInsets } from '@/components/atlas/types';
import { GlobeStatus } from './GlobeStatus';
import { MapCovered, MapPadding } from './MapPadding';
import { NO_INSETS } from './mapFraming';
import { useProvideMapHandle } from './mapHandle';
import { useArcLayers } from './useArcLayers';
import { useGlobeClicks, useGlobeScene } from './useGlobeScene';
import { useLandLayers, useLandMusic } from './useLandLayers';
import { useMapFlights } from './useMapFlights';
import { useMapInstance } from './useMapInstance';
import { useMapPointer } from './useMapPointer';
import { useMotionGate } from './useMotionGate';
import { usePlaceLayers } from './usePlaceLayers';
import { useSpin } from './useSpin';

/**
 * The Globe page's map on MapLibre GL (docs/globe-ui/ENGINE.md): a 3-D globe
 * of Natural Earth's countries and the page's own places, events and links,
 * drawn from the page's state (useGlobeScene) and answering clicks
 * (useGlobeClicks).
 *
 * The map is made once (useMapInstance). Everything after that reaches it
 * through setData, feature-state and the camera, never a new map, so a
 * selection or a layer switch costs one source update. Each concern is a
 * hook of its own: the land, the places, the arcs, the pointer, the
 * flights, Spin.
 */
export default function MapLibreGlobe() {
  const { containerRef, map, mapError } = useMapInstance();
  const geo = useGeoData();
  const scene = useGlobeScene();
  const clicks = useGlobeClicks();
  const reducedMotion = usePrefersReducedMotion();
  // Read when a flight starts; a change of setting alone flies nowhere.
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const gate = useMotionGate(containerRef);
  // The overlays' padding (MapPadding, below), for flights to land clear of it.
  const paddingRef = useRef<MapInsets>(NO_INSETS);

  const countryData = useLandLayers(
    map,
    geo,
    scene.layers,
    scene.selectedLocation,
  );
  useLandMusic(map, countryData, scene.layers.landColor);
  usePlaceLayers(map, scene);
  useArcLayers(map, scene.influenceArcs, gate, reducedMotion);
  useMapPointer(map, clicks);
  useMapFlights(map, geo, paddingRef, reducedMotionRef);
  useSpin(map, gate);
  useProvideMapHandle(map);

  // The country outlines are the map: losing them is the page failing.
  const failure = mapError ?? geo.error;

  return (
    <div className="atlas-map-ground absolute inset-0 overflow-hidden">
      {map && <MapPadding map={map} paddingRef={paddingRef} />}
      {map && <MapCovered coveredRef={gate.covered} map={map} />}
      {/* Sized, not positioned: maplibre-gl.css makes the map position:
          relative, which would collapse an inset-0 box to no height. */}
      <div ref={containerRef} className="h-full w-full" />
      {failure ? (
        <GlobeStatus error={failure} />
      ) : (
        (!map || geo.loading) && <GlobeStatus />
      )}
    </div>
  );
}
