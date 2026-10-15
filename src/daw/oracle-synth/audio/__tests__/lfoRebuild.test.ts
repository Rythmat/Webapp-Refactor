import { afterEach, describe, expect, it, vi } from 'vitest';
import { LFO } from '../LFO';
import { LFOWaveformBuilder } from '../LFOWaveformBuilder';

function fakeContext(): AudioContext {
  const node = () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    gain: { value: 1 },
    playbackRate: { value: 1 },
    buffer: null,
    loop: false,
  });
  return {
    createGain: node,
    createBufferSource: node,
  } as unknown as AudioContext;
}

describe('LFO rebuilds', () => {
  afterEach(() => vi.restoreAllMocks());

  it('builds nothing when a patch push repeats what it holds', () => {
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
    const afterFirstPush = build.mock.calls.length;
    expect(afterFirstPush).toBe(1 + 9);

    // The panel's mount sync pushes the same patch again, as fresh arrays.
    for (let bar = 0; bar < 4; bar++) {
      lfo.setBarNodes(
        bar,
        nodes.map((n) => ({ ...n })),
      );
      lfo.setBarSmooth(bar, 0.2);
    }
    lfo.setBPM(97);
    expect(build).toHaveBeenCalledTimes(afterFirstPush);
  });

  it('still rebuilds after the caller edits its array in place', () => {
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
    const before = build.mock.calls.length;
    nodes[1].value = 0.5;
    lfo.setBarNodes(0, nodes);
    expect(build).toHaveBeenCalledTimes(before + 1);
  });
});
