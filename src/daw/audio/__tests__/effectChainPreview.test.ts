import { describe, expect, it, vi } from 'vitest';

// ── An effect chain previewing a moving knob (milestone 1.9) ───────────────
// While a knob moves, the chain glides to each value instead of stepping at
// the pointer's rate (audio-core-16), keeps its reverb impulse response
// until the release, and swaps no waveshaper curve that didn't change.

vi.mock('../reverbIR', () => ({
  getProcessedIr: () => null,
  ensureProcessedIr: () => Promise.resolve(null),
}));

import {
  DEFAULT_EFFECTS,
  EffectChain,
  PARAM_GLIDE_S,
  type TrackEffectState,
} from '../EffectChain';

type Event = [kind: string, ...args: number[]];

function fakeParam(value = 0) {
  const param = {
    value,
    events: [] as Event[],
    setValueAtTime(v: number, t: number) {
      param.events.push(['set', v, t]);
      return param;
    },
    setTargetAtTime(v: number, t: number, c: number) {
      param.events.push(['target', v, t, c]);
      return param;
    },
    cancelScheduledValues(t: number) {
      param.events.push(['cancel', t]);
      return param;
    },
    linearRampToValueAtTime() {
      return param;
    },
  };
  return param;
}

function fakeNode() {
  const node = {
    connect() {},
    disconnect() {},
    frequency: fakeParam(350),
    gain: fakeParam(1),
    Q: fakeParam(1),
    threshold: fakeParam(),
    ratio: fakeParam(),
    knee: fakeParam(),
    attack: fakeParam(),
    release: fakeParam(),
    delayTime: fakeParam(),
    pan: fakeParam(),
    type: '',
    bufferSets: 0,
    curveSets: 0,
    _buffer: null as unknown,
    _curve: null as unknown,
    get buffer() {
      return node._buffer;
    },
    set buffer(value: unknown) {
      node.bufferSets += 1;
      node._buffer = value;
    },
    get curve() {
      return node._curve;
    },
    set curve(value: unknown) {
      node.curveSets += 1;
      node._curve = value;
    },
    oversample: 'none',
    fftSize: 2048,
    smoothingTimeConstant: 0,
    reduction: 0,
  };
  return node;
}

const ctx = {
  currentTime: 5,
  sampleRate: 8000,
  createGain: fakeNode,
  createBiquadFilter: fakeNode,
  createConvolver: fakeNode,
  createDelay: fakeNode,
  createAnalyser: fakeNode,
  createDynamicsCompressor: fakeNode,
  createWaveShaper: fakeNode,
  createStereoPanner: fakeNode,
  createBuffer: (channels: number, length: number, sampleRate: number) => ({
    numberOfChannels: channels,
    length,
    sampleRate,
    getChannelData: () => new Float32Array(length),
  }),
} as unknown as AudioContext;

type Fake = ReturnType<typeof fakeNode>;
const nodes = (chain: EffectChain) =>
  chain as unknown as {
    reverbWetGain: Fake;
    reverbConvolver: Fake;
    crushNode: Fake;
    stopGateLoop(): void;
  };

function withReverb(wet: number, decay = 2): TrackEffectState {
  const effects = structuredClone(DEFAULT_EFFECTS);
  effects.reverb = { ...effects.reverb, enabled: true, wet, decay };
  return effects;
}

function chainWith(state: TrackEffectState): EffectChain {
  const chain = new EffectChain(ctx);
  nodes(chain).stopGateLoop();
  chain.update(state);
  return chain;
}

describe('EffectChain previews', () => {
  it('glides a moving knob rather than stepping', () => {
    const chain = chainWith(withReverb(0.2));
    const wet = nodes(chain).reverbWetGain.gain;
    wet.events.length = 0;

    chain.update(withReverb(0.5), { glide: true });
    expect(wet.events).toEqual([['target', 0.5, 5, PARAM_GLIDE_S]]);
    expect(wet.value).toBe(0.2);
  });

  it("sets a new chain's first state at once, even asked to glide", () => {
    const chain = new EffectChain(ctx);
    nodes(chain).stopGateLoop();
    chain.update(withReverb(0.4), { glide: true });
    expect(nodes(chain).reverbWetGain.gain.value).toBe(0.4);
  });

  it("builds the reverb's impulse response on release, not for every Decay step", () => {
    const chain = chainWith(withReverb(0.3, 2));
    const convolver = nodes(chain).reverbConvolver;
    const built = convolver.bufferSets;

    chain.update(withReverb(0.3, 3), { glide: true, deferIr: true });
    chain.update(withReverb(0.3, 4), { glide: true, deferIr: true });
    expect(convolver.bufferSets).toBe(built);

    // The release's update, without deferIr, builds it once.
    chain.update(withReverb(0.3, 4), { glide: true });
    expect(convolver.bufferSets).toBe(built + 1);
  });

  it('replaces a waveshaper curve only when its amount moved', () => {
    const effects = structuredClone(DEFAULT_EFFECTS);
    effects.compressor = { ...effects.compressor, enabled: true, crush: 0.3 };
    const chain = chainWith(effects);
    const crush = nodes(chain).crushNode;
    const sets = crush.curveSets;

    chain.update(
      { ...effects, compressor: { ...effects.compressor, ratio: 8 } },
      { glide: true },
    );
    expect(crush.curveSets).toBe(sets);

    chain.update({
      ...effects,
      compressor: { ...effects.compressor, crush: 0.6 },
    });
    expect(crush.curveSets).toBe(sets + 1);
  });
});
