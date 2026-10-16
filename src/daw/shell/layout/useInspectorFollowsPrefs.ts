import { useEffect } from 'react';
import { useSessionStore } from '@/daw/session/sessionStore';
import { useStore } from '@/daw/store';
import { resolveInspectorOpen } from './layoutModel';

/**
 * Puts the Inspector as the student keeps it in the view showing: when an
 * open settles (a new project, a template, a restored draft, a lesson), and
 * when their prefs arrive or change (startPrefsSync, once auth knows who
 * they are). Between those, setCurrentView and the student's toggle keep it
 * so. A running lesson is left alone: its steps set the Inspector for the
 * moment (StepRequires.libraryOpen) without touching the student's choice.
 * Mounted once, by the shell.
 */
export function useInspectorFollowsPrefs(): void {
  useEffect(() => {
    const follow = () => {
      const s = useStore.getState();
      if (s.activeTutorialId !== null) return;
      const open = resolveInspectorOpen(s.currentView, s.inspectorOpenByView);
      if (s.libraryOpen !== open) s.setLibraryOpen(open);
    };
    const offSession = useSessionStore.subscribe((state, previous) => {
      if (state.generation !== previous.generation) follow();
    });
    const offPrefs = useStore.subscribe((s) => s.inspectorOpenByView, follow);
    return () => {
      offSession();
      offPrefs();
    };
  }, []);
}
