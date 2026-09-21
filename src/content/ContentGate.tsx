import { Suspense, type ReactNode } from 'react';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ensureAtlasContent, isAtlasContentReady } from './contentStore';
import { ensureSongContent, isSongContentReady } from './songStore';

/**
 * Suspends until the published content this subtree reads has hydrated.
 *
 * This is a hard requirement, not a nicety. Both stores are filled by mutating
 * a stable object, and mutation does not trigger a React re-render — so a
 * consumer that mounts before hydration renders an empty globe or an empty song
 * library and never recovers. Wrapping the route turns "eventually correct"
 * into "correct on first paint".
 */

export type ContentNeed = 'events' | 'songs';

const LOADERS: Record<
  ContentNeed,
  { ensure: () => Promise<void>; ready: () => boolean }
> = {
  events: { ensure: ensureAtlasContent, ready: isAtlasContentReady },
  songs: { ensure: ensureSongContent, ready: isSongContentReady },
};

/**
 * Hydration failures, kept at module scope. A component that suspends before
 * it has ever mounted gets its hooks thrown away on every retry, so anything it
 * remembered in state or a memo starts over as "pending" and it suspends
 * forever — which is exactly how a cold deep link used to sit on the skeleton.
 * Readiness is read straight from the stores instead; only failure needs
 * remembering, and it has to live out here.
 */
const failures = new Map<ContentNeed, unknown>();

const ContentSuspender = ({
  needs,
  children,
}: {
  needs: ContentNeed[];
  children: ReactNode;
}) => {
  for (const need of needs) {
    // The ensure* functions already fall back to bundled data on a fetch
    // failure, so an error here is unrecoverable. Rethrow to the nearest error
    // boundary rather than rendering a silently empty page.
    if (failures.has(need)) throw failures.get(need);
  }

  const pending = needs.filter((n) => !LOADERS[n].ready());
  if (pending.length > 0) {
    // Suspense needs a promise surfaced through the render path. ensure* hands
    // back the store's one memoised hydration, so re-throwing on each retry
    // never refetches.
    throw Promise.all(
      pending.map((n) =>
        LOADERS[n].ensure().catch((error: unknown) => {
          failures.set(n, error);
        }),
      ),
    );
  }

  return <>{children}</>;
};

export const ContentGate = ({
  needs = ['events'],
  children,
  fallback,
}: {
  needs?: ContentNeed[];
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  // Already hydrated — the common case once the AppContext prefetch has landed.
  // Render straight through with no Suspense boundary at all.
  if (needs.every((n) => LOADERS[n].ready())) return <>{children}</>;

  return (
    <Suspense fallback={fallback ?? <DashboardContentSkeleton />}>
      <ContentSuspender needs={needs}>{children}</ContentSuspender>
    </Suspense>
  );
};
