import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, type MutableRefObject } from 'react';
import type { useGeoData } from '@/components/atlas/hooks/useGeoData';
import { useIsPhone } from '@/components/atlas/hooks/useMediaQuery';
import { INSPECTOR_REM } from '@/components/atlas/layout/frameGeometry';
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
  const journey = useAtlasSelector(
    (s) => s.activeModule !== null || s.activeTour !== null,
  );
  const journeyRef = useRef(journey);
  journeyRef.current = journey;
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
    // A journey keeps its own camera; otherwise a city frames the region it
    // lifts, tilted, which sells the height.
    const frame = journeyRef.current ? target.frame : liftFrame(target.frame);
    const lifting = !journeyRef.current && frame?.kind === 'region';
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
