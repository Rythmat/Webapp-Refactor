import { useEffect, useRef, useState } from 'react';
import { getLocalStoreUserKey } from '@/lib/local-store/userScope';
import type { CortexWeb } from './buildWeb';
import { layoutWebInSlices, NARROW_PX, type Positions } from './layout';

/**
 * Where this student's map sits, and what's new on it since they last looked.
 * Kept per user on the device, and on no account: it's a view, and worked out
 * again from the web wherever they sign in.
 */

interface SavedView {
  positions: Positions;
  nodes: readonly string[];
  links: readonly string[];
}

const storageKey = (userKey: string) => `music-atlas-cortex-view:${userKey}`;

const readView = (): SavedView | null => {
  const userKey = getLocalStoreUserKey();
  if (!userKey) return null;
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    return raw ? (JSON.parse(raw) as SavedView) : null;
  } catch {
    return null;
  }
};

const writeView = (view: SavedView) => {
  const userKey = getLocalStoreUserKey();
  if (!userKey) return;
  try {
    localStorage.setItem(storageKey(userKey), JSON.stringify(view));
  } catch {
    // Storage full or private browsing: it lays out afresh next time.
  }
};

export interface CortexView {
  /** Null until laid out. */
  positions: Positions | null;
  /** What to animate in. */
  bornNodes: ReadonlySet<string>;
  bornLinks: ReadonlySet<string>;
  /** "3 new connections": what's grown since the last visit, if anything. */
  caption: string | null;
}

const NOTHING_NEW: ReadonlySet<string> = new Set();

const plural = (n: number, one: string, many: string) =>
  `${n} new ${n === 1 ? one : many}`;

export const useCortexView = (web: CortexWeb): CortexView => {
  const [view, setView] = useState<CortexView>({
    positions: null,
    bornNodes: NOTHING_NEW,
    bornLinks: NOTHING_NEW,
    caption: null,
  });
  // What's already been seen this visit, so a change while the page is open
  // only animates what just arrived.
  const saved = useRef<SavedView | null | undefined>(undefined);

  useEffect(() => {
    if (saved.current === undefined) saved.current = readView();
    const before = saved.current;
    return layoutWebInSlices(
      web,
      before?.positions ?? {},
      (positions) => {
        // The first map there's ever been simply appears; after that, growth.
        const seenNodes = new Set(before?.nodes ?? []);
        const seenLinks = new Set(before?.links ?? []);
        const bornNodes = before
          ? new Set(
              web.nodes.filter((n) => !seenNodes.has(n.id)).map((n) => n.id),
            )
          : NOTHING_NEW;
        const bornLinks = before
          ? new Set(
              web.links.filter((l) => !seenLinks.has(l.id)).map((l) => l.id),
            )
          : NOTHING_NEW;
        const newConnections = web.links.filter(
          (l) => !l.hollow && bornLinks.has(l.id),
        ).length;
        const newActivities = web.nodes.filter(
          (n) => n.role === 'activity' && bornNodes.has(n.id),
        ).length;
        const growth =
          newConnections > 0
            ? plural(newConnections, 'connection', 'connections')
            : newActivities > 0
              ? plural(newActivities, 'activity', 'activities')
              : null;
        setView((was) => ({
          positions,
          bornNodes,
          bornLinks,
          // The caption stays up for the visit, until something newer replaces it.
          caption: growth ?? was.caption,
        }));
        const next: SavedView = {
          positions,
          nodes: web.nodes.map((n) => n.id),
          links: web.links.map((l) => l.id),
        };
        saved.current = next;
        writeView(next);
      },
      window.innerWidth < NARROW_PX,
    );
  }, [web]);

  return view;
};
