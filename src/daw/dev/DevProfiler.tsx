import {
  Profiler,
  useEffect,
  type ProfilerOnRenderCallback,
  type ReactNode,
} from 'react';
import { DEV_AUTH_BYPASS } from '@/auth/devBypass';

// ── Dev-only render counters for scripts/studio-perf ───────────────────────
// The perf scripts read window.__MA_RENDER_STATS__ to see how often each part
// of the editor commits, e.g. during playback, and performance marks named
// `ma:daw:*` for the load timeline. Everything here is inert unless the dev
// auth bypass is on, and that folds out of production builds (devBypass.ts).

interface RenderStats {
  /** Commits of the profiled subtree (DevProfiler) or of one component. */
  commits: number;
  /** Total render time of those commits, in ms (DevProfiler only). */
  actualMs: number;
}

const statsFor = (id: string): RenderStats => {
  const w = window as unknown as {
    __MA_RENDER_STATS__?: Record<string, RenderStats>;
  };
  const all = (w.__MA_RENDER_STATS__ ??= {});
  return (all[id] ??= { commits: 0, actualMs: 0 });
};

const onRender: ProfilerOnRenderCallback = (id, _phase, actualDuration) => {
  const stats = statsFor(id);
  stats.commits += 1;
  stats.actualMs += actualDuration;
};

/** Counts every commit inside `children`, under `id`. */
export function DevProfiler({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  if (!DEV_AUTH_BYPASS) return <>{children}</>;
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}

/**
 * Counts commits of the calling component itself, not of its children: the
 * effect has no dependencies, so it runs once after every commit.
 */
export function useDevCommitCount(id: string): void {
  useEffect(() => {
    if (DEV_AUTH_BYPASS) statsFor(id).commits += 1;
  });
}

/** A `ma:daw:<name>` performance mark for the load timeline. */
export function devMark(name: string): void {
  if (DEV_AUTH_BYPASS) performance.mark(`ma:daw:${name}`);
}
