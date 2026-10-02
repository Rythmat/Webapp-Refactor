import { describe, expect, it } from 'vitest';
import type { GraphEdge } from '@/content/graph/types';
import { graphFacets } from '../model/facets';
import {
  buildRenderGraph,
  DEFAULT_RENDER_FILTERS,
  NODE_ORPHAN,
  neighboursOf,
  type RenderGraph,
} from '../model/renderGraph';
import { planTimelapse, planTimelapseFromYears } from '../model/timelapse';
import {
  gatherPerNode,
  revealGraph,
  TIMELAPSE_DURATION_MS,
  TIMELAPSE_MAX_STEP_MS,
  TIMELAPSE_MIN_STEP_MS,
  timelapseStepMs,
  timelapseSteps,
  timelapseYear,
} from '../model/timelapseGraph';
import { ATLAS } from './queryFixture';

/**
 * What the timelapse draws at each step, over the fixture Atlas with every
 * tag and the curriculum drawn: the batches so far and only the lines whose
 * ends are both showing, each dot weighed by what shows, growing step by
 * step into exactly the whole graph.
 */

const edges: GraphEdge[] = [...new Set([...ATLAS.adjacency.values()].flat())];
const full = buildRenderGraph(
  { nodes: ATLAS.nodes, edges },
  { ...DEFAULT_RENDER_FILTERS, tags: true, curriculum: true },
);
const plan = planTimelapse({
  ids: full.ids,
  links: full.links,
  facets: graphFacets(ATLAS),
});
const steps = plan.batches.map((_, b) => revealGraph(full, plan, b));

/** Each line as "a|b" by id, so graphs numbered differently compare. */
const linesById = (g: RenderGraph) => {
  const out: string[] = [];
  for (let l = 0; l < g.linkCount; l++) {
    out.push(`${g.ids[g.links[2 * l]]}|${g.ids[g.links[2 * l + 1]]}`);
  }
  return out.sort();
};

describe('revealGraph', () => {
  it('starts with the first year’s batch and only its own lines', () => {
    const first = steps[0].graph;
    expect(plan.batches[0].year).toBe(1959);
    expect([...first.ids].sort()).toEqual(
      [...plan.batches[0].nodes].map((i) => full.ids[i]).sort(),
    );
    expect(first.ids).toContain('song:so_what');
    expect(first.ids).not.toContain('song:africa');
    for (const line of linesById(first)) {
      const [a, b] = line.split('|');
      expect(first.ids).toContain(a);
      expect(first.ids).toContain(b);
    }
  });

  it('shows a line exactly when both its ends show', () => {
    for (const { graph } of steps) {
      const shown = new Set<string>(graph.ids);
      const expected = linesById(full).filter((line) => {
        const [a, b] = line.split('|');
        return shown.has(a) && shown.has(b);
      });
      expect(linesById(graph)).toEqual(expected);
    }
  });

  it('only ever adds: every node keeps its number, every line its place', () => {
    for (let b = 1; b < steps.length; b++) {
      const before = steps[b - 1].graph;
      const now = steps[b].graph;
      expect(now.count).toBeGreaterThan(before.count);
      // The step before, with the new nodes and lines added at the end.
      expect(now.ids.slice(0, before.count)).toEqual(before.ids);
      expect(Array.from(now.links.subarray(0, before.links.length))).toEqual(
        Array.from(before.links),
      );
      expect(Array.from(steps[b].source)).toEqual(
        now.ids.map((id) => full.indexOf.get(id)),
      );
    }
    // In the order they appeared: So What (1959) comes before Toto (1977).
    const last = steps[steps.length - 1].graph;
    expect(last.indexOf.get('song:so_what' as never)!).toBeLessThan(
      last.indexOf.get('artist:toto' as never)!,
    );
  });

  it('weighs each dot by the lines showing, so dots grow as links arrive', () => {
    for (const { graph } of steps) {
      for (let i = 0; i < graph.count; i++) {
        const around = neighboursOf(graph, i);
        expect(graph.weights[i]).toBe(around.length);
        for (const j of around) expect(neighboursOf(graph, j)).toContain(i);
        expect(Boolean(graph.flags[i] & NODE_ORPHAN)).toBe(
          graph.weights[i] === 0,
        );
        expect(graph.indexOf.get(graph.ids[i])).toBe(i);
      }
    }
    // Toto arrives in 1977 with no song yet, and has his songs by 1982.
    const at = (year: number) =>
      steps[plan.batches.findIndex((b) => b.year === year)].graph;
    const totoIn = (g: RenderGraph) =>
      g.weights[g.indexOf.get('artist:toto' as never)!];
    expect(totoIn(at(1982))).toBeGreaterThan(totoIn(at(1977)));
  });

  it('ends as the whole graph', () => {
    const last = steps[steps.length - 1].graph;
    expect([...last.ids].sort()).toEqual([...full.ids].sort());
    expect(linesById(last)).toEqual(linesById(full));
    for (let k = 0; k < last.count; k++) {
      const i = full.indexOf.get(last.ids[k])!;
      expect(last.weights[k]).toBe(full.weights[i]);
      expect(last.kinds[k]).toBe(full.kinds[i]);
      expect(last.nodes[k]).toBe(full.nodes[i]);
    }
    // Each line keeps its flags and which end comes first.
    const flagsById = (g: RenderGraph) =>
      new Map(
        Array.from({ length: g.linkCount }, (_, l) => [
          `${g.ids[g.links[2 * l]]}|${g.ids[g.links[2 * l + 1]]}`,
          g.linkFlags[l],
        ]),
      );
    expect(flagsById(last)).toEqual(flagsById(full));
  });

  it('is a new structure at every step, and the same one for the same step', () => {
    const prints = steps.map((s) => s.graph.fingerprint);
    expect(new Set(prints).size).toBe(prints.length);
    for (const print of prints) expect(print).not.toBe(full.fingerprint);
    expect(revealGraph(full, plan, 2).graph.fingerprint).toBe(prints[2]);
    // Past the end is the last step; before the start is nothing.
    expect(revealGraph(full, plan, 99).batch).toBe(steps.length - 1);
    expect(revealGraph(full, plan, -5).graph.count).toBe(0);
  });

  it('picks each step’s colours out of the whole graph’s', () => {
    const rgba = new Uint8Array(full.count * 4);
    for (let i = 0; i < full.count; i++) rgba.set([i, 2 * i, 3, 255], 4 * i);
    const { graph, source } = steps[1];
    const picked = gatherPerNode(rgba, source, 4);
    expect(picked).toBeInstanceOf(Uint8Array);
    for (let k = 0; k < graph.count; k++) {
      const i = full.indexOf.get(graph.ids[k])!;
      expect(Array.from(picked.subarray(4 * k, 4 * k + 4))).toEqual([
        i,
        2 * i,
        3,
        255,
      ]);
    }
  });
});

describe('the timelapse’s pace', () => {
  it('takes about 30 seconds, about ten steps a second for the Atlas', () => {
    expect(timelapseStepMs(300)).toBe(100);
    expect(300 * timelapseStepMs(300)).toBe(TIMELAPSE_DURATION_MS);
    expect(timelapseStepMs(240) * 240).toBe(TIMELAPSE_DURATION_MS);
  });

  it('never steps faster than 20 or slower than 4 a second', () => {
    expect(timelapseStepMs(5)).toBe(TIMELAPSE_MAX_STEP_MS);
    expect(timelapseStepMs(5000)).toBe(TIMELAPSE_MIN_STEP_MS);
    expect(timelapseStepMs(0)).toBe(TIMELAPSE_MAX_STEP_MS);
  });

  it('takes a step per dated batch, then one for everything left undated', () => {
    const N = Number.NaN;
    // Two 1990 batches, a 2000 one, then three batches of leftovers.
    const many = planTimelapseFromYears([1990, 1990, 2000, N, N, N, N, N], [], {
      batchSize: 2,
    });
    expect(many.batches.map((b) => b.year)).toEqual([
      1990,
      2000,
      null,
      null,
      null,
    ]);
    expect(Array.from(timelapseSteps(many))).toEqual([0, 1, 4]);
    // The last step shows every node.
    expect(Array.from(timelapseSteps(plan))).toEqual([0, 1, 2, 3, 4]);
    const undated = planTimelapseFromYears([N, N, N], [], { batchSize: 1 });
    expect(Array.from(timelapseSteps(undated))).toEqual([2]);
    expect(Array.from(timelapseSteps(planTimelapseFromYears([], [])))).toEqual(
      [],
    );
  });

  it('counts the years, and shows the last for the undated end', () => {
    expect(plan.batches.map((_, b) => timelapseYear(plan, b))).toEqual([
      1959, 1977, 1981, 1982, 1982,
    ]);
    expect(plan.batches[plan.batches.length - 1].year).toBeNull();
  });
});
