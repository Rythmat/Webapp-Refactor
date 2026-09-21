import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useAppDispatch,
  useAppState,
} from '@/components/atlas/context/AppContext';
import {
  HISTORICAL_MODULES,
  MUSIC_HISTORY,
  MUSICAL_ERAS,
  getTour,
} from '@/components/atlas/data';
import { getEventsForArtist } from '@/components/atlas/data/artists';
import { useStartPathway, useStartTour } from '@/components/atlas/hooks';
import { stopKey } from './atlasStop';
import { consumeFlown, flyToFit, focusEvent } from './focusEvent';
import { resolvePlaceFly } from './resolvePlaceFly';
import { useAtlasStop } from './useAtlasNavigate';

/**
 * Drive the globe's reducer state from the URL.
 *
 * Runs once per distinct stop (keyed on {@link stopKey}), whether it arrived
 * from a click, a bookmark, a lesson link, the trail strip, or the browser's
 * Back button — they are all just URL changes, so they all behave identically.
 *
 * Replaces four independent deep-link effects that each handled one param and
 * ignored the rest.
 */
export function useAtlasUrlSync(): void {
  const stop = useAtlasStop();
  const key = stopKey(stop);
  const [params] = useSearchParams();
  const eraId = params.get('era');
  const { activeModule, activeTour, selectedEra, selectedLocation } =
    useAppState();
  const dispatch = useAppDispatch();
  const startPathway = useStartPathway();
  const startTour = useStartTour();

  // The era filter rides alongside whatever stop is showing. Declared FIRST and
  // guarded against no-ops because SET_ERA also clears `pinnedEvent`: run after
  // the stop effect — or unconditionally on mount — it would wipe the pin that
  // effect had just set, and a deep-linked event would open collapsed.
  useEffect(() => {
    const valid = !!eraId && MUSICAL_ERAS.some((e) => e.id === eraId);
    const next = valid ? eraId : null;
    if (next !== selectedEra) dispatch({ type: 'SET_ERA', payload: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eraId]);

  // Leaving a sequence: any stop that is not the running pathway or tour ends
  // it, exactly as if the user had pressed its Exit button.
  useEffect(() => {
    if (stop.kind !== 'pathway' && activeModule) {
      dispatch({ type: 'EXIT_MODULE' });
    }
    if (stop.kind !== 'tour' && activeTour) dispatch({ type: 'EXIT_TOUR' });
    // Only on stop changes — the sequence bars manage their own steps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    switch (stop.kind) {
      case 'event': {
        const event = MUSIC_HISTORY.find((e) => e.id === stop.eventId);
        if (event) focusEvent(dispatch, event, selectedLocation);
        return;
      }

      case 'place': {
        dispatch({ type: 'SELECT_LOCATION', payload: stop.place });
        // A globe click already flew to the polygon's true centroid, which is
        // better than anything rebuilt from CITIES; only fly for a stop that
        // arrived some other way (bookmark, Back, the trail strip).
        if (!consumeFlown(key)) {
          const fly = resolvePlaceFly(stop.place);
          if (fly) dispatch({ type: 'EXECUTE_SEARCH', payload: fly });
        }
        return;
      }

      case 'artist': {
        // The artist panel replaces the details card, so clear the region; the
        // artist's own pins are drawn by BaseGlobe from the same URL.
        dispatch({ type: 'SELECT_LOCATION', payload: null });
        const fly = flyToFit(
          getEventsForArtist(stop.artist).map((e) => e.location),
        );
        if (fly) dispatch({ type: 'EXECUTE_SEARCH', payload: fly });
        return;
      }

      case 'pathway':
        if (HISTORICAL_MODULES.some((m) => m.id === stop.pathwayId)) {
          startPathway(stop.pathwayId);
        }
        return;

      case 'tour':
        if (getTour(stop.tourId)) startTour(stop.tourId);
        return;

      // Both replace the details card with their own view (or nothing).
      case 'search':
      case 'home':
        dispatch({ type: 'SELECT_LOCATION', payload: null });
        return;
    }
    // Keyed on the stop's identity, not the object: re-running on every render
    // would re-fly the camera out from under the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
