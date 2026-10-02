import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphEdge } from '@/content/graph/types';
import { graphFacets } from '../model/facets';
import { buildRenderGraph, DEFAULT_RENDER_FILTERS } from '../model/renderGraph';
import {
  TIMELAPSE_HOLD_MS,
  TIMELAPSE_MAX_STEP_MS,
} from '../model/timelapseGraph';
import {
  createTimelapsePlayer,
  type TimelapseEnd,
  type TimelapseSnapshot,
} from '../timelapsePlayer';
import { ATLAS } from './queryFixture';

/**
 * The timelapse's clock on a fake timer: it shows the first year at once,
 * steps one batch at a time at its pace, holds the finished picture, and
 * ends by itself; Stop ends it at once; starting again starts a new run.
 */

const edges: GraphEdge[] = [...new Set([...ATLAS.adjacency.values()].flat())];
const graph = buildRenderGraph(
  { nodes: ATLAS.nodes, edges },
  { ...DEFAULT_RENDER_FILTERS, tags: true, curriculum: true },
);
const facets = graphFacets(ATLAS);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function record() {
  const player = createTimelapsePlayer();
  const seen: TimelapseSnapshot[] = [];
  const ends: TimelapseEnd[] = [];
  player.subscribe(() => seen.push(player.getSnapshot()));
  player.onEnd((end) => ends.push(end));
  return { player, seen, ends };
}

describe('the timelapse player', () => {
  it('plays every year in order, holds the end, then ends by itself', () => {
    const { player, seen, ends } = record();
    const first = player.start(graph, facets);
    expect(first?.status).toBe('playing');
    expect(first?.batch).toBe(0);
    expect(first?.year).toBe(1959);
    const batches = first!.plan!.batches.length;
    // Five batches: each step shows for the slowest step there is.
    expect(batches).toBe(5);
    expect(first!.stepMs).toBe(TIMELAPSE_MAX_STEP_MS);

    vi.advanceTimersByTime(first!.stepMs * (batches - 1));
    expect(player.getSnapshot().batch).toBe(batches - 1);
    expect(seen.map((s) => s.year)).toEqual([1959, 1977, 1981, 1982, 1982]);
    expect(seen.map((s) => s.progress)).toEqual([0.2, 0.4, 0.6, 0.8, 1]);

    vi.advanceTimersByTime(first!.stepMs);
    expect(player.getSnapshot().status).toBe('holding');
    expect(ends).toEqual([]);

    vi.advanceTimersByTime(TIMELAPSE_HOLD_MS - 1);
    expect(player.getSnapshot().status).toBe('holding');
    vi.advanceTimersByTime(1);
    expect(player.getSnapshot().status).toBe('idle');
    expect(player.getSnapshot().graph).toBeNull();
    expect(ends).toEqual(['finished']);
    // Nothing more happens.
    vi.advanceTimersByTime(60_000);
    expect(ends).toEqual(['finished']);
  });

  it('shows everything left undated in one last step', () => {
    const { player, seen } = record();
    const first = player.start(graph, facets)!;
    expect(first.steps).toBe(5);
    vi.advanceTimersByTime(first.stepMs * 4);
    const last = seen[seen.length - 1];
    expect(last.step).toBe(4);
    expect(last.batch).toBe(first.plan!.batches.length - 1);
    expect(first.plan!.batches[last.batch].year).toBeNull();
    expect(last.year).toBe(1982);
  });

  it('stops at once, once', () => {
    const { player, ends } = record();
    const first = player.start(graph, facets)!;
    vi.advanceTimersByTime(first.stepMs * 2);
    expect(player.getSnapshot().year).toBe(1981);
    player.stop();
    player.stop();
    expect(player.getSnapshot().status).toBe('idle');
    expect(ends).toEqual(['stopped']);
    vi.advanceTimersByTime(60_000);
    expect(player.getSnapshot().status).toBe('idle');
    expect(ends).toEqual(['stopped']);
  });

  it('starts a new run, from the first year, when started again', () => {
    const { player } = record();
    const one = player.start(graph, facets)!;
    vi.advanceTimersByTime(one.stepMs * 3);
    const two = player.start(graph, facets)!;
    expect(two.run).toBe(one.run + 1);
    expect(two.batch).toBe(0);
    expect(two.year).toBe(1959);
    vi.advanceTimersByTime(two.stepMs);
    expect(player.getSnapshot().batch).toBe(1);
  });

  it('has nothing to play for an empty graph', () => {
    const { player, seen } = record();
    const empty = buildRenderGraph({ nodes: new Map(), edges: [] });
    expect(player.start(empty, facets)).toBeNull();
    expect(player.getSnapshot().status).toBe('idle');
    expect(seen).toEqual([]);
  });

  it('forgets everything when disposed', () => {
    const { player, seen, ends } = record();
    player.start(graph, facets);
    const heard = seen.length;
    player.dispose();
    vi.advanceTimersByTime(60_000);
    expect(seen.length).toBe(heard);
    expect(ends).toEqual([]);
    expect(player.getSnapshot().status).toBe('idle');
  });
});
