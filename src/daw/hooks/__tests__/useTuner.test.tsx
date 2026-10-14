// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

// ── The tuner renders only when its readout changes ───────────────────────
// It used to run its own unthrottled rAF and set five pieces of state on
// every voiced frame. Now it is an engineClock task while running, and it
// renders only when the note, cents or Hz shown change.

const yin = vi.hoisted(() => ({ freq: 0 }));
vi.mock('@/audio/pitch/YinCore', () => ({
  yinDetectSingle: () => yin.freq,
}));

import { useTuner } from '../useTuner';
import { frameTaskNames } from '@/daw/engine/engineClock';
import { useStore } from '@/daw/store';

let now = 0;
const analyser = {
  fftSize: 64,
  context: { sampleRate: 48000 },
  getFloatTimeDomainData: () => {},
} as unknown as AnalyserNode;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  now = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb((now += 16)), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  yin.freq = 0;
  useStore.setState({ rootNote: null } as never);
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

describe('useTuner', () => {
  it('runs no frame task until started, and none after stop', async () => {
    const { result } = renderHook(() => useTuner(null, analyser));
    expect(frameTaskNames()).toEqual([]);
    await act(() => result.current.start());
    expect(frameTaskNames()).toEqual(['tuner']);
    act(() => result.current.stop());
    expect(frameTaskNames()).toEqual([]);
  });

  it('renders for a new reading, not for every frame of the same one', async () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return useTuner(null, analyser);
    });
    await act(() => result.current.start());

    // Silence: nothing to show.
    const base = renders;
    frames(30);
    expect(renders).toBe(base);

    // A steady A4: the note settles, then the readout holds still.
    yin.freq = 440;
    frames(10);
    expect(result.current.note).toBe('A');
    expect(result.current.octave).toBe(4);
    expect(result.current.frequency).toBe(440);
    const settled = renders;
    frames(30);
    expect(renders).toBe(settled);
  });
});
