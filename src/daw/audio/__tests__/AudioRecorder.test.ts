import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── AudioRecorder: placement from the capture tap, failures, the mic ───────
// (milestone 1.11 d: audio-core-14, audio-core-15, engine-hooks-13)

vi.mock('tone', () => ({
  getContext: () => ({ rawContext: {} }),
  getTransport: () => ({
    bpm: { value: 120 },
    PPQ: 480,
    // Started at context time 10 from tick 0: 960 ticks a second.
    getTicksAtTime: (time: number) => Math.max(0, (time - 10) * 960),
  }),
}));

import { AudioRecorder, prepareRecording } from '../AudioRecorder';

const RATE = 8000;

/** A MediaRecorder that records what the test says it does. */
class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  static failConstruct = false;
  static failStart = false;
  static isTypeSupported = (type: string) => type === 'audio/webm;codecs=opus';
  state: 'inactive' | 'recording' = 'inactive';
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  constructor(
    readonly stream: unknown,
    options?: { mimeType?: string },
  ) {
    if (FakeMediaRecorder.failConstruct) throw new Error('NotSupportedError');
    this.mimeType = options?.mimeType ?? '';
    FakeMediaRecorder.instances.push(this);
  }
  start() {
    if (!FakeMediaRecorder.failStart) this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob([new Uint8Array([1, 2, 3])]) });
    queueMicrotask(() => this.onstop?.());
  }
}

/** The capture tap's node: answers a 'stop' with what the test queued. */
class FakeWorkletNode {
  static instances: FakeWorkletNode[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  port = {
    postMessage: (msg: { type: string }) => {
      if (msg.type === 'stop') {
        queueMicrotask(() => this.port.onmessage?.({ data: { type: 'done' } }));
      }
    },
    onmessage: null as ((e: { data: unknown }) => void) | null,
    close() {},
  };
  connect() {}
  disconnect() {}
  constructor() {
    FakeWorkletNode.instances.push(this);
  }
  /** The processor's messages. */
  emit(data: unknown) {
    this.port.onmessage?.({ data });
  }
}

function micStream(latency?: number) {
  const track = {
    stop: vi.fn(),
    getSettings: () => (latency === undefined ? {} : { latency }),
  };
  return {
    track,
    stream: {
      getTracks: () => [track],
      getAudioTracks: () => [track],
    } as unknown as MediaStream,
  };
}

/** Noise, deterministic. */
function noise(length: number): Float32Array {
  const out = new Float32Array(length);
  let x = 12345;
  for (let i = 0; i < length; i++) {
    x = (x + 0x6d2b79f5) >>> 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    out[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296 - 0.5;
  }
  return out;
}

function fakeBuffer(data: Float32Array): AudioBuffer {
  return {
    duration: data.length / RATE,
    sampleRate: RATE,
    numberOfChannels: 1,
    getChannelData: () => data,
  } as unknown as AudioBuffer;
}

function context(
  decoded: Float32Array | Error,
  withWorklet = true,
  addModule: () => Promise<void> = () => Promise.resolve(),
) {
  return {
    sampleRate: RATE,
    currentTime: 10,
    baseLatency: 0.01,
    outputLatency: 0.04,
    destination: {},
    audioWorklet: withWorklet ? { addModule: vi.fn(addModule) } : undefined,
    createMediaStreamSource: () => ({ connect() {}, disconnect() {} }),
    decodeAudioData: vi.fn(async () => {
      if (decoded instanceof Error) throw decoded;
      return fakeBuffer(decoded);
    }),
  };
}

beforeEach(() => {
  FakeMediaRecorder.instances = [];
  FakeMediaRecorder.failConstruct = false;
  FakeMediaRecorder.failStart = false;
  FakeWorkletNode.instances = [];
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  vi.stubGlobal('AudioWorkletNode', FakeWorkletNode);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a take placed by the capture tap', () => {
  it('lands at the tick heard at its first frame, lined up with the decoded audio', async () => {
    const source = noise(RATE * 4);
    // The decoded audio starts 30 ms after the tap's first frame.
    const shift = Math.round(0.03 * RATE);
    const ctx = context(source.slice(shift));
    // The module is loaded ahead, so the tap starts first.
    prepareRecording(ctx as unknown as BaseAudioContext);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const { stream } = micStream(0.02);
    const recorder = new AudioRecorder();
    await recorder.startRecording(stream, {
      ownsStream: true,
      context: ctx as unknown as BaseAudioContext,
      transportStart: () => 10,
    });
    expect(recorder.isRecording()).toBe(true);
    const [tap] = FakeWorkletNode.instances;
    // First frame at 12.07 s: heard 12.07 − 0.02 (input) − 0.01 (base)
    // − 0.04 (output) = 12 s, and the decoded audio starts 30 ms later.
    tap.emit({ type: 'start', contextTime: 12.07 });
    tap.emit({ type: 'pcm', channels: [source.slice(0, RATE * 2.5)] });

    const result = await recorder.stopRecording(ctx as unknown as AudioContext);
    expect(result.placement?.startTick).toBe(1949);
    expect(result.placement?.offsetSeconds).toBe(0);
    expect(result.originalContentType).toBe('audio/webm;codecs=opus');
  });

  it('counts the base and output latency when the track gives none', async () => {
    const source = noise(RATE * 4);
    const ctx = context(source);
    const { stream } = micStream();
    const recorder = new AudioRecorder();
    await recorder.startRecording(stream, {
      context: ctx as unknown as BaseAudioContext,
      transportStart: () => 10,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const [tap] = FakeWorkletNode.instances;
    // 11.05 − 0.01 − 0.04 = 11 s: 960 ticks.
    tap.emit({ type: 'start', contextTime: 11.05 });
    tap.emit({ type: 'pcm', channels: [source.slice(0, RATE * 2.5)] });
    const result = await recorder.stopRecording(ctx as unknown as AudioContext);
    expect(result.placement?.startTick).toBe(960);
  });

  it('keeps a take stopped while the tap is still loading, trimmed to the start', async () => {
    const ctx = context(noise(RATE), true, () => new Promise<void>(() => {}));
    const { stream } = micStream();
    const recorder = new AudioRecorder();
    // The recorder started at context time 10; the transport at 10.1.
    await recorder.startRecording(stream, {
      context: ctx as unknown as BaseAudioContext,
      transportStart: () => 10.1,
    });
    expect(recorder.isRecording()).toBe(true);
    const result = await recorder.stopRecording(ctx as unknown as AudioContext);
    expect(result.placement).toBeUndefined();
    expect(result.leadSeconds).toBeCloseTo(0.1, 9);
    expect(result.buffer.duration).toBe(1);
  });

  it('is placed by the caller where AudioWorklet is missing', async () => {
    const ctx = context(noise(RATE), false);
    const { stream } = micStream();
    const recorder = new AudioRecorder();
    await recorder.startRecording(stream, {
      context: ctx as unknown as BaseAudioContext,
    });
    const result = await recorder.stopRecording(ctx as unknown as AudioContext);
    expect(result.placement).toBeUndefined();
    expect(result.buffer.duration).toBe(1);
  });
});

describe('the microphone', () => {
  it('is let go after every take the recorder opened it for', async () => {
    const ctx = context(noise(RATE));
    const { stream, track } = micStream();
    const recorder = new AudioRecorder();
    await recorder.startRecording(stream, {
      ownsStream: true,
      context: ctx as unknown as BaseAudioContext,
    });
    expect(track.stop).not.toHaveBeenCalled();
    await recorder.stopRecording(ctx as unknown as AudioContext);
    expect(track.stop).toHaveBeenCalled();
  });

  it("is left running when it is an adapter's stream", async () => {
    const ctx = context(noise(RATE));
    const { stream, track } = micStream();
    const recorder = new AudioRecorder();
    await recorder.startRecording(stream, {
      context: ctx as unknown as BaseAudioContext,
    });
    await recorder.stopRecording(ctx as unknown as AudioContext);
    recorder.dispose();
    expect(track.stop).not.toHaveBeenCalled();
  });
});

describe('failures', () => {
  it('a recorder the browser cannot make: rejects, not recording, mic let go', async () => {
    FakeMediaRecorder.failConstruct = true;
    const ctx = context(noise(RATE));
    const { stream, track } = micStream();
    const recorder = new AudioRecorder();
    await expect(
      recorder.startRecording(stream, {
        ownsStream: true,
        context: ctx as unknown as BaseAudioContext,
      }),
    ).rejects.toThrow('NotSupportedError');
    expect(recorder.isRecording()).toBe(false);
    expect(track.stop).toHaveBeenCalled();
  });

  it('a recorder that never starts is not recording', async () => {
    FakeMediaRecorder.failStart = true;
    const ctx = context(noise(RATE));
    const { stream } = micStream();
    const recorder = new AudioRecorder();
    await expect(
      recorder.startRecording(stream, {
        context: ctx as unknown as BaseAudioContext,
      }),
    ).rejects.toThrow();
    expect(recorder.isRecording()).toBe(false);
  });

  it('a take that cannot be decoded rejects the stop', async () => {
    const ctx = context(new Error('EncodingError'));
    const { stream, track } = micStream();
    const recorder = new AudioRecorder();
    await recorder.startRecording(stream, {
      ownsStream: true,
      context: ctx as unknown as BaseAudioContext,
    });
    await expect(
      recorder.stopRecording(ctx as unknown as AudioContext),
    ).rejects.toThrow('EncodingError');
    expect(recorder.isRecording()).toBe(false);
    expect(track.stop).toHaveBeenCalled();
  });

  it('an error mid-take is reported, and the mic let go', async () => {
    const ctx = context(noise(RATE));
    const { stream, track } = micStream();
    const onError = vi.fn();
    const recorder = new AudioRecorder();
    await recorder.startRecording(stream, {
      ownsStream: true,
      onError,
      context: ctx as unknown as BaseAudioContext,
    });
    FakeMediaRecorder.instances[0].onerror?.({ error: new Error('gone') });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(recorder.isRecording()).toBe(false);
    expect(track.stop).toHaveBeenCalled();
  });
});
