import { useCallback } from 'react';
import { MUSIC_HISTORY } from '@/components/atlas/data';
import { guidesData } from '@/components/atlas/data/loaders';
import { focusEvent } from '@/components/atlas/navigation/focusEvent';
import { afterLoad } from '@/components/atlas/navigation/pendingNavigation';
import { useAtlasDispatch } from '@/components/atlas/state/atlasStore';

/**
 * Start a guided Pathway (a `HistoricalModule`): flag it active, then fly the
 * globe to its first stop — pin the event, move the camera, and select its city.
 * Driven by the `?pathway=` deep-link (atlas.tsx), which the dashboard's
 * Pathways tab links into.
 *
 * The pathways load on demand, so this waits for them, unless the user has
 * gone somewhere else by the time they arrive. An unknown id does nothing.
 */
export function useStartPathway() {
  const dispatch = useAtlasDispatch();

  return useCallback(
    (moduleId: string) =>
      afterLoad(guidesData, (guides) => {
        const mod = guides?.getModuleById(moduleId);
        if (!mod) return;
        dispatch({ type: 'START_MODULE', payload: { moduleId } });

        const firstEvent = MUSIC_HISTORY.find((e) => e.id === mod.eventIds[0]);
        if (firstEvent) focusEvent(dispatch, firstEvent);
      }),
    [dispatch],
  );
}
