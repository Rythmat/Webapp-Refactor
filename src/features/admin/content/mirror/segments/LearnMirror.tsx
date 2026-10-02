import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LearnInlet } from '@/components/learn/LearnInlet';

/** The Learn tabs the mirror shows; each is content rather than per-student. */
const TABS = ['Songs', 'Genre', 'Theory', 'Technique', 'WorldHarmony'];

/**
 * Learn, always on a tab.
 *
 * With no `?tab` LearnInlet resets itself to Learn Home, whatever
 * `initialTab` says, and Learn Home is a student's own streak, XP and recent
 * lessons — nothing an admin edits, and calls to per-user APIs on their
 * behalf. Both Learn's own heading and the sidebar link to bare `/learn`, so
 * this settles the tab first (Genre when arriving from the globe with
 * `?genre=`, else Songs) and never mounts Learn without one.
 */
export const LearnMirror = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab');
  const settled = tab !== null && TABS.includes(tab);

  useEffect(() => {
    if (settled) return;
    const next = new URLSearchParams(params);
    next.set('tab', params.get('genre') ? 'Genre' : 'Songs');
    setParams(next, { replace: true });
  }, [settled, params, setParams]);

  return settled ? <LearnInlet /> : null;
};
