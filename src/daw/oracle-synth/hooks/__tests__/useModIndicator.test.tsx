// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

// ── The modulation ring's live dot ─────────────────────────────────────────
// The dot reads the LFO on the shared engineClock and renders only when it
// moves a visible step. It follows the engine the synth view registers,
// including one registered after the knob mounted (a parent's effect runs
// after its children's) and a swap to another engine.

import {
  acquireModIndicatorEngine,
  releaseModIndicatorEngine,
  useModIndicator,
} from '../useModIndicator';
import { useSynthStore } from '../../store';
import { frameTaskNames } from '@/daw/engine/engineClock';
import type { SynthEngine } from '../../audio/SynthEngine';
import type { ModRoute } from '../../audio/types';

let now = 0;

function fakeEngine() {
  const lfo = {
    fftSize: 4,
    value: 0,
    getFloatTimeDomainData(buf: Float32Array) {
      buf.fill(lfo.value);
    },
  };
  return { lfo, getLFOAnalyser: () => lfo };
}
const asEngine = (e: ReturnType<typeof fakeEngine>) =>
  e as unknown as SynthEngine;

const route: ModRoute = {
  id: 'r1',
  source: { type: 'lfo', index: 0 },
  target: { source: 'flt1', param: 'resonance' },
  amount: 1,
  polarity: 'unipolar',
  enabled: true,
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  now = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb((now += 16)), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  useSynthStore.setState({ modRoutes: [route] });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const frames = (n: number) =>
  act(() => {
    vi.advanceTimersByTime(16 * n);
  });

describe('useModIndicator', () => {
  it('starts when the engine is registered after mount, and follows a swap', () => {
    const { result } = renderHook(() => useModIndicator('flt1', 'resonance'));
    expect(frameTaskNames()).toEqual([]);
    expect(result.current?.liveOffset).toBeNull();

    const a = fakeEngine();
    a.lfo.value = 0.5;
    act(() => acquireModIndicatorEngine(asEngine(a)));
    expect(frameTaskNames()).toEqual(['mod-indicator']);
    frames(3);
    const fromA = result.current?.liveOffset;
    expect(fromA).not.toBeNull();

    const b = fakeEngine();
    b.lfo.value = 1;
    act(() => acquireModIndicatorEngine(asEngine(b)));
    frames(3);
    expect(result.current?.liveOffset).not.toBe(fromA);

    act(() => releaseModIndicatorEngine(asEngine(b)));
    act(() => releaseModIndicatorEngine(asEngine(a)));
    expect(frameTaskNames()).toEqual([]);
    expect(result.current?.liveOffset).toBeNull();
  });

  it('renders only for a visible move of the dot', () => {
    const e = fakeEngine();
    act(() => acquireModIndicatorEngine(asEngine(e)));
    let renders = 0;
    renderHook(() => {
      renders++;
      return useModIndicator('flt1', 'resonance');
    });
    frames(3);
    const base = renders;
    // A drift under half a percent of the ring: no render.
    e.lfo.value = 0.001;
    frames(10);
    expect(renders).toBe(base);
    e.lfo.value = 0.5;
    frames(3);
    expect(renders).toBe(base + 1);
    act(() => releaseModIndicatorEngine(asEngine(e)));
  });
});
