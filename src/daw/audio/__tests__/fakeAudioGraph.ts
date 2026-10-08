import { vi } from 'vitest';

/** A node of the fake graph: its kind, its connection spies and its params. */
export interface FakeNode {
  kind: string;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  gain: { value: number };
  delayTime: { value: number };
  frequency: { value: number };
  buffer: unknown;
}

/**
 * Just enough of an AudioContext for the pedal processors: every node it
 * makes is recorded, so a test can find one by kind and check whether
 * anything was rewired.
 */
export function fakeAudioGraph(sampleRate = 8000) {
  const nodes: FakeNode[] = [];
  const make = (kind: string, extra: Record<string, unknown> = {}) => {
    const node = {
      kind,
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: { value: 1 },
      delayTime: { value: 0 },
      frequency: { value: 350 },
      Q: { value: 1 },
      buffer: null,
      channelCount: 2,
      channelCountMode: 'max',
      channelInterpretation: 'speakers',
      ...extra,
    };
    nodes.push(node);
    return node;
  };
  const ctx = {
    sampleRate,
    createGain: () => make('gain'),
    createDelay: () => make('delay'),
    createConvolver: () => make('convolver'),
    createBiquadFilter: () => make('biquad', { type: 'lowpass' }),
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
    /** Every node of one kind, in the order they were made. */
    ofKind: (kind: string) => nodes.filter((n) => n.kind === kind),
    /** Forget every connect and disconnect so far. */
    clearWiring: () =>
      nodes.forEach((n) => {
        n.connect.mockClear();
        n.disconnect.mockClear();
      }),
    /** Whether anything connected or disconnected since the last clear. */
    rewired: () =>
      nodes.some(
        (n) => n.connect.mock.calls.length + n.disconnect.mock.calls.length > 0,
      ),
  };
}
