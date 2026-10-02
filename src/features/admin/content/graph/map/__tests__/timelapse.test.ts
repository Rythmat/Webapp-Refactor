import { describe, expect, it } from 'vitest';
import { graphFacets } from '../model/facets';
import {
  TIMELAPSE_BATCH_SIZE,
  earliestYears,
  planTimelapse,
  planTimelapseFromYears,
  type TimelapsePlan,
} from '../model/timelapse';
import { ATLAS, EDGES, IDS } from './queryFixture';

const N = Number.NaN;

/** Each batch as [year, node indices]. */
const shape = (plan: TimelapsePlan) =>
  plan.batches.map((b) => [b.year, [...b.nodes]]);

/** Every node in exactly one batch, every link where its later end is. */
function expectConsistent(
  plan: TimelapsePlan,
  count: number,
  links: readonly number[],
) {
  const seen = plan.batches.flatMap((b) => [...b.nodes]).sort((a, b) => a - b);
  expect(seen).toEqual(Array.from({ length: count }, (_, i) => i));
  plan.batches.forEach((batch, b) => {
    for (const i of batch.nodes) expect(plan.nodeBatch[i]).toBe(b);
    for (const l of batch.links) expect(plan.linkBatch[l]).toBe(b);
  });
  for (let l = 0; l < links.length / 2; l++) {
    expect(plan.linkBatch[l]).toBe(
      Math.max(plan.nodeBatch[links[2 * l]], plan.nodeBatch[links[2 * l + 1]]),
    );
  }
}

describe('planTimelapseFromYears', () => {
  it('orders by year, brings undated nodes with their first neighbour, and leaves the rest to the end', () => {
    const years = [1990, N, 1960, 1975, N, N];
    // 0–1, 2–3, 1–4; node 5 has no links.
    const links = [0, 1, 2, 3, 1, 4];
    const plan = planTimelapseFromYears(years, links);
    expect(shape(plan)).toEqual([
      [1960, [2]],
      [1975, [3]],
      // 1 comes with 0, and 4 with 1.
      [1990, [0, 1, 4]],
      [null, [5]],
    ]);
    expect([...plan.linkBatch]).toEqual([2, 1, 2]);
    expect(plan.batches.map((b) => [...b.links])).toEqual([
      [],
      [1],
      [0, 2],
      [],
    ]);
    expect(plan.firstYear).toBe(1960);
    expect(plan.lastYear).toBe(1990);
    expectConsistent(plan, years.length, links);
  });

  it('brings an undated node with the earlier of its dated neighbours', () => {
    const plan = planTimelapseFromYears([2000, 1950, N], [0, 2, 1, 2]);
    expect(shape(plan)).toEqual([
      [1950, [1, 2]],
      [2000, [0]],
    ]);
    // 0–2 waits for 0; 1–2 shows with both.
    expect([...plan.linkBatch]).toEqual([1, 0]);
  });

  it('does not reveal a dated node early through an undated one', () => {
    // 0 (1950) – 1 (undated) – 2 (1980).
    const plan = planTimelapseFromYears([1950, N, 1980], [0, 1, 1, 2]);
    expect(shape(plan)).toEqual([
      [1950, [0, 1]],
      [1980, [2]],
    ]);
  });

  it('breaks ties within a year by index', () => {
    const plan = planTimelapseFromYears([1970, 1970, 1960], [], {
      batchSize: 1,
    });
    expect(shape(plan)).toEqual([
      [1960, [2]],
      [1970, [0]],
      [1970, [1]],
    ]);
  });

  it('splits a busy year into batches, never across years', () => {
    const years = [1980, 1980, 1980, 1980, 1980, 1981, 1981];
    const plan = planTimelapseFromYears(years, [], { batchSize: 2 });
    expect(shape(plan)).toEqual([
      [1980, [0, 1]],
      [1980, [2, 3]],
      [1980, [4]],
      [1981, [5, 6]],
    ]);
  });

  it('keeps a dated node and what it brings in one batch, however big', () => {
    // 1 brings 2, 3 and 4 with it.
    const years = [1980, 1980, N, N, N, 1980];
    const links = [1, 2, 1, 3, 1, 4];
    const plan = planTimelapseFromYears(years, links, { batchSize: 2 });
    expect(shape(plan)).toEqual([
      [1980, [0]],
      [1980, [1, 2, 3, 4]],
      [1980, [5]],
    ]);
    expectConsistent(plan, years.length, links);
  });

  it('packs the undated leftovers too, a linked cluster together', () => {
    const years = [N, N, N, N];
    const links = [0, 3];
    const plan = planTimelapseFromYears(years, links, { batchSize: 2 });
    expect(shape(plan)).toEqual([
      [null, [0, 3]],
      [null, [1, 2]],
    ]);
    expect(plan.firstYear).toBeNull();
    expect(plan.lastYear).toBeNull();
  });

  it('copes with nothing, self-links and links out of range', () => {
    expect(planTimelapseFromYears([], []).batches).toEqual([]);
    const plan = planTimelapseFromYears([1970, 1980], [0, 0, 0, 7, 1, 0]);
    expect([...plan.linkBatch]).toEqual([0, -1, 1]);
    expect(plan.batches.map((b) => [...b.links])).toEqual([[0], [2]]);
  });

  it('packs to the default batch size', () => {
    const years = Array.from({ length: 100 }, () => 1990);
    const plan = planTimelapseFromYears(years, []);
    expect(plan.batches.map((b) => b.nodes.length)).toEqual([
      TIMELAPSE_BATCH_SIZE,
      TIMELAPSE_BATCH_SIZE,
      TIMELAPSE_BATCH_SIZE,
      100 - 3 * TIMELAPSE_BATCH_SIZE,
    ]);
  });
});

describe('planTimelapse over the fixture Atlas', () => {
  const facets = graphFacets(ATLAS);
  const links = EDGES.flatMap(([from, , to]) => [
    IDS.indexOf(from),
    IDS.indexOf(to),
  ]);
  const plan = planTimelapse({ ids: IDS, links, facets });
  const yearOf = (id: string) =>
    plan.batches[plan.nodeBatch[IDS.indexOf(id)]].year;

  it('dates nodes by their earliest year', () => {
    const years = earliestYears(IDS, facets);
    expect(years[IDS.indexOf('artist:toto')]).toBe(1977);
    expect(years[IDS.indexOf('song:africa')]).toBe(1982);
    expect(years[IDS.indexOf('year:1959')]).toBe(1959);
    expect(Number.isNaN(years[IDS.indexOf('place:detroit')])).toBe(true);
  });

  it('runs from the earliest year to the latest, then the leftovers', () => {
    expect(plan.batches.map((b) => b.year)).toEqual([
      1959,
      1977,
      1981,
      1982,
      null,
    ]);
    expect(plan.firstYear).toBe(1959);
    expect(plan.lastYear).toBe(1982);
  });

  it('shows each node in its year or with its first neighbour', () => {
    expect(yearOf('song:so_what')).toBe(1959);
    expect(yearOf('event:evt-motown-founded')).toBe(1959);
    // Undated: with Motown, and with So What.
    expect(yearOf('place:detroit')).toBe(1959);
    expect(yearOf('artist:miles-davis')).toBe(1959);
    expect(yearOf('artist:toto')).toBe(1977);
    expect(yearOf('artist:beyonce')).toBe(1981);
    expect(yearOf('genre:hip-hop')).toBe(1981);
    expect(yearOf('song:africa')).toBe(1982);
    expect(yearOf('key:c')).toBe(1982);
    expect(yearOf('teach_day:unit-1-day-1')).toBe(1982);
    // Linked to nothing dated.
    expect(yearOf('artist:loner')).toBeNull();
    expect(yearOf('place:london')).toBeNull();
    expect(yearOf('place:region-europe')).toBeNull();
  });

  it('shows each link once both ends are visible', () => {
    expectConsistent(plan, IDS.length, links);
  });
});
