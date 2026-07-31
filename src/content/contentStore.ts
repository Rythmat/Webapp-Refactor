import type { HistoricalEvent } from '@/components/atlas/types';
import { fetchBundle, isContentCdnEnabled } from './manifest';

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  READ THIS BEFORE TOUCHING MUSIC_HISTORY
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `MUSIC_HISTORY` starts EMPTY and is filled in place by `ensureAtlasContent()`
 * once the published bundle arrives from the CDN. The array's identity never
 * changes — that is the entire trick, and it is what let this migration happen
 * without rewriting the ten places that read it, since every one of them reads
 * lazily inside a function body, hook, or effect.
 *
 * Two consequences you must respect:
 *
 *  1. NEVER snapshot it at module scope.
 *       const ACTIVE = MUSIC_HISTORY.filter(...)   ← WRONG, captures []
 *       new Map(MUSIC_HISTORY.map(...))            ← WRONG, captures []
 *     Do it inside the function/component/useMemo that needs it instead.
 *     contentStore.test.ts asserts the array is empty before hydration
 *     specifically so that reintroducing an eager snapshot fails a test rather
 *     than silently rendering an empty globe.
 *
 *  2. Mutation does NOT trigger a React re-render. Anything that reads this
 *     must mount behind <ContentGate>, which suspends until hydration resolves.
 *
 * Falls back to the bundled `.ts` data when the CDN is unset (local dev, tests)
 * or unreachable. The fallback is behind a dynamic import, so those ~1.3MB of
 * event files stay off the eager bundle graph and cost nothing unless used.
 */
export const MUSIC_HISTORY: HistoricalEvent[] = [];

/**
 * Bumped on every hydration. Derived caches built from MUSIC_HISTORY compare
 * against this to know when to rebuild — see eventConnections.ts and
 * features/search/sources/staticIndex.ts.
 */
export let contentGeneration = 0;

export type ContentSource = 'cdn' | 'bundled';

let source: ContentSource | null = null;
export const atlasContentSource = (): ContentSource | null => source;

const loadBundled = async (): Promise<HistoricalEvent[]> => {
  const module = await import('@/components/atlas/data/events');
  return module.BUNDLED_MUSIC_HISTORY;
};

const loadEvents = async (): Promise<{
  events: HistoricalEvent[];
  from: ContentSource;
}> => {
  if (!isContentCdnEnabled()) {
    return { events: await loadBundled(), from: 'bundled' };
  }

  try {
    const events = await fetchBundle<HistoricalEvent>('globe-events');
    if (events.length === 0) throw new Error('published bundle was empty');
    return { events, from: 'cdn' };
  } catch (caught) {
    // A CDN outage must degrade to the previous globe, not to a blank one.
    console.error(
      '[content] globe events failed to load from CDN, falling back to bundled data:',
      caught,
    );
    return { events: await loadBundled(), from: 'bundled' };
  }
};

let hydration: Promise<void> | null = null;

export const ensureAtlasContent = (): Promise<void> => {
  hydration ??= loadEvents().then(({ events, from }) => {
    MUSIC_HISTORY.length = 0;
    MUSIC_HISTORY.push(...events);
    source = from;
    contentGeneration += 1;
  });

  return hydration;
};

export const isAtlasContentReady = (): boolean => contentGeneration > 0;

/** Test seam — resets to the pre-hydration state. */
export const resetAtlasContent = () => {
  MUSIC_HISTORY.length = 0;
  hydration = null;
  source = null;
  contentGeneration = 0;
};
