import { describe, expect, it } from 'vitest';
import {
  bandPath,
  centerAt,
  fitLaneHeight,
  halfAt,
  layoutRiver,
  type RiverLaneSpec,
} from './riverLayout';

// A small tree: a source, a lane above it from 1900, one below from 1950,
// and a merge of the two in 1970 laid out between them.
const SPECS: RiverLaneSpec[] = [
  { id: 'up', label: 'Up', born: 1900, parent: 'src', inflows: [] },
  {
    id: 'merge',
    label: 'Merge',
    born: 1970,
    parent: 'src',
    inflows: [
      { from: 'down', year: 1970 },
      { from: 'up', year: 1985 },
    ],
  },
  { id: 'src', label: 'Source', born: 1800, parent: null, inflows: [] },
  { id: 'down', label: 'Down', born: 1950, parent: 'src', inflows: [] },
];
const OPTIONS = {
  height: 400,
  laneHeight: 40,
  gap: 10,
  rampYears: 10,
  domain: { from: 1800, to: 2020 },
};

describe('the river layout', () => {
  const layout = layoutRiver(SPECS, OPTIONS);

  it('grows the source from a point at the domain’s start', () => {
    expect(halfAt(layout, 'src', 1800)).toBe(0);
    expect(halfAt(layout, 'src', 1810)).toBe(20);
    expect(centerAt(layout, 'src', 1850)).toBe(200);
  });

  it('starts a newborn lane on its parent’s centre line, at no thickness', () => {
    expect(centerAt(layout, 'up', 1900)).toBeCloseTo(
      centerAt(layout, 'src', 1900)!,
    );
    expect(halfAt(layout, 'up', 1900)).toBe(0);
    expect(centerAt(layout, 'up', 1899)).toBeNull();
  });

  it('stacks the grown lanes in order, centred, a lane and a gap apart', () => {
    const at = (id: string) => centerAt(layout, id, 2000)!;
    expect(at('up')).toBeLessThan(at('merge'));
    expect(at('merge')).toBeLessThan(at('src'));
    expect(at('src')).toBeLessThan(at('down'));
    expect(at('merge') - at('up')).toBeCloseTo(50);
    expect(at('down') - at('src')).toBeCloseTo(50);
    // Four lanes and three gaps (190 px), centred in 400: from 105.
    expect(at('up') - 20).toBeCloseTo(105);
  });

  it('widens as lanes are born: a delta', () => {
    const width = (year: number) => {
      const centers = layout.lanes
        .map((l) => centerAt(layout, l.id, year))
        .filter((c): c is number => c !== null);
      return Math.max(...centers) - Math.min(...centers);
    };
    expect(width(1850)).toBe(0);
    expect(width(1925)).toBeCloseTo(50);
    expect(width(2000)).toBeCloseTo(150);
  });

  it('draws inflows from their source to where the lane has grown', () => {
    const birth = layout.inflows.find((f) => f.from === 'down')!;
    expect(birth.points[0]).toBe(1960);
    expect(birth.points[6]).toBe(1980);
    expect(birth.points[7]).toBeCloseTo(centerAt(layout, 'merge', 1980)!);
    const later = layout.inflows.find((f) => f.from === 'up')!;
    expect(later.points[0]).toBe(1975);
    expect(later.points[6]).toBe(1985);
  });

  it('leaves out lanes born after the domain', () => {
    const late = layoutRiver(
      [
        ...SPECS,
        { id: 'late', label: 'L', born: 2100, parent: 'src', inflows: [] },
      ],
      OPTIONS,
    );
    expect(late.lanes.map((l) => l.id)).not.toContain('late');
  });

  it('draws a band as one closed path in year space', () => {
    const path = bandPath(layout.lanes.find((l) => l.id === 'down')!);
    expect(path.startsWith('M1950,')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });
});

describe('fitLaneHeight', () => {
  it('shares the height among every lane, within limits', () => {
    expect(fitLaneHeight(SPECS, 300, 10)).toBeCloseTo((300 - 48 - 30) / 4);
    expect(fitLaneHeight(SPECS, 2000, 10)).toBe(72);
    expect(fitLaneHeight(SPECS, 100, 10)).toBe(18);
  });
});
