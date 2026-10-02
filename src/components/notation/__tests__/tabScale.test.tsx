// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { fretToMidi, shapeNotes } from '@/lib/guitar/fretboard';
import { buildTab } from '@/lib/notation';
import type { StaffLayout } from '../StaffView';
import { chooseTabScale, TabStaffView } from '../TabStaffView';

// ── How big the TAB is drawn, and when it pages ────────────────────────────

/** One line's height at scale 1 (TabStaffView's SYSTEM_HEIGHT). */
const LINE = 168;

const choose = (
  height: number,
  lines: number | ((scale: number) => number),
  fitsWidth: (scale: number) => boolean = () => true,
  fitHeight = true,
) =>
  chooseTabScale({
    fitHeight,
    height,
    systemHeight: LINE,
    fitsWidth,
    linesAt: typeof lines === 'number' ? () => lines : lines,
  });

describe('chooseTabScale', () => {
  it('draws a one-line step at twice the size when the panel has room', () => {
    expect(choose(600, 1)).toEqual({ scale: 2, paged: false });
  });

  it('takes the largest scale from 2 down to 1 at which every line fits', () => {
    // Two lines in 400px: 2 × 168 × 1.15 = 386.4; at 1.2 they'd need 403.2.
    expect(choose(400, 2)).toEqual({ scale: 1.15, paged: false });
    expect(choose(2 * LINE, 2)).toEqual({ scale: 1, paged: false });
  });

  it('pages instead of shrinking lines that do not all fit, the lines that fit filling the panel', () => {
    // Three lines need 504px at scale 1; the panel has 400. Two fit at 1
    // (336px), drawn at 1.19 they fill it (399.8px): no third line cut off
    // under them.
    expect(choose(400, 3)).toEqual({ scale: 1.19, paged: true });
    // Two lines would fit at 0.85 (285.6px), but not at 1 (336px): page,
    // one line at a time, filling the 300px (1.78 × 168 = 299).
    expect(choose(300, 2)).toEqual({ scale: 1.78, paged: true });
  });

  it('never shows the next line cut off under a paged one (a phone’s TAB)', () => {
    // A phone's 222px TAB: one line at 1 would leave 54px, the top of line 2.
    const { scale, paged } = choose(222, 2);
    expect(paged).toBe(true);
    expect(scale).toBe(1.32);
    expect(LINE * scale).toBeLessThanOrEqual(222);
    expect(222 - LINE * scale).toBeLessThan(LINE * 0.05);
    // The width still decides: the largest step that fits it.
    expect(choose(222, 2, (s) => s <= 1.2)).toEqual({
      scale: 1.17,
      paged: true,
    });
  });

  it('pages below scale 1 only when one line does not fit the panel', () => {
    // 0.85 × 168 = 142.8 fits 150; 0.9 × 168 = 151.2 does not. The line
    // fills the panel as far as it can (0.89 × 168 = 149.5).
    expect(choose(150, 3)).toEqual({ scale: 0.89, paged: true });
    // Nothing fits: the smallest readable scale, still paging.
    expect(choose(100, 3)).toEqual({ scale: 0.85, paged: true });
  });

  it('has nothing to page through on a one-line step', () => {
    expect(choose(150, 1)).toEqual({ scale: 0.85, paged: false });
  });

  it('counts the lines at the scale it tries: bigger scales wrap more', () => {
    // Wider bars at a larger scale: 1 line at 1, 2 lines above 1.5.
    const lines = (scale: number) => (scale > 1.5 ? 2 : 1);
    expect(choose(340, lines)).toEqual({ scale: 1.5, paged: false });
  });

  it('never draws a bar wider than the panel', () => {
    expect(choose(600, 1, (s) => s <= 1.5)).toEqual({
      scale: 1.5,
      paged: false,
    });
    expect(choose(600, 1, (s) => s <= 0.9)).toEqual({
      scale: 0.9,
      paged: false,
    });
    // Held under 1 by the width, two lines still fit the height: no paging.
    expect(choose(400, 2, (s) => s <= 0.9)).toEqual({
      scale: 0.9,
      paged: false,
    });
    // …but three don't (3 × 168 × 0.9 = 453.6).
    expect(choose(400, 3, (s) => s <= 0.9)).toEqual({
      scale: 0.9,
      paged: true,
    });
  });

  it('draws at 1 without a height to fit, smaller only for the width', () => {
    expect(choose(0, 5, () => true, true)).toEqual({ scale: 1, paged: false });
    expect(choose(600, 5, () => true, false)).toEqual({
      scale: 1,
      paged: false,
    });
    expect(choose(600, 5, (s) => s <= 0.9, false)).toEqual({
      scale: 0.9,
      paged: false,
    });
    expect(choose(600, 5, () => false, false)).toEqual({
      scale: 0.85,
      paged: false,
    });
  });
});

// ── The view: a paged TAB turns to the playhead's line ─────────────────────

const Q = 480;
const BAR = 4 * Q;
/** The TAB's box, as the ResizeObserver reports it (tests may change it). */
const PANEL = { width: 400, height: 200 };

const scrollTo = vi.fn();
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => ({
    font: '',
    measureText: (text: string) => ({
      width: text.length * 10,
      fontBoundingBoxAscent: 10,
      fontBoundingBoxDescent: 3,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 3,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 10,
    }),
  })) as unknown as HTMLCanvasElement['getContext'];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe() {
        this.callback(
          [{ contentRect: { ...PANEL } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      disconnect() {}
    },
  );
  HTMLElement.prototype.scrollTo =
    scrollTo as unknown as HTMLElement['scrollTo'];
  // jsdom lays nothing out: the scroll box is the panel's height.
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => PANEL.height,
  });
});
afterAll(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  scrollTo.mockClear();
});

const strums = (bars: number) =>
  Array.from({ length: bars }, (_, bar) =>
    shapeNotes('X-3-2-0-1-0').map(({ position }, i) => ({
      id: `b${bar}n${i}`,
      midi: fretToMidi(position),
      startTick: bar * BAR,
      durationTicks: BAR,
      fretPosition: position,
    })),
  ).flat();

async function view(bars: number, playheadTick: number | null) {
  const score = buildTab(strums(bars), {
    timeSignature: [4, 4],
    minMeasures: bars,
  });
  const onLayout = vi.fn<(layout: StaffLayout | null) => void>();
  const ui = (tick: number | null) => (
    <TabStaffView
      score={score}
      playheadTick={tick}
      fitHeight
      onLayout={onLayout}
    />
  );
  const utils = render(ui(playheadTick));
  await waitFor(
    () => expect(onLayout).toHaveBeenLastCalledWith(expect.anything()),
    { timeout: 5000 },
  );
  const container = screen.getByRole('img', { name: /^Guitar TAB/ })
    .parentElement!.parentElement!;
  return {
    ...utils,
    container,
    layout: () => onLayout.mock.lastCall![0]!,
    rerenderAt: (tick: number | null) => utils.rerender(ui(tick)),
  };
}

describe('TabStaffView paging', () => {
  it('turns to the playhead’s line, keeping it at the top', async () => {
    const { container, layout, rerenderAt } = await view(8, 0);
    expect(container.getAttribute('data-tab-paged')).toBe('true');
    const { measures, scale } = layout();
    // One line a page, drawn to fill the 200px panel (none of line 2 shows).
    expect(scale).toBeGreaterThan(1);
    expect(LINE * scale).toBeLessThanOrEqual(PANEL.height);
    const secondLine = measures.find((m) => m.system === 1)!;
    // Still on the first line, already at the top: nothing to turn.
    expect(scrollTo).not.toHaveBeenCalled();

    rerenderAt(secondLine.startTick + 10);
    expect(scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ top: LINE * scale }),
    );
  });

  it('turns even when the next line is already in view', async () => {
    // 400px tall: the second line shows, but the playhead's line goes to the top.
    PANEL.height = 400;
    try {
      const { container, layout, rerenderAt } = await view(8, 0);
      expect(container.getAttribute('data-tab-paged')).toBe('true');
      const { measures, scale } = layout();
      const second = measures.find((m) => m.system === 1)!;
      // The second line already ends inside the panel.
      expect(2 * LINE * scale).toBeLessThanOrEqual(400);
      rerenderAt(second.startTick + 10);
      expect(scrollTo).toHaveBeenLastCalledWith(
        expect.objectContaining({ top: LINE * scale }),
      );
    } finally {
      PANEL.height = 200;
    }
  });

  it('never turns a TAB whose lines all fit', async () => {
    const { container, rerenderAt } = await view(1, 0);
    expect(container.hasAttribute('data-tab-paged')).toBe(false);
    rerenderAt(BAR / 2);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('draws a flat playhead in the text colour: no teal, no glow', async () => {
    const { container } = await view(1, Q);
    const playhead = container.querySelector<HTMLElement>('.ma-playhead')!;
    expect(playhead.style.background).toBe(
      'var(--ma-playhead, rgba(232, 232, 240, 0.9))',
    );
    expect(playhead.style.width).toBe('2px');
    expect(playhead.style.boxShadow).toBe('');
    expect(container.innerHTML).not.toMatch(/126, ?207, ?207|7ecfcf/i);
  });
});
