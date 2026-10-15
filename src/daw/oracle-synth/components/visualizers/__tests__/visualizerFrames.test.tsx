// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

// ── The synth visualizers draw only when there is something new to show ───
// Each canvas used to own a 30 fps rAF loop for as long as it was mounted.
// Now they draw on the shared engineClock, only on screen: the scope only
// while sound flows (a slow probe wakes it), the filter curve only for a
// few frames after its params change.

import { WaveformVisualizer } from '../WaveformVisualizer';
import {
  FilterResponseVisualizer,
  FILTER_SETTLE_FRAMES,
} from '../FilterResponseVisualizer';
import { frameTaskNames } from '@/daw/engine/engineClock';
import { useSynthStore } from '../../../store';
import type { Filter } from '../../../audio/Filter';

let now = 0;
let observers: { cb: IntersectionObserverCallback; el?: Element }[] = [];

class FakeIntersectionObserver {
  entry: { cb: IntersectionObserverCallback; el?: Element };
  constructor(cb: IntersectionObserverCallback) {
    this.entry = { cb };
    observers.push(this.entry);
  }
  observe(el: Element) {
    this.entry.el = el;
  }
  disconnect() {
    observers = observers.filter((o) => o !== this.entry);
  }
}

function setOnScreen(isIntersecting: boolean) {
  act(() => {
    for (const o of observers) {
      o.cb(
        [{ isIntersecting, target: o.el } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    }
  });
}

const ctx2d = new Proxy(
  {},
  { get: () => () => {} },
) as unknown as CanvasRenderingContext2D;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
  now = 0;
  observers = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb((now += 16)), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx2d as never,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const frames = (n: number) =>
  act(() => {
    vi.advanceTimersByTime(16 * n);
  });

function fakeAnalyser() {
  const node = {
    fftSize: 32,
    level: 0,
    reads: 0,
    getByteTimeDomainData(buf: Uint8Array) {
      node.reads++;
      buf.fill(128 + node.level);
    },
  };
  return node;
}

describe('WaveformVisualizer', () => {
  it('stops drawing after a second of silence and wakes on sound', () => {
    const a = fakeAnalyser();
    render(<WaveformVisualizer analyser={a as unknown as AnalyserNode} />);
    expect(frameTaskNames()).toEqual(['oracle-waveform']);

    frames(90); // ~1.4 s of silence
    expect(frameTaskNames()).toEqual([]);

    // Still silent: the probe reads now and then, no frames.
    const reads = a.reads;
    frames(60);
    expect(frameTaskNames()).toEqual([]);
    expect(a.reads - reads).toBeLessThanOrEqual(4);

    a.level = 20;
    frames(20);
    expect(frameTaskNames()).toEqual(['oracle-waveform']);
  });

  it('draws nothing off screen', () => {
    const a = fakeAnalyser();
    a.level = 20;
    render(<WaveformVisualizer analyser={a as unknown as AnalyserNode} />);
    setOnScreen(false);
    expect(frameTaskNames()).toEqual([]);
    const reads = a.reads;
    frames(60);
    expect(a.reads).toBe(reads);
    setOnScreen(true);
    expect(frameTaskNames()).toEqual(['oracle-waveform']);
  });
});

describe('FilterResponseVisualizer', () => {
  function fakeFilter() {
    const filter = {
      calls: 0,
      getFrequencyResponse(freqs: Float32Array) {
        filter.calls++;
        return {
          magnitude: new Float32Array(freqs.length).fill(1),
          phase: new Float32Array(freqs.length),
        };
      },
    };
    return filter;
  }

  it('draws for a few frames, then only after a filter change', () => {
    const f = fakeFilter();
    render(<FilterResponseVisualizer liveFilter={f as unknown as Filter} />);
    frames(FILTER_SETTLE_FRAMES * 3);
    expect(frameTaskNames()).toEqual([]);
    const calls = f.calls;
    frames(60);
    expect(f.calls).toBe(calls);

    act(() => {
      useSynthStore.getState().setFilterParam(0, 'cutoff', 800);
    });
    expect(frameTaskNames()).toEqual(['oracle-filter-response']);
    frames(FILTER_SETTLE_FRAMES * 3);
    expect(frameTaskNames()).toEqual([]);
    expect(f.calls).toBeGreaterThan(calls);
  });

  it('does not draw off screen', () => {
    const f = fakeFilter();
    render(<FilterResponseVisualizer liveFilter={f as unknown as Filter} />);
    setOnScreen(false);
    expect(frameTaskNames()).toEqual([]);
    const calls = f.calls;
    act(() => {
      useSynthStore.getState().setFilterParam(0, 'cutoff', 1200);
    });
    frames(30);
    expect(f.calls).toBe(calls);
  });
});
