// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LFONode } from '../../audio/types';
import { LFONodeEditor } from './LFONodeEditor';

// ── The LFO editor under the pop-out's CSS scale ───────────────────────────
// The full-screen synth lays its panels out at 1440×932 and scales them to
// the window. The editor's drawing is sized before that scale, while the
// pointer moves over the scaled box, so on a laptop a dragged node used to
// land short of the pointer and could not reach the end of the bar.

/** The editor's laid-out size, as its ResizeObserver reports it. */
const WIDTH = 400;
const HEIGHT = 200;
/** Its padding, and the drawing inside it (LFONodeEditor's PAD). */
const PAD = 6;
const DRAW_W = WIDTH - PAD * 2;
const DRAW_H = HEIGHT - PAD * 2;

class SizedObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe() {
    this.callback(
      [
        {
          contentRect: { width: WIDTH, height: HEIGHT },
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

/** Draws the editor on screen at `scale`, its top-left corner at (left, top). */
function renderScaled(nodes: LFONode[], scale: number, left = 100, top = 50) {
  const onChange = vi.fn<(nodes: LFONode[]) => void>();
  const { container } = render(
    <LFONodeEditor nodes={nodes} onChange={onChange} />,
  );
  const svg = container.querySelector('svg')!;
  expect(svg.getAttribute('width')).toBe(String(WIDTH));
  svg.getBoundingClientRect = () =>
    ({
      left,
      top,
      x: left,
      y: top,
      width: WIDTH * scale,
      height: HEIGHT * scale,
      right: left + WIDTH * scale,
      bottom: top + HEIGHT * scale,
      toJSON: () => ({}),
    }) as DOMRect;
  /** Where on screen a point of the LFO (time, value) is drawn. */
  const screenAt = (time: number, value: number) => ({
    clientX: left + (PAD + time * DRAW_W) * scale,
    clientY: top + (PAD + (1 - value) * DRAW_H) * scale,
  });
  return { svg, onChange, screenAt };
}

/** A pointer event as the browser sends it; jsdom has no PointerEvent. */
function pointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  at: { clientX: number; clientY: number },
) {
  act(() => {
    target.dispatchEvent(
      new MouseEvent(type, { ...at, bubbles: true, cancelable: true }),
    );
  });
}

const RAMP: LFONode[] = [
  { time: 0, value: 0 },
  { time: 0.5, value: 0.5 },
  { time: 1, value: 0 },
];

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', SizedObserver);
  // jsdom has no pointer capture; the editor captures the node it grabs.
  Element.prototype.setPointerCapture = () => {};
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (Element.prototype as Partial<Element>).setPointerCapture;
});

describe('LFONodeEditor at the pop-out scale', () => {
  it('adds a node under the pointer', () => {
    const { svg, onChange, screenAt } = renderScaled(RAMP, 0.75);
    act(() => {
      svg.dispatchEvent(
        new MouseEvent('click', { ...screenAt(0.875, 0.75), bubbles: true }),
      );
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toContainEqual({
      time: 0.875,
      value: 0.75,
    });
  });

  it('drags a node to the pointer, out to the end of the bar', () => {
    const { svg, onChange, screenAt } = renderScaled(RAMP, 0.75);
    const middle = svg.querySelectorAll('circle')[1];
    pointer(middle, 'pointerdown', screenAt(0.5, 0.5));
    pointer(svg, 'pointermove', screenAt(0.9375, 0.125));
    pointer(svg, 'pointerup', screenAt(0.9375, 0.125));
    expect(onChange).toHaveBeenLastCalledWith([
      { time: 0, value: 0 },
      { time: 0.9375, value: 0.125 },
      { time: 1, value: 0 },
    ]);
  });

  it('bends a curve by the distance moved on screen, at any scale', () => {
    const bendBy = (scale: number) => {
      const { svg, onChange, screenAt } = renderScaled(RAMP, scale);
      const handle = svg.querySelector('rect')!;
      const from = screenAt(0.25, 0.25);
      pointer(handle, 'pointerdown', from);
      // A quarter of the drawing's height, upwards, as drawn on screen.
      const to = { ...from, clientY: from.clientY - (DRAW_H / 4) * scale };
      pointer(svg, 'pointermove', to);
      pointer(svg, 'pointerup', to);
      cleanup();
      return onChange.mock.calls[0][0][0].curve;
    };
    expect(bendBy(0.75)).toBe(0.75);
    expect(bendBy(1)).toBe(0.75);
  });

  it('maps the pointer as before where nothing is scaled', () => {
    const { svg, onChange, screenAt } = renderScaled(RAMP, 1, 10, 10);
    act(() => {
      svg.dispatchEvent(
        new MouseEvent('click', { ...screenAt(0.25, 0.375), bubbles: true }),
      );
    });
    expect(onChange.mock.calls[0][0]).toContainEqual({
      time: 0.25,
      value: 0.375,
    });
  });
});
