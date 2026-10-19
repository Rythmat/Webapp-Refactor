import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAudioGraph } from '@/daw/audio/__tests__/fakeAudioGraph';
import { WahPedal } from '@/daw/audio/pedals/WahPedal';
import { frameTaskNames } from '@/daw/engine/engineClock';

// The envelope follower runs on the audio thread (the dynamics worklet in
// 'follower' mode): its envelope is scaled onto the filter's frequency and Q
// by two gains, so nothing on the main thread writes the filter per frame.

let graph: ReturnType<typeof fakeAudioGraph>;
let ctx: AudioContext;
let followers: Array<{
  options: AudioWorkletNodeOptions;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  parameters: Map<string, { setValueAtTime: ReturnType<typeof vi.fn> }>;
  port: { postMessage: ReturnType<typeof vi.fn>; close: () => void };
}>;
let addModule: ReturnType<typeof vi.fn>;

beforeEach(() => {
  graph = fakeAudioGraph();
  followers = [];
  addModule = vi.fn(() => Promise.resolve());
  ctx = Object.assign(graph.ctx, {
    currentTime: 0,
    audioWorklet: { addModule },
  });
  vi.stubGlobal(
    'AudioWorkletNode',
    function FakeWorkletNode(
      _ctx: unknown,
      _name: string,
      options: AudioWorkletNodeOptions,
    ) {
      const node = {
        options,
        connect: vi.fn(),
        disconnect: vi.fn(),
        parameters: new Map(
          Object.keys(options.parameterData ?? {}).map((k) => [
            k,
            { setValueAtTime: vi.fn() },
          ]),
        ),
        port: { postMessage: vi.fn(), close: vi.fn(), onmessage: null },
      };
      followers.push(node);
      return node;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('WahPedal envelope follower', () => {
  it('runs in the worklet, not on the frame loop', async () => {
    const pedal = new WahPedal(ctx);
    await flush();
    expect(frameTaskNames()).toEqual([]);
    expect(followers).toHaveLength(1);
    expect(followers[0].options.processorOptions).toEqual({
      mode: 'follower',
    });
    pedal.dispose();
  });

  it("scales the envelope onto the filter's frequency and Q", async () => {
    const pedal = new WahPedal(ctx);
    await flush();
    const [filter] = graph.ofKind('biquad');
    const [, , , , , , freqEnv, resEnv] = graph.ofKind('gain');
    expect(freqEnv.connect).toHaveBeenCalledWith(filter.frequency);
    expect(resEnv.connect).toHaveBeenCalledWith(
      (filter as unknown as { Q: unknown }).Q,
    );
    const follower = followers[0];
    expect(follower.connect).toHaveBeenCalledWith(freqEnv);
    expect(follower.connect).toHaveBeenCalledWith(resEnv);

    pedal.updateParams({ frequency: 0, freqEnvAmt: 1, resEnvAmt: 0.5 });
    // The filter holds the base; the gains hold the sweep's depth.
    expect(filter.frequency.value).toBeCloseTo(100);
    expect(freqEnv.gain.value).toBe(4000);
    expect(resEnv.gain.value).toBe(7.5);
    pedal.dispose();
  });

  it('times attack and decay in seconds (no frame rate)', async () => {
    const pedal = new WahPedal(ctx);
    await flush();
    const follower = followers[0];
    expect(follower.options.parameterData).toMatchObject({
      attack: 0.001 + 0.3 * 0.099,
      release: 0.01 + 0.5 * 0.99,
    });
    pedal.updateParams({ attack: 1, decay: 0, sensitivity: 1 });
    const set = (name: string) =>
      follower.parameters.get(name)!.setValueAtTime.mock.calls.at(-1)?.[0];
    expect(set('attack')).toBeCloseTo(0.1);
    expect(set('release')).toBeCloseTo(0.01);
    expect(set('sensitivity')).toBeCloseTo(10);
    pedal.dispose();
  });

  it('hears nothing while bypassed', async () => {
    const pedal = new WahPedal(ctx);
    await flush();
    const follower = followers[0];
    const [input] = graph.ofKind('gain');
    expect(input.connect).toHaveBeenCalledWith(follower);
    pedal.setEnabled(false);
    input.connect.mockClear();
    expect(input.disconnect).toHaveBeenCalled();
    pedal.setEnabled(true);
    expect(input.connect).toHaveBeenCalledWith(follower);
    pedal.dispose();
  });

  it('disposes its follower, and drops one that loads after dispose', async () => {
    const pedal = new WahPedal(ctx);
    await flush();
    pedal.dispose();
    expect(followers[0].port.postMessage).toHaveBeenCalledWith({
      type: 'dispose',
    });

    const late = new WahPedal(ctx);
    late.dispose();
    await flush();
    expect(followers).toHaveLength(1);
  });
});
