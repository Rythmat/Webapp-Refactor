// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  PAINT_MARGIN,
  needsRepaint,
  paintRect,
  preparePaintCanvas,
  sizeHitSurface,
  type PaintedWindow,
} from '../viewportCanvas';

// ── Viewport-sized piano-roll canvases (pianoroll-05) ───────────────────────

const M = PAINT_MARGIN;

describe('paintRect', () => {
  it('grows the view by the margin on every side', () => {
    expect(
      paintRect({ x: 1000, y: 500, w: 800, h: 300 }, 20_000, 3000),
    ).toEqual({ x: 1000 - M, y: 500 - M, w: 800 + 2 * M, h: 300 + 2 * M });
  });

  it('stays inside the content', () => {
    expect(paintRect({ x: 0, y: 0, w: 800, h: 300 }, 900, 400)).toEqual({
      x: 0,
      y: 0,
      w: 900,
      h: 400,
    });
    expect(
      paintRect({ x: 19_500, y: 2900, w: 800, h: 300 }, 20_000, 3000),
    ).toEqual({ x: 19_500 - M, y: 2900 - M, w: 500 + M, h: 100 + M });
  });
});

describe('needsRepaint', () => {
  const painted: PaintedWindow = {
    rect: { x: 1000 - M, y: 500 - M, w: 800 + 2 * M, h: 300 + 2 * M },
    contentW: 20_000,
    contentH: 3000,
  };
  const view = (x: number, y: number) => ({ x, y, w: 800, h: 300 });

  it('paints a lane that has never painted', () => {
    expect(needsRepaint(undefined, view(0, 0))).toBe(true);
  });

  it('leaves a small scroll to the margin it already painted', () => {
    expect(needsRepaint(painted, view(1000, 500))).toBe(false);
    expect(needsRepaint(painted, view(1000 + M / 4, 500 - M / 4))).toBe(false);
  });

  it('repaints before the view reaches a painted edge', () => {
    expect(needsRepaint(painted, view(1000 + M * 0.6, 500))).toBe(true);
    expect(needsRepaint(painted, view(1000, 500 - M * 0.6))).toBe(true);
  });

  it('repaints when part of the view is unpainted', () => {
    expect(needsRepaint(painted, view(5000, 500))).toBe(true);
    expect(needsRepaint(painted, { x: 1000, y: 500, w: 2000, h: 300 })).toBe(
      true,
    );
  });

  it('never repaints for an edge that is the content’s own', () => {
    const atStart: PaintedWindow = {
      rect: { x: 0, y: 0, w: 800 + M, h: 300 + M },
      contentW: 20_000,
      contentH: 3000,
    };
    expect(needsRepaint(atStart, view(0, 0))).toBe(false);
  });
});

describe('the two canvases', () => {
  it('gives the hit surface the content size and no bitmap', () => {
    const canvas = document.createElement('canvas');
    sizeHitSurface(canvas, 40_960, 876);
    expect([canvas.width, canvas.height]).toEqual([0, 0]);
    expect([canvas.style.width, canvas.style.height]).toEqual([
      '40960px',
      '876px',
    ]);
  });

  it('places the paint canvas over the window and draws in content units', () => {
    const canvas = document.createElement('canvas');
    const ctx = { setTransform: vi.fn() };
    canvas.getContext = (() => ctx) as unknown as typeof canvas.getContext;
    const rect = { x: 744, y: 244, w: 1312, h: 812 };

    expect(preparePaintCanvas(canvas, rect, 2)).toBe(ctx);
    expect([canvas.width, canvas.height]).toEqual([2624, 1624]);
    expect(canvas.style.left).toBe('744px');
    expect(canvas.style.top).toBe('244px');
    expect(canvas.style.width).toBe('1312px');
    expect(ctx.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, -1488, -488);
  });

  it('keeps the bitmap when the window only moves', () => {
    const canvas = document.createElement('canvas');
    canvas.getContext = (() => ({
      setTransform() {},
    })) as unknown as typeof canvas.getContext;
    preparePaintCanvas(canvas, { x: 0, y: 0, w: 1000, h: 500 }, 1);
    const resize = vi.spyOn(canvas, 'width', 'set');
    preparePaintCanvas(canvas, { x: 4000, y: 300, w: 1000, h: 500 }, 1);
    expect(resize).not.toHaveBeenCalled();
    expect(canvas.style.left).toBe('4000px');
  });
});
