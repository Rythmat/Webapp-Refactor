import { useCallback } from 'react';
import { guidesData } from '@/components/atlas/data/loaders';
import { cityFrame } from '@/components/atlas/navigation/flyFrames';
import { afterLoad } from '@/components/atlas/navigation/pendingNavigation';
import { useAtlasDispatch } from '@/components/atlas/state/atlasStore';
import { resolveStopEvent } from '@/components/atlas/utils/resolveStopEvent';

/**
 * Start a place-based Guided Tour (a region or city tour): flag it active, then
 * fly the globe to its first stop and highlight that stop's city (if any).
 * Used by the `?tour=` deep-link (atlas.tsx). Stepping thereafter is driven by
 * GuidedTourBar, which repeats the same fly/select for each stop.
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

        // Fly to the first stop. The map applies the fly target once it is
        // ready, so this works even on a cold deep-link load.
        const first = stops[0];
        dispatch({
          type: 'EXECUTE_SEARCH',
          payload: {
            lat: first.lat,
            lng: first.lng,
            zoom: first.zoom,
            ...(first.cityId ? { frame: cityFrame(first.zoom) } : {}),
          },
        });
        dispatch({
          type: 'SELECT_LOCATION',
          payload: first.cityId ? { type: 'city', id: first.cityId } : null,
        });
        // Pin the stop's representative event so its card opens fully. Must run
        // after SELECT_LOCATION, which resets pinnedEvent.
        const event = resolveStopEvent(tour, first, 0);
        if (event) dispatch({ type: 'PIN_EVENT', payload: event });
      }),
    [dispatch],
  );
}
