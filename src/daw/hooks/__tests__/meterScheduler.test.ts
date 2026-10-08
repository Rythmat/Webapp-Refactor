import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/daw/store';
import { registerMeter } from '../useMeterLevel';

// ── The shared meter loop runs only while there is something to show ──────
// Every header used to run its own rAF loop forever and set React state on
// every frame. Now one loop serves every meter, emits only on a change, and
// stops once the meters decay with the transport stopped; a slow probe
// wakes it for a note played while stopped.

/** A stand-in analyser whose waveform deviates `dev` steps from 128. */
function fakeAnalyser(dev = 0) {
  const node = {
    fftSize: 32,
    dev,
    getByteTimeDomainData(buf: Uint8Array) {
      buf.fill(128 - node.dev);
    },
  };
  return node;
}
const asNode = (a: ReturnType<typeof fakeAnalyser>) =>
  a as unknown as AnalyserNode;

let rafCalls = 0;
let offs: Array<() => void> = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  rafCalls = 0;
  // A frame every 16 ms on the fake clock.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCalls++;
    return setTimeout(() => cb(0), 16) as unknown as number;
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

describe('shared meter loop', () => {
  it('stops after one frame for a silent meter and stays stopped', () => {
    const emit = vi.fn();
    offs.push(registerMeter(asNode(fakeAnalyser(0)), emit));
    frames(60);
    expect(rafCalls).toBe(1);
    expect(emit).not.toHaveBeenCalled();
  });

  it('treats one step of residue as silence (no loop, reads 1)', () => {
    const emit = vi.fn();
    const a = fakeAnalyser(1);
    offs.push(registerMeter(asNode(a), emit));
    frames(60);
    expect(rafCalls).toBe(1);
    expect(emit).toHaveBeenLastCalledWith(1);
    // The residue fades: the probe brings the settled meter back to 0.
    a.dev = 0;
    frames(15);
    expect(emit).toHaveBeenLastCalledWith(0);
    expect(rafCalls).toBe(1);
  });

  it('wakes on signal while stopped, then decays and stops again', () => {
    const a = fakeAnalyser(0);
    const levels: number[] = [];
    offs.push(registerMeter(asNode(a), (l) => levels.push(l)));
    frames(10);
    expect(rafCalls).toBe(1);

    a.dev = 64; // a note played while stopped: the probe finds it
    frames(10);
    expect(levels).toContain(50);
    a.dev = 0;
    frames(120);
    expect(levels.at(-1)).toBe(0);
    const settled = rafCalls;
    frames(120);
    expect(rafCalls).toBe(settled);
  });

  it('emits only when the whole-percent level changes', () => {
    const emit = vi.fn();
    useStore.setState({ isPlaying: true });
    offs.push(registerMeter(asNode(fakeAnalyser(64)), emit));
    frames(30);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(50);
  });

  it('runs one loop for many meters while the transport plays', () => {
    useStore.setState({ isPlaying: true });
    for (let i = 0; i < 4; i++) {
      offs.push(registerMeter(asNode(fakeAnalyser(0)), () => {}));
    }
    rafCalls = 0;
    frames(30);
    // One rAF per frame for all four meters (not four).
    expect(rafCalls).toBeGreaterThan(20);
    expect(rafCalls).toBeLessThanOrEqual(31);

    useStore.setState({ isPlaying: false });
    frames(5);
    const stopped = rafCalls;
    frames(60);
    expect(rafCalls).toBe(stopped);
  });
});
