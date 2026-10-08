import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fakeAudioGraph,
  type FakeNode,
} from '@/daw/audio/__tests__/fakeAudioGraph';
import { ReverbPedal } from '@/daw/audio/pedals/ReverbPedal';

const ir = vi.hoisted(() => ({
  getProcessedIr: vi.fn(),
  ensureProcessedIr: vi.fn(),
}));
vi.mock('@/daw/audio/reverbIR', () => ir);

/** A real IR from the shared loader (any object stands in for the buffer). */
const realIr = (name: string) => ({ name }) as unknown as AudioBuffer;

/** A promise the test settles by hand, like an IR still downloading. */
function pending<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function insides(pedal: ReverbPedal) {
  return pedal as unknown as {
    convolver: FakeNode;
    preDelay: FakeNode;
    dryGain: FakeNode;
    wetGain: FakeNode;
  };
}

/** The (space, decay in s) of each real IR the pedal asked for. */
const asked = () =>
  ir.getProcessedIr.mock.calls.map(([, type, decay]) => [type, decay]);

let graph: ReturnType<typeof fakeAudioGraph>;

beforeEach(() => {
  graph = fakeAudioGraph();
  ir.getProcessedIr.mockReset().mockReturnValue(null);
  ir.ensureProcessedIr.mockReset().mockResolvedValue(null);
});

describe('ReverbPedal: impulse responses', () => {
  it('plays the shared real IR when it has already loaded', () => {
    const hall = realIr('hall');
    ir.getProcessedIr.mockReturnValue(hall);

    const pedal = new ReverbPedal(graph.ctx);
    pedal.updateParams({ size: 1, decay: 0.5, mix: 0.3 });

    expect(insides(pedal).convolver.buffer).toBe(hall);
    expect(ir.ensureProcessedIr).not.toHaveBeenCalled();
  });

  it('holds a synthetic IR until the real one lands, then swaps it in', async () => {
    const load = pending<AudioBuffer | null>();
    ir.ensureProcessedIr.mockReturnValue(load.promise);

    const pedal = new ReverbPedal(graph.ctx);
    const synthetic = insides(pedal).convolver.buffer;
    expect(synthetic).not.toBeNull();

    const chamber = realIr('chamber');
    load.resolve(chamber);
    await load.promise;

    expect(insides(pedal).convolver.buffer).toBe(chamber);
  });

  it('drops a real IR that lands after the student picked another space', async () => {
    const chamberLoad = pending<AudioBuffer | null>();
    const hallLoad = pending<AudioBuffer | null>();
    ir.ensureProcessedIr
      .mockReturnValueOnce(chamberLoad.promise)
      .mockReturnValueOnce(hallLoad.promise);

    const pedal = new ReverbPedal(graph.ctx);
    pedal.updateParams({ size: 1 });
    const hallStandIn = insides(pedal).convolver.buffer;

    chamberLoad.resolve(realIr('chamber'));
    await chamberLoad.promise;
    expect(insides(pedal).convolver.buffer).toBe(hallStandIn);

    const hall = realIr('hall');
    hallLoad.resolve(hall);
    await hallLoad.promise;
    expect(insides(pedal).convolver.buffer).toBe(hall);
  });

  it('drops a real IR that lands after it was disposed', async () => {
    const load = pending<AudioBuffer | null>();
    ir.ensureProcessedIr.mockReturnValue(load.promise);
    const pedal = new ReverbPedal(graph.ctx);
    const standIn = insides(pedal).convolver.buffer;

    pedal.dispose();
    load.resolve(realIr('chamber'));
    await load.promise;

    expect(insides(pedal).convolver.buffer).toBe(standIn);
  });
});

describe('ReverbPedal: knobs', () => {
  it('lets Size pick the space, small to large', () => {
    const pedal = new ReverbPedal(graph.ctx);

    for (const size of [0, 0.5, 1]) {
      pedal.updateParams({ size, decay: 0.5 });
    }

    expect(asked().map(([type]) => type)).toEqual([
      'chamber',
      'room',
      'chamber',
      'hall',
    ]);
  });

  it('takes an explicit type over Size', () => {
    const pedal = new ReverbPedal(graph.ctx);

    pedal.updateParams({ size: 0, typeIdx: 3 });

    expect(asked().at(-1)?.[0]).toBe('plate');
  });

  it('maps Decay to 0.1–5 s and leaves the IR alone within a 0.1 s step', () => {
    const pedal = new ReverbPedal(graph.ctx);
    ir.getProcessedIr.mockClear();

    pedal.updateParams({ size: 0.5, decay: 0.505 });
    expect(ir.getProcessedIr).not.toHaveBeenCalled();

    pedal.updateParams({ size: 0.5, decay: 1 });
    expect(asked()).toEqual([['chamber', 5]]);
    pedal.updateParams({ size: 0.5, decay: 0 });
    expect(asked().at(-1)).toEqual(['chamber', 0.1]);
  });

  it('sets wet and dry from Mix', () => {
    const pedal = new ReverbPedal(graph.ctx);

    pedal.updateParams({ mix: 0.25 });

    expect(insides(pedal).wetGain.gain.value).toBe(0.25);
    expect(insides(pedal).dryGain.gain.value).toBe(0.75);
  });

  it('clamps knobs to 0–1 and ignores ones that are not numbers', () => {
    const pedal = new ReverbPedal(graph.ctx);
    pedal.updateParams({ mix: 0.25, preDelay: 0.5 });

    pedal.updateParams({ mix: Number.NaN, preDelay: Infinity });
    expect(insides(pedal).wetGain.gain.value).toBe(0.25);
    expect(insides(pedal).preDelay.delayTime.value).toBe(0.1);

    pedal.updateParams({ mix: 3, preDelay: -1 });
    expect(insides(pedal).wetGain.gain.value).toBe(1);
    expect(insides(pedal).dryGain.gain.value).toBe(0);
    expect(insides(pedal).preDelay.delayTime.value).toBe(0);
  });
});
