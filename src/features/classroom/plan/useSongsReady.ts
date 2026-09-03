/**
 * useSongsReady — track song-library hydration readiness.
 *
 * Songs hydrate asynchronously (usually prefetched by AppContext). This hook
 * re-renders once the library lands, so lesson-card artist images upgrade from
 * the hex placeholder — without gating the surrounding grid on Suspense. Shared
 * by the Lessons page (`PlanPage`) and the Calendar Week view (`CalendarView`).
 */
import { useEffect, useState } from 'react';
import { ensureSongContent, isSongContentReady } from '@/content/songStore';

export const useSongsReady = (): boolean => {
  const [ready, setReady] = useState(() => isSongContentReady());
  useEffect(() => {
    if (ready) return;
    let alive = true;
    void ensureSongContent().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [ready]);
  return ready;
};
