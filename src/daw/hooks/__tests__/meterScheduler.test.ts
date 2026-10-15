import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/daw/store';
import { frameTaskNames } from '@/daw/engine/engineClock';
import { registerMeter } from '../useMeterLevel';

// ── The legacy meter API runs on the meter bus ─────────────────────────────
// Every header used to run its own rAF loop forever and set React state on
// every frame. registerMeter (behind useMeterLevel and useMeterFill) now
// rides on the meter bus: one engineClock task that emits only on a change,
// runs while the transport plays and until the meters fall to rest, and a
// slow probe (a timer, no rAF) that wakes it for a note played while
// stopped.

/** A stand-in analyser whose samples all sit at amplitude `amp`. */
function fakeAnalyser(amp = 0) {
  const node = {
    fftSize: 32,
    amp,
    getFloatTimeDomainData(buf: Float32Array) {
      buf.fill(-node.amp);
    },
  };
  return node;
}
const asNode = (a: ReturnType<typeof fakeAnalyser>) =>
  a as unknown as AnalyserNode;

let rafCalls = 0;
let offs: Array<() => void> = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  rafCalls = 0;
  // A frame every 16 ms on the fake clock.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCalls++;
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  useStore.setState({
    isPlaying: false,
    isRecording: false,
    isCountingIn: false,
  });
});

afterEach(() => {
  offs.forEach((off) => off());
  offs = [];
  useStore.setState({ isPlaying: false });
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const frames = (n: number) => vi.advanceTimersByTime(16 * n);

describe('legacy meters on the bus', () => {
  it('probes a silent meter with a timer and runs no frame loop', () => {
    const emit = vi.fn();
    offs.push(registerMeter(asNode(fakeAnalyser(0)), emit));
    frames(60);
    expect(rafCalls).toBe(0);
    expect(frameTaskNames()).not.toContain('meterBus');
    expect(emit).not.toHaveBeenCalled();
  });

  it('treats a level under −60 dBFS as silence', () => {
    const emit = vi.fn();
    offs.push(registerMeter(asNode(fakeAnalyser(0.0005)), emit));
    frames(60);
    expect(rafCalls).toBe(0);
    expect(emit).not.toHaveBeenCalled();
  });

  it('wakes on signal while stopped, then falls to rest and stops again', () => {
    const a = fakeAnalyser(0);
    const levels: number[] = [];
    offs.push(registerMeter(asNode(a), (l) => levels.push(l)));
    frames(10);
    expect(rafCalls).toBe(0);

    a.amp = 0.5; // a note played while stopped: the probe finds it
    frames(10);
    expect(levels).toContain(50);
    expect(frameTaskNames()).toContain('meterBus');
    a.amp = 0;
    frames(300);
    expect(levels.at(-1)).toBe(0);
    expect(frameTaskNames()).not.toContain('meterBus');
    const settled = rafCalls;
    frames(120);
    expect(rafCalls).toBe(settled);
  });

  it('emits only when the whole-percent level changes', () => {
    const emit = vi.fn();
    useStore.setState({ isPlaying: true });
    offs.push(registerMeter(asNode(fakeAnalyser(0.5)), emit));
    frames(30);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(50);
  });

  it('runs one task for many meters while the transport plays', () => {
    useStore.setState({ isPlaying: true });
    for (let i = 0; i < 4; i++) {
      offs.push(registerMeter(asNode(fakeAnalyser(0)), () => {}));
    }
    rafCalls = 0;
    frames(30);
    // One rAF per frame for all four meters (not four), one bus task.
    expect(rafCalls).toBeGreaterThan(20);
    expect(rafCalls).toBeLessThanOrEqual(31);
    expect(frameTaskNames().filter((n) => n === 'meterBus')).toHaveLength(1);

    useStore.setState({ isPlaying: false });
    frames(5);
    const stopped = rafCalls;
    frames(60);
    expect(rafCalls).toBe(stopped);
    expect(frameTaskNames()).not.toContain('meterBus');
  });
});
