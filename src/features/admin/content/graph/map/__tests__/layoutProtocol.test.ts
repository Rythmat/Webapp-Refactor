/**
 * The layout engine behind the worker, driven in node by a fake clock and a
 * fake scheduler: positions about every 16 ms on two buffers
 * that go back and forth, the final positions then `settled`, converging
 * out of sight with progress for reduced motion, drags, stop and resume,
 * new graphs, pacing, and errors reported rather than thrown.
 */
import { describe, expect, it } from 'vitest';
import { createForceLayout, STOCK_FORCES } from '../layout/forceLayout';
import {
  createLayoutEngine,
  mayHoldPositions,
  POST_INTERVAL_MS,
  PROGRESS_INTERVAL_MS,
  REST_AFTER_TICKS,
  transferListOf,
  type InitRequest,
  type LayoutMessage,
  type LayoutRequest,
  type PositionsMessage,
} from '../layout/layoutProtocol';
import { syntheticGraph } from './layoutFixtures';

const GRAPH = syntheticGraph({ nodes: 60, edges: 90, orphans: 4, seed: 5 });

/** The item `back` places from the end (1 is the last). */
const fromEnd = <T>(list: readonly T[], back = 1): T =>
  list[list.length - back];

interface Posted {
  message: LayoutMessage;
  transfer: ArrayBuffer[];
  at: number;
}

/**
 * An engine on a fake clock. Every reading of the clock moves it on by a
 * millisecond, so ticking takes time; scheduled tasks run in time order.
 * Positions buffers go back to the engine as a page would return them, a
 * moment later, unless `keepBuffers` holds them.
 */
function harness({ keepBuffers = false, returnAfterMs = 0 } = {}) {
  let clock = 0;
  let order = 0;
  const tasks: { at: number; order: number; run: () => void; live: boolean }[] =
    [];
  const posts: Posted[] = [];
  const held: Float32Array[] = [];
  const later = (run: () => void, delayMs = 0) => {
    const task = { at: clock + delayMs, order: order++, run, live: true };
    tasks.push(task);
    return () => {
      task.live = false;
    };
  };
  const engine = createLayoutEngine({
    post: (message, transfer) => {
      posts.push({ message, transfer, at: clock });
      if (message.type !== 'positions') return;
      if (keepBuffers) held.push(message.xy);
      else
        later(
          () => engine.handle({ type: 'returnBuffer', buffer: message.xy }),
          returnAfterMs,
        );
    },
    schedule: later,
    now: () => (clock += 1),
  });
  /** Run tasks until none are left (or `limit` have run). */
  const drain = (limit = 100_000) => {
    let ran = 0;
    for (;;) {
      const live = tasks.filter((t) => t.live);
      if (live.length === 0 || ran >= limit) return ran;
      live.sort((a, b) => a.at - b.at || a.order - b.order);
      const next = live[0];
      next.live = false;
      tasks.splice(tasks.indexOf(next), 1);
      clock = Math.max(clock, next.at);
      next.run();
      ran += 1;
    }
  };
  const of = <T extends LayoutMessage['type']>(type: T) =>
    posts
      .filter((p) => p.message.type === type)
      .map((p) => ({
        ...p,
        message: p.message as Extract<LayoutMessage, { type: T }>,
      }));
  const pending = () => tasks.filter((t) => t.live).length;
  return {
    engine,
    posts,
    held,
    drain,
    of,
    pending,
    time: () => clock,
  };
}

const init = (overrides: Partial<InitRequest> = {}): InitRequest => ({
  type: 'init',
  generation: 1,
  count: GRAPH.count,
  links: GRAPH.links.slice(),
  xy: new Float32Array(GRAPH.count * 2).fill(NaN),
  forces: STOCK_FORCES,
  seed: 42,
  mode: 'animate',
  ...overrides,
});

describe('animating', () => {
  it('posts positions about every 16 ms, then the final positions and settled', () => {
    const h = harness();
    h.engine.handle(init());
    h.drain();

    const positions = h.of('positions');
    expect(positions.length).toBeGreaterThan(10);
    // Short ticks (a millisecond on this clock): a post at most one tick
    // before the 16 ms are up, never sooner.
    for (let k = 1; k < positions.length; k++) {
      expect(positions[k].at - positions[k - 1].at).toBeGreaterThanOrEqual(
        POST_INTERVAL_MS - 2,
      );
    }
    const last = fromEnd(h.posts, 1);
    const beforeLast = fromEnd(h.posts, 2);
    expect(last.message).toMatchObject({ type: 'settled', generation: 1 });
    expect(beforeLast.message.type).toBe('positions');
    expect(h.of('settled')).toHaveLength(1);
    const final = beforeLast.message as PositionsMessage;
    expect(final.alpha).toBeLessThan(0.001);
    expect(final.ticks).toBe(300);

    // The engine ticks exactly as the layout does on its own.
    const direct = createForceLayout({
      count: GRAPH.count,
      links: GRAPH.links,
      xy: init().xy,
      forces: STOCK_FORCES,
      seed: 42,
    });
    direct.settle();
    expect(Array.from(final.xy)).toEqual(Array.from(direct.positions()));
  });

  it('holds positions back only while one more tick still fits in the frame', () => {
    // A tick of 4 ms after a post at 0: hold at 8 and 12 (the next tick is
    // done by 16), post at 16.
    expect(mayHoldPositions(0, 8 + 4)).toBe(true);
    expect(mayHoldPositions(0, 12 + 4)).toBe(true);
    expect(mayHoldPositions(0, 16 + 4)).toBe(false);
    // A tick of 11.7 ms (the Atlas with Tags on): post after every tick,
    // not every second one 23.4 ms apart.
    expect(mayHoldPositions(0, 11.7 + 11.7)).toBe(false);
    // A tick longer than a frame: post after each.
    expect(mayHoldPositions(0, 20 + 20)).toBe(false);
    // Nothing posted yet: post at once.
    expect(mayHoldPositions(Number.NEGATIVE_INFINITY, 5)).toBe(false);
  });

  it('hands over each positions buffer, and never uses more than two', () => {
    // Buffers that come straight back: one is enough.
    const quick = harness();
    quick.engine.handle(init());
    quick.drain();
    expect(new Set(quick.of('positions').map((p) => p.message.xy)).size).toBe(
      1,
    );
    for (const p of quick.of('positions')) {
      expect(p.transfer).toEqual([p.message.xy.buffer]);
      expect(p.message.xy).toHaveLength(GRAPH.count * 2);
    }
    // Buffers held past the next post: the second one comes into play, and
    // no third.
    const slow = harness({ returnAfterMs: 40 });
    slow.engine.handle(init());
    slow.drain();
    expect(new Set(slow.of('positions').map((p) => p.message.xy)).size).toBe(2);
    expect(fromEnd(slow.posts).message.type).toBe('settled');
  });

  it('waits for a buffer to come back before posting again', () => {
    const h = harness({ keepBuffers: true });
    h.engine.handle(init());
    h.drain();
    expect(h.of('positions')).toHaveLength(2);
    expect(h.of('settled')).toHaveLength(0);
    expect(h.pending()).toBe(0);

    h.engine.handle({ type: 'returnBuffer', buffer: h.held[0] });
    h.drain();
    expect(h.of('positions')).toHaveLength(3);
    expect(fromEnd(h.posts, 1).message.type).toBe('settled');
    expect(
      (fromEnd(h.posts, 2).message as PositionsMessage).alpha,
    ).toBeLessThan(0.001);
  });

  it('paces ticks when given a rate', () => {
    const h = harness();
    h.engine.handle(init({ maxTicksPerSecond: 60 }));
    const started = h.time();
    h.drain();
    const settled = h.of('settled')[0];
    expect(settled.message.ticks).toBe(300);
    // 300 ticks at 60 a second take about five seconds.
    const seconds = (settled.at - started) / 1000;
    expect(seconds).toBeGreaterThan(4.7);
    expect(seconds).toBeLessThan(5.6);
  });
});

describe('converging (reduced motion)', () => {
  it('reports progress, then posts the settled positions once', () => {
    const h = harness();
    h.engine.handle(init({ mode: 'converge' }));
    h.drain();
    const progress = h.of('progress');
    expect(progress.length).toBeGreaterThan(2);
    for (let k = 1; k < progress.length; k++) {
      expect(progress[k].message.fraction).toBeGreaterThanOrEqual(
        progress[k - 1].message.fraction,
      );
      expect(progress[k].at - progress[k - 1].at).toBeGreaterThanOrEqual(
        PROGRESS_INTERVAL_MS,
      );
    }
    for (const p of progress) {
      expect(p.message.fraction).toBeGreaterThanOrEqual(0);
      expect(p.message.fraction).toBeLessThanOrEqual(1);
    }
    expect(h.of('positions')).toHaveLength(1);
    expect(fromEnd(h.posts, 2).message.type).toBe('positions');
    expect(fromEnd(h.posts, 1).message.type).toBe('settled');
  });

  it('animates a drag even while converging', () => {
    const h = harness();
    h.engine.handle(init({ mode: 'converge' }));
    h.drain();
    const before = h.of('positions').length;
    h.engine.handle({ type: 'pin', index: 3, x: 500, y: -500 });
    h.drain(40);
    const during = h.of('positions').slice(before);
    expect(during.length).toBeGreaterThan(1);
    for (const p of during) {
      expect(p.message.xy[6]).toBe(500);
      expect(p.message.xy[7]).toBe(-500);
    }
    h.engine.handle({ type: 'unpin', index: 3 });
    const afterRelease = h.of('positions').length;
    h.drain();
    // Let go, it converges out of sight again and posts once at rest.
    expect(h.of('positions').length).toBe(afterRelease + 1);
    expect(fromEnd(h.posts, 1).message.type).toBe('settled');
  });

  it('switches to animating mid-way when asked', () => {
    const h = harness();
    h.engine.handle(init({ mode: 'converge' }));
    h.drain(3);
    expect(h.of('positions')).toHaveLength(0);
    h.engine.handle({ type: 'setMode', mode: 'animate' });
    h.drain();
    expect(h.of('positions').length).toBeGreaterThan(3);
  });
});

describe('changes', () => {
  it('stops on request, and resumes on the next change that moves the layout', () => {
    const h = harness();
    h.engine.handle(init());
    h.drain(5);
    h.engine.handle({ type: 'stop' });
    const posted = h.posts.length;
    h.drain();
    // Only the buffers already on their way back are handled.
    expect(h.posts.length).toBe(posted);
    expect(h.of('settled')).toHaveLength(0);

    h.engine.handle({ type: 'reheat', alpha: 0.3 });
    h.drain();
    expect(h.of('settled')).toHaveLength(1);
  });

  it('reheats on new forces and settles again', () => {
    const h = harness();
    h.engine.handle(init());
    h.drain();
    h.engine.handle({
      type: 'setForces',
      forces: { ...STOCK_FORCES, repel: -1500 },
    });
    h.drain();
    const settled = h.of('settled');
    expect(settled).toHaveLength(2);
    // From 0.3 down to the minimum is about 248 ticks.
    expect(settled[1].message.ticks).toBeGreaterThan(240);
    expect(settled[1].message.ticks).toBeLessThan(260);
  });

  it('takes a new graph as a new generation, with buffers of the new size', () => {
    const h = harness();
    h.engine.handle(init());
    h.drain();
    const old = fromEnd(h.of('positions'), 1).message.xy;
    const count = GRAPH.count + 2;
    const xy = new Float32Array(count * 2).fill(NaN);
    xy.set(old);
    h.engine.handle({
      type: 'setGraph',
      generation: 2,
      count,
      links: Uint32Array.from([...GRAPH.links, GRAPH.count, 0, count - 1, 1]),
      xy,
    });
    // A buffer of the old size coming back is simply dropped.
    h.engine.handle({ type: 'returnBuffer', buffer: new Float32Array(4) });
    h.drain();
    const fresh = h.of('positions').filter((p) => p.message.generation === 2);
    expect(fresh.length).toBeGreaterThan(0);
    for (const p of fresh) expect(p.message.xy).toHaveLength(count * 2);
    expect(fromEnd(h.posts, 1).message).toMatchObject({
      type: 'settled',
      generation: 2,
    });
    // A structural reheat starts from 0.1: about 200 ticks.
    expect(fromEnd(h.of('settled'), 1).message.ticks).toBeLessThanOrEqual(205);
  });

  it('ignores changes before the first graph', () => {
    const h = harness();
    h.engine.handle({ type: 'pin', index: 0, x: 0, y: 0 });
    h.engine.handle({ type: 'reheat', alpha: 1 });
    h.engine.handle({
      type: 'setGraph',
      generation: 1,
      count: 1,
      links: new Uint32Array(0),
      xy: new Float32Array(2),
    });
    h.drain();
    expect(h.posts).toHaveLength(0);
  });

  it('reports a bad graph as an error message instead of throwing', () => {
    const h = harness();
    expect(() =>
      h.engine.handle(
        init({
          count: 2,
          links: Uint32Array.from([0, 5]),
          xy: new Float32Array(4),
        }),
      ),
    ).not.toThrow();
    expect(h.posts).toHaveLength(1);
    expect(h.posts[0].message.type).toBe('error');
    expect((h.posts[0].message as { message: string }).message).toMatch(
      /node 5/,
    );
  });

  it('drops the old layout when a new graph is refused', () => {
    const h = harness();
    h.engine.handle(init());
    h.drain(3);
    h.engine.handle(
      init({
        generation: 2,
        count: 2,
        links: Uint32Array.from([0, 5]),
        xy: new Float32Array(4),
      }),
    );
    const posted = h.posts.length;
    h.drain();
    // Nothing more runs, under either generation.
    expect(h.posts.length).toBe(posted);
    expect(fromEnd(h.posts).message.type).toBe('error');
  });

  it('keeps the current graph running when a new one is refused', () => {
    const h = harness();
    h.engine.handle(init());
    h.drain(3);
    h.engine.handle({
      type: 'setGraph',
      generation: 2,
      count: 2,
      links: Uint32Array.from([0, 9]),
      xy: new Float32Array(4),
    });
    h.drain();
    expect(h.of('error')).toHaveLength(1);
    expect(h.of('positions').every((p) => p.message.generation === 1)).toBe(
      true,
    );
    expect(fromEnd(h.posts).message).toMatchObject({
      type: 'settled',
      generation: 1,
    });
  });

  it('does nothing once disposed', () => {
    const h = harness();
    h.engine.handle(init());
    h.engine.dispose();
    h.drain();
    h.engine.handle(init());
    h.drain();
    expect(h.posts).toHaveLength(0);
  });
});

describe('a warm start that ends early (owner decision, 1 Oct)', () => {
  /** A settled layout of the graph, to start warm from. */
  const settledXy = () => {
    const layout = createForceLayout({
      count: GRAPH.count,
      links: GRAPH.links,
      forces: STOCK_FORCES,
      seed: 42,
    });
    layout.settle();
    return layout.positions();
  };
  const ticksToSettle = (overrides: Partial<InitRequest>) => {
    const h = harness();
    h.engine.handle(init(overrides));
    h.drain();
    const settled = h.of('settled');
    expect(settled).toHaveLength(1);
    return settled[0].message.ticks;
  };

  it('stops once nothing moves more than restBelow for ten ticks in a row', () => {
    const xy = settledXy();
    // Obsidian's schedule from 0.05 down to 0.001 is 170 ticks.
    const full = ticksToSettle({ xy: xy.slice() });
    expect(full).toBeGreaterThanOrEqual(169);
    const early = ticksToSettle({ xy: xy.slice(), restBelow: 0.5 });
    expect(early).toBeGreaterThanOrEqual(REST_AFTER_TICKS);
    expect(early).toBeLessThan(full / 2);
  });

  it('keeps Obsidian’s schedule on a cold start, whatever restBelow says', () => {
    expect(ticksToSettle({ restBelow: 1e9 })).toBe(ticksToSettle({}));
  });

  it('keeps the schedule once anything stirs the layout after the start', () => {
    const xy = settledXy();
    const h = harness();
    h.engine.handle(init({ xy: xy.slice(), restBelow: 1e9 }));
    // A slider moves before the first tick: the run is no longer a warm start.
    h.engine.handle({ type: 'setForces', forces: STOCK_FORCES });
    h.drain();
    const settled = h.of('settled');
    expect(settled).toHaveLength(1);
    expect(settled[0].message.ticks).toBeGreaterThan(REST_AFTER_TICKS * 10);
  });
});

describe('transfer lists', () => {
  it('hands over the typed arrays a message carries, and nothing else', () => {
    const request = init();
    expect(transferListOf(request)).toEqual([
      request.links.buffer,
      request.xy.buffer,
    ]);
    const buffer = new Float32Array(2);
    expect(transferListOf({ type: 'returnBuffer', buffer })).toEqual([
      buffer.buffer,
    ]);
    const plain: LayoutRequest[] = [
      { type: 'stop' },
      { type: 'pin', index: 0, x: 1, y: 2 },
      { type: 'setForces', forces: STOCK_FORCES },
    ];
    for (const message of plain) expect(transferListOf(message)).toEqual([]);
  });
});
