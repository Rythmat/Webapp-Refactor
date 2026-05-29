import { useEffect } from 'react';
import { useStore } from '@/daw/store';
import { writeLocalSession } from '@/lib/studio-projects/localSession';

// Debounce after the last store change before flushing to localStorage. Picked
// to be short enough that a tab-close right after an edit usually persists,
// long enough that frame-rate UI updates don't trigger per-tick writes.
const AUTOSAVE_DEBOUNCE_MS = 1500;

/**
 * Subscribes to the DAW store and writes a serialized session to localStorage
 * 1.5s after the last change. Single-slot — the previous autosave is
 * overwritten. Cleared by File → New Project (see FileMenu).
 */
export function useAutosave(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsub = useStore.subscribe(() => {
      if (timer != null) clearTimeout(timer);
      timer = setTimeout(() => {
        writeLocalSession();
        timer = null;
      }, AUTOSAVE_DEBOUNCE_MS);
    });

    return () => {
      if (timer != null) clearTimeout(timer);
      unsub();
    };
  }, []);
}
