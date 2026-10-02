/**
 * The page's side of the Mind Map's layout: it starts the layout worker,
 * sends it the graph and every change, and keeps the latest positions in one
 * array the renderer reads.
 *
 * Positions arrive as transferred buffers. The client copies each into its
 * own array, hands the buffer straight back (so two buffers go back and
 * forth and nothing is allocated while the layout moves), and tells its
 * listeners. Messages about an older graph are dropped by their generation.
 *
 * Where there is no Worker (jsdom tests, or a browser that refuses to start
 * one) the same engine runs inline on the page, with the same messages,
 * delivered a moment later as a worker's would be. If the worker fails after
 * starting, the client moves to the inline engine and picks up from the last
 * positions it had. Reduced motion uses the engine's converge mode: the
 * layout runs to rest out of sight, reporting progress, and posts once.
 */
import type { LayoutForces } from './forceLayout';
import {
  createLayoutEngine,
  transferListOf,
  type LayoutMessage,
  type LayoutMode,
  type LayoutRequest,
  type LayoutScheduler,
  type TickTiming,
} from './layoutProtocol';

/** A message's tick timing, when it carries one. */
const timingOf = (message: TickTiming): TickTiming | undefined =>
  message.tickMs === undefined
    ? undefined
    : {
        tickMs: message.tickMs,
        tickMaxMs: message.tickMaxMs,
        slowTicks: message.slowTicks,
      };

/** Where the layout runs: the worker, or the inline engine. */
export interface LayoutPort {
  post(message: LayoutRequest, transfer: ArrayBuffer[]): void;
  listen(
    onMessage: (message: LayoutMessage) => void,
    onError: (message: string) => void,
  ): void;
  terminate(): void;
}

/** Everything the layout needs to start. */
export interface LayoutStart {
  count: number;
  /** Links as pairs of node numbers. Copied, so the caller keeps its array. */
  links: Uint32Array;
  /** Starting positions, NaN for none; left out, every node starts unplaced. */
  xy?: ArrayLike<number>;
  forces: LayoutForces;
  seed: number;
  /** The starting alpha; left out, it follows from how many nodes are placed. */
  alpha?: number;
  mode?: LayoutMode;
  /** The most ticks per second while animating; left out, as fast as it can. */
  maxTicksPerSecond?: number;
  /**
   * A warm start's early stop, in world units (see `InitRequest.restBelow`):
   * the run ends once nothing moves further than this for ten ticks.
   */
  restBelow?: number;
}

/** A structural change: the new graph, with the positions nodes already had. */
export interface LayoutGraphChange {
  count: number;
  links: Uint32Array;
  xy?: ArrayLike<number>;
  /** Defaults to the structural reheat, 0.1. */
  alpha?: number;
}

export type LayoutEvent =
  | {
      type: 'positions';
      /** The client's own array, overwritten by the next update. */
      positions: Float32Array;
      alpha: number;
      ticks: number;
      /** What the ticks cost, when the engine said. */
      timing?: TickTiming;
    }
  | {
      type: 'settled';
      positions: Float32Array | null;
      alpha: number;
      ticks: number;
      timing?: TickTiming;
    }
  | { type: 'progress'; fraction: number }
  | { type: 'error'; message: string };

export type LayoutListener = (event: LayoutEvent) => void;

export interface LayoutClientOptions {
  /**
   * Opens the worker. Defaults to the layout's module worker; null, or a
   * factory that returns null or throws, runs the engine inline.
   */
  openPort?: (() => LayoutPort | null) | null;
  /** The inline engine's scheduler; defaults to timers. */
  schedule?: LayoutScheduler;
  /** The inline engine's clock; defaults to `performance.now()`. */
  now?: () => number;
  /** The inline engine's time slices (see the engine's options). */
  budgetMs?: number;
  convergeBudgetMs?: number;
}

export interface LayoutClient {
  /** Where the layout is running now. */
  runsIn(): 'worker' | 'inline';
  /** Start the layout over a graph, replacing any graph before it. */
  start(start: LayoutStart): void;
  /** Replace the graph after a structural change, keeping the motion. */
  setGraph(change: LayoutGraphChange): void;
  setForces(forces: LayoutForces): void;
  /** Hold a node at (x, y) in world units, as a drag does. */
  pin(index: number, x: number, y: number): void;
  unpin(index: number): void;
  reheat(alpha: number): void;
  setMode(mode: LayoutMode): void;
  /** Stop ticking until the next change that moves the layout. */
  stop(): void;
  /** The latest positions of the current graph, or null before the first. */
  positions(): Float32Array | null;
  /** True once the current graph's layout has come to rest. */
  isSettled(): boolean;
  subscribe(listener: LayoutListener): () => void;
  /** Stop the layout and close the worker. */
  dispose(): void;
}

const timerScheduler: LayoutScheduler = (task, delayMs) => {
  const id = setTimeout(task, delayMs);
  return () => clearTimeout(id);
};

/** The layout's module worker, or null where workers are missing or refused. */
function openWorkerPort(): LayoutPort | null {
  if (typeof Worker === 'undefined') return null;
  const worker = new Worker(new URL('./layout.worker.ts', import.meta.url), {
    type: 'module',
  });
  return {
    post: (message, transfer) => worker.postMessage(message, transfer),
    listen(onMessage, onError) {
      worker.onmessage = (event: MessageEvent<LayoutMessage>) =>
        onMessage(event.data);
      worker.onerror = (event) => {
        event.preventDefault();
        onError(event.message || 'The layout worker stopped.');
      };
      worker.onmessageerror = () =>
        onError('A message from the layout worker could not be read.');
    },
    terminate: () => worker.terminate(),
  };
}

/**
 * The engine on the page. Its messages reach the client in a microtask, as
 * a worker's would arrive later, so the engine is never re-entered while it
 * ticks.
 */
function openInlinePort(options: LayoutClientOptions): LayoutPort {
  let deliver: (message: LayoutMessage) => void = () => {};
  const engine = createLayoutEngine({
    post: (message) => queueMicrotask(() => deliver(message)),
    schedule: options.schedule ?? timerScheduler,
    now: options.now ?? (() => performance.now()),
    budgetMs: options.budgetMs,
    convergeBudgetMs: options.convergeBudgetMs,
  });
  return {
    post: (message) => engine.handle(message),
    listen(onMessage) {
      deliver = onMessage;
    },
    terminate() {
      deliver = () => {};
      engine.dispose();
    },
  };
}

/**
 * A copy of the starting positions to hand over, or all NaN when there are
 * none. A copy keeps the length it was given, so positions that do not fit
 * the graph come back from the engine as an error rather than being padded.
 */
const copyXy = (xy: ArrayLike<number> | undefined, count: number) =>
  xy ? Float32Array.from(xy) : new Float32Array(count * 2).fill(NaN);

export function createLayoutClient(
  options: LayoutClientOptions = {},
): LayoutClient {
  const listeners = new Set<LayoutListener>();
  let port: LayoutPort;
  let runsIn: 'worker' | 'inline';
  let disposed = false;

  let generation = 0;
  let latest: Float32Array | null = null;
  let settled = false;
  /** The alpha last reported for the current graph. */
  let alpha = 1;

  // What a restart on the inline engine needs, should the worker fail.
  let current: Omit<LayoutStart, 'mode'> | null = null;
  let mode: LayoutMode = 'animate';

  const emit = (event: LayoutEvent) => {
    for (const listener of [...listeners]) listener(event);
  };

  const send = (message: LayoutRequest) => {
    if (!disposed) port.post(message, transferListOf(message));
  };

  const receive = (message: LayoutMessage) => {
    if (disposed) return;
    switch (message.type) {
      case 'positions': {
        const { xy } = message;
        const fresh = message.generation === generation;
        if (fresh) {
          if (!latest || latest.length !== xy.length)
            latest = new Float32Array(xy.length);
          latest.set(xy);
          settled = false;
          alpha = message.alpha;
        }
        // Back to the engine at once, stale or not: it keeps what fits.
        send({ type: 'returnBuffer', buffer: xy });
        if (fresh && latest)
          emit({
            type: 'positions',
            positions: latest,
            alpha: message.alpha,
            ticks: message.ticks,
            timing: timingOf(message),
          });
        break;
      }
      case 'settled':
        if (message.generation !== generation) return;
        settled = true;
        alpha = message.alpha;
        emit({
          type: 'settled',
          positions: latest,
          alpha: message.alpha,
          ticks: message.ticks,
          timing: timingOf(message),
        });
        break;
      case 'progress':
        if (message.generation === generation)
          emit({ type: 'progress', fraction: message.fraction });
        break;
      case 'error':
        emit({ type: 'error', message: message.message });
        break;
    }
  };

  /** The worker failed: carry on inline from the last positions seen. */
  const fallBack = (reason: string) => {
    if (disposed || runsIn === 'inline') return;
    port.terminate();
    port = openInlinePort(options);
    runsIn = 'inline';
    port.listen(receive, () => {});
    emit({ type: 'error', message: reason });
    if (!current) return;
    const resume = current;
    send({
      type: 'init',
      generation,
      count: resume.count,
      links: resume.links.slice(),
      xy: copyXy(latest ?? resume.xy, resume.count),
      forces: resume.forces,
      seed: resume.seed,
      // From where it was: the alpha last reported goes with the positions.
      alpha: latest ? alpha : resume.alpha,
      mode,
      maxTicksPerSecond: resume.maxTicksPerSecond,
      restBelow: resume.restBelow,
    });
  };

  const openPort =
    options.openPort === undefined ? openWorkerPort : options.openPort;
  let opened: LayoutPort | null = null;
  try {
    opened = openPort ? openPort() : null;
  } catch {
    opened = null;
  }
  port = opened ?? openInlinePort(options);
  runsIn = opened ? 'worker' : 'inline';
  port.listen(receive, fallBack);

  return {
    runsIn: () => runsIn,
    start(start) {
      generation += 1;
      latest = null;
      settled = false;
      mode = start.mode ?? 'animate';
      current = { ...start };
      send({
        type: 'init',
        generation,
        count: start.count,
        // Copies, transferred: the caller's arrays stay usable.
        links: start.links.slice(),
        xy: copyXy(start.xy, start.count),
        forces: start.forces,
        seed: start.seed,
        alpha: start.alpha,
        mode,
        maxTicksPerSecond: start.maxTicksPerSecond,
        restBelow: start.restBelow,
      });
    },
    setGraph(change) {
      if (!current) return;
      generation += 1;
      latest = null;
      settled = false;
      current = {
        ...current,
        count: change.count,
        links: change.links,
        xy: change.xy,
        alpha: undefined,
        // A changed graph keeps Obsidian's schedule, here as in the engine.
        restBelow: undefined,
      };
      send({
        type: 'setGraph',
        generation,
        count: change.count,
        links: change.links.slice(),
        xy: copyXy(change.xy, change.count),
        alpha: change.alpha,
      });
    },
    setForces(forces) {
      if (current) current = { ...current, forces };
      settled = false;
      send({ type: 'setForces', forces });
    },
    pin(index, x, y) {
      settled = false;
      send({ type: 'pin', index, x, y });
    },
    unpin(index) {
      send({ type: 'unpin', index });
    },
    reheat(next) {
      settled = false;
      send({ type: 'reheat', alpha: next });
    },
    setMode(next) {
      mode = next;
      send({ type: 'setMode', mode: next });
    },
    stop() {
      send({ type: 'stop' });
    },
    positions: () => latest,
    isSettled: () => settled,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      if (disposed) return;
      send({ type: 'stop' });
      disposed = true;
      listeners.clear();
      port.terminate();
    },
  };
}
