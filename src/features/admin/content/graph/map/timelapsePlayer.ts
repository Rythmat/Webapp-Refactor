import type { GraphFacets } from './model/facets';
import type { RenderGraph } from './model/renderGraph';
import { planTimelapse, type TimelapsePlan } from './model/timelapse';
import {
  TIMELAPSE_HOLD_MS,
  timelapseStepMs,
  timelapseSteps,
  timelapseYear,
} from './model/timelapseGraph';

/**
 * The clock behind Cortex's "Animate" timelapse.
 *
 * Starting it plans the order the whole graph appears in (`planTimelapse`,
 * by year) and shows the first batch at once. It then moves on one batch
 * every step (about twelve a second for the Atlas, so the whole run takes
 * about 30 seconds; `timelapseStepMs`), and shows whatever is left undated
 * in one last step (`timelapseSteps`). After that the finished
 * picture holds for a moment with the counter at its last year, and the
 * run ends by itself. Stop ends it at any point. Either way the canvas
 * then hands back the settled layout (see `TimelapseCanvas`).
 *
 * It is a small store with no React in it: the canvas, the year counter and
 * the page each read it through `useSyncExternalStore`, so a step redraws
 * the canvas and the counter but never the page around them. A snapshot is
 * replaced, never changed, so React can tell when it moved.
 */

export type TimelapseStatus = 'idle' | 'playing' | 'holding';

/** How a run ended: it reached the end, or it was stopped. */
export type TimelapseEnd = 'finished' | 'stopped';

export interface TimelapseSnapshot {
  readonly status: TimelapseStatus;
  /** Bumped by every start, so each run is a layout run of its own. */
  readonly run: number;
  /** The whole graph the run grows to, and its plan; null when idle. */
  readonly graph: RenderGraph | null;
  readonly plan: TimelapsePlan | null;
  /** The plan's last batch showing, from 0. */
  readonly batch: number;
  /** The step the run is at, from 0, and how many it takes. */
  readonly step: number;
  readonly steps: number;
  /** The year on the counter. */
  readonly year: number | null;
  /** The share of the batches showing, from 0 to 1. */
  readonly progress: number;
  /** How long each step shows, in ms. */
  readonly stepMs: number;
}

export type TimelapseScheduler = (task: () => void, ms: number) => () => void;

export interface TimelapsePlayerOptions {
  /** Runs a task later; returns a cancel. Defaults to `setTimeout`. */
  schedule?: TimelapseScheduler;
  /** How long the finished picture holds. Defaults to `TIMELAPSE_HOLD_MS`. */
  holdMs?: number;
}

export interface TimelapsePlayer {
  getSnapshot(): TimelapseSnapshot;
  /** For `useSyncExternalStore`: told after every change of snapshot. */
  subscribe(listener: () => void): () => void;
  /**
   * Plan and start a run over `graph` (restarting one already going).
   * Returns the first snapshot, or null when there is nothing to show.
   */
  start(graph: RenderGraph, facets: GraphFacets): TimelapseSnapshot | null;
  /** End the run, if one is going. */
  stop(): void;
  /** Told once whenever a run ends, and how. */
  onEnd(listener: (end: TimelapseEnd) => void): () => void;
  /** Stop and forget every listener. */
  dispose(): void;
}

const IDLE: TimelapseSnapshot = Object.freeze({
  status: 'idle',
  run: 0,
  graph: null,
  plan: null,
  batch: -1,
  step: -1,
  steps: 0,
  year: null,
  progress: 0,
  stepMs: 0,
});

const timerScheduler: TimelapseScheduler = (task, ms) => {
  const id = setTimeout(task, ms);
  return () => clearTimeout(id);
};

export function createTimelapsePlayer(
  options: TimelapsePlayerOptions = {},
): TimelapsePlayer {
  const schedule = options.schedule ?? timerScheduler;
  const holdMs = options.holdMs ?? TIMELAPSE_HOLD_MS;
  const listeners = new Set<() => void>();
  const endListeners = new Set<(end: TimelapseEnd) => void>();
  let snapshot: TimelapseSnapshot = IDLE;
  let runs = 0;
  let cancel: (() => void) | null = null;

  const emit = () => {
    for (const listener of [...listeners]) listener();
  };

  const set = (next: TimelapseSnapshot) => {
    snapshot = next;
    emit();
  };

  const clearTimer = () => {
    cancel?.();
    cancel = null;
  };

  const end = (how: TimelapseEnd) => {
    clearTimer();
    if (snapshot.status === 'idle') return;
    set({ ...IDLE, run: snapshot.run });
    for (const listener of [...endListeners]) listener(how);
  };

  /** The batch each step shows, for the run going. */
  let stepBatches: Int32Array = new Int32Array(0);

  const showStep = (step: number) => {
    const plan = snapshot.plan;
    if (!plan) return;
    const batch = stepBatches[step];
    set({
      ...snapshot,
      status: 'playing',
      batch,
      step,
      year: timelapseYear(plan, batch),
      progress: (step + 1) / stepBatches.length,
    });
    cancel = schedule(next, snapshot.stepMs);
  };

  function next() {
    cancel = null;
    if (!snapshot.plan || snapshot.status !== 'playing') return;
    if (snapshot.step + 1 < stepBatches.length) {
      showStep(snapshot.step + 1);
      return;
    }
    // Every batch is in: hold the finished picture, then hand back.
    set({ ...snapshot, status: 'holding', progress: 1 });
    cancel = schedule(() => {
      cancel = null;
      end('finished');
    }, holdMs);
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start(graph, facets) {
      clearTimer();
      if (graph.count === 0) return null;
      const plan = planTimelapse({
        ids: graph.ids,
        links: graph.links,
        facets,
      });
      if (plan.batches.length === 0) return null;
      runs += 1;
      stepBatches = timelapseSteps(plan);
      snapshot = {
        ...IDLE,
        status: 'playing',
        run: runs,
        graph,
        plan,
        steps: stepBatches.length,
        stepMs: timelapseStepMs(stepBatches.length),
      };
      showStep(0);
      return snapshot;
    },
    stop: () => end('stopped'),
    onEnd(listener) {
      endListeners.add(listener);
      return () => {
        endListeners.delete(listener);
      };
    },
    dispose() {
      clearTimer();
      snapshot = IDLE;
      listeners.clear();
      endListeners.clear();
    },
  };
}
