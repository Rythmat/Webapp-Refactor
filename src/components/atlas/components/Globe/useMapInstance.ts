import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useEffect, useRef, useState } from 'react';
import { MAP_MAX_ZOOM, altitudeToMapZoom } from './mapGeometry';
import { buildStyle } from './mapStyle';

/** Full device pixel ratio on a full-viewport canvas is 2-3x the pixels we need. */
const MAX_PIXEL_RATIO = 1.5;

/** The camera before any fly: altitude 2.5 (the earlier three.js globe's start). */
export const MAP_START = { lat: 20, lng: 0, altitude: 2.5 };

let mapLibreSetUp = false;
/** One-off, process-wide: where the worker is. */
function setUpMapLibre() {
  if (mapLibreSetUp) return;
  mapLibreSetUp = true;
  // Bundled, MapLibre would look for its worker beside the chunk it ended up
  // in; Vite emits the worker as its own file and hands us that file's URL.
  setWorkerUrl(workerUrl);
}

/**
 * The map, made once into the container: null until its style has loaded,
 * and the reason when it could not be made at all (no WebGL).
 */
export function useMapInstance() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setUpMapLibre();
    const height = container.clientHeight || window.innerHeight;
    let created: MapLibreMap;
    try {
      created = new MapLibreMap({
        container,
        style: buildStyle({
          origin: window.location.origin,
          // The page's rem (the app is set at 110%) over 16 px.
          textScale:
            parseFloat(getComputedStyle(document.documentElement).fontSize) /
              16 || 1,
        }),
        center: [MAP_START.lng, MAP_START.lat],
        zoom: altitudeToMapZoom(MAP_START.altitude, height, MAP_START.lat),
        maxZoom: MAP_MAX_ZOOM,
        pixelRatio: Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO),
        // The map's data is Natural Earth's (public domain) and our own:
        // nothing to credit, so no corner control.
        attributionControl: false,
        // A globe turns by being dragged; tilting and twisting it only
        // disorients, so those gestures are off.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
    } catch (err) {
      setMapError(err instanceof Error ? err.message : String(err));
      return;
    }
    created.touchZoomRotate.disableRotation();
    created.keyboard.disableRotation();
    // The map takes our data as soon as its style is parsed; 'load' waits
    // for every source as well.
    created.once('style.load', () => setMap(created));
    // scripts/measureGlobe.mjs times the first globe frame from this mark.
    created.once('load', () => performance.mark('atlas:globe-ready'));
    // A font that fails to load is not the page failing: its labels fall
    // back to the browser's own font.
    created.on('error', (event) => {
      if (import.meta.env.DEV) console.warn('[atlas map]', event.error);
    });
    return () => {
      created.remove();
      setMap(null);
    };
  }, []);

  // Dev server only: lets scripts/measureGlobe.mjs aim the camera and find a
  // city on screen. The literal DEV guard folds it out of production builds
  // (verifyProdBundle.mjs checks).
  useEffect(() => {
    if (!import.meta.env.DEV || !map) return;
    const w = window as unknown as { __atlasGlobeDebug?: unknown };
    const height = () => map.getContainer().clientHeight;
    w.__atlasGlobeDebug = {
      engine: 'maplibre',
      screenOf: (lat: number, lng: number) => {
        const { x, y } = map.project([lng, lat]);
        return { x, y };
      },
      pointOfView: (
        pov: { lat: number; lng: number; altitude: number },
        ms = 0,
      ) =>
        map.easeTo({
          center: [pov.lng, pov.lat],
          zoom: altitudeToMapZoom(pov.altitude, height(), pov.lat),
          duration: ms,
        }),
      map,
    };
    return () => {
      delete w.__atlasGlobeDebug;
    };
  }, [map]);

  return { containerRef, map, mapError };
}
