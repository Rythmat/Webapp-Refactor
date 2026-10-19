import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audioBufferToWav } from '@/lib/studio-assets/encode-wav';
import {
  encodeAudioBuffer,
  resetEncodeWorkerForTests,
} from '@/daw/audio/encodeAudio';
import {
  runEncodeRequest,
  type EncodeRequest,
  type EncodeResponse,
} from '../encodeWorker';

// ── The export's encode worker (milestone 1.11) ────────────────────────────
// A rendered mix is encoded in a module worker, on copies of its channels,
// with the page's own encoders, so a WAV is byte for byte what the page
// writes (16 and 24-bit). Opus at another rate is resampled on the page
// first; a worker without WebCodecs hands Opus back to the page. Where no
// worker can be made, or it fails to start, the page encodes. A cancel ends
// the worker at once.
//
// Run: npx vitest run src/daw/workers/__tests__/encodeWorker.test.ts

const opus = vi.hoisted(() => ({
  inWorker: false,
  resampledTo: null as number | null,
  pageCalls: [] as number[],
  workerCalls: [] as number[],
  onPage: null as (() => void) | null,
}));
vi.mock('@/lib/studio-assets/encode-opus', () => ({
  isOpusEncodingSupported: () => true,
  canEncodeOpusHere: () => opus.inWorker,
  opusReadyBuffer: async (buffer: AudioBuffer) => {
    if (buffer.sampleRate === 48000) return buffer;
    opus.resampledTo = 48000;
    return fakeBuffer(
      Array.from({ length: buffer.numberOfChannels }, () =>
        new Float32Array(8).fill(0.25),
      ),
      48000,
    );
  },
  audioBufferToOpusWebm: async (buffer: AudioBuffer) => {
    opus.pageCalls.push(buffer.sampleRate);
    opus.onPage?.();
    return new Uint8Array([1, 2, 3]).buffer;
  },
  pcmToOpusWebm: async (_channels: Float32Array[], sampleRate: number) => {
    opus.workerCalls.push(sampleRate);
    return new Uint8Array([9, 9]).buffer;
  },
}));

/** An AudioBuffer as the encoders read it. */
function fakeBuffer(channels: Float32Array[], sampleRate = 44100): AudioBuffer {
  return {
    numberOfChannels: channels.length,
    sampleRate,
    length: channels[0].length,
    duration: channels[0].length / sampleRate,
    getChannelData: (ch: number) => channels[ch],
  } as unknown as AudioBuffer;
}

/** A song's worth of awkward samples: out of range, tiny, negative zero. */
function mix(): AudioBuffer {
  const frames = 4096;
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  let seed = 7;
  for (let i = 0; i < frames; i++) {
    seed = (seed * 16807) % 2147483647;
    left[i] = (seed / 2147483647) * 2.4 - 1.2;
    right[i] = Math.sin(i / 7) * 0.999;
  }
  left[0] = -0;
  left[1] = 1;
  left[2] = -1;
  right[3] = 1e-9;
  return fakeBuffer([left, right]);
}

/** A module worker that runs runEncodeRequest, with real transfers. */
class FakeWorker {
  static made: FakeWorker[] = [];
  static failToStart = false;
  /** Takes jobs and never answers. */
  static busy = false;
  onmessage: ((event: MessageEvent<EncodeResponse>) => void) | null = null;
  onerror: ((event: { preventDefault(): void }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  terminated = false;
  url: string;
  options: unknown;
  constructor(url: URL, options: unknown) {
    this.url = String(url);
    this.options = options;
    FakeWorker.made.push(this);
  }
  postMessage(request: EncodeRequest, transfer: Transferable[]) {
    const received = structuredClone(request, { transfer });
    if (FakeWorker.failToStart) {
      setTimeout(() => this.onerror?.({ preventDefault() {} }), 0);
      return;
    }
    if (FakeWorker.busy) return;
    void runEncodeRequest(received).then((response) => {
      if (this.terminated) return;
      const sent =
        'bytes' in response
          ? structuredClone(response, { transfer: [response.bytes] })
          : response;
      this.onmessage?.({ data: sent } as MessageEvent<EncodeResponse>);
    });
  }
  terminate() {
    this.terminated = true;
  }
}

const bytesOf = (b: ArrayBuffer) => Array.from(new Uint8Array(b));

beforeEach(() => {
  FakeWorker.made = [];
  FakeWorker.failToStart = false;
  FakeWorker.busy = false;
  opus.inWorker = false;
  opus.resampledTo = null;
  opus.pageCalls = [];
  opus.workerCalls = [];
  opus.onPage = null;
  resetEncodeWorkerForTests();
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WAV in the worker', () => {
  for (const bitDepth of [16, 24] as const) {
    it(`writes the very bytes the page writes (${bitDepth}-bit)`, async () => {
      const buffer = mix();
      const page = audioBufferToWav(buffer, bitDepth);
      const worker = await encodeAudioBuffer(buffer, 'wav', bitDepth);
      expect(FakeWorker.made).toHaveLength(1);
      expect(FakeWorker.made[0].url).toContain('encodeWorker');
      expect(FakeWorker.made[0].options).toEqual({ type: 'module' });
      expect(worker.byteLength).toBe(page.byteLength);
      expect(bytesOf(worker)).toEqual(bytesOf(page));
      // The buffer itself was not handed over (copies were).
      expect(buffer.getChannelData(0).length).toBe(4096);
      expect(bytesOf(audioBufferToWav(buffer, bitDepth))).toEqual(
        bytesOf(page),
      );
      // Done, the worker is ended.
      expect(FakeWorker.made[0].terminated).toBe(true);
    });
  }

  it('encodes on the page where there is no Worker (jsdom), the same bytes', async () => {
    vi.stubGlobal('Worker', undefined);
    const buffer = mix();
    const bytes = await encodeAudioBuffer(buffer, 'wav', 24);
    expect(bytesOf(bytes)).toEqual(bytesOf(audioBufferToWav(buffer, 24)));
  });

  it('encodes on the page when the worker cannot be made, from then on', async () => {
    let tries = 0;
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          tries++;
          throw new Error('SecurityError');
        }
      },
    );
    const buffer = mix();
    const first = await encodeAudioBuffer(buffer, 'wav');
    const second = await encodeAudioBuffer(buffer, 'wav');
    expect(bytesOf(first)).toEqual(bytesOf(audioBufferToWav(buffer)));
    expect(bytesOf(second)).toEqual(bytesOf(first));
    expect(tries).toBe(1);
  });

  it('encodes on the page when the worker fails to start', async () => {
    FakeWorker.failToStart = true;
    const buffer = mix();
    const bytes = await encodeAudioBuffer(buffer, 'wav', 16);
    expect(bytesOf(bytes)).toEqual(bytesOf(audioBufferToWav(buffer, 16)));
    expect(FakeWorker.made[0].terminated).toBe(true);
  });
});

describe('Cancel', () => {
  it('ends the worker and rejects with an AbortError', async () => {
    FakeWorker.busy = true;
    const controller = new AbortController();
    const done = encodeAudioBuffer(mix(), 'wav', 16, controller.signal);
    await Promise.resolve();
    expect(FakeWorker.made).toHaveLength(1);
    controller.abort();
    await expect(done).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeWorker.made[0].terminated).toBe(true);
  });

  it('on the page (no Worker), a cancel during the encode gives no bytes', async () => {
    vi.stubGlobal('Worker', undefined);
    const controller = new AbortController();
    opus.onPage = () => controller.abort();
    await expect(
      encodeAudioBuffer(mix(), 'opus', 16, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(opus.pageCalls).toEqual([44100]);
  });

  it('starts nothing once already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      encodeAudioBuffer(mix(), 'wav', 16, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeWorker.made).toHaveLength(0);
  });
});

describe('Opus', () => {
  it('is resampled to 48 kHz on the page, then encoded in the worker', async () => {
    opus.inWorker = true;
    const bytes = await encodeAudioBuffer(mix(), 'opus');
    expect(opus.resampledTo).toBe(48000);
    expect(opus.workerCalls).toEqual([48000]);
    expect(opus.pageCalls).toEqual([]);
    expect(bytesOf(bytes)).toEqual([9, 9]);
  });

  it('goes back to the page when the worker has no WebCodecs', async () => {
    opus.inWorker = false;
    const bytes = await encodeAudioBuffer(mix(), 'opus');
    expect(opus.workerCalls).toEqual([]);
    // The resampled buffer, so the page doesn't resample again.
    expect(opus.pageCalls).toEqual([48000]);
    expect(bytesOf(bytes)).toEqual([1, 2, 3]);
  });
});
