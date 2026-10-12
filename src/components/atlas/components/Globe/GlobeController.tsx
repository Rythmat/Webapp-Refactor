import { useEffect, useRef } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';

interface Props {
  globeRef: React.MutableRefObject<GlobeMethods | undefined>;
  /** True once the globe is initialised — pending fly targets apply then. */
  ready?: boolean;
}

function zoomToAltitude(zoom: number): number {
  return Math.max(0.3, 3.5 - zoom * 0.3);
}

/** A camera flight's length; with reduced motion the camera cuts instead. */
export const flightDuration = (reducedMotion: boolean): number =>
  reducedMotion ? 0 : 1500;

/**
 * Spin speed for OrbitControls' own auto-rotation: the angle per second is
 * `2π/60 × speed`, so 2.3 is a little under 14°/s — roughly 26 seconds for a
 * full turn, the same pace the globe used to drift at.
 */
const AUTO_ROTATE_SPEED = 2.3;

export function GlobeController({ globeRef, ready }: Props) {
  const dispatch = useAtlasDispatch();
  const searchFlyTarget = useAtlasSelector((s) => s.searchFlyTarget);
  const globeRotating = useAtlasSelector((s) => s.globeRotating);
  const reducedMotion = usePrefersReducedMotion();
  const prevReady = useRef(false);

  // Fly to search target. Depends on `ready` so a target set before the globe
  // finished loading (e.g. a deep-link) is applied once it's initialised.
  useEffect(() => {
    const justReady = !!ready && !prevReady.current;
    prevReady.current = !!ready;

    if (!searchFlyTarget || !ready || !globeRef.current) return;
    const globe = globeRef.current;
    const target = {
      lat: searchFlyTarget.lat,
      lng: searchFlyTarget.lng,
      altitude: zoomToAltitude(searchFlyTarget.zoom),
    };

    // On the first fly right after the globe loads (a deep-link), jump the
    // camera instantly over the target (zoomed out) so it never shows the
    // default view, then fly in. Later flies just animate from the current view.
    if (justReady) {
      globe.pointOfView({ lat: target.lat, lng: target.lng, altitude: 2.5 }, 0);
    }
    globe.pointOfView(target, flightDuration(reducedMotion));
    dispatch({ type: 'CLEAR_FLY_TARGET' });
  }, [searchFlyTarget, ready, globeRef, dispatch]);

  /**
   * Spin the globe, and only ever because the user asked for it.
   *
   * This used to start on its own: opening an "Influenced by" / "Influenced"
   * section — which also happened when a video started playing — pulled the
   * camera out to a fixed altitude and began rotating. The globe moving without
   * being touched is disorienting, and it fought anyone reading a card, so both
   * the automatic zoom and the automatic spin are gone. The control now lives
   * in the corner of the globe page.
   *
   * It starts off for everyone, so reduced motion needs nothing more here:
   * a spin only ever begins from a press of the control.
   *
   * Rotation is handed to OrbitControls rather than driven from a rAF loop:
   * it already ticks every frame (three-render-objects calls `controls.update`),
   * it is time-based, and it yields to a drag instead of fighting it.
   */
  useEffect(() => {
    if (!ready) return;
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
    controls.autoRotate = globeRotating;
    return () => {
      controls.autoRotate = false;
    };
  }, [globeRotating, ready, globeRef]);

  return null;
}
