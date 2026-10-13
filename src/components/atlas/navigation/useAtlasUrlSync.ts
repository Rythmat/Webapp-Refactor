import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MUSIC_HISTORY, MUSICAL_ERAS } from '@/components/atlas/data';
import { getEventsForArtist } from '@/components/atlas/data/artists';
import { useStartPathway, useStartTour } from '@/components/atlas/hooks';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { stopFromSearchParams, stopKey } from './atlasStop';
import { consumeFlown, flyToFit, focusEvent } from './focusEvent';
import { cancelPendingNavigation } from './pendingNavigation';
import { resolvePlaceFly } from './resolvePlaceFly';

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
  // Read straight from the router, not useAtlasStop: these effects must see a
  // new URL in the same commit it lands, in the order declared below.
  const [params] = useSearchParams();
  const stop = useMemo(() => stopFromSearchParams(params), [params]);
  const key = stopKey(stop);
  const eraId = params.get('era');
  const inModule = useAtlasSelector((s) => s.activeModule !== null);
  const inTour = useAtlasSelector((s) => s.activeTour !== null);
  const selectedEra = useAtlasSelector((s) => s.selectedEra);
  const selectedLocation = useAtlasSelector((s) => s.selectedLocation);
  const dispatch = useAtlasDispatch();
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
    if (stop.kind !== 'pathway' && inModule) dispatch({ type: 'EXIT_MODULE' });
    if (stop.kind !== 'tour' && inTour) dispatch({ type: 'EXIT_TOUR' });
    // Only on stop changes — the sequence bars manage their own steps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    // A navigation still waiting for its data (a tour, the state outlines)
    // belongs to the stop being left.
    cancelPendingNavigation();
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

      // Both load the tours and pathways first, and ignore an unknown id.
      case 'pathway':
        startPathway(stop.pathwayId);
        return;

      case 'tour':
        startTour(stop.tourId);
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
