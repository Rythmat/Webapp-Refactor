import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAudioGraph } from './fakeAudioGraph';
import { GuitarPedalChain } from '@/daw/audio/GuitarPedalChain';
import type {
  PedalBlockDescriptor,
  PedalProcessor,
} from '@/daw/audio/pedals/PedalProcessor';

// The reverb's real IRs are fetched; here it keeps its synthetic stand-in.
vi.mock('@/daw/audio/reverbIR', () => ({
  getProcessedIr: vi.fn(() => null),
  ensureProcessedIr: vi.fn(() => Promise.resolve(null)),
}));

/** The vocal catalog's Delay and Reverb blocks (VocalView PEDAL_CATALOG). */
const delayBlock = (params: Record<string, number> = {}) => ({
  type: 'delay',
  enabled: true,
  params: { time: 0.4, feedback: 0.3, mix: 0.4, ...params },
});
const reverbBlock = (params: Record<string, number> = {}) => ({
  type: 'reverb',
  enabled: true,
  params: { size: 0.5, decay: 0.5, mix: 0.3, ...params },
});

function processorsOf(chain: GuitarPedalChain): PedalProcessor[] {
  return (chain as unknown as { processors: PedalProcessor[] }).processors;
}

let graph: ReturnType<typeof fakeAudioGraph>;
let chain: GuitarPedalChain;

beforeEach(() => {
  graph = fakeAudioGraph();
  chain = new GuitarPedalChain(graph.ctx);
});

describe('GuitarPedalChain: Delay and Reverb', () => {
  it('builds a processor for each, wired in block order', () => {
    chain.syncChain([delayBlock(), reverbBlock()]);

    const [delay, reverb] = processorsOf(chain);
    expect(processorsOf(chain).map((p) => p.type)).toEqual(['delay', 'reverb']);
    expect(chain.getInputNode().connect).toHaveBeenCalledWith(
      delay.getInputNode(),
    );
    expect(delay.getOutputNode().connect).toHaveBeenCalledWith(
      reverb.getInputNode(),
    );
    expect(reverb.getOutputNode().connect).toHaveBeenCalledWith(
      chain.getOutputNode(),
    );
    // Its empty-chain input→output bypass was replaced.
    expect(chain.getInputNode().connect).toHaveBeenLastCalledWith(
      delay.getInputNode(),
    );
  });

  it('applies the knobs of the blocks it builds', () => {
    chain.syncChain([delayBlock({ time: 0.25 }), reverbBlock()]);

    const [delayLine] = graph.ofKind('delay');
    expect(delayLine.delayTime.value).toBe(0.25);
    expect(graph.ofKind('convolver')[0].buffer).not.toBeNull();
  });

  it('takes a knob edit on the fast path, with no rewiring', () => {
    chain.syncChain([delayBlock(), reverbBlock()]);
    const before = [...processorsOf(chain)];
    graph.clearWiring();

    const took = chain.updateProcessorParams([
      delayBlock({ time: 0.75, feedback: 0.5 }),
      reverbBlock({ mix: 0.5 }),
    ]);

    expect(took).toBe(true);
    expect(graph.rewired()).toBe(false);
    expect(processorsOf(chain)).toEqual(before);
    const [delayLine] = graph.ofKind('delay');
    expect(delayLine.delayTime.value).toBe(0.75);
  });

  it('keeps the processors through a full sync of the same chain', () => {
    chain.syncChain([delayBlock(), reverbBlock()]);
    const [delay, reverb] = processorsOf(chain);
    const disposeDelay = vi.spyOn(delay, 'dispose');
    const disposeReverb = vi.spyOn(reverb, 'dispose');

    chain.syncChain([delayBlock({ mix: 0.2 }), reverbBlock({ decay: 0.1 })]);

    expect(processorsOf(chain)).toEqual([delay, reverb]);
    expect(disposeDelay).not.toHaveBeenCalled();
    expect(disposeReverb).not.toHaveBeenCalled();
  });

  it('switches a bypassed Delay or Reverb through the fast path', () => {
    chain.syncChain([delayBlock(), reverbBlock()]);
    graph.clearWiring();

    const took = chain.updateProcessorParams([
      { ...delayBlock(), enabled: false },
      reverbBlock(),
    ]);

    // Only the bypassed pedal's own insides move; the chain stays put.
    expect(took).toBe(true);
    expect(chain.getInputNode().connect).not.toHaveBeenCalled();
    expect(chain.getInputNode().disconnect).not.toHaveBeenCalled();
  });
});

describe('GuitarPedalChain: a block type it has no processor for', () => {
  const unknownBlock: PedalBlockDescriptor = {
    type: 'tape-echo',
    enabled: true,
    params: { wow: 0.2 },
  };

  it('passes the signal through and keeps the fast path', () => {
    chain.syncChain([unknownBlock, delayBlock()]);
    const [standIn, delay] = processorsOf(chain);
    expect(standIn.type).toBe('tape-echo');
    expect(standIn.getInputNode()).toBe(standIn.getOutputNode());
    expect(standIn.getOutputNode().connect).toHaveBeenCalledWith(
      delay.getInputNode(),
    );

    graph.clearWiring();
    expect(
      chain.updateProcessorParams([unknownBlock, delayBlock({ mix: 0.9 })]),
    ).toBe(true);
    expect(graph.rewired()).toBe(false);
  });

  it('keeps the pedals after it on a full sync', () => {
    const eqBlock = (low: number) => ({
      type: 'eq',
      enabled: true,
      params: { low, mid: 0.5, high: 0.5 },
    });
    const eqOf = () => processorsOf(chain).find((p) => p.type === 'eq');
    chain.syncChain([unknownBlock, eqBlock(0.5)]);
    const eq = eqOf();
    const disposeEq = vi.spyOn(eq!, 'dispose');

    chain.syncChain([unknownBlock, eqBlock(0.7)]);

    expect(eqOf()).toBe(eq);
    expect(disposeEq).not.toHaveBeenCalled();
  });
});
