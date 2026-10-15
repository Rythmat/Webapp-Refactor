import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Reverb IRs are cached per sample rate (audio-core-01) ──────────────────
// A ConvolverNode throws on a buffer of another rate. The live engine decodes
// Return A's hall IR at the device rate as it starts; an export used to pick
// that buffer up for its own offline context, so every export on a 48 kHz
// device failed and left Tone on the dead offline context.

const MANIFEST = {
  irs: [
    {
      id: 'hall-1',
      type: 'hall',
      name: 'Hall',
      file: 'hall.wav',
      decaySeconds: 3,
      gain: 1,
      license: 'test',
      sourceName: 'test',
      attribution: 'test',
    },
  ],
};

function fakeBuffer(sampleRate: number, length: number, channels = 2) {
  const data = Array.from({ length: channels }, () =>
    new Float32Array(length).fill(0.5),
  );
  return {
    sampleRate,
    length,
    numberOfChannels: channels,
    duration: length / sampleRate,
    getChannelData: (c: number) => data[c],
  } as unknown as AudioBuffer;
}

/** A context at `rate` that logs each decode it is asked for. */
function fakeContext(rate: number) {
  const ctx = {
    sampleRate: rate,
    decodes: 0,
    decodeAudioData: async () => {
      ctx.decodes++;
      // decodeAudioData resamples to the context's rate.
      return fakeBuffer(rate, rate * 3);
    },
    createBuffer: (channels: number, length: number, sampleRate: number) =>
      fakeBuffer(sampleRate, length, channels),
  };
  return ctx;
}

const asContext = (ctx: ReturnType<typeof fakeContext>) =>
  ctx as unknown as BaseAudioContext;

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MANIFEST),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        url,
      }),
    ),
  );
});

describe('reverbIR caches', () => {
  it('gives each context an IR at its own rate', async () => {
    const { ensureProcessedIr } = await import('../reverbIR');
    const live = fakeContext(48000);
    const offline = fakeContext(44100);
    const liveIr = await ensureProcessedIr(asContext(live), 'hall', 2);
    const offlineIr = await ensureProcessedIr(asContext(offline), 'hall', 2);
    expect(liveIr?.sampleRate).toBe(48000);
    expect(offlineIr?.sampleRate).toBe(44100);
    expect(offline.decodes).toBe(1);
  });

  it("never hands one rate's IR to a context at another", async () => {
    const { ensureProcessedIr, getProcessedIr } = await import('../reverbIR');
    await ensureProcessedIr(asContext(fakeContext(48000)), 'hall', 2);
    // Not decoded at 44.1 kHz yet: stay on the synthetic IR.
    expect(getProcessedIr(asContext(fakeContext(44100)), 'hall', 2)).toBe(null);
  });

  it('decodes once per rate and serves the rest from the cache', async () => {
    const { ensureProcessedIr, getProcessedIr } = await import('../reverbIR');
    const live = fakeContext(48000);
    const [a, b] = await Promise.all([
      ensureProcessedIr(asContext(live), 'hall', 2),
      ensureProcessedIr(asContext(live), 'hall', 2),
    ]);
    expect(live.decodes).toBe(1);
    expect(a).toBe(b);
    // A second context at the same rate (another chain) shares it.
    expect(getProcessedIr(asContext(fakeContext(48000)), 'hall', 2)).toBe(a);
  });
});
