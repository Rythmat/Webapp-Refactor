import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAudioGraph } from '@/daw/audio/__tests__/fakeAudioGraph';
import { WahPedal } from '@/daw/audio/pedals/WahPedal';
import { frameTaskNames } from '@/daw/engine/engineClock';

// The envelope follower runs on the shared frame loop only while the pedal
// is on: a bypassed wah used to keep its own rAF loop until disposed.

let graph: ReturnType<typeof fakeAudioGraph>;
let ctx: AudioContext;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  graph = fakeAudioGraph();
  ctx = Object.assign(graph.ctx, {
    createAnalyser: () => ({
      fftSize: 256,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getFloatTimeDomainData: (buf: Float32Array) => buf.fill(0.2),
    }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('WahPedal envelope follower', () => {
  it('runs only while the pedal is on, and stops on dispose', () => {
    const pedal = new WahPedal(ctx);
    expect(frameTaskNames()).toEqual(['wah-envelope']);

    pedal.setEnabled(false);
    expect(frameTaskNames()).toEqual([]);

    pedal.setEnabled(true);
    expect(frameTaskNames()).toEqual(['wah-envelope']);

    pedal.dispose();
    expect(frameTaskNames()).toEqual([]);
  });

  it('sweeps the filter with the input level', () => {
    const pedal = new WahPedal(ctx);
    const filter = graph.ofKind('biquad')[0];
    pedal.updateParams({ frequency: 0, freqEnvAmt: 1 });
    vi.advanceTimersByTime(16 * 30);
    expect(filter.frequency.value).toBeGreaterThan(100);
    pedal.dispose();
  });

  it("holds the filter at rest in a bounce, where the frame loop can't keep up", () => {
    // An offline context renders faster than the page's frames; a follower
    // there would sweep the filter at random.
    const offline = Object.assign(ctx, { startRendering: vi.fn() });
    const pedal = new WahPedal(offline);
    expect(frameTaskNames()).toEqual([]);

    const filter = graph.ofKind('biquad')[0];
    pedal.updateParams({ frequency: 0, resonance: 1, freqEnvAmt: 1 });
    vi.advanceTimersByTime(16 * 30);
    // The knobs' rest position: 100 Hz, Q 20, no envelope on top.
    expect(filter.frequency.value).toBeCloseTo(100);
    expect((filter as unknown as { Q: { value: number } }).Q.value).toBe(20);
    pedal.dispose();
  });
});
