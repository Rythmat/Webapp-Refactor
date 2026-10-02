import { useEffect, useMemo, useRef } from 'react';
import {
  ALPHA,
  alignPositions,
  mulberry32,
  placedFraction,
  placeNewNodes,
  SIMULATION,
  WARM_START_COVERAGE,
} from './layout/forceLayout';
import {
  createLayoutClient,
  type LayoutClient,
  type LayoutClientOptions,
} from './layout/layoutClient';
import type { LayoutMode, TickTiming } from './layout/layoutProtocol';
import {
  createPositionCache,
  type PositionCache,
  type PositionSnapshot,
} from './layout/positionCache';
import type { MappedForces } from './model/graphSettings';
import type { RenderGraph } from './model/renderGraph';

/**
 * Cortex's layout, as a React hook: it owns the layout client (the force
 * layout in its Web Worker, or inline where there is no worker) and the
 * position cache, and keeps one array of positions for the canvas to draw.
 *
 * What it lays out is a `RenderGraph`, and which run that graph belongs to
 * is its scope: "global" for the whole Atlas, "local:<id>" for the local
 * graph around one item, or "timelapse:<n>" for a run of "Animate".
 *
 * - A new scope starts a new run. The global graph starts from the
 *   positions it last settled at, kept in memory while the page is open and
 *   in the browser's position cache between visits, so reopening it looks
 *   still: when at least 95% of the nodes have a starting position, the run
 *   begins at the warm alpha, and ends as soon as nothing visibly moves.
 *   Coming back within the page to a global graph that had come to rest,
 *   with nothing changed since, it resumes at rest (`RESTING_ALPHA`), the
 *   picture exactly as it was. A timelapse run starts from nothing
 *   (`timelapseScope`). A
 *   local graph starts from the global graph's positions, shifted so its
 *   focus sits at the centre, at a mild reheat (`LOCAL_START_ALPHA`): its
 *   neighbourhood opens where the global picture had it and draws together
 *   into its own shape within a moment.
 * - Within a scope, a graph whose structural fingerprint is unchanged (a
 *   recolour, a save that touched only fields) changes nothing here: no
 *   reheat, not a tick. A changed structure (a filter, a search, a save that
 *   added a link) goes to the layout as a new graph with the positions its
 *   nodes already had, and the layout reheats to 0.1 (`ALPHA.structure`).
 *   New nodes are placed here first, at the mean of their placed neighbours
 *   (or on a ring outside the cloud when they have none), so the very next
 *   frame already shows them where the layout will move them from, and the
 *   rest barely move.
 * - Changed forces reheat the run (to 0.3; the layout does that).
 * - Under reduced motion (`mode: 'converge'`) the layout runs to rest out of
 *   sight and posts its positions once, at the end. Meanwhile listeners hear
 *   how far it has come (`progress`), for the canvas's "Arranging… N%". A
 *   run that starts cold, or a local graph, shows nothing until then; a warm
 *   start shows its starting positions at once, since they barely move.
 *
 * The global graph's positions are saved to the cache when its run settles
 * and when the page is hidden. Local graphs are not cached: they are cheap
 * to lay out and would push the global graph's entries out of the cache.
 *
 * Positions arrive from the worker up to once a tick. The hook only notes
 * that they changed and tells its listeners; the canvas uploads the latest
 * once per animation frame.
 */

/** What a run is about: the whole Atlas, or the local graph around one item. */
export const GLOBAL_SCOPE = 'global';

/** The scope of the local graph around `focus`. */
export const localScope = (focus: string): string => `local:${focus}`;

/**
 * The scope of one run of the "Animate" timelapse (`TimelapseCanvas`). Each
 * run is a scope of its own, so starting again starts from nothing. A
 * timelapse run starts cold, with no positions at all, and grows: every
 * step hands the layout a bigger graph, as any change of structure does,
 * so the nodes already showing keep their places and the new ones start
 * beside their neighbours. It ticks at most `TIMELAPSE_TICKS_PER_SECOND`,
 * so the graph grows at one pace whatever its size. It is never cached,
 * and leaving it brings back the global graph from the positions kept
 * when the timelapse began.
 */
export const timelapseScope = (run: number): string => `timelapse:${run}`;

/** Whether a scope is a timelapse run's. */
export const isTimelapseScope = (scope: string): boolean =>
  scope.startsWith('timelapse:');

/**
 * How fast a timelapse's layout ticks: once a frame, as Obsidian's does.
 * Left unpaced, a graph of a few dozen nodes would settle between two steps
 * and each step would jump rather than grow.
 */
export const TIMELAPSE_TICKS_PER_SECOND = 60;

/**
 * Where a local graph's run starts: the reheat a slider change gives. Its
 * nodes begin where the global graph had them, centred on the focus, so the
 * neighbourhood opens in place, then it draws together into the local
 * graph's own shape, as Obsidian's local graph does. (Started at the warm
 * alpha, it would stay a cut-out of the global picture, its lines stretched
 * by thousands of nodes that are not there.)
 */
const LOCAL_START_ALPHA = ALPHA.forces;

/** The seed every run uses, so the same graph always lays out the same way. */
const LAYOUT_SEED = 1;

/**
 * Where a global graph resumes when it comes back unchanged to positions it
 * had come to rest at: below the alpha minimum, so the layout counts as
 * settled at once, posts those positions as they are and does not tick.
 * (Started warm instead, the forces would wake at 0.05 and nudge every dot
 * a little before resting again.)
 */
export const RESTING_ALPHA = SIMULATION.alphaMin / 2;

export interface UseLayoutOptions {
  /** What to lay out; nothing happens while it is null. */
  graph: RenderGraph | null;
  /** `GLOBAL_SCOPE`, `localScope(focus)` or `timelapseScope(run)`. */
  scope: string;
  /**
   * The position cache's key for this graph (`layoutSignature`): the global
   * graph's structural filters. Null for a local graph, which is not cached.
   */
  signature: string | null;
  /** The global graph's key, which a local graph starts from. */
  globalSignature: string;
  /** A local graph's focus (its canonical id), to centre its start on. */
  focusId: string | null;
  /** The forces' strengths (`mappedForces`), never slider positions. */
  forces: MappedForces;
  /** `converge` lays the graph out out of sight (reduced motion). */
  mode?: LayoutMode;
  /**
   * The early stop for a warm start, in world units, worked out from where
   * the run starts (see `InitRequest.restBelow`). Asked only of warm starts.
   */
  restBelowFor?(xy: Float32Array): number | undefined;
  /** For tests: how the client is made (an inline engine on a fake clock). */
  clientOptions?: LayoutClientOptions;
  /** For tests: the cache, or null for none. Defaults to IndexedDB's. */
  cache?: PositionCache | null;
}

/** What a listener hears. */
export type LayoutHookEvent =
  | { type: 'start'; warm: boolean }
  | { type: 'positions' }
  /** A converging layout's progress, from 0 to 1 (reduced motion only). */
  | { type: 'progress'; fraction: number }
  | { type: 'settled' };

export interface LayoutStats {
  /** Runs started on this page. */
  starts: number;
  /** Whether the latest run started warm. */
  warm: boolean;
  /** `performance.now()` at the latest run's start, its first positions and its rest. */
  startedAt: number | null;
  firstPositionsAt: number | null;
  settledAt: number | null;
  /** Ticks the layout reported for the latest run. */
  ticks: number;
  /** The alpha the layout last reported (its heat), or null before any. */
  alpha: number | null;
  /** Changes of structure carried over into the latest run (after a save, say). */
  changes: number;
  /** The last thing that went wrong in the layout (a worker that failed), or null. */
  lastError: string | null;
  /**
   * What the latest run's ticks cost, as the engine last said: a running
   * average and the slowest tick in ms, and how many went over the plan's
   * 12 ms target (`TICK_TARGET_MS`). Null before the engine has said.
   */
  tickMs: number | null;
  tickMaxMs: number | null;
  slowTicks: number | null;
  /** How the run is laid out: animated, or worked out out of sight (reduced motion). */
  mode: LayoutMode;
}

export interface LayoutHandle {
  /**
   * The latest positions (x0, y0, x1, y1, … in world units, in the order of
   * the graph's ids), or null before the first. The array may be reused by
   * the next update, so read it rather than keep it.
   */
  positions(): Float32Array | null;
  /** Whether the current run has come to rest. */
  isSettled(): boolean;
  /** Hold a node at a world point (a drag), which keeps the layout warm. */
  pin(index: number, x: number, y: number): void;
  /** Let a held node go. */
  unpin(index: number): void;
  subscribe(listener: (event: LayoutHookEvent) => void): () => void;
  /** Where the layout runs, for the dev hook. */
  runsIn(): 'worker' | 'inline' | 'none';
  stats(): LayoutStats;
}

interface Running {
  scope: string;
  signature: string | null;
  ids: readonly string[];
  fingerprint: string;
}

interface LayoutState {
  client: LayoutClient | null;
  cache: PositionCache | null;
  /** The run in progress, or the one being loaded. */
  running: Running | null;
  /** The client has been started for `running`. */
  started: boolean;
  /** Bumped by every new run, so a slow cache load for an old one is dropped. */
  token: number;
  latest: Float32Array | null;
  settled: boolean;
  /** The global graph's last positions, kept while a local graph shows. */
  global: {
    signature: string;
    ids: readonly string[];
    xy: Float32Array;
    /** Its structure and forces then, and whether it had come to rest. */
    fingerprint: string;
    forcesKey: string;
    settled: boolean;
  } | null;
  forcesKey: string;
  /**
   * The item a drag holds, by id, and where. A change of structure renumbers
   * the layout's nodes and lets go of every pin, so the hold is put back on
   * the same item straight after (a timelapse grows the graph about twelve
   * times a second under a held dot; a save can land mid-drag).
   */
  held: { id: string; x: number; y: number } | null;
  listeners: Set<(event: LayoutHookEvent) => void>;
  stats: LayoutStats;
}

const now = () =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

const forcesKeyOf = (forces: MappedForces) =>
  `${forces.center}|${forces.repel}|${forces.link}|${forces.linkDistance}`;

/** Keep what the engine last said its ticks cost. */
const keepTiming = (stats: LayoutStats, timing: TickTiming | undefined) => {
  if (!timing) return;
  stats.tickMs = timing.tickMs ?? null;
  stats.tickMaxMs = timing.tickMaxMs ?? null;
  stats.slowTicks = timing.slowTicks ?? null;
};

/** The number of nodes in `xy` that have a position. */
const placedCount = (xy: Float32Array) => {
  let placed = 0;
  for (let i = 0; i + 1 < xy.length; i += 2) {
    if (Number.isFinite(xy[i]) && Number.isFinite(xy[i + 1])) placed += 1;
  }
  return placed;
};

export function useLayout(options: UseLayoutOptions): LayoutHandle {
  const latestOptions = useRef(options);
  latestOptions.current = options;

  const state = useRef<LayoutState>({
    client: null,
    cache: null,
    running: null,
    started: false,
    token: 0,
    latest: null,
    settled: false,
    global: null,
    forcesKey: forcesKeyOf(options.forces),
    held: null,
    listeners: new Set(),
    stats: {
      starts: 0,
      warm: false,
      startedAt: null,
      firstPositionsAt: null,
      settledAt: null,
      ticks: 0,
      alpha: null,
      changes: 0,
      lastError: null,
      mode: options.mode ?? 'animate',
      tickMs: null,
      tickMaxMs: null,
      slowTicks: null,
    },
  });

  const emit = (event: LayoutHookEvent) => {
    for (const listener of [...state.current.listeners]) listener(event);
  };

  /** The global graph's positions as they stand, to keep or to save. */
  const globalSnapshot = (): PositionSnapshot | null => {
    const s = state.current;
    const running = s.running;
    if (!running || !running.signature || !s.latest) return null;
    if (running.scope !== GLOBAL_SCOPE || !s.started) return null;
    return { signature: running.signature, ids: running.ids, xy: s.latest };
  };

  const rememberGlobal = () => {
    const snapshot = globalSnapshot();
    const s = state.current;
    if (!snapshot || !s.running) return;
    s.global = {
      signature: snapshot.signature,
      ids: snapshot.ids,
      xy: Float32Array.from(snapshot.xy),
      fingerprint: s.running.fingerprint,
      forcesKey: s.forcesKey,
      settled: s.settled,
    };
  };

  // The client and the cache live as long as the page.
  useEffect(() => {
    const s = state.current;
    const client = createLayoutClient(latestOptions.current.clientOptions);
    const cache =
      latestOptions.current.cache === undefined
        ? createPositionCache()
        : latestOptions.current.cache;
    s.client = client;
    s.cache = cache;

    const unsubscribe = client.subscribe((event) => {
      switch (event.type) {
        case 'positions':
          s.latest = event.positions;
          s.settled = false;
          s.stats.ticks = event.ticks;
          s.stats.alpha = event.alpha;
          keepTiming(s.stats, event.timing);
          s.stats.firstPositionsAt ??= now();
          emit({ type: 'positions' });
          break;
        case 'settled': {
          if (event.positions) s.latest = event.positions;
          s.settled = true;
          s.stats.ticks = event.ticks;
          s.stats.alpha = event.alpha;
          keepTiming(s.stats, event.timing);
          s.stats.settledAt = now();
          const snapshot = globalSnapshot();
          if (snapshot && cache) void cache.save(snapshot);
          emit({ type: 'settled' });
          break;
        }
        case 'progress':
          emit({ type: 'progress', fraction: event.fraction });
          break;
        case 'error':
          // The client has already moved to the inline engine if the worker
          // itself failed; this is kept for the dev hook and smoke tests.
          s.stats.lastError = event.message;
          break;
      }
    });
    const stopSaving = cache?.saveOnPageHide(globalSnapshot) ?? (() => {});

    return () => {
      // Leaving the page keeps where the global graph got to.
      const snapshot = globalSnapshot();
      if (snapshot && cache) void cache.save(snapshot);
      stopSaving();
      unsubscribe();
      client.dispose();
      cache?.close();
      s.client = null;
      s.cache = null;
      s.running = null;
      s.started = false;
      s.token += 1;
    };
    // Built once: everything it reads goes through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { graph, scope } = options;

  // A graph or a scope arrived: start, or carry the run over to it.
  useEffect(() => {
    const s = state.current;
    const client = s.client;
    if (!graph || !client) return;
    const { signature } = latestOptions.current;

    const running = s.running;
    if (running && running.scope === scope) {
      if (running.fingerprint === graph.fingerprint) {
        // Same nodes, same lines: nothing for the layout to do.
        running.ids = graph.ids;
        return;
      }
      if (!s.started) {
        // Still loading the start: it picks up the newest graph itself.
        return;
      }
      // A structural change: the nodes keep the positions they had, new
      // ones start beside their neighbours, and the layout reheats to 0.1.
      const aligned = s.latest
        ? withNewNodesPlaced(
            graph,
            alignPositions(running.ids, s.latest, graph.ids).xy,
            placementSeed(graph.fingerprint),
          )
        : undefined;
      s.running = {
        scope,
        signature,
        ids: graph.ids,
        fingerprint: graph.fingerprint,
      };
      s.latest = aligned ?? null;
      s.settled = false;
      s.stats.changes += 1;
      client.setGraph({ count: graph.count, links: graph.links, xy: aligned });
      // A dot held by a drag stays held, under its new number.
      const held = s.held;
      const again = held ? graph.indexOf.get(held.id as never) : undefined;
      if (held && again !== undefined) client.pin(again, held.x, held.y);
      else s.held = null;
      if (aligned) emit({ type: 'positions' });
      return;
    }

    // A new scope: a new run.
    if (running?.scope === GLOBAL_SCOPE) rememberGlobal();
    client.stop();
    s.held = null;
    s.running = {
      scope,
      signature,
      ids: graph.ids,
      fingerprint: graph.fingerprint,
    };
    s.started = false;
    s.latest = null;
    s.settled = false;
    const token = ++s.token;

    void startingPositions(s, graph, scope, latestOptions.current).then(
      (xy) => {
        if (token !== s.token || !s.client) return;
        const opts = latestOptions.current;
        const current = opts.graph;
        if (!current || !s.running) return;
        // The graph may have moved on while the cache was read.
        const start =
          current === graph
            ? xy
            : alignPositions(graph.ids, xy, current.ids).xy;
        // The global graph starts warm on the layout's own rule
        // (`startAlphaFor`). A local graph starts from where the global
        // graph had its nodes but must still find its own, tighter shape, so
        // it starts at the reheat a slider gives (0.3), never warm. A
        // timelapse run starts cold, from nothing, and is paced.
        const timelapse = isTimelapseScope(scope);
        const local = scope !== GLOBAL_SCOPE && !timelapse;
        const warm =
          !local &&
          current.count > 0 &&
          placedFraction(start, current.count) >= WARM_START_COVERAGE;
        // The global graph coming back unchanged (the same structure,
        // filters and forces) to the positions it had come to rest at
        // resumes at rest: the picture is exactly as it was and the layout
        // does no work. This is how a timelapse, or a visit to a local
        // graph, hands it back.
        const kept = s.global;
        const resting =
          warm &&
          scope === GLOBAL_SCOPE &&
          current === graph &&
          kept !== null &&
          kept.settled &&
          kept.signature === signature &&
          kept.fingerprint === current.fingerprint &&
          kept.forcesKey === forcesKeyOf(opts.forces);
        s.running = {
          ...s.running,
          ids: current.ids,
          fingerprint: current.fingerprint,
        };
        s.started = true;
        // Under reduced motion the layout is worked out out of sight, so a
        // start that would move (cold, or a local graph drawing together) is
        // not shown until the layout posts its rest. A warm start barely
        // moves, so it shows at once.
        const converging = (opts.mode ?? 'animate') === 'converge';
        s.latest =
          placedCount(start) > 0 && (warm || !converging) ? start : null;
        s.stats.starts += 1;
        s.stats.warm = warm;
        s.stats.startedAt = now();
        s.stats.firstPositionsAt = null;
        s.stats.settledAt = null;
        s.stats.ticks = 0;
        s.stats.alpha = null;
        s.stats.changes = 0;
        s.stats.tickMs = null;
        s.stats.tickMaxMs = null;
        s.stats.slowTicks = null;
        s.stats.mode = opts.mode ?? 'animate';
        s.forcesKey = forcesKeyOf(opts.forces);
        s.client.start({
          count: current.count,
          links: current.links,
          xy: start,
          forces: opts.forces,
          seed: LAYOUT_SEED,
          mode: opts.mode ?? 'animate',
          alpha: local
            ? LOCAL_START_ALPHA
            : resting
              ? RESTING_ALPHA
              : undefined,
          maxTicksPerSecond: timelapse ? TIMELAPSE_TICKS_PER_SECOND : undefined,
          restBelow: warm ? opts.restBelowFor?.(start) : undefined,
        });
        emit({ type: 'start', warm });
        if (s.latest) emit({ type: 'positions' });
      },
    );
  }, [graph, scope]);

  // New forces reheat the run in progress.
  const forcesKey = forcesKeyOf(options.forces);
  useEffect(() => {
    const s = state.current;
    if (!s.client || !s.started || s.forcesKey === forcesKey) return;
    s.forcesKey = forcesKey;
    s.settled = false;
    s.client.setForces(latestOptions.current.forces);
  }, [forcesKey]);

  // Reduced motion switches between animating and converging.
  const mode = options.mode ?? 'animate';
  useEffect(() => {
    const s = state.current;
    s.stats.mode = mode;
    if (s.client && s.started) s.client.setMode(mode);
  }, [mode]);

  return useMemo<LayoutHandle>(
    () => ({
      positions: () => state.current.latest,
      isSettled: () => state.current.settled,
      pin(index, x, y) {
        const s = state.current;
        if (!s.started) return;
        s.settled = false;
        const id = s.running?.ids[index];
        s.held = id === undefined ? null : { id, x, y };
        s.client?.pin(index, x, y);
      },
      unpin(index) {
        const s = state.current;
        // Let go of the held item wherever the numbering has put it now.
        const held = s.held;
        s.held = null;
        const now = held
          ? (s.running?.ids.indexOf(held.id as never) ?? -1)
          : -1;
        if (s.started) s.client?.unpin(now >= 0 ? now : index);
      },
      subscribe(listener) {
        const { listeners } = state.current;
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      runsIn: () => state.current.client?.runsIn() ?? 'none',
      stats: () => ({ ...state.current.stats }),
    }),
    [],
  );
}

/**
 * Positions for a graph whose structure just changed: the ones its nodes
 * already had (`aligned`, NaN for new nodes), with every new node placed the
 * way the layout would place it: at the mean of its placed neighbours plus a
 * little seeded jitter, or, for a new group with no placed neighbour, on a
 * ring just outside the cloud. Done on the page rather than left to the
 * layout so the frame drawn before the layout's first tick already has every
 * node in place. A graph with no node placed (nothing laid out yet) is
 * handed back as it is, all NaN, for the layout's own cold start.
 */
export function withNewNodesPlaced(
  graph: Pick<RenderGraph, 'count' | 'links'>,
  aligned: Float32Array,
  seed: number = LAYOUT_SEED,
): Float32Array {
  const placed = placeNewNodes(
    graph.count,
    graph.links,
    aligned,
    mulberry32(seed),
  );
  return Float32Array.from(placed);
}

/**
 * The seed a change of structure places its new nodes with: the layout's
 * seed mixed with a hash (FNV-1a) of the new structure's fingerprint. The
 * same change always places the same way, but successive changes draw
 * differently. With one seed for all of them, every change's first node
 * with no placed neighbour landed at the same angle on the ring outside
 * the cloud, so a run of changes (the steps of a timelapse, or saves that
 * each add an unlinked item) lined up into spokes.
 */
export function placementSeed(fingerprint: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < fingerprint.length; i++) {
    hash = Math.imul(hash ^ fingerprint.charCodeAt(i), 0x01000193);
  }
  return (hash ^ LAYOUT_SEED) >>> 0;
}

/**
 * Where a new run starts: the global graph from its positions kept in
 * memory, else from the cache; a local graph from the global graph's
 * positions, centred on its focus. NaN for every node with none.
 */
async function startingPositions(
  s: LayoutState,
  graph: RenderGraph,
  scope: string,
  options: UseLayoutOptions,
): Promise<Float32Array> {
  // A timelapse grows from nothing.
  if (isTimelapseScope(scope)) {
    return new Float32Array(graph.count * 2).fill(NaN);
  }
  const local = scope !== GLOBAL_SCOPE;
  const signature = local ? options.globalSignature : options.signature;
  const center = local ? (options.focusId ?? undefined) : undefined;
  const kept = s.global;
  if (kept && (local || kept.signature === signature)) {
    return alignPositions(kept.ids, kept.xy, graph.ids, { center }).xy;
  }
  if (s.cache && signature) {
    const warm = await s.cache.load(signature, graph.ids, { center });
    return warm.xy;
  }
  return new Float32Array(graph.count * 2).fill(NaN);
}
