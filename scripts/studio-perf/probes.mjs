/* eslint-env node */
/**
 * In-page probes for the Studio editor checks. `installProbes` runs in the
 * page before any app code (context.addInitScript), so it must be
 * self-contained. It records, while `window.__MA_PERF__.recording` is on:
 *
 * - long tasks and long animation frames (PerformanceObserver);
 * - every animation frame (its own rAF loop), for frame-time percentiles;
 * - requestAnimationFrame calls made by the app (its own loop is excluded),
 *   so an idle editor that keeps animating shows up;
 * - React commits, through a minimal devtools hook;
 * - writes to the editor's store (window.__MA_STORE__, exposed by DawApp under
 *   the dev auth bypass) and which top-level keys each write changed.
 *
 * The node side starts and reads a recording with `startRecording` and
 * `stopRecording`; `stopRecording` also returns the per-region render counts
 * DawApp's DevProfiler keeps in window.__MA_RENDER_STATS__.
 */

export function installProbes() {
  if (window.__MA_PERF__) return;
  const perf = {
    recording: false,
    t0: performance.now(),
    longTasks: [],
    loaf: [],
    frames: [],
    rafCalls: 0,
    commits: 0,
    storeWrites: 0,
    storeKeys: {},
  };
  window.__MA_PERF__ = perf;

  const observe = (type, push) => {
    try {
      new PerformanceObserver((list) => {
        if (!perf.recording) return;
        for (const entry of list.getEntries()) push(entry);
      }).observe({ type, buffered: false });
    } catch {
      // Not supported by this browser.
    }
  };
  observe('longtask', (e) =>
    perf.longTasks.push({ start: e.startTime, duration: e.duration }),
  );
  observe('long-animation-frame', (e) =>
    perf.loaf.push({
      start: e.startTime,
      duration: e.duration,
      blocking: e.blockingDuration,
    }),
  );

  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    if (perf.recording) perf.rafCalls += 1;
    return raf(callback);
  };
  const tick = (time) => {
    if (perf.recording) perf.frames.push(time);
    raf(tick);
  };
  raf(tick);

  if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    let nextId = 1;
    const renderers = new Map();
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      renderers,
      inject(renderer) {
        const id = nextId++;
        renderers.set(id, renderer);
        return id;
      },
      onCommitFiberRoot() {
        if (perf.recording) perf.commits += 1;
      },
      onCommitFiberUnmount() {},
      onPostCommitFiberRoot() {},
      onScheduleFiberRoot() {},
      checkDCE() {},
    };
  }

  const attachStore = () => {
    const store = window.__MA_STORE__;
    if (!store) {
      setTimeout(attachStore, 200);
      return;
    }
    store.subscribe((state, prev) => {
      if (!perf.recording) return;
      perf.storeWrites += 1;
      for (const key of Object.keys(state)) {
        if (typeof state[key] === 'function' || state[key] === prev[key]) {
          continue;
        }
        perf.storeKeys[key] = (perf.storeKeys[key] ?? 0) + 1;
      }
    });
  };
  attachStore();
}

/** Clears the counters (including DevProfiler's) and starts recording. */
export async function startRecording(page) {
  await page.evaluate(() => {
    const perf = window.__MA_PERF__;
    perf.longTasks.length = 0;
    perf.loaf.length = 0;
    perf.frames.length = 0;
    perf.rafCalls = 0;
    perf.commits = 0;
    perf.storeWrites = 0;
    perf.storeKeys = {};
    const stats = window.__MA_RENDER_STATS__ ?? {};
    for (const id of Object.keys(stats))
      stats[id] = { commits: 0, actualMs: 0 };
    perf.t0 = performance.now();
    perf.recording = true;
  });
}

/** Stops recording and returns rates per second plus the raw counts. */
export async function stopRecording(page) {
  return page.evaluate(() => {
    const perf = window.__MA_PERF__;
    perf.recording = false;
    const seconds = (performance.now() - perf.t0) / 1000;
    const gaps = perf.frames.slice(1).map((t, i) => t - perf.frames[i]);
    const sorted = [...gaps].sort((a, b) => a - b);
    const pct = (p) =>
      sorted.length
        ? Number(
            sorted[
              Math.min(sorted.length - 1, Math.floor(p * sorted.length))
            ].toFixed(1),
          )
        : null;
    const perSecond = (n) => Number((n / seconds).toFixed(2));
    const stats = window.__MA_RENDER_STATS__ ?? {};
    const regions = Object.fromEntries(
      Object.entries(stats).map(([id, s]) => [
        id,
        {
          commitsPerSecond: perSecond(s.commits),
          msPerSecond: Number((s.actualMs / seconds).toFixed(2)),
        },
      ]),
    );
    const topKeys = Object.entries(perf.storeKeys)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([key, n]) => ({ key, perSecond: perSecond(n) }));
    return {
      seconds: Number(seconds.toFixed(2)),
      frames: perf.frames.length,
      frameMs: { p50: pct(0.5), p95: pct(0.95), max: sorted.at(-1) ?? null },
      longTasks: {
        count: perf.longTasks.length,
        totalMs: Math.round(perf.longTasks.reduce((a, t) => a + t.duration, 0)),
      },
      longAnimationFrames: {
        count: perf.loaf.length,
        blockingMs: Math.round(
          perf.loaf.reduce((a, t) => a + (t.blocking ?? 0), 0),
        ),
      },
      appRafCallsPerSecond: perSecond(perf.rafCalls),
      reactCommitsPerSecond: perSecond(perf.commits),
      storeWritesPerSecond: perSecond(perf.storeWrites),
      storeKeys: topKeys,
      regions,
    };
  });
}
