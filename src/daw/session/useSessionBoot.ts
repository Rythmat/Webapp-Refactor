import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { openSession } from './openSession';
import { hasBootKeys, parseBootIntent } from './parseBootIntent';
import { getSessionDeps } from './sessionDeps';
import type { OpenIntent, OpenSource } from './types';

// ── The editor's boot: what its URL asks to open (milestone 1.4) ───────────
//
// Mounted once in the editor (DawApp, after it registers SessionDeps). On
// mount it opens what the URL names, or carries on with the session (a cold
// page resumes its last draft; a return to the editor keeps the live one and
// rejoins its room). After that it opens again on every navigation that
// lands on a URL with a boot key (a link clicked while the editor is open)
// or `?projects=1`, keyed on location.key, so each navigation opens once.
//
// Each open starts a tick after the effect: under StrictMode the first
// effect pass is torn down before its timer fires, so a collab join is
// never started by a mount React is about to throw away. A location key
// that has opened once never opens its link again (a remount, HMR); the
// mount's first run then just carries on with the session.

/** Location keys that have started an open in this page. */
const openedKeys = new Set<string>();

/** Test seam: forget which location keys have opened. */
export function resetSessionBootForTests(): void {
  openedKeys.clear();
}

function bootOpen(
  intent: OpenIntent,
  source: OpenSource,
  openProjects: boolean,
): void {
  void openSession(intent, { source }).then((outcome) => {
    if (!openProjects || outcome.status === 'superseded') return;
    getSessionDeps()?.openProjectsDialog();
  });
}

export function useSessionBoot(): void {
  const location = useLocation();
  const firstRunRef = useRef(true);
  const key = location.key;
  const search = location.search;

  useEffect(() => {
    const timer = setTimeout(() => {
      const first = firstRunRef.current;
      firstRunRef.current = false;
      const params = new URLSearchParams(search);
      if (openedKeys.has(key)) {
        // This navigation opened already: a remount carries on with the
        // session it left.
        if (first) bootOpen({ kind: 'resume' }, 'boot', false);
        return;
      }
      if (!first && !hasBootKeys(params)) return;
      openedKeys.add(key);
      const parsed = parseBootIntent(params);
      bootOpen(parsed.intent, first ? 'boot' : 'link', parsed.openProjects);
    }, 0);
    return () => clearTimeout(timer);
  }, [key, search]);
}
