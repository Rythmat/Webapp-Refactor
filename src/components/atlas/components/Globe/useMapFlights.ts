import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, type MutableRefObject } from 'react';
import type { useGeoData } from '@/components/atlas/hooks/useGeoData';
import { useIsPhone } from '@/components/atlas/hooks/useMediaQuery';
import { readInspectorWidth } from '@/components/atlas/layout/inspectorWidth';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import type { MapInsets } from '@/components/atlas/types';
import {
  findRegion,
  fitCamera,
  frameCamera,
  landingInsets,
  type Outlines,
} from './mapFraming';
import {
  altitudeToMapZoom,
  flightDuration,
  statesInViewAt,
} from './mapGeometry';
import { MAP_START } from './useMapInstance';
import { FLIGHT_EVENT } from './useMapPhase';

/** How long a framed flight waits for the panel it opens to be measured. */
const SETTLE_MS = 80;
/** How long a country or state flight waits for its outlines before going anyway. */
const OUTLINE_WAIT_MS = 2500;

type Geo = Pick<ReturnType<typeof useGeoData>, 'countries' | 'adminRegions'>;

/**
 * The camera: a flight to the search or stop target, framed (mapFraming.ts):
 * a country or a state fitted to its outline, a city centred, an artist's
 * events fitted together, inside the part of the map the overlays leave
 * clear (`paddingRef`, kept by MapPadding). Depends on `map` so a target set
 * before the map finished loading (a deep link) is applied once it has, and
 * on the outlines so a region waits for them. Also tells the store when the
 * state outlines come into view, for the legend.
 */
export function useMapFlights(
  map: MapLibreMap | null,
  { countries, adminRegions }: Geo,
  paddingRef: MutableRefObject<MapInsets>,
  reducedMotionRef: MutableRefObject<boolean>,
) {
  const dispatch = useAtlasDispatch();
  const searchFlyTarget = useAtlasSelector((s) => s.searchFlyTarget);
  const isPhone = useIsPhone();
  const isPhoneRef = useRef(isPhone);
  isPhoneRef.current = isPhone;
  const flownBefore = useRef(false);
  const flightTimer = useRef<number | undefined>(undefined);
  const waitingSince = useRef<{ target: object; at: number } | null>(null);

  useEffect(() => {
    if (!map || !searchFlyTarget) return;
    const target = searchFlyTarget;
    const outlines: Outlines = {
      countries: countries?.features ?? null,
      states: adminRegions?.features ?? null,
    };
    const frame = target.frame;
    const loading =
      frame?.kind === 'region' &&
      findRegion(frame.place, outlines) === 'loading';

    const fly = () => {
      waitingSince.current = null;
      const container = map.getContainer();
      const view = {
        phone: isPhoneRef.current,
        width: container.clientWidth,
        height: container.clientHeight,
        inspectorPx: readInspectorWidth(),
      };
      const padding = landingInsets(paddingRef.current, view, !!frame);
      const camera = frameCamera(
        target,
        outlines,
        (bounds, maxZoom) => fitCamera(bounds, view, padding, maxZoom),
        view.height,
      );
      // The first flight is a deep link's: start over the target, zoomed
      // out, so the default view never shows, then fly in.
      if (!flownBefore.current) {
        map.jumpTo({
          center: camera.center,
          zoom: altitudeToMapZoom(
            MAP_START.altitude,
            view.height,
            camera.center[1],
          ),
          padding,
        });
      }
      flownBefore.current = true;
      map.flyTo(
        {
          center: camera.center,
          zoom: camera.zoom,
          padding,
          duration: flightDuration(reducedMotionRef.current),
          // Not essential: MapLibre itself cuts the flight under reduced
          // motion.
          essential: false,
        },
        // So the page can tell its flights from the spin (useMapPhase).
        FLIGHT_EVENT,
      );
    };

    window.clearTimeout(flightTimer.current);
    if (loading) {
      // Wait for the outlines, but not for ever: if they never come, fly to
      // the target's own centre.
      if (waitingSince.current?.target !== target) {
        waitingSince.current = { target, at: Date.now() };
      }
      const left = OUTLINE_WAIT_MS - (Date.now() - waitingSince.current.at);
      flightTimer.current = window.setTimeout(
        () => {
          dispatch({ type: 'CLEAR_FLY_TARGET' });
          fly();
        },
        Math.max(0, left),
      );
      return;
    }
    dispatch({ type: 'CLEAR_FLY_TARGET' });
    // A framed flight opens a panel; give it a moment to be on the page and
    // measured, so the flight lands clear of it (landingInsets).
    flightTimer.current = window.setTimeout(fly, frame ? SETTLE_MS : 0);
  }, [
    map,
    searchFlyTarget,
    countries,
    adminRegions,
    dispatch,
    paddingRef,
    reducedMotionRef,
  ]);
  useEffect(() => () => window.clearTimeout(flightTimer.current), []);

  // State outlines in view, for the legend: from STATES_MIN_ZOOM, with
  // hysteresis. 'zoom' fires every frame of a flight; only a change is sent.
  const statesInView = useAtlasSelector((s) => s.statesInView);
  const statesInViewRef = useRef(statesInView);
  useEffect(() => {
    if (!map) return;
    const check = () => {
      const next = statesInViewAt(map.getZoom(), statesInViewRef.current);
      if (next === statesInViewRef.current) return;
      statesInViewRef.current = next;
      dispatch({ type: 'SET_STATES_IN_VIEW', payload: next });
    };
    check();
    map.on('zoom', check);
    return () => {
      map.off('zoom', check);
    };
  }, [map, dispatch]);
}
