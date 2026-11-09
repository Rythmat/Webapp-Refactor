import { afterEach, describe, expect, it, vi } from 'vitest';
import { LFO } from '../LFO';
import { LFOWaveformBuilder } from '../LFOWaveformBuilder';

function fakeContext(): AudioContext {
  const node = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    playbackRate: { value: 1 },
    buffer: null,
    loop: false,
  });
  return {
    currentTime: 0,
    createGain: node,
    createBufferSource: node,
  } as unknown as AudioContext;
}

describe('LFO rebuilds', () => {
  afterEach(() => vi.restoreAllMocks());

  it('builds once per push, and nothing when a push repeats what it holds', async () => {
    const build = vi
      .spyOn(LFOWaveformBuilder, 'buildBuffer')
      .mockReturnValue({} as AudioBuffer);
    const lfo = new LFO(fakeContext());
    lfo.start();
    expect(build).toHaveBeenCalledTimes(1);

    const nodes = [
      { time: 0, value: 0 },
      { time: 0.5, value: 1, curve: 0.3 },
    ];
    for (let bar = 0; bar < 4; bar++) {
      lfo.setBarNodes(bar, nodes);
      lfo.setBarSmooth(bar, 0.2);
    }
    lfo.setBPM(97);
    await Promise.resolve();
    const afterFirstPush = build.mock.calls.length;
    // The 8 shape edits and the BPM change build one buffer between them.
    expect(afterFirstPush).toBe(1 + 1);

    // The panel's mount sync pushes the same patch again, as fresh arrays.
    for (let bar = 0; bar < 4; bar++) {
      lfo.setBarNodes(
        bar,
        nodes.map((n) => ({ ...n })),
      );
      lfo.setBarSmooth(bar, 0.2);
    }
    lfo.setBPM(97);
    await Promise.resolve();
    expect(build).toHaveBeenCalledTimes(afterFirstPush);
  });

  it('still rebuilds after the caller edits its array in place', async () => {
    const build = vi
      .spyOn(LFOWaveformBuilder, 'buildBuffer')
      .mockReturnValue({} as AudioBuffer);
    const lfo = new LFO(fakeContext());
    lfo.start();
    const nodes = [
      { time: 0, value: 0 },
      { time: 1, value: 1 },
    ];
    lfo.setBarNodes(0, nodes);
    await Promise.resolve();
    const before = build.mock.calls.length;
    nodes[1].value = 0.5;
    lfo.setBarNodes(0, nodes);
    await Promise.resolve();
    expect(build).toHaveBeenCalledTimes(before + 1);
  });
});
