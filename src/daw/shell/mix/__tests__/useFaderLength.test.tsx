// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MIN_FADER_PX, useFaderLength } from '../useFaderLength';

// ── A fader's length from its box (milestone 2.10) ─────────────────────────
// The length is the box's height less the reserve, never under the minimum
// (80 px), and it follows the box when the ResizeObserver reports a resize.

let height = 0;
let observers: { callback: () => void; observed: Element[] }[] = [];

class StubResizeObserver {
  observed: Element[] = [];
  constructor(public callback: () => void) {
    observers.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {}
  disconnect() {
    observers = observers.filter((o) => o !== this);
  }
}

const OriginalResizeObserver = globalThis.ResizeObserver;

beforeEach(() => {
  height = 0;
  observers = [];
  globalThis.ResizeObserver =
    StubResizeObserver as unknown as typeof ResizeObserver;
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
    () => height,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  globalThis.ResizeObserver = OriginalResizeObserver;
});

function Probe({ reserve, min }: { reserve?: number; min?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const length = useFaderLength(ref, { reserve, min });
  return (
    <div ref={ref} data-testid="box">
      {length}
    </div>
  );
}

const shown = () => Number(screen.getByTestId('box').textContent);

/** The box grows or shrinks and the observer reports it. */
function resize(to: number) {
  height = to;
  act(() => observers.forEach((o) => o.callback()));
}

describe('useFaderLength', () => {
  it('is the box’s height less the reserve', () => {
    height = 300;
    render(<Probe reserve={24} />);
    expect(shown()).toBe(276);
  });

  it('never goes under the minimum, 80 px by default', () => {
    expect(MIN_FADER_PX).toBe(80);
    height = 90;
    render(<Probe reserve={24} />);
    expect(shown()).toBe(80);
    cleanup();
    height = 50;
    render(<Probe min={120} />);
    expect(shown()).toBe(120);
  });

  it('observes its box and follows a resize', () => {
    height = 300;
    render(<Probe reserve={24} />);
    expect(observers).toHaveLength(1);
    expect(observers[0].observed).toEqual([screen.getByTestId('box')]);
    resize(500);
    expect(shown()).toBe(476);
    resize(40);
    expect(shown()).toBe(80);
  });

  it('stops observing on unmount', () => {
    height = 300;
    const { unmount } = render(<Probe />);
    expect(observers).toHaveLength(1);
    unmount();
    expect(observers).toHaveLength(0);
  });
});
