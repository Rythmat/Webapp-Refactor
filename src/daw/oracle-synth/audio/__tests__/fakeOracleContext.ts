import { vi } from 'vitest';

type ParamEvent =
  | { kind: 'set'; time: number; value: number }
  | { kind: 'linear'; time: number; value: number }
  | { kind: 'target'; time: number; value: number; tc: number };

/**
 * An AudioParam that records its automation and can evaluate it: valueAt(t)
 * follows the Web Audio rules for setValueAtTime, linearRampToValueAtTime,
 * setTargetAtTime and cancelScheduledValues closely enough to check levels
 * and pitches at a given time.
 */
export class FakeParam {
  value: number;
  events: ParamEvent[] = [];
  constructor(value = 0) {
    this.value = value;
  }
  private insert(event: ParamEvent) {
    let i = this.events.length;
    while (i > 0 && this.events[i - 1].time > event.time) i--;
    this.events.splice(i, 0, event);
  }
  setValueAtTime(value: number, time: number) {
    if (!Number.isFinite(value)) throw new TypeError('non-finite value');
    this.insert({ kind: 'set', time, value });
    return this;
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.insert({ kind: 'linear', time, value });
    return this;
  }
  setTargetAtTime(value: number, time: number, tc: number) {
    if (!Number.isFinite(value)) throw new TypeError('non-finite value');
    this.insert({ kind: 'target', time, value, tc });
    return this;
  }
  cancelScheduledValues(time: number) {
    this.events = this.events.filter((e) => e.time < time);
    return this;
  }
  /** The param's value at context time t. */
  valueAt(t: number): number {
    let v = this.value;
    let prevTime = 0;
    let target: {
      from: number;
      start: number;
      value: number;
      tc: number;
    } | null = null;
    const settle = (until: number) => {
      if (!target) return v;
      if (target.tc <= 0) return target.value;
      return (
        target.value +
        (target.from - target.value) *
          Math.exp(-(until - target.start) / target.tc)
      );
    };
    for (const e of this.events) {
      if (e.kind === 'linear') {
        const from = settle(prevTime);
        target = null;
        if (t < e.time) {
          const span = e.time - prevTime;
          return span > 0
            ? from + ((e.value - from) * (t - prevTime)) / span
            : e.value;
        }
        v = e.value;
        prevTime = e.time;
        continue;
      }
      if (e.time > t) break;
      if (e.kind === 'set') {
        target = null;
        v = e.value;
      } else {
        v = settle(e.time);
        target = { from: v, start: e.time, value: e.value, tc: e.tc };
      }
      prevTime = e.time;
    }
    return target ? settle(t) : v;
  }
}

const PARAM_DEFAULTS: Record<string, number> = {
  gain: 1,
  frequency: 440,
  detune: 0,
  pan: 0,
  offset: 1,
  Q: 1,
  playbackRate: 1,
  delayTime: 0,
  threshold: -24,
  knee: 30,
  ratio: 12,
  attack: 0.003,
  release: 0.25,
};

export interface FakeNode {
  kind: string;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
  [param: string]: unknown;
}

/** The FakeParam behind a node's param (gain, frequency, detune, …). */
export function param(node: FakeNode, name: string): FakeParam {
  return node[name] as FakeParam;
}

/**
 * Just enough of an AudioContext to build the Oracle engine: every node is
 * recorded with its params (FakeParam), start/stop spies and an `onended` a
 * test can fire with `endSources(t)`.
 */
export function fakeOracleContext(sampleRate = 8000) {
  const nodes: FakeNode[] = [];
  let currentTime = 0;
  const make = (kind: string): FakeNode => {
    const base: Record<string, unknown> = {
      kind,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
      setPeriodicWave: vi.fn(),
      getFrequencyResponse: vi.fn(),
      type: kind === 'oscillator' ? 'sine' : 'lowpass',
      buffer: null,
      loop: false,
      curve: null,
      fftSize: 2048,
      frequencyBinCount: 1024,
      channelCount: 2,
      channelCountMode: 'max',
      channelInterpretation: 'speakers',
    };
    const node = new Proxy(base, {
      get(target, prop) {
        if (
          typeof prop === 'string' &&
          !(prop in target) &&
          prop in PARAM_DEFAULTS
        ) {
          target[prop] = new FakeParam(PARAM_DEFAULTS[prop]);
        }
        return target[prop as string];
      },
    }) as unknown as FakeNode;
    nodes.push(node);
    return node;
  };
  const destination = make('destination');
  const ctx = {
    get currentTime() {
      return currentTime;
    },
    sampleRate,
    state: 'running',
    destination,
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    createGain: () => make('gain'),
    createOscillator: () => make('oscillator'),
    createConstantSource: () => make('constant'),
    createBufferSource: () => make('bufferSource'),
    createStereoPanner: () => make('panner'),
    createBiquadFilter: () => make('biquad'),
    createWaveShaper: () => make('waveshaper'),
    createAnalyser: () => make('analyser'),
    createDelay: () => make('delay'),
    createConvolver: () => make('convolver'),
    createDynamicsCompressor: () => make('compressor'),
    createChannelMerger: () => make('merger'),
    createPeriodicWave: () => ({}),
    createBuffer: (channels: number, length: number, rate: number) => {
      const data = Array.from(
        { length: channels },
        () => new Float32Array(length),
      );
      return {
        numberOfChannels: channels,
        length,
        sampleRate: rate,
        duration: length / rate,
        getChannelData: (ch: number) => data[ch],
        copyToChannel: (src: Float32Array, ch: number) => data[ch].set(src),
      };
    },
  };
  /** The start time a source node was given (start() → now). */
  const startTime = (n: FakeNode): number => {
    const call = n.start.mock.calls[0];
    return call && call[0] !== undefined ? (call[0] as number) : 0;
  };
  /** The last stop time a source was given (Infinity if never stopped). */
  const stopTime = (n: FakeNode): number => {
    const calls = n.stop.mock.calls;
    if (calls.length === 0) return Infinity;
    const last = calls[calls.length - 1][0];
    return last === undefined ? 0 : (last as number);
  };
  return {
    ctx: ctx as unknown as AudioContext,
    nodes,
    setTime: (t: number) => {
      currentTime = t;
    },
    ofKind: (kind: string) => nodes.filter((n) => n.kind === kind),
    startTime,
    stopTime,
    /** Fires onended on every source whose stop time is at or before t. */
    endSources: (t: number) => {
      for (const n of nodes) {
        if (n.onended && stopTime(n) <= t) n.onended();
      }
    },
  };
}
