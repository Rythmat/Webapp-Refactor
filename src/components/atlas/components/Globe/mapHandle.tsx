import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { cameraRadii, facing } from './globeGeometry';

/**
 * What the rest of the page may ask of the map, without importing MapLibre
 * (so this file sits in the route chunk): where points are on screen, its
 * container, and when its camera moves. The ring view starts its places
 * where the map shows them; the intro and the hover card hang off them.
 */
export interface ScreenPoint {
  id: string;
  /** In the map's container, px. */
  x: number;
  y: number;
  /** On the globe's near side, so on screen at all. */
  visible: boolean;
}

export interface AtlasMapHandle {
  project(
    points: readonly { id: string; lat: number; lng: number }[],
  ): ScreenPoint[];
  container(): HTMLElement;
  /** Called on every frame the camera moves; returns an unsubscribe. */
  onCamera(listener: () => void): () => void;
}

/** The handle for a map. */
export function handleFor(map: MapLibreMap): AtlasMapHandle {
  return {
    project(points) {
      const center = map.getCenter();
      const cameraR = cameraRadii(
        map.getZoom(),
        center.lat,
        map.getContainer().clientHeight,
        map.getVerticalFieldOfView(),
      );
      return points.map(({ id, lat, lng }) => {
        const { x, y } = map.project([lng, lat]);
        return { id, x, y, visible: facing(center, { lat, lng }, cameraR) > 0 };
      });
    },
    container: () => map.getContainer(),
    onCamera(listener) {
      map.on('move', listener);
      return () => {
        map.off('move', listener);
      };
    },
  };
}

type HandleRef = MutableRefObject<AtlasMapHandle | null>;

const AtlasMapContext = createContext<HandleRef | null>(null);

/** One handle per Globe page; the map fills it while it is up. */
export function AtlasMapProvider({ children }: { children: ReactNode }) {
  const ref = useRef<AtlasMapHandle | null>(null);
  return (
    <AtlasMapContext.Provider value={ref}>{children}</AtlasMapContext.Provider>
  );
}

/** The map's handle, or null before the map is up (or outside a page). */
export function useAtlasMap(): HandleRef | null {
  return useContext(AtlasMapContext);
}

/** The map side: hand the page this map while it is up. */
export function useProvideMapHandle(map: MapLibreMap | null) {
  const ref = useContext(AtlasMapContext);
  useEffect(() => {
    if (!ref || !map) return;
    ref.current = handleFor(map);
    return () => {
      ref.current = null;
    };
  }, [ref, map]);
}
