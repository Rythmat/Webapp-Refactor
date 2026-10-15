import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EFFECTS,
  EffectChain,
  type TrackEffectState,
} from '../EffectChain';

// ── Switching the EQ off glides its cut filters (no thump on Bypass) ───────
// A disabled EQ parks its low cut at 1 Hz. Jumping a 30 Hz low cut there
// rings out as a low thump for about a second, and mastering Bypass switches
// every slot off on each A/B, so the cutoff now glides. A new chain's first
// update still jumps: nobody has heard it yet, and a bounce must start exact.

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
  return {
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
    buffer: null,
    curve: null,
    oversample: 'none',
    fftSize: 2048,
    smoothingTimeConstant: 0,
    reduction: 0,
  };
}

const ctx = {
  currentTime: 5,
  sampleRate: 44100,
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

const effects = (eqOn: boolean): TrackEffectState => ({
  ...structuredClone(DEFAULT_EFFECTS),
  eq: { ...structuredClone(DEFAULT_EFFECTS.eq), enabled: eqOn },
});

/** The 30 Hz low cut's frequency param (band 0). */
const lowCut = (chain: EffectChain) =>
  (
    chain as unknown as {
      eqFilterGroups: Array<Array<{ frequency: ReturnType<typeof fakeParam> }>>;
    }
  ).eqFilterGroups[0][0].frequency;

describe('EffectChain EQ on/off', () => {
  it('glides the low cut to its parked cutoff when the EQ goes off', () => {
    const chain = new EffectChain(ctx);
    chain.update(effects(true));
    const param = lowCut(chain);
    param.events.length = 0;

    chain.update(effects(false));
    expect(param.events).toContainEqual(['target', 1, 5, 0.05]);
    // No instant jump: the value is left to the glide.
    expect(param.value).toBe(30);
  });

  it('glides back when the EQ comes on again', () => {
    const chain = new EffectChain(ctx);
    chain.update(effects(true));
    chain.update(effects(false));
    const param = lowCut(chain);
    param.events.length = 0;

    chain.update(effects(true));
    expect(param.events).toContainEqual(['target', 30, 5, 0.05]);
  });

  it("sets a new chain's first state at once (a bounce starts exact)", () => {
    const chain = new EffectChain(ctx);
    chain.update(effects(true));
    const param = lowCut(chain);
    expect(param.value).toBe(30);
    expect(param.events.some(([kind]) => kind === 'target')).toBe(false);
  });

  it('moves a knob on an EQ that stays on at once, as before', () => {
    const chain = new EffectChain(ctx);
    chain.update(effects(true));
    const param = lowCut(chain);
    param.events.length = 0;
    const moved = effects(true);
    moved.eq.bands[0] = { ...moved.eq.bands[0], freq: 80 };
    chain.update(moved);
    expect(param.value).toBe(80);
    expect(param.events).toEqual([]);
  });
});
