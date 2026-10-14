import { describe, expect, it } from 'vitest';
import { laneAt, lanePaths, layoutFan, type FanLane } from './placeLayout';

const lane = (id: string, ancestors: string[] = []): FanLane => ({
  id,
  depth: ancestors.length + 1,
  ancestors,
  color: '#ffffff',
  colorEnd: '#eeeeee',
  parentColor: '#000000',
});

const OPTIONS = {
  width: 1200,
  height: 500,
  gap: 10,
  maxLane: 120,
  minLane: 20,
  stages: [150, 240, 330] as const,
  sourceShare: 0.35,
};

describe('the place river’s fan', () => {
  it('stacks four continents, centred, as thick as they can be', () => {
    const fan = layoutFan(
      ['a', 'b', 'c', 'd'].map((id) => lane(id)),
      OPTIONS,
    );
    expect(fan.thickness).toBe(OPTIONS.height / 4 - 7.5);
    const ys = fan.lanes.map((l) => l.y);
    expect(ys[1] - ys[0]).toBeCloseTo(fan.thickness + 10);
    expect((ys[0] + ys[3]) / 2).toBeCloseTo(250);
    // No split deeper than the first: the years start after it.
    expect(fan.plotLeft).toBe(162);
  });

  it('never spills over its height, closing gaps and then thinning lanes', () => {
    const many = Array.from({ length: 30 }, (_, i) => lane(`l${i}`));
    const fan = layoutFan(many, OPTIONS);
    const first = fan.lanes[0];
    const last = fan.lanes.at(-1)!;
    expect(first.y - fan.thickness / 2).toBeGreaterThanOrEqual(-0.001);
    expect(last.y + fan.thickness / 2).toBeLessThanOrEqual(
      OPTIONS.height + 0.001,
    );
  });

  it('caps a lane’s thickness', () => {
    expect(layoutFan([lane('a')], OPTIONS).thickness).toBe(120);
  });

  it('carries split lanes together to their parent’s height, then apart', () => {
    const fan = layoutFan(
      [lane('na', ['am']), lane('sa', ['am']), lane('eu')],
      OPTIONS,
    );
    const [na, sa] = fan.lanes;
    expect(na.stops[1]).toBeCloseTo(sa.stops[1]);
    expect(na.stops[1]).toBeCloseTo((na.y + sa.y) / 2);
    expect(na.stops[2]).toBe(na.y);
    expect(fan.plotLeft).toBe(252);
  });

  it('leaves the source thin and grows to full thickness at the last split', () => {
    const g = layoutFan([lane('a')], OPTIONS).lanes[0];
    const stages = [0, ...OPTIONS.stages];
    const atSource = laneAt(g.stops, stages, 1, g.thickness, 0.35, 0);
    expect(atSource.y).toBe(250);
    expect(atSource.t).toBeCloseTo(g.thickness * 0.35);
    expect(laneAt(g.stops, stages, 1, g.thickness, 0.35, 150).t).toBe(
      g.thickness,
    );
  });

  it('draws the fan, the run and the strand', () => {
    const fan = layoutFan([lane('a'), lane('b')], OPTIONS);
    const paths = lanePaths(fan.lanes[0], fan.stages, 0.35, 1300);
    expect(paths.fan.startsWith('M0.0,')).toBe(true);
    expect(paths.run).toContain('L1300.0,');
    // The strand stops where the run begins (the first split, at 150).
    expect(paths.strand.endsWith(`L150.0,${fan.lanes[0].y.toFixed(1)}`)).toBe(
      true,
    );
    expect(paths.strand).not.toContain('L1300.0');
  });
});
