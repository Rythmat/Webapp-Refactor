/**
 * The page's layout client. In node there is no Worker, so it runs the
 * engine inline, which is what jsdom component tests will get too. A fake
 * worker port checks the worker path: copies handed over rather than the
 * caller's arrays, buffers returned, stale generations dropped, and the move
 * to the inline engine when the worker fails.
 */
import { describe, expect, it } from 'vitest';
import { STOCK_FORCES } from '../layout/forceLayout';
import {
  createLayoutClient,
  type LayoutClient,
  type LayoutEvent,
  type LayoutPort,
} from '../layout/layoutClient';
import type { LayoutMessage, LayoutRequest } from '../layout/layoutProtocol';
import { syntheticGraph } from './layoutFixtures';

const GRAPH = syntheticGraph({ nodes: 50, edges: 80, orphans: 3, seed: 9 });

const last = <T>(list: readonly T[]): T => list[list.length - 1];

/** Every event the client sends, and a way to wait for one. */
function record(client: LayoutClient) {
  const events: LayoutEvent[] = [];
  const waiting: { type: LayoutEvent['type']; resolve: () => void }[] = [];
  client.subscribe((event) => {
    events.push(event);
    for (const w of waiting.splice(0)) {
      if (w.type === event.type) w.resolve();
      else waiting.push(w);
    }
  });
  const next = (type: LayoutEvent['type']) =>
    new Promise<void>((resolve) => waiting.push({ type, resolve }));
  return { events, next };
}

const start = (
  client: LayoutClient,
  mode: 'animate' | 'converge' = 'animate',
) =>
  client.start({
    count: GRAPH.count,
    links: GRAPH.links,
    forces: STOCK_FORCES,
    seed: 3,
    mode,
  });

describe('the inline engine (no Worker)', () => {
  it('runs inline, posts positions, then settles', async () => {
    const client = createLayoutClient();
    expect(client.runsIn()).toBe('inline');
    const { events, next } = record(client);
    const linksBefore = GRAPH.links.slice();
    const settled = next('settled');
    start(client);
    await settled;

    const positions = events.filter((e) => e.type === 'positions');
    expect(positions.length).toBeGreaterThan(0);
    const latest = client.positions();
    expect(latest).toHaveLength(GRAPH.count * 2);
    expect(Array.from(latest!).every(Number.isFinite)).toBe(true);
    expect(client.isSettled()).toBe(true);
    // Every event shares the client's one array.
    for (const e of positions) {
      if (e.type === 'positions') expect(e.positions).toBe(latest);
    }
    // The caller's links were copied, not handed over.
    expect(Array.from(GRAPH.links)).toEqual(Array.from(linksBefore));
    client.dispose();
  });

  it('converges out of sight with progress for reduced motion', async () => {
    const client = createLayoutClient({ convergeBudgetMs: 2 });
    const { events, next } = record(client);
    const settled = next('settled');
    start(client, 'converge');
    await settled;
    const types = events.map((e) => e.type);
    expect(types.filter((t) => t === 'positions')).toHaveLength(1);
    expect(types).toContain('progress');
    expect(types.indexOf('progress')).toBeLessThan(types.indexOf('positions'));
    expect(last(types)).toBe('settled');
    client.dispose();
  });

  it('holds a dragged node where it is pinned, and settles once let go', async () => {
    const client = createLayoutClient();
    const { events, next } = record(client);
    let settled = next('settled');
    start(client);
    await settled;

    client.pin(4, 1200, -800);
    expect(client.isSettled()).toBe(false);
    const moved = next('positions');
    await moved;
    await next('positions');
    const held = client.positions()!;
    expect(held[8]).toBe(1200);
    expect(held[9]).toBe(-800);

    settled = next('settled');
    client.unpin(4);
    await settled;
    expect(client.isSettled()).toBe(true);
    expect(events.filter((e) => e.type === 'settled')).toHaveLength(2);
    client.dispose();
  });

  it('takes a new graph and reports positions of the new size', async () => {
    const client = createLayoutClient();
    const { next } = record(client);
    let settled = next('settled');
    start(client);
    await settled;
    const count = GRAPH.count + 1;
    const xy = new Float32Array(count * 2).fill(NaN);
    xy.set(client.positions()!);
    settled = next('settled');
    client.setGraph({
      count,
      links: Uint32Array.from([...GRAPH.links, GRAPH.count, 0]),
      xy,
    });
    expect(client.positions()).toBeNull();
    await settled;
    expect(client.positions()).toHaveLength(count * 2);
    client.dispose();
  });

  it('reports a bad graph as an error event', async () => {
    const client = createLayoutClient();
    const { events, next } = record(client);
    const failed = next('error');
    client.start({
      count: 2,
      links: Uint32Array.from([0, 9]),
      forces: STOCK_FORCES,
      seed: 1,
    });
    await failed;
    expect(events[0]).toMatchObject({ type: 'error' });
    client.dispose();
  });

  it('reports starting positions that do not fit the graph', async () => {
    const client = createLayoutClient();
    const { events, next } = record(client);
    const failed = next('error');
    client.start({
      count: GRAPH.count,
      links: GRAPH.links,
      xy: new Float32Array(4),
      forces: STOCK_FORCES,
      seed: 1,
    });
    await failed;
    expect(events[0]).toMatchObject({ type: 'error' });
    expect(client.positions()).toBeNull();
    client.dispose();
  });

  it('is quiet once disposed', async () => {
    const client = createLayoutClient();
    const { events } = record(client);
    start(client);
    client.dispose();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(events).toHaveLength(0);
    // Calls after dispose are harmless.
    client.reheat(1);
    client.dispose();
  });
});

describe('the worker path', () => {
  function fakeWorker() {
    const sent: { message: LayoutRequest; transfer: ArrayBuffer[] }[] = [];
    let deliver: (message: LayoutMessage) => void = () => {};
    let fail: (reason: string) => void = () => {};
    let terminated = false;
    const port: LayoutPort = {
      post: (message, transfer) => sent.push({ message, transfer }),
      listen(onMessage, onError) {
        deliver = onMessage;
        fail = onError;
      },
      terminate: () => {
        terminated = true;
      },
    };
    return {
      port,
      sent,
      deliver: (message: LayoutMessage) => deliver(message),
      fail: (reason: string) => fail(reason),
      terminated: () => terminated,
    };
  }

  it('hands the worker copies of the graph, never the caller’s arrays', () => {
    const worker = fakeWorker();
    const client = createLayoutClient({ openPort: () => worker.port });
    expect(client.runsIn()).toBe('worker');
    const xy = new Float32Array(GRAPH.count * 2).fill(1);
    client.start({
      count: GRAPH.count,
      links: GRAPH.links,
      xy,
      forces: STOCK_FORCES,
      seed: 3,
    });
    const [{ message, transfer }] = worker.sent;
    expect(message.type).toBe('init');
    if (message.type !== 'init') return;
    expect(message.links).not.toBe(GRAPH.links);
    expect(Array.from(message.links)).toEqual(Array.from(GRAPH.links));
    expect(message.xy).not.toBe(xy);
    expect(transfer).toEqual([message.links.buffer, message.xy.buffer]);
    expect(transfer).not.toContain(GRAPH.links.buffer);
    expect(message).toMatchObject({ generation: 1, seed: 3, mode: 'animate' });
  });

  it('copies positions, returns each buffer, and drops stale generations', () => {
    const worker = fakeWorker();
    const client = createLayoutClient({ openPort: () => worker.port });
    const { events } = record(client);
    start(client);

    const fresh = Float32Array.from({ length: GRAPH.count * 2 }, (_, i) => i);
    worker.deliver({
      type: 'positions',
      generation: 1,
      xy: fresh,
      alpha: 0.5,
      ticks: 3,
    });
    expect(events).toHaveLength(1);
    expect(client.positions()).not.toBe(fresh);
    expect(Array.from(client.positions()!)).toEqual(Array.from(fresh));
    const returned = last(worker.sent);
    expect(returned.message).toEqual({ type: 'returnBuffer', buffer: fresh });
    expect(returned.transfer).toEqual([fresh.buffer]);

    const stale = new Float32Array(GRAPH.count * 2).fill(7);
    worker.deliver({
      type: 'positions',
      generation: 0,
      xy: stale,
      alpha: 0.4,
      ticks: 4,
    });
    expect(events).toHaveLength(1);
    expect(client.positions()![2]).toBe(2);
    expect(last(worker.sent).message).toEqual({
      type: 'returnBuffer',
      buffer: stale,
    });

    worker.deliver({ type: 'settled', generation: 0, alpha: 0, ticks: 9 });
    expect(client.isSettled()).toBe(false);
    worker.deliver({
      type: 'settled',
      generation: 1,
      alpha: 0.0009,
      ticks: 300,
    });
    expect(client.isSettled()).toBe(true);
    expect(last(events)).toMatchObject({ type: 'settled', ticks: 300 });
  });

  it('passes drags, forces, reheats, modes and stop through as messages', () => {
    const worker = fakeWorker();
    const client = createLayoutClient({ openPort: () => worker.port });
    start(client);
    client.pin(2, 10, 20);
    client.unpin(2);
    client.setForces({ ...STOCK_FORCES, repel: -500 });
    client.reheat(0.3);
    client.setMode('converge');
    client.stop();
    expect(worker.sent.slice(1).map((s) => s.message)).toEqual([
      { type: 'pin', index: 2, x: 10, y: 20 },
      { type: 'unpin', index: 2 },
      { type: 'setForces', forces: { ...STOCK_FORCES, repel: -500 } },
      { type: 'reheat', alpha: 0.3 },
      { type: 'setMode', mode: 'converge' },
      { type: 'stop' },
    ]);
  });

  it('moves to the inline engine when the worker fails, from the last positions', async () => {
    const worker = fakeWorker();
    const client = createLayoutClient({ openPort: () => worker.port });
    const { events, next } = record(client);
    start(client);
    const where = new Float32Array(GRAPH.count * 2);
    for (let i = 0; i < where.length; i++) where[i] = (i % 7) * 100 - 300 + i;
    worker.deliver({
      type: 'positions',
      generation: 1,
      xy: where,
      alpha: 0.02,
      ticks: 120,
    });

    const settled = next('settled');
    worker.fail('The layout worker stopped.');
    expect(worker.terminated()).toBe(true);
    expect(client.runsIn()).toBe('inline');
    expect(events).toContainEqual({
      type: 'error',
      message: 'The layout worker stopped.',
    });
    await settled;
    expect(client.isSettled()).toBe(true);
    // It carried on from where the worker was, at the alpha it had reached.
    const settledEvent = events.find((e) => e.type === 'settled');
    expect(settledEvent).toMatchObject({ type: 'settled' });
    if (settledEvent?.type === 'settled')
      expect(settledEvent.ticks).toBeLessThan(200);
    client.dispose();
  });

  it('runs inline when the worker cannot be opened', () => {
    const client = createLayoutClient({
      openPort: () => {
        throw new Error('refused');
      },
    });
    expect(client.runsIn()).toBe('inline');
    client.dispose();
    expect(createLayoutClient({ openPort: null }).runsIn()).toBe('inline');
  });

  it('stops and closes the worker on dispose, then ignores it', () => {
    const worker = fakeWorker();
    const client = createLayoutClient({ openPort: () => worker.port });
    const { events } = record(client);
    start(client);
    client.dispose();
    expect(last(worker.sent).message).toEqual({ type: 'stop' });
    expect(worker.terminated()).toBe(true);
    worker.deliver({
      type: 'positions',
      generation: 1,
      xy: new Float32Array(GRAPH.count * 2),
      alpha: 1,
      ticks: 1,
    });
    expect(events).toHaveLength(0);
  });
});
