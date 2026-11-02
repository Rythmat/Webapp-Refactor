import { useEffect, useRef, useState } from 'react';
import { getLocalStoreUserKey } from '@/lib/local-store/userScope';
import type { CortexWeb } from './buildWeb';
import { layoutWebInSlices, NARROW_PX, type Positions } from './layout';

/**
 * Where this student's map sits, and what's new on it since they last looked.
 * Kept per user on the device, and on no account: it's a view, and worked out
 * again from the web wherever they sign in.
 */

/** What's been seen. Only ever grows, so a failed load can't shrink it. */
interface Seen {
  nodes: readonly string[];
  links: readonly string[];
}

interface SavedView extends Seen {
  positions: Positions;
}

/** Positions from before the web grew around the core are laid out afresh. */
const VIEW_VERSION = 2;

const storageKey = (userKey: string) => `music-atlas-cortex-view:${userKey}`;

const stringsIn = (value: unknown): readonly string[] =>
  Array.isArray(value) ? (value as string[]) : [];

const readView = (): SavedView | null => {
  const userKey = getLocalStoreUserKey();
  if (!userKey) return null;
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedView> & { v?: number };
    return {
      positions:
        parsed.v === VIEW_VERSION && parsed.positions ? parsed.positions : {},
      nodes: stringsIn(parsed.nodes),
      links: stringsIn(parsed.links),
    };
  } catch {
    return null;
  }
};

const writeView = (view: SavedView) => {
  const userKey = getLocalStoreUserKey();
  if (!userKey) return;
  try {
    localStorage.setItem(
      storageKey(userKey),
      JSON.stringify({ v: VIEW_VERSION, ...view }),
    );
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

/** Long enough for the slowest animation; a view opened later doesn't replay it. */
const BORN_MS = 1500;

const plural = (n: number, one: string, many: string) =>
  `${n} new ${n === 1 ? one : many}`;

/**
 * What the web has that `before` hadn't. The first map there's ever been simply
 * appears, so nothing on it is new; after that, growth. Pure.
 */
export const growthSince = (
  web: CortexWeb,
  before: Seen | null,
): {
  bornNodes: ReadonlySet<string>;
  bornLinks: ReadonlySet<string>;
  growth: string | null;
} => {
  if (!before || before.nodes.length === 0) {
    return { bornNodes: NOTHING_NEW, bornLinks: NOTHING_NEW, growth: null };
  }
  const seenNodes = new Set(before.nodes);
  const seenLinks = new Set(before.links);
  const bornNodes = new Set(
    web.nodes.filter((n) => !seenNodes.has(n.id)).map((n) => n.id),
  );
  const bornLinks = new Set(
    web.links.filter((l) => !seenLinks.has(l.id)).map((l) => l.id),
  );
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
  return { bornNodes, bornLinks, growth };
};

/**
 * `loading`: the account hasn't answered, so the web may be missing what it
 * holds. Nothing is compared or saved until it has, or everything on the account
 * would arrive looking new. `layout`: whether anything needs positions; the
 * Orbit doesn't, and a big web's layout isn't free.
 */
export const useCortexView = (
  web: CortexWeb,
  { loading, layout }: { loading: boolean; layout: boolean },
): CortexView => {
  const [view, setView] = useState<CortexView>({
    positions: null,
    bornNodes: NOTHING_NEW,
    bornLinks: NOTHING_NEW,
    caption: null,
  });
  // What's already been seen this visit, so a change while the page is open
  // only animates what just arrived.
  const saved = useRef<SavedView | null | undefined>(undefined);
  // StrictMode runs an effect twice, and the second run would find nothing new.
  const comparedWeb = useRef<CortexWeb | null>(null);

  useEffect(() => {
    if (loading || comparedWeb.current === web) return;
    comparedWeb.current = web;
    if (saved.current === undefined) saved.current = readView();
    const before = saved.current;
    const { bornNodes, bornLinks, growth } = growthSince(web, before);
    setView((was) => ({
      ...was,
      bornNodes,
      bornLinks,
      // The caption stays up for the visit, until something newer replaces it.
      caption: growth ?? was.caption,
    }));
    const next: SavedView = {
      positions: before?.positions ?? {},
      nodes: [
        ...new Set([...(before?.nodes ?? []), ...web.nodes.map((n) => n.id)]),
      ],
      links: [
        ...new Set([...(before?.links ?? []), ...web.links.map((l) => l.id)]),
      ],
    };
    saved.current = next;
    writeView(next);
  }, [web, loading]);

  useEffect(() => {
    if (view.bornNodes.size === 0 && view.bornLinks.size === 0) return;
    const timer = setTimeout(() => {
      setView((was) => ({
        ...was,
        bornNodes: NOTHING_NEW,
        bornLinks: NOTHING_NEW,
      }));
    }, BORN_MS);
    return () => clearTimeout(timer);
  }, [view.bornNodes, view.bornLinks]);

  useEffect(() => {
    if (loading || !layout) return;
    if (saved.current === undefined) saved.current = readView();
    return layoutWebInSlices(
      web,
      saved.current?.positions ?? {},
      (positions) => {
        setView((was) => ({ ...was, positions }));
        const next: SavedView = {
          nodes: saved.current?.nodes ?? [],
          links: saved.current?.links ?? [],
          positions,
        };
        saved.current = next;
        writeView(next);
      },
      window.innerWidth < NARROW_PX,
    );
  }, [web, loading, layout]);

  return view;
};
