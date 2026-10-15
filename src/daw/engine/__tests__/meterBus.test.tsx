// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useStore } from '@/daw/store';
import { Meter } from '@/daw/ui/Meter';
import { frameTaskNames } from '../engineClock';
import {
  isMeterBusRunning,
  meterSource,
  subscribeMeter,
  type BusLevels,
} from '../meterBus';

// ── The meter bus (milestone 1.7) ──────────────────────────────────────────
// One loop for every level in the editor: a task on the engineClock that
// runs only while the transport plays or a meter still shows something, a
// timer probe while idle, sources by key that find their analysers again
// after an engine is rebuilt, and readings that bring meters to rest.

/** A stand-in analyser whose samples all sit at amplitude `amp`. */
function fakeAnalyser(amp = 0) {
  const node = {
    fftSize: 32,
    amp,
    context: { sampleRate: 48000 },
    getFloatTimeDomainData(buf: Float32Array) {
      buf.fill(node.amp);
    },
  };
  return node;
}
type FakeAnalyser = ReturnType<typeof fakeAnalyser>;

const audio = vi.hoisted(() => ({
  ready: false,
  master: [] as unknown[],
  registry: new Map<string, unknown>(),
  listeners: new Set<() => void>(),
}));

vi.mock('@/daw/audio/AudioEngine', () => ({
  audioEngine: {
    getIsInitialized: () => audio.ready,
    getMasterAnalysers: () => audio.master,
    getMasteringChain: () => null,
  },
}));

vi.mock('@/daw/engine/trackAudio', () => ({
  getTrackAudioState: (id: string) => audio.registry.get(id),
  subscribeEngineReady: (cb: () => void) => {
    audio.listeners.add(cb);
    return () => audio.listeners.delete(cb);
  },
}));

const notifyEngineReady = () => audio.listeners.forEach((cb) => cb());

/** A registry entry whose track engine meters through `analyser`. */
const trackState = (analyser: FakeAnalyser) => ({
  trackEngine: { getMeterAnalyser: () => analyser },
});

let left = fakeAnalyser();
let right = fakeAnalyser();
let offs: Array<() => void> = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  left = fakeAnalyser();
  right = fakeAnalyser();
  audio.ready = true;
  audio.master = [left, right];
  audio.registry.clear();
  useStore.setState({
    isPlaying: false,
    isRecording: false,
    isCountingIn: false,
  });
  // The bus caches what it resolved: start every test from a fresh graph.
  notifyEngineReady();
});

afterEach(() => {
  cleanup();
  offs.forEach((off) => off());
  offs = [];
  useStore.setState({ isPlaying: false });
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const ms = (n: number) => vi.advanceTimersByTime(n);

/** Subscribes to `key` and records a copy of every reading. */
function record(key: string) {
  const readings: Array<{ peak: number[]; hold: number[] }> = [];
  offs.push(
    subscribeMeter(meterSource(key), (levels: BusLevels) =>
      readings.push({
        peak: Array.from(levels.peak),
        hold: Array.from(levels.hold),
      }),
    ),
  );
  return readings;
}

describe('meter bus', () => {
  it('returns one stable source per key', () => {
    expect(meterSource('master')).toBe(meterSource('master'));
    expect(meterSource('track:a')).toBe(meterSource('track:a'));
    expect(meterSource('track:a')).not.toBe(meterSource('track:b'));
    expect(() => meterSource('track:')).toThrow();
    expect(() => meterSource('nonsense:x')).toThrow();
  });

  it('pauses when idle: no frame task, only a timer probe', () => {
    const readings = record('master');
    ms(2000);
    expect(frameTaskNames()).not.toContain('meterBus');
    expect(isMeterBusRunning()).toBe(false);
    expect(readings).toHaveLength(0);
  });

  it('wakes on transport start and stops after the transport stops', () => {
    record('master');
    ms(500);
    expect(frameTaskNames()).not.toContain('meterBus');
    useStore.setState({ isPlaying: true });
    expect(frameTaskNames()).toContain('meterBus');
    ms(1000);
    expect(frameTaskNames()).toContain('meterBus');
    useStore.setState({ isPlaying: false });
    ms(100);
    expect(frameTaskNames()).not.toContain('meterBus');
  });

  it('probes while stopped: a note played wakes it within the probe interval', () => {
    const readings = record('master');
    ms(500);
    left.amp = 0.5;
    right.amp = 0.25;
    ms(150);
    expect(isMeterBusRunning()).toBe(true);
    const last = readings.at(-1)!;
    expect(last.peak[0]).toBeCloseTo(0.5);
    expect(last.peak[1]).toBeCloseTo(0.25);
  });

  it('publishes only on change', () => {
    useStore.setState({ isPlaying: true });
    left.amp = 0.5;
    const readings = record('master');
    ms(1000);
    expect(readings).toHaveLength(1);
  });

  it('finds a track analyser after engine-ready, and the new one after a rebuild', () => {
    useStore.setState({ isPlaying: true });
    const readings = record('track:t1');
    ms(200);
    expect(readings).toHaveLength(0); // no engine yet

    const first = fakeAnalyser(0.5);
    audio.registry.set('t1', trackState(first));
    notifyEngineReady();
    ms(100);
    expect(readings.at(-1)!.peak[0]).toBeCloseTo(0.5);

    // A load rebuilds the engine under the same id; the old analyser is
    // still loud, so reading it would keep 0.5.
    const second = fakeAnalyser(0.1);
    audio.registry.set('t1', trackState(second));
    notifyEngineReady();
    ms(3000);
    expect(readings.at(-1)!.peak[0]).toBeCloseTo(0.1);
    expect(readings.at(-1)!.hold[0]).toBeCloseTo(0.1);
  });

  it('releases the peak-hold marker in real time after the signal stops', () => {
    useStore.setState({ isPlaying: true });
    left.amp = 0.5;
    const readings = record('master');
    ms(200);
    useStore.setState({ isPlaying: false });
    left.amp = 0;
    ms(500);
    // Held for a second…
    expect(readings.at(-1)!.hold[0]).toBeCloseTo(0.5);
    expect(readings.at(-1)!.peak[0]).toBeLessThan(0.5);
    ms(1000);
    // …then falling…
    expect(readings.at(-1)!.hold[0]).toBeLessThan(0.5);
    ms(3000);
    // …to rest, and the loop with it.
    expect(readings.at(-1)!.hold[0]).toBe(0);
    expect(readings.at(-1)!.peak[0]).toBe(0);
    expect(isMeterBusRunning()).toBe(false);
  });

  it('drives the Meter primitive and sends one silent reading when it stops', () => {
    // jsdom has no canvas: a context that draws nothing, so the Meter runs.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      setTransform() {},
      clearRect() {},
      fillRect() {},
      fillStyle: '',
    } as never);
    const source = meterSource('master');
    let silent = 0;
    let after = 0;
    offs.push(
      subscribeMeter(source, (levels) => {
        if (levels.peak[0] === 0 && levels.hold[0] === 0) silent++;
        else if (silent > 0) after++;
      }),
    );
    render(<Meter label="Master" source={source} showPeak />);
    const peak = () => screen.getByText('Peak').previousElementSibling;

    useStore.setState({ isPlaying: true });
    left.amp = 0.5;
    ms(300);
    expect(peak()?.textContent).toBe('−6.0');

    useStore.setState({ isPlaying: false });
    left.amp = 0;
    ms(6000);
    expect(isMeterBusRunning()).toBe(false);
    // The Meter's own held peak came to rest with the bus's readings.
    expect(peak()?.textContent).toBe('−∞');
    expect(silent).toBe(1);
    expect(after).toBe(0);
  });
});
