/**
 * The messages between the Mind Map and its layout worker, and the engine
 * that answers them.
 *
 * The page sends the graph once (`init`), then small changes: new forces from
 * the sliders, a node pinned under the pointer and let go, a reheat, a new
 * graph after a save, a switch between animating and converging, and stop.
 * The engine ticks the force layout and sends positions back about every
 * 16 ms, one frame, as a transferred Float32Array: it holds them back only
 * while one more tick would still be done before the 16 ms are up, so a
 * frame never goes without fresh positions whether a tick takes 2 ms or 12.
 * Two such buffers go back
 * and forth: the page copies the positions into its own array and returns
 * the buffer, so a steady layout allocates nothing. When the layout comes to
 * rest the engine sends its final positions and then `settled`.
 *
 * The same engine runs inside the worker and, where there is no Worker
 * (jsdom tests), inline on the page. It is pure: the clock, the scheduler
 * and the way messages are posted are handed to it, so the tests drive it
 * with a fake clock in node.
 */
import {
  ALPHA,
  createForceLayout,
  settleProgress,
  type ForceLayout,
  type LayoutForces,
} from './forceLayout';

// ── Messages to the engine ──────────────────────────────────────────────────

/**
 * `animate` posts positions while the layout moves. `converge` (for reduced
 * motion) runs the layout to rest without posting positions, sends progress
 * as it goes, and posts once at the end. A drag always animates.
 */
export type LayoutMode = 'animate' | 'converge';

/** Start (or restart) the layout over a new graph. */
export interface InitRequest {
  type: 'init';
  /** Echoed on every message about this graph, so stale ones can be dropped. */
  generation: number;
  count: number;
  /** Links as pairs of node numbers. Transferred. */
  links: Uint32Array;
  /** Starting positions, NaN for nodes with none yet. Transferred. */
  xy: Float32Array;
  forces: LayoutForces;
  seed: number;
  /** The starting alpha; left out, it follows from how many nodes are placed. */
  alpha?: number;
  mode: LayoutMode;
  /**
   * The most ticks to run per second while animating. Left out, the layout
   * ticks as fast as it can.
   */
  maxTicksPerSecond?: number;
  /**
   * For a warm start only (one that begins at the warm alpha or cooler):
   * end the run early once no node has moved more than this many world
   * units on each of `REST_AFTER_TICKS` ticks in a row. The page passes
   * half a device pixel at the zoom it shows, so the run stops once nothing
   * visibly moves rather than cooling on for the 170 ticks Obsidian's
   * schedule takes from 0.05. Left out, or on a cold start, the run keeps
   * Obsidian's schedule.
   */
  restBelow?: number;
}

/** New force strengths from the sliders; reheats to 0.3. */
export interface SetForcesRequest {
  type: 'setForces';
  forces: LayoutForces;
}

/** Hold a node at a point (a drag); sent again as the pointer moves. */
export interface PinRequest {
  type: 'pin';
  index: number;
  x: number;
  y: number;
}

/** Let a dragged node go. */
export interface UnpinRequest {
  type: 'unpin';
  index: number;
}

/** Raise alpha to at least this. */
export interface ReheatRequest {
  type: 'reheat';
  alpha: number;
}

/**
 * The graph's structure changed (a save added or removed nodes or links).
 * `xy` holds the positions nodes already had, NaN for new ones; alpha rises
 * to at least 0.1 unless told otherwise.
 */
export interface SetGraphRequest {
  type: 'setGraph';
  generation: number;
  count: number;
  links: Uint32Array;
  xy: Float32Array;
  alpha?: number;
}

export interface SetModeRequest {
  type: 'setMode';
  mode: LayoutMode;
}

/** A positions buffer handed back once the page has copied it. */
export interface ReturnBufferRequest {
  type: 'returnBuffer';
  buffer: Float32Array;
}

/** Stop ticking until the next change that moves the layout. */
export interface StopRequest {
  type: 'stop';
}

export type LayoutRequest =
  | InitRequest
  | SetForcesRequest
  | PinRequest
  | UnpinRequest
  | ReheatRequest
  | SetGraphRequest
  | SetModeRequest
  | ReturnBufferRequest
  | StopRequest;

// ── Messages from the engine ────────────────────────────────────────────────

/**
 * What the ticks have cost since the layout last started moving, for the
 * dev hook and the browser smoke: a running average, the slowest one, and
 * how many went over `TICK_TARGET_MS`.
 */
export interface TickTiming {
  tickMs?: number;
  tickMaxMs?: number;
  slowTicks?: number;
}

/** Positions as x0, y0, x1, y1, …; the buffer is transferred. */
export interface PositionsMessage extends TickTiming {
  type: 'positions';
  generation: number;
  xy: Float32Array;
  alpha: number;
  /** Ticks run since the layout last started moving. */
  ticks: number;
}

/** The layout came to rest; its final positions were the last ones posted. */
export interface SettledMessage extends TickTiming {
  type: 'settled';
  generation: number;
  alpha: number;
  ticks: number;
}

/** How far a converging layout has come, from 0 to 1. */
export interface ProgressMessage {
  type: 'progress';
  generation: number;
  fraction: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type LayoutMessage =
  | PositionsMessage
  | SettledMessage
  | ProgressMessage
  | ErrorMessage;

// ── Cadence ─────────────────────────────────────────────────────────────────

/** Positions are posted about this often: one frame at 60 a second. */
export const POST_INTERVAL_MS = 16;

/**
 * The plan's target for one tick of the layout, in ms: a tick slower than
 * this is counted (`TickTiming.slowTicks`), so the smoke can report it.
 */
export const TICK_TARGET_MS = 12;

/**
 * Whether the engine may hold fresh positions back for one more tick. It may
 * while that tick would still be done by the time the next post is due (16
 * ms after the last one), so posts come about once a frame however short the
 * ticks. Once waiting would push the post past that, it posts now: with ticks
 * of 8 to 16 ms, that is after every tick, where waiting for a full 16 ms
 * would post every second tick and leave frames with nothing new (about 43
 * updates a second at the Atlas's worst case, instead of 60).
 */
export function mayHoldPositions(
  lastPostAt: number,
  nextTickEndsAt: number,
): boolean {
  return nextTickEndsAt <= lastPostAt + POST_INTERVAL_MS;
}

/**
 * How many ticks in a row a warm start must stay below its `restBelow`
 * before the engine ends it (see `InitRequest.restBelow`).
 */
export const REST_AFTER_TICKS = 10;

/**
 * What the page passes as `restBelow`: half a device pixel, in world units
 * at the zoom it shows.
 */
export const REST_DEVICE_PX = 0.5;

/** A converging layout reports progress at most this often. */
export const PROGRESS_INTERVAL_MS = 100;

/** How many positions buffers go back and forth. */
export const POSITION_BUFFERS = 2;

/** The buffers a message hands over rather than copies. */
export function transferListOf(
  message: LayoutRequest | LayoutMessage,
): ArrayBuffer[] {
  switch (message.type) {
    case 'init':
    case 'setGraph':
      return [
        message.links.buffer as ArrayBuffer,
        message.xy.buffer as ArrayBuffer,
      ];
    case 'positions':
      return [message.xy.buffer as ArrayBuffer];
    case 'returnBuffer':
      return [message.buffer.buffer as ArrayBuffer];
    default:
      return [];
  }
}

// ── The engine ──────────────────────────────────────────────────────────────

/** Run `task` after `delayMs` (0: as soon as possible); returns a cancel. */
export type LayoutScheduler = (task: () => void, delayMs: number) => () => void;

export interface LayoutEngineOptions {
  /** Send a message to the page, handing over the listed buffers. */
  post: (message: LayoutMessage, transfer: ArrayBuffer[]) => void;
  schedule: LayoutScheduler;
  /** Milliseconds, from any fixed origin. */
  now: () => number;
  /**
   * The longest stretch of ticking before the engine yields, so a pin or a
   * slider change is heard quickly. Defaults to 8 ms.
   */
  budgetMs?: number;
  /** The same while converging, when nothing is drawn. Defaults to 50 ms. */
  convergeBudgetMs?: number;
}

export interface LayoutEngine {
  handle(request: LayoutRequest): void;
  /** Stop for good and drop the layout. */
  dispose(): void;
}

const describe = (caught: unknown) =>
  caught instanceof Error ? caught.message : String(caught);

export function createLayoutEngine(options: LayoutEngineOptions): LayoutEngine {
  const { post, schedule, now } = options;
  const budgetMs = options.budgetMs ?? 8;
  const convergeBudgetMs = options.convergeBudgetMs ?? 50;

  let layout: ForceLayout | null = null;
  let generation = 0;
  let mode: LayoutMode = 'animate';
  let tickInterval = 0;
  let nextTickAt = -Infinity;
  let halted = false;
  let disposed = false;
  let cancel: (() => void) | null = null;
  let running = false;

  // What the page has seen.
  let dirty = false;
  let settledSent = false;
  let lastPostAt = -Infinity;
  /** What a tick has been costing lately, in ms (a running average). */
  let tickCost = 0;
  /** The slowest tick, and how many went over the target, since the last stir. */
  let tickMax = 0;
  let slowTicks = 0;
  let heatTicks = 0;
  let convergeFrom: number | null = null;
  let lastProgressAt = -Infinity;
  let lastProgress = 0;
  /** A warm start's early stop: the move to stay under, or 0 for none. */
  let restBelow = 0;
  let stillTicks = 0;

  // The ping-pong pool: buffers of the current length, free or out with the
  // page. A buffer of another length (an older graph's) is dropped.
  let bufferLength = 0;
  let free: Float32Array[] = [];
  let pool = 0;

  const fail = (caught: unknown) => {
    post({ type: 'error', message: describe(caught) }, []);
  };

  const resize = (length: number) => {
    if (length === bufferLength) return;
    bufferLength = length;
    free = [];
    pool = 0;
  };

  const takeBuffer = (): Float32Array | null => {
    const buffer = free.pop();
    if (buffer) return buffer;
    if (pool >= POSITION_BUFFERS) return null;
    pool += 1;
    return new Float32Array(bufferLength);
  };

  /**
   * Something moved the layout: the page will need to hear about it. Any
   * change after the start (a drag, a slider, a new graph) keeps Obsidian's
   * schedule, so a warm start's early stop ends here; `init` sets it again.
   */
  const stir = () => {
    restBelow = 0;
    stillTicks = 0;
    halted = false;
    dirty = true;
    settledSent = false;
    heatTicks = 0;
    tickMax = 0;
    slowTicks = 0;
    convergeFrom = null;
    lastProgress = 0;
    lastProgressAt = -Infinity;
    wake();
  };

  const wake = (delayMs = 0) => {
    if (running || cancel || halted || disposed || !layout) return;
    cancel = schedule(run, delayMs);
  };

  const timing = (): TickTiming => ({
    tickMs: tickCost,
    tickMaxMs: tickMax,
    slowTicks,
  });

  const animating = () =>
    mode === 'animate' || (layout !== null && layout.pinnedCount() > 0);

  /** Post the positions if a buffer is free; false if none was. */
  const postPositions = (at: number): boolean => {
    if (!layout) return false;
    const buffer = takeBuffer();
    if (!buffer) return false;
    layout.positions(buffer);
    dirty = false;
    lastPostAt = at;
    const message: PositionsMessage = {
      type: 'positions',
      generation,
      xy: buffer,
      alpha: layout.alpha(),
      ticks: heatTicks,
      ...timing(),
    };
    post(message, transferListOf(message));
    return true;
  };

  const tickFor = (current: ForceLayout, budget: number, paced: boolean) => {
    const start = now();
    let before = start;
    while (!current.isSettled()) {
      if (paced) {
        const at = now();
        if (at < nextTickAt) break;
        // Keep to the rate on average, but forget a debt of more than one
        // tick (after a pause) rather than burst to catch up.
        nextTickAt =
          (at - nextTickAt > tickInterval ? at : nextTickAt) + tickInterval;
      }
      current.tick();
      heatTicks += 1;
      dirty = true;
      if (restBelow > 0) {
        stillTicks = current.lastMove() < restBelow ? stillTicks + 1 : 0;
        if (stillTicks >= REST_AFTER_TICKS) {
          current.rest();
          restBelow = 0;
        }
      }
      const after = now();
      const cost = after - before;
      tickCost = tickCost === 0 ? cost : tickCost * 0.75 + cost * 0.25;
      if (cost > tickMax) tickMax = cost;
      if (cost > TICK_TARGET_MS) slowTicks += 1;
      before = after;
      if (after - start >= budget) break;
    }
  };

  const reportProgress = (current: ForceLayout) => {
    convergeFrom ??= current.alpha();
    const at = now();
    if (at - lastProgressAt < PROGRESS_INTERVAL_MS) return;
    lastProgressAt = at;
    lastProgress = Math.max(
      lastProgress,
      settleProgress(convergeFrom, current.alpha()),
    );
    post({ type: 'progress', generation, fraction: lastProgress }, []);
  };

  function run() {
    cancel = null;
    const current = layout;
    if (!current || halted || disposed) return;
    running = true;
    let delay = 0;
    try {
      const moving = animating();
      const paced = moving && tickInterval > 0;
      tickFor(current, moving ? budgetMs : convergeBudgetMs, paced);
      const settled = current.isSettled();

      if (moving || settled) {
        if (dirty) {
          const at = now();
          const wait = lastPostAt + POST_INTERVAL_MS - at;
          // The next tick starts now, or when the pace allows.
          const nextTickEndsAt =
            (paced ? Math.max(at, nextTickAt) : at) + tickCost;
          if (
            settled ? wait > 0 : mayHoldPositions(lastPostAt, nextTickEndsAt)
          ) {
            // The final positions wait out the 16 ms; there is no next tick.
            if (settled) delay = wait;
          } else if (!postPositions(at) && settled) {
            // Every buffer is out; the next one back wakes the engine.
            return;
          }
        }
      } else reportProgress(current);

      if (layout !== current) {
        // A new graph arrived while posting: run that one next.
        delay = 0;
      } else if (current.isSettled() && !dirty) {
        if (!settledSent) {
          settledSent = true;
          lastProgress = 0;
          post(
            {
              type: 'settled',
              generation,
              alpha: current.alpha(),
              ticks: heatTicks,
              ...timing(),
            },
            [],
          );
        }
        return;
      } else if (paced && !current.isSettled()) {
        delay = Math.max(delay, nextTickAt - now());
      }
    } catch (caught) {
      fail(caught);
      return;
    } finally {
      running = false;
    }
    wake(Math.max(0, delay));
  }

  const stopRun = () => {
    cancel?.();
    cancel = null;
  };

  const handle = (request: LayoutRequest) => {
    if (disposed) return;
    try {
      switch (request.type) {
        case 'init':
          // The old layout goes first: if the new graph is refused, nothing
          // runs under the new generation.
          stopRun();
          layout = null;
          generation = request.generation;
          mode = request.mode;
          tickInterval =
            request.maxTicksPerSecond && request.maxTicksPerSecond > 0
              ? 1000 / request.maxTicksPerSecond
              : 0;
          layout = createForceLayout({
            count: request.count,
            links: request.links,
            xy: request.xy,
            forces: request.forces,
            seed: request.seed,
            alpha: request.alpha,
          });
          resize(request.count * 2);
          lastPostAt = -Infinity;
          lastProgress = 0;
          stir();
          // Only a warm start may end early; a cold one keeps the schedule.
          restBelow =
            request.restBelow &&
            request.restBelow > 0 &&
            layout.alpha() <= ALPHA.warm
              ? request.restBelow
              : 0;
          break;
        case 'setGraph':
          if (!layout) return;
          // A refused graph throws here and leaves the current one running.
          layout.setGraph(
            { count: request.count, links: request.links, xy: request.xy },
            request.alpha ?? ALPHA.structure,
          );
          generation = request.generation;
          resize(request.count * 2);
          stir();
          break;
        case 'setForces':
          layout?.setForces(request.forces);
          stir();
          break;
        case 'pin':
          layout?.pin(request.index, request.x, request.y);
          stir();
          break;
        case 'unpin':
          layout?.unpin(request.index);
          stir();
          break;
        case 'reheat':
          layout?.reheat(request.alpha);
          stir();
          break;
        case 'setMode':
          mode = request.mode;
          convergeFrom = null;
          wake();
          break;
        case 'returnBuffer':
          if (request.buffer.length === bufferLength && free.length < pool)
            free.push(request.buffer);
          if (dirty) wake();
          break;
        case 'stop':
          halted = true;
          stopRun();
          break;
      }
    } catch (caught) {
      fail(caught);
    }
  };

  return {
    handle,
    dispose() {
      disposed = true;
      stopRun();
      layout = null;
    },
  };
}
