import { useCallback } from 'react';
import { useAppDispatch } from '@/components/atlas/context/AppContext';
import { HISTORICAL_MODULES, MUSIC_HISTORY } from '@/components/atlas/data';
import { focusEvent } from '@/components/atlas/navigation/focusEvent';

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

      const firstEvent = MUSIC_HISTORY.find((e) => e.id === mod.eventIds[0]);
      if (firstEvent) focusEvent(dispatch, firstEvent);
    },
    [dispatch],
  );
}
