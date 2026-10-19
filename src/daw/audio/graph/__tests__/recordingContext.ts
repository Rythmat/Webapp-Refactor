// ── A fake AudioContext that keeps the graph it is wired into ───────────────
// Every node it makes gets an id (its creation index) and a kind; connect()
// and disconnect() keep a live edge list, as Web Audio does: connecting an
// existing edge is ignored, and disconnecting one that isn't there throws.

type Event = [kind: string, ...args: number[]];

export interface FakeParam {
  value: number;
  events: Event[];
  setValueAtTime(v: number, t: number): FakeParam;
  setTargetAtTime(v: number, t: number, c: number): FakeParam;
  cancelScheduledValues(t: number): FakeParam;
  linearRampToValueAtTime(v: number, t: number): FakeParam;
}

function fakeParam(value = 0): FakeParam {
  const param: FakeParam = {
    value,
    events: [],
    setValueAtTime(v, t) {
      param.events.push(['set', v, t]);
      return param;
    },
    setTargetAtTime(v, t, c) {
      param.events.push(['target', v, t, c]);
      return param;
    },
    cancelScheduledValues(t) {
      param.events.push(['cancel', t]);
      return param;
    },
    linearRampToValueAtTime(v, t) {
      param.events.push(['linear', v, t]);
      return param;
    },
  };
  return param;
}

export interface RecNode {
  id: number;
  kind: string;
  [key: string]: unknown;
}

export function recordingContext(sampleRate = 8000) {
  const nodes: RecNode[] = [];
  /** Live edges, in the order they were made. */
  const edges: Array<[from: RecNode, to: RecNode]> = [];
  /** Every connect, in order (a rewire shows up here, not in `edges`). */
  const connects: Array<[from: RecNode, to: RecNode]> = [];

  const make = (kind: string) => () => {
    const node: RecNode = {
      id: nodes.length,
      kind,
      type: '',
      oversample: 'none',
      fftSize: 2048,
      smoothingTimeConstant: 0,
      reduction: 0,
      buffer: null,
      curve: null,
      frequency: fakeParam(350),
      gain: fakeParam(1),
      Q: fakeParam(1),
      threshold: fakeParam(),
      ratio: fakeParam(),
      knee: fakeParam(),
      attack: fakeParam(),
      release: fakeParam(),
      delayTime: fakeParam(),
      connect(to: RecNode) {
        connects.push([node, to]);
        if (!edges.some(([a, b]) => a === node && b === to)) {
          edges.push([node, to]);
        }
      },
      disconnect(to?: RecNode) {
        if (to === undefined) {
          for (let i = edges.length - 1; i >= 0; i--) {
            if (edges[i][0] === node) edges.splice(i, 1);
          }
          return;
        }
        const i = edges.findIndex(([a, b]) => a === node && b === to);
        if (i < 0) throw new Error('InvalidAccessError: not connected');
        edges.splice(i, 1);
      },
      getFloatTimeDomainData(buffer: Float32Array) {
        buffer.fill(0);
      },
    };
    nodes.push(node);
    return node;
  };

  const ctx = {
    currentTime: 5,
    sampleRate,
    createGain: make('gain'),
    createBiquadFilter: make('biquad'),
    createConvolver: make('convolver'),
    createDelay: make('delay'),
    createAnalyser: make('analyser'),
    createDynamicsCompressor: make('compressor'),
    createWaveShaper: make('waveshaper'),
    createBuffer: (channels: number, length: number, rate: number) => {
      const data = Array.from(
        { length: channels },
        () => new Float32Array(length),
      );
      return {
        numberOfChannels: channels,
        length,
        sampleRate: rate,
        getChannelData: (ch: number) => data[ch],
      };
    },
  };

  return {
    ctx: ctx as unknown as AudioContext,
    nodes,
    edges,
    connects,
    /** The node's outgoing edges, in the order they were made. */
    from: (node: unknown) =>
      edges.filter(([a]) => a === node).map(([, b]) => b),
  };
}
