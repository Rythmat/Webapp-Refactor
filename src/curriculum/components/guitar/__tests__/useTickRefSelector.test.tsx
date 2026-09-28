// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTickRefSelector } from '../useTickRefSelector';

// A hand-driven animation frame: callbacks run only when a test flushes.
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;

function flushFrame() {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(0)));
}

beforeEach(() => {
  frames.clear();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Shows the bar a tick falls in, counting its renders. */
function setup(active: boolean) {
  const tickRef = { current: 0 };
  const renders: number[] = [];
  function Bar({ active }: { active: boolean }) {
    // A new selector every render, as an inline one would be.
    const bar = useTickRefSelector(
      tickRef,
      (tick) => Math.floor(tick / 1920),
      active,
    );
    renders.push(bar);
    return <span>{bar}</span>;
  }
  const view = render(<Bar active={active} />);
  return {
    tickRef,
    renders,
    setActive: (next: boolean) => view.rerender(<Bar active={next} />),
    unmount: view.unmount,
  };
}

describe('useTickRefSelector', () => {
  it('re-renders only when the selected value changes', () => {
    const { tickRef, renders } = setup(true);
    expect(renders).toEqual([0]);

    for (const tick of [100, 900, 1919]) {
      tickRef.current = tick;
      flushFrame();
    }
    expect(renders).toEqual([0]);

    tickRef.current = 2000;
    flushFrame();
    expect(renders).toEqual([0, 1]);

    tickRef.current = 3000;
    flushFrame();
    flushFrame();
    expect(renders).toEqual([0, 1]);
  });

  it('does not poll while inactive, and reads at once when it starts', () => {
    const { tickRef, renders, setActive } = setup(false);
    expect(frames.size).toBe(0);

    tickRef.current = 4000;
    expect(renders).toEqual([0]);

    setActive(true);
    // The re-render that activated it, then the value read straight away.
    expect(renders).toEqual([0, 0, 2]);
    expect(frames.size).toBe(1);

    setActive(false);
    expect(frames.size).toBe(0);
  });

  it('stops its frame loop on unmount', () => {
    const { unmount } = setup(true);
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
  });
});
