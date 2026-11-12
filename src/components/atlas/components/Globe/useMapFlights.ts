import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, type MutableRefObject } from 'react';
import type { useGeoData } from '@/components/atlas/hooks/useGeoData';
import { useIsPhone } from '@/components/atlas/hooks/useMediaQuery';
import { INSPECTOR_REM } from '@/components/atlas/layout/frameGeometry';
import { useAtlasStop } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import type { MapInsets } from '@/components/atlas/types';
import { LIFT_PITCH } from './liftLayers';
import {
  findRegion,
  fitCamera,
  frameCamera,
  landingInsets,
  type Outlines,
} from './mapFraming';
import { altitudeToMapZoom, flightDuration } from './mapGeometry';
import { liftFrame } from './regionLift';
import { MAP_START } from './useMapInstance';
import { FLIGHT_EVENT } from './useMapPhase';

/** Room round a lifted region, px: it's the hero, not edge to edge. */
const LIFT_MARGIN_PX = 72;
/** A phone's stage above its sheet is short: 72 px would take 40% of it. */
const LIFT_MARGIN_PHONE_PX = 36;
/**
 * How far a lifted region's flight lands short of its fit, in zoom levels
 * (owner, 2026-11-09: it came in slightly too close): 0.4 is about a quarter
 * further out, small regions at their zoom cap included.
 */
export const LIFT_PULL_BACK_ZOOM = 0.4;
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
 * on the outlines so a region waits for them.
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
  // Whether the page opened on a stop (a link into the Globe), not the bare
  // globe: as the page first had it.
  const stop = useAtlasStop();
  const openedOnStop = useRef(stop.kind !== 'home');
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
    // A city frames the region it lifts, tilted, which sells the height; a
    // tour's or a pathway's step as much as Explore's (owner, 2026-11-09).
    const frame = liftFrame(target.frame);
    const lifting = frame?.kind === 'region';
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
        inspectorPx:
          INSPECTOR_REM.width *
          (parseFloat(getComputedStyle(document.documentElement).fontSize) ||
            16),
      };
      const padding = landingInsets(paddingRef.current, view, !!frame);
      const camera = frameCamera(
        { ...target, frame },
        outlines,
        (bounds, maxZoom) =>
          fitCamera(
            bounds,
            view,
            padding,
            maxZoom,
            lifting
              ? view.phone
                ? LIFT_MARGIN_PHONE_PX
                : LIFT_MARGIN_PX
              : undefined,
          ),
        view.height,
      );
      // A deep link's first flight starts over the target, zoomed out, so the
      // default view never shows, then flies in. A flight the viewer starts
      // from the globe they are looking at flies from where it is.
      if (!flownBefore.current && openedOnStop.current) {
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
          zoom: lifting
            ? Math.max(0, camera.zoom - LIFT_PULL_BACK_ZOOM)
            : camera.zoom,
          pitch: lifting ? LIFT_PITCH : 0,
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
}
