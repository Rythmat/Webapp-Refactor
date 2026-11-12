import { useCallback, type Dispatch } from 'react';
import type { GuidedTour, ResolvedTourStop } from '@/components/atlas/data';
import { guidesData } from '@/components/atlas/data/loaders';
import { cityFrame } from '@/components/atlas/navigation/flyFrames';
import { afterLoad } from '@/components/atlas/navigation/pendingNavigation';
import { useAtlasDispatch } from '@/components/atlas/state/atlasStore';
import type { AppAction } from '@/components/atlas/types';
import { resolveStopEvent } from '@/components/atlas/utils/resolveStopEvent';

/**
 * Show a Guided Tour's stop `step`: fly there, highlight its city (an
 * overview stop clears the selection), and pin its representative event so
 * its tile opens fully. A city stop names its city, so the map lifts the
 * city's region as Explore does (useMapFlights). The start and the Tours card
 * (Panels/ToursPanel) both step this way.
 */
export function goToTourStop(
  dispatch: Dispatch<AppAction>,
  tour: GuidedTour,
  stops: readonly ResolvedTourStop[],
  step: number,
): void {
  const stop = stops[step];
  if (!stop) return;
  dispatch({ type: 'TOUR_STEP', payload: step });
  dispatch({
    type: 'EXECUTE_SEARCH',
    payload: {
      lat: stop.lat,
      lng: stop.lng,
      zoom: stop.zoom,
      ...(stop.cityId ? { frame: cityFrame(stop.zoom, stop.cityId) } : {}),
    },
  });
  dispatch({
    type: 'SELECT_LOCATION',
    payload: stop.cityId ? { type: 'city', id: stop.cityId } : null,
  });
  // After SELECT_LOCATION, which resets pinnedEvent.
  const event = resolveStopEvent(tour, stop, step);
  if (event) dispatch({ type: 'PIN_EVENT', payload: event });
}

/**
 * Start a place-based Guided Tour (a region or city tour): flag it active, then
 * show its first stop (goToTourStop). Used by the `?tour=` deep-link
 * (useAtlasUrlSync); the Tours card steps it from there.
 *
 * The tours load on demand, so this waits for them, unless the user has gone
 * somewhere else by the time they arrive. An unknown id does nothing.
 */
export function useStartTour() {
  const dispatch = useAtlasDispatch();

  return useCallback(
    (tourId: string) =>
      afterLoad(guidesData, (guides) => {
        const tour = guides?.getTour(tourId);
        if (!guides || !tour) return;
        const stops = guides.resolveTourStops(tour);
        if (stops.length === 0) return;
        dispatch({ type: 'START_TOUR', payload: { tourId } });
        // The map applies the fly target once it is ready, so this works
        // even on a cold deep-link load.
        goToTourStop(dispatch, tour, stops, 0);
      }),
    [dispatch],
  );
}
