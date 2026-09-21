import { describe, expect, it } from 'vitest';
import {
  A4_PORTRAIT,
  LETTER_PORTRAIT,
  PX_PER_INCH,
  contentHeight,
  contentWidth,
  fitScale,
  pageScale,
  pageTops,
  paginate,
  uniformSystemNeed,
} from '../pageLayout';

describe('the page', () => {
  it('is US Letter at 96 pixels to the inch', () => {
    expect(LETTER_PORTRAIT.width).toBe(8.5 * PX_PER_INCH);
    expect(LETTER_PORTRAIT.height).toBe(11 * PX_PER_INCH);
  });

  it('keeps the three-quarter-inch margin the print stylesheet uses', () => {
    expect(LETTER_PORTRAIT.margin).toBe(0.75 * PX_PER_INCH);
  });

  it('leaves seven inches of staff across the page', () => {
    expect(contentWidth(LETTER_PORTRAIT)).toBe(7 * PX_PER_INCH);
  });

  it('leaves nine and a half inches down it', () => {
    expect(contentHeight(LETTER_PORTRAIT)).toBe(9.5 * PX_PER_INCH);
  });

  it('is taller and narrower on A4', () => {
    expect(A4_PORTRAIT.width).toBeLessThan(LETTER_PORTRAIT.width);
    expect(A4_PORTRAIT.height).toBeGreaterThan(LETTER_PORTRAIT.height);
  });

  it('has room for four bars at a readable width', () => {
    // The renderer will not draw a bar narrower than 90px.
    expect(contentWidth(LETTER_PORTRAIT) / 4).toBeGreaterThan(90);
  });
});

describe('scaling the page to the screen', () => {
  const page = LETTER_PORTRAIT;

  it('fits the page exactly to the space it is given', () => {
    expect(pageScale(page.width, page)).toBe(1);
    expect(pageScale(page.width / 2, page)).toBeCloseTo(0.5);
  });

  it('shrinks on a narrow window and grows on a wide one', () => {
    expect(pageScale(600, page)).toBeLessThan(1);
    expect(pageScale(1000, page)).toBeGreaterThan(1);
  });

  it('refuses to shrink the notation away', () => {
    expect(pageScale(50, page)).toBe(0.4);
  });

  it('refuses to blow it up past a readable size', () => {
    expect(pageScale(5000, page)).toBe(1.4);
  });

  it('survives a container that has not been measured yet', () => {
    expect(pageScale(0, page)).toBe(1);
    expect(pageScale(Number.NaN, page)).toBe(1);
  });

  it('honours limits it is given', () => {
    expect(pageScale(5000, page, { max: 1 })).toBe(1);
  });
});

describe('laying systems onto pages', () => {
  const page = LETTER_PORTRAIT;
  const gap = 24;

  it('puts as many systems on a page as will fit', () => {
    // 9.5in of content at 200px a system is 4 systems per page.
    const { systems, pageCount } = paginate(4, 200, page, gap);
    expect(systems.map((s) => s.page)).toEqual([0, 0, 0, 0]);
    expect(pageCount).toBe(1);
  });

  it('starts a new page rather than splitting a system across one', () => {
    const { systems, pageCount } = paginate(6, 200, page, gap);
    expect(systems.map((s) => s.page)).toEqual([0, 0, 0, 0, 1, 1]);
    expect(pageCount).toBe(2);
  });

  it('stacks systems down a page from the top margin', () => {
    const { systems } = paginate(3, 200, page, gap);
    expect(systems[0].y).toBe(page.margin);
    expect(systems[1].y).toBe(page.margin + 200);
    expect(systems[2].y).toBe(page.margin + 400);
  });

  it('starts each page below the one before it', () => {
    const { systems } = paginate(6, 200, page, gap);
    expect(systems[4].y).toBe(page.height + gap + page.margin);
  });

  it('never leaves a page empty, even for a giant system', () => {
    const { systems, pageCount } = paginate(2, 5000, page, gap);
    expect(systems.map((s) => s.page)).toEqual([0, 1]);
    expect(pageCount).toBe(2);
  });

  it('is one page when there is nothing to show', () => {
    const { pageCount, systems } = paginate(0, 200, page, gap);
    expect(pageCount).toBe(1);
    expect(systems).toEqual([]);
  });

  it('measures the whole scroll including the gaps between pages', () => {
    const { totalHeight } = paginate(6, 200, page, gap);
    expect(totalHeight).toBe(page.height * 2 + gap);
  });

  it('gives a top for every page', () => {
    expect(pageTops(3, page, gap)).toEqual([
      0,
      page.height + gap,
      (page.height + gap) * 2,
    ]);
  });

  it('keeps every system inside its own page', () => {
    const systemHeight = 180;
    const { systems } = paginate(20, systemHeight, page, gap);
    for (const system of systems) {
      const top = system.y - system.page * (page.height + gap);
      expect(top).toBeGreaterThanOrEqual(page.margin);
      expect(top + systemHeight).toBeLessThanOrEqual(
        page.height - page.margin + 1,
      );
    }
  });
});

describe('shrinking the notation to fit a system', () => {
  const room = contentWidth(LETTER_PORTRAIT); // 672px

  it('leaves a system that already fits alone', () => {
    expect(fitScale(400, room)).toBe(1);
    expect(fitScale(room, room)).toBe(1);
  });

  it('shrinks just enough for a system that overflows', () => {
    // A system needing twice the page shrinks to half size.
    expect(fitScale(room * 2, room)).toBeCloseTo(0.5);
  });

  it('shrinks a crowded four-bar system rather than letting it run off', () => {
    // Four bars of sixteenths asking ~1000px on a 672px page.
    const scale = fitScale(1000, room);
    expect(scale).toBeLessThan(1);
    expect(1000 * scale).toBeCloseTo(room);
  });

  it('stops before the music becomes unreadable', () => {
    expect(fitScale(room * 100, room)).toBe(0.45);
  });

  it('honours a floor it is given', () => {
    expect(fitScale(room * 4, room, 0.3)).toBeCloseTo(0.3);
  });

  it('survives degenerate input', () => {
    expect(fitScale(0, room)).toBe(1);
    expect(fitScale(500, 0)).toBe(1);
    expect(fitScale(Number.NaN, room)).toBe(1);
  });

  it('is the scale that makes the need exactly fill the room', () => {
    // Up to the point where the floor takes over: room / 0.45 is ~1493px.
    for (const need of [700, 800, 1200, 1400]) {
      expect(need * fitScale(need, room)).toBeCloseTo(room);
    }
  });

  it('lets a system run wide once shrinking it further would be unreadable', () => {
    const need = 2000;
    expect(fitScale(need, room)).toBe(0.45);
    expect(need * 0.45).toBeGreaterThan(room);
  });
});

describe('what a system of uniform bars needs', () => {
  const room = contentWidth(LETTER_PORTRAIT); // 672px

  it('is the busiest bar times the bar count', () => {
    // Three sparse bars and one full of sixteenths: all four take 300.
    expect(uniformSystemNeed([90, 90, 300, 90])).toBe(1200);
  });

  it('asks for more than the bars would take separately', () => {
    const bars = [90, 90, 300, 90];
    const proportional = bars.reduce((a, b) => a + b, 0);
    expect(uniformSystemNeed(bars)).toBeGreaterThan(proportional);
  });

  it('counts the header too', () => {
    expect(uniformSystemNeed([100, 100], 60)).toBe(260);
  });

  it('is just the header when there are no bars', () => {
    expect(uniformSystemNeed([], 60)).toBe(60);
  });

  it('matches the plain sum when every bar is equally busy', () => {
    const bars = [150, 150, 150, 150];
    expect(uniformSystemNeed(bars)).toBe(600);
  });

  it('shrinks the score so uniform bars fit the page', () => {
    // The bar of sixteenths sets the size for all four.
    const need = uniformSystemNeed([90, 90, 300, 90], 60);
    const scale = fitScale(need, room);
    expect(scale).toBeLessThan(1);
    // Every bar then lands at the same width, four to the system.
    const barWidth = (room - 60 * scale) / 4;
    expect(barWidth * 4 + 60 * scale).toBeCloseTo(room);
  });

  it('leaves a system alone when uniform bars already fit', () => {
    expect(fitScale(uniformSystemNeed([90, 90, 90, 90], 60), room)).toBe(1);
  });
});

describe('a page break forces a new page', () => {
  const page = LETTER_PORTRAIT;
  const gap = 24;

  it('moves the marked system onto the next page', () => {
    // Four systems fit a page; break before the second anyway.
    const { systems, pageCount } = paginate(4, 200, page, gap, new Set([1]));
    expect(systems.map((s) => s.page)).toEqual([0, 1, 1, 1]);
    expect(pageCount).toBe(2);
  });

  it('puts the broken system at the top of its page', () => {
    const { systems } = paginate(3, 200, page, gap, new Set([1]));
    expect(systems[1].y).toBe(page.height + gap + page.margin);
  });

  it('still starts a new page when one fills up', () => {
    const { systems } = paginate(6, 200, page, gap, new Set([1]));
    // 0 | 1,2,3,4 | 5 — the second page fills and spills.
    expect(systems.map((s) => s.page)).toEqual([0, 1, 1, 1, 1, 2]);
  });

  it('ignores a break on the very first system', () => {
    const { pageCount } = paginate(3, 200, page, gap, new Set([0]));
    expect(pageCount).toBe(1);
  });

  it('is unchanged when nothing is forced', () => {
    const plain = paginate(6, 200, page, gap);
    const forced = paginate(6, 200, page, gap, new Set());
    expect(forced).toEqual(plain);
  });
});
