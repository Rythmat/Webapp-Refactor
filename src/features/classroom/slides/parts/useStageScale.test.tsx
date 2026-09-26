// @vitest-environment jsdom
/**
 * The stage must follow its container, not a snapshot of it.
 *
 * The hook used to take a `RefObject` and attach its ResizeObserver once, in a
 * mount effect. Two things break that: a node that is not mounted on the first
 * render (the student surface renders the REFLOW below the breakpoint, so there
 * is no stage node at all), and a node React later replaces. In both cases the
 * observer never bound and the stage kept its first-paint scale — a 1280-wide
 * canvas rendering inside a 996-wide box, clipped by the frame's own
 * `overflow-hidden` with nothing to see but missing content.
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStageScale } from './useStageScale';

afterEach(cleanup);

/** A ResizeObserver whose observations we can drive. */
let observed: Map<Element, (rect: { width: number; height: number }) => void>;

beforeEach(() => {
  observed = new Map();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private cb: (entries: unknown[]) => void) {}
      observe(el: Element) {
        observed.set(el, ({ width, height }) =>
          this.cb([{ contentRect: { width, height } }]),
        );
      }
      unobserve(el: Element) {
        observed.delete(el);
      }
      disconnect() {
        observed.clear();
      }
    },
  );
});

const Stage = ({ show }: { show: boolean }) => {
  const { scale, ref } = useStageScale();
  if (!show) return <p>reflow</p>;
  return (
    <div ref={ref} data-testid="outer" data-scale={scale}>
      stage
    </div>
  );
};

const scaleOf = (c: HTMLElement) =>
  Number(c.querySelector('[data-testid="outer"]')?.getAttribute('data-scale'));

const resizeTo = (w: number, h: number) => {
  act(() => {
    for (const fire of observed.values()) fire({ width: w, height: h });
  });
};

describe('useStageScale', () => {
  it('fits the canvas into the container (contain, not cover)', () => {
    const { container } = render(<Stage show />);
    resizeTo(640, 360);
    expect(scaleOf(container)).toBeCloseTo(0.5, 3);
  });

  it('is bounded by the SHORTER dimension', () => {
    const { container } = render(<Stage show />);
    // A very wide, short box must not overflow vertically.
    resizeTo(2560, 360);
    expect(scaleOf(container)).toBeCloseTo(0.5, 3);
  });

  it('tracks the container when it resizes', () => {
    const { container } = render(<Stage show />);
    resizeTo(1280, 720);
    expect(scaleOf(container)).toBeCloseTo(1, 3);
    resizeTo(996, 560);
    expect(scaleOf(container)).toBeCloseTo(996 / 1280, 2);
  });

  it('binds to a stage that appears AFTER the first render', () => {
    // The student case: the reflow renders first, then the viewport widens.
    const { container, rerender } = render(<Stage show={false} />);
    expect(observed.size).toBe(0);
    rerender(<Stage show />);
    expect(observed.size).toBe(1);
    resizeTo(996, 560);
    expect(scaleOf(container)).toBeCloseTo(996 / 1280, 2);
  });

  it('stops observing a stage that goes away', () => {
    const { rerender } = render(<Stage show />);
    expect(observed.size).toBe(1);
    rerender(<Stage show={false} />);
    expect(observed.size).toBe(0);
  });

  it('ignores a zero-sized container rather than collapsing the slide', () => {
    const { container } = render(<Stage show />);
    resizeTo(1280, 720);
    resizeTo(0, 0);
    expect(scaleOf(container)).toBeCloseTo(1, 3);
  });
});
