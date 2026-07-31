import { Suspense, useMemo, type ReactNode } from 'react';
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

/** Suspense needs a promise surfaced through the render path. */
const suspend = (promise: Promise<void>) => {
  let status: 'pending' | 'done' | 'error' = 'pending';
  let error: unknown;

  const tracked = promise.then(
    () => {
      status = 'done';
    },
    (caught) => {
      status = 'error';
      error = caught;
    },
  );

  return () => {
    // The ensure* functions already fall back to bundled data on a fetch
    // failure, so an error here is unrecoverable. Rethrow to the nearest error
    // boundary rather than rendering a silently empty page.
    if (status === 'error') throw error;
    if (status === 'pending') throw tracked;
  };
};

const ContentSuspender = ({
  needs,
  children,
}: {
  needs: ContentNeed[];
  children: ReactNode;
}) => {
  const read = useMemo(
    () =>
      suspend(
        Promise.all(needs.map((n) => LOADERS[n].ensure())).then(
          () => undefined,
        ),
      ),
    // Re-suspending on a changed `needs` array would remount the subtree; the
    // set is static per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  read();
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
