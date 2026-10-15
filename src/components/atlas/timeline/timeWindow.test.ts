import { describe, expect, it } from 'vitest';
import { MUSICAL_ERAS, eraWindow } from '@/components/atlas/data/musicalEras';
import {
  DEFAULT_WINDOW,
  DOMAIN,
  MIN_SPAN,
  clampWindow,
  ensureVisible,
  eraOfWindow,
  inWindow,
  panBy,
  railSegments,
  railToYear,
  sameWindow,
  windowLabel,
  yearToRail,
  zoomAt,
} from './timeWindow';

const THIS_YEAR = new Date().getFullYear();

describe('time windows', () => {
  it('opens on the twentieth century to now', () => {
    expect(DEFAULT_WINDOW).toEqual({ from: 1900, to: THIS_YEAR });
    expect(DOMAIN.from).toBe(500);
  });

  it('keeps a window inside the domain and its span within limits', () => {
    // Past the end: slid back so it ends this year, span kept.
    expect(clampWindow({ from: 2020, to: 2200 })).toEqual({
      from: THIS_YEAR - 180,
      to: THIS_YEAR,
    });
    expect(clampWindow({ from: 1950, to: 1951 })).toEqual({
      from: 1950,
      to: 1950 + MIN_SPAN,
    });
    expect(clampWindow({ from: 0, to: 5000 })).toEqual(DOMAIN);
  });

  it('zooms about an anchor that stays put', () => {
    const w = { from: 1900, to: 2000 };
    const zoomed = zoomAt(w, 1950, 0.5);
    expect(zoomed).toEqual({ from: 1925, to: 1975 });
    const atEdge = zoomAt(w, 1900, 0.5);
    expect(atEdge.from).toBe(1900);
    expect(zoomAt(w, 1950, 0.001).to - zoomAt(w, 1950, 0.001).from).toBe(
      MIN_SPAN,
    );
  });

  it('pans without leaving the domain', () => {
    expect(panBy({ from: 1900, to: 2000 }, 10)).toEqual({
      from: 1910,
      to: 2010,
    });
    expect(panBy({ from: 600, to: 700 }, -500).from).toBe(DOMAIN.from);
  });

  it('pans the least to bring a year into view', () => {
    const w = { from: 1950, to: 1990 };
    expect(ensureVisible(w, 1970)).toBe(w);
    const moved = ensureVisible(w, 2000);
    expect(moved.to - moved.from).toBe(40);
    expect(moved.to).toBeCloseTo(2004);
  });

  it('compares and labels windows in whole years', () => {
    expect(
      sameWindow({ from: 1946.2, to: 1979.4 }, { from: 1946, to: 1979 }),
    ).toBe(true);
    expect(sameWindow(null, null)).toBe(true);
    expect(sameWindow(null, { from: 1, to: 2 })).toBe(false);
    expect(windowLabel({ from: 1946, to: 1979 })).toBe('1946–1979');
    expect(windowLabel({ from: 2000, to: THIS_YEAR })).toBe('2000–present');
  });

  it('knows a window that is exactly an era', () => {
    const postwar = MUSICAL_ERAS.find((e) => e.id === 'postwar')!;
    expect(eraOfWindow(eraWindow(postwar))).toBe(postwar);
    expect(eraOfWindow({ from: 1950, to: 1960 })).toBeUndefined();
    expect(eraOfWindow(null)).toBeUndefined();
  });

  it('lets every year through no window', () => {
    expect(inWindow(null, 590)).toBe(true);
    expect(inWindow({ from: 1946, to: 1979 }, 1979)).toBe(true);
    expect(inWindow({ from: 1946, to: 1979 }, 1980)).toBe(false);
  });
});

describe('the era rail scale', () => {
  // Roughly the bundled events per era.
  const counts = [12, 23, 42, 78, 637, 424, 509];
  const segments = railSegments(counts);

  it('covers the rail end to end, in era order', () => {
    expect(segments[0].x0).toBe(0);
    expect(segments.at(-1)!.x1).toBe(1);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].x0).toBeCloseTo(segments[i - 1].x1);
    }
  });

  it('gives every era at least the floor and the busy ones more', () => {
    for (const s of segments) expect(s.x1 - s.x0).toBeGreaterThan(0.05);
    const width = (id: string) => {
      const s = segments.find((x) => x.era.id === id)!;
      return s.x1 - s.x0;
    };
    expect(width('postwar')).toBeGreaterThan(width('ancient') * 3);
  });

  it('maps years to the rail and back', () => {
    for (const year of [500, 900, 1500, 1820, 1946, 1975, 1999, 2010]) {
      expect(railToYear(yearToRail(year, segments), segments)).toBeCloseTo(
        year,
        6,
      );
    }
    expect(yearToRail(100, segments)).toBe(0);
    expect(yearToRail(3000, segments)).toBe(1);
  });

  it('is monotonic', () => {
    let last = -1;
    for (let year = 500; year <= THIS_YEAR; year += 7) {
      const x = yearToRail(year, segments);
      expect(x).toBeGreaterThanOrEqual(last);
      last = x;
    }
  });
});
