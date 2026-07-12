import { useCallback } from 'react';
import { useAppDispatch } from '@/components/atlas/context/AppContext';
import { getTour, resolveTourStops } from '@/components/atlas/data';
import { resolveStopEvent } from '@/components/atlas/utils/resolveStopEvent';

/**
 * Start a place-based Guided Tour (a region or city tour): flag it active, then
 * fly the globe to its first stop and highlight that stop's city (if any).
 * Used by the `?tour=` deep-link (atlas.tsx). Stepping thereafter is driven by
 * GuidedTourBar, which repeats the same fly/select for each stop.
 */
export function useStartTour() {
  const dispatch = useAppDispatch();

  return useCallback(
    (tourId: string) => {
      const tour = getTour(tourId);
      if (!tour) return;
      const stops = resolveTourStops(tour);
      if (stops.length === 0) return;

      dispatch({ type: 'START_TOUR', payload: { tourId } });

      // Fly to the first stop. GlobeController applies the fly target once the
      // globe reports ready, so this works even on a cold deep-link load.
      const first = stops[0];
      dispatch({
        type: 'EXECUTE_SEARCH',
        payload: { lat: first.lat, lng: first.lng, zoom: first.zoom },
      });
      dispatch({
        type: 'SELECT_LOCATION',
        payload: first.cityId ? { type: 'city', id: first.cityId } : null,
      });
      // Pin the stop's representative event so its card opens fully. Must run
      // after SELECT_LOCATION, which resets pinnedEvent.
      const event = resolveStopEvent(tour, first, 0);
      if (event) dispatch({ type: 'PIN_EVENT', payload: event });
    },
    [dispatch],
  );
}
