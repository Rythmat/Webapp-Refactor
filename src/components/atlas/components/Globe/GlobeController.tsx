import { useEffect, useRef } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import { REGIONS } from '@/components/atlas/data';

interface Props {
  globeRef: React.MutableRefObject<GlobeMethods | undefined>;
  /** True once the globe is initialised — pending fly targets apply then. */
  ready?: boolean;
}

function zoomToAltitude(zoom: number): number {
  return Math.max(0.3, 3.5 - zoom * 0.3);
}

// When influence arcs are shown, pull back to this altitude and spin gently so
// the connections around the globe are visible.
const ARCS_VIEW_ALTITUDE = 1.3;
const ROTATE_DEG_PER_FRAME = 0.23; // ~26s per full rotation at 60fps

export function GlobeController({ globeRef, ready }: Props) {
  const dispatch = useAppDispatch();
  const {
    selectedRegions,
    searchFlyTarget,
    pinnedEvent,
    visibleArcDirections,
    rotationPaused,
  } = useAppState();
  const prevLength = useRef(selectedRegions.length);
  const prevReady = useRef(false);
  const rotateRaf = useRef<number | null>(null);
  const prevShowingArcs = useRef(false);
  // Read live inside the rAF spin loop so pausing takes effect without
  // restarting the animation.
  const pausedRef = useRef(rotationPaused);
  useEffect(() => {
    pausedRef.current = rotationPaused;
  }, [rotationPaused]);

  // Fly to region when a new region is toggled on
  useEffect(() => {
    if (selectedRegions.length > prevLength.current && globeRef.current) {
      const lastRegionId = selectedRegions[selectedRegions.length - 1];
      const region = REGIONS.find((r) => r.id === lastRegionId);

      if (region) {
        const [lat, lng] = region.center;
        globeRef.current.pointOfView(
          { lat, lng, altitude: region.altitude },
          1500,
        );
      }
    }
    prevLength.current = selectedRegions.length;
  }, [selectedRegions, globeRef]);

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
    globe.pointOfView(target, 1500);
    dispatch({ type: 'CLEAR_FLY_TARGET' });
  }, [searchFlyTarget, ready, globeRef, dispatch]);

  // When an "Influenced by"/"Influenced" section is opened (arcs become visible),
  // zoom the camera out and gently auto-rotate so the connections are visible.
  // Stops when the sections close or the pinned event is cleared.
  useEffect(() => {
    const showingArcs = !!pinnedEvent && visibleArcDirections.size > 0;
    // Only act on an on/off transition, so re-renders (e.g. opening a second
    // section) don't cancel the running rotation. NB: no cleanup is returned —
    // the rAF is managed imperatively and torn down on the off transition or on
    // unmount (below), not on every re-render.
    if (showingArcs === prevShowingArcs.current) return;
    prevShowingArcs.current = showingArcs;

    if (!showingArcs) {
      if (rotateRaf.current != null) {
        cancelAnimationFrame(rotateRaf.current);
        rotateRaf.current = null;
      }
      return;
    }
    if (!globeRef.current || rotateRaf.current != null) return;

    // Ease altitude out to the arcs view once, then keep spinning (preserving
    // whatever altitude the user later sets).
    let reachedZoom = false;
    const spin = () => {
      const globe = globeRef.current;
      if (!globe) return;
      if (pausedRef.current) {
        // Held while the user paused rotation; resumes on unpause.
        rotateRaf.current = requestAnimationFrame(spin);
        return;
      }
      const pov = globe.pointOfView();
      let altitude = pov.altitude;
      if (!reachedZoom) {
        altitude = pov.altitude + (ARCS_VIEW_ALTITUDE - pov.altitude) * 0.08;
        if (Math.abs(altitude - ARCS_VIEW_ALTITUDE) < 0.02) {
          altitude = ARCS_VIEW_ALTITUDE;
          reachedZoom = true;
        }
      }
      globe.pointOfView(
        { lat: pov.lat, lng: pov.lng + ROTATE_DEG_PER_FRAME, altitude },
        0,
      );
      rotateRaf.current = requestAnimationFrame(spin);
    };
    rotateRaf.current = requestAnimationFrame(spin);
  }, [pinnedEvent, visibleArcDirections, globeRef]);

  // Stop rotation if the controller unmounts.
  useEffect(
    () => () => {
      if (rotateRaf.current != null) cancelAnimationFrame(rotateRaf.current);
    },
    [],
  );

  return null;
}
