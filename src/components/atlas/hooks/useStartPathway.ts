import { useCallback } from 'react';
import { useAppDispatch } from '@/components/atlas/context/AppContext';
import {
  HISTORICAL_MODULES,
  CITIES,
  MUSIC_HISTORY,
} from '@/components/atlas/data';

/**
 * Start a guided Pathway (a `HistoricalModule`): flag it active, then fly the
 * globe to its first stop — pin the event, move the camera, and select its city.
 * Driven by the `?pathway=` deep-link (atlas.tsx), which the dashboard's
 * Pathways tab links into.
 */
export function useStartPathway() {
  const dispatch = useAppDispatch();

  return useCallback(
    (moduleId: string) => {
      const mod = HISTORICAL_MODULES.find((m) => m.id === moduleId);
      if (!mod) return;
      dispatch({ type: 'START_MODULE', payload: { moduleId } });

      // Navigate to the first event.
      const firstEvent = MUSIC_HISTORY.find((e) => e.id === mod.eventIds[0]);
      if (!firstEvent) return;
      // SELECT_LOCATION resets pinnedEvent, so select the city BEFORE pinning —
      // otherwise the pin (and the focused card + camera offset) is wiped.
      const city = CITIES.find(
        (c) => c.name.toLowerCase() === firstEvent.location.city.toLowerCase(),
      );
      if (city)
        dispatch({
          type: 'SELECT_LOCATION',
          payload: { type: 'city', id: city.id },
        });
      dispatch({ type: 'PIN_EVENT', payload: firstEvent });
      dispatch({
        type: 'EXECUTE_SEARCH',
        payload: {
          lat: firstEvent.location.lat,
          lng: firstEvent.location.lng,
          zoom: 10,
        },
      });
    },
    [dispatch],
  );
}
