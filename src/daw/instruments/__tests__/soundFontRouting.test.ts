import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundFontAdapter } from '../SoundFontAdapter';

// ── Each SoundFont track hears only its own channel (instruments-01) ───────
// All GM tracks share one SpessaSynth worklet. Its connect() wires all 17
// outputs (16 channels plus the GS reverb/chorus send), so every track's
// strip used to get every channel: doubled level, and mute/solo/FX that
// couldn't isolate a track.

type Call = [method: string, ...args: unknown[]];

const synth = vi.hoisted(() => ({ calls: [] as Call[] }));

vi.mock('spessasynth_lib', () => ({
  WorkletSynthesizer: class {
    isReady = Promise.resolve();
    soundBankManager = { addSoundBank: () => Promise.resolve() };
    connect(...args: unknown[]) {
      synth.calls.push(['connect', ...args]);
    }
    disconnect(...args: unknown[]) {
      synth.calls.push(['disconnect', ...args]);
    }
    connectChannel(...args: unknown[]) {
      // An export's offline graph: out of the live synth's reach.
      if ((args[0] as { offline?: boolean }).offline) {
        throw new Error('different audio context');
      }
      synth.calls.push(['connectChannel', ...args]);
    }
    disconnectChannel(...args: unknown[]) {
      synth.calls.push(['disconnectChannel', ...args]);
    }
    setSystemParameter(...args: unknown[]) {
      synth.calls.push(['setSystemParameter', ...args]);
    }
    programChange() {}
    controllerChange() {}
  },
}));

const ctx = {
  state: 'running',
  destination: { name: 'speakers' },
  audioWorklet: { addModule: () => Promise.resolve() },
  createConstantSource: () => ({
    offset: { value: 0 },
    start() {},
    stop() {},
    connect() {},
    disconnect() {},
  }),
} as unknown as AudioContext;

/** A track input as Tone wraps it, around its native node. */
const trackInput = (name: string) =>
  ({ _nativeAudioNode: { name } }) as unknown as AudioNode;

const nativeOf = (node: AudioNode) =>
  (node as unknown as { _nativeAudioNode: object })._nativeAudioNode;

const callsOf = (method: string) =>
  synth.calls.filter(([name]) => name === method).map(([, ...args]) => args);

beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      }),
    ),
  );
});

beforeEach(() => {
  synth.calls.length = 0;
});

describe('SoundFontAdapter routing', () => {
  it('connects each track to its own channel only', async () => {
    const bassInput = trackInput('bass');
    const chordsInput = trackInput('chords');
    const bass = new SoundFontAdapter(33);
    const chords = new SoundFontAdapter(4);
    await bass.init(ctx, bassInput);
    await chords.init(ctx, chordsInput);

    expect(bass.getChannel()).not.toBe(chords.getChannel());
    expect(callsOf('connectChannel')).toEqual([
      [nativeOf(bassInput), bass.getChannel()],
      [nativeOf(chordsInput), chords.getChannel()],
    ]);
    expect(callsOf('connect')).toEqual([]);

    bass.dispose();
    chords.dispose();
  });

  it('dispose unwires its own channel and nothing else', async () => {
    // The Learn backing track points both adapters at the same node.
    const speakers = trackInput('speakers');
    const bass = new SoundFontAdapter(33);
    const chords = new SoundFontAdapter(4);
    await bass.init(ctx, speakers);
    await chords.init(ctx, speakers);
    synth.calls.length = 0;

    bass.dispose();
    expect(synth.calls).toEqual([
      ['disconnectChannel', nativeOf(speakers), bass.getChannel()],
    ]);
    chords.dispose();
  });
});

describe('a failed init', () => {
  it('hands its channel back, so exports do not use channels up', async () => {
    const offlineCtx = {
      ...ctx,
      destination: { offline: true },
    } as unknown as AudioContext;
    const offlineInput = {
      _nativeAudioNode: { offline: true },
    } as unknown as AudioNode;
    const bounced = new SoundFontAdapter(33);
    await expect(bounced.init(offlineCtx, offlineInput)).rejects.toThrow(
      'different audio context',
    );
    // All 15 melodic channels are still free for live tracks: none of them
    // has to share (and so hear another track).
    const live = Array.from({ length: 15 }, () => new SoundFontAdapter(0));
    for (const [i, adapter] of live.entries()) {
      await adapter.init(ctx, trackInput(`track-${i}`));
    }
    expect(new Set(live.map((a) => a.getChannel())).size).toBe(15);
    for (const adapter of live) adapter.dispose();
  });
});

describe('the shared synth', () => {
  // Nothing listens to its GS reverb/chorus output any more.
  it('starts with its effects off', async () => {
    vi.resetModules();
    synth.calls.length = 0;
    const { SoundFontAdapter: Fresh } = await import('../SoundFontAdapter');
    const adapter = new Fresh(0);
    await adapter.init(ctx, trackInput('lead'));
    expect(callsOf('setSystemParameter')).toEqual([['effectsEnabled', false]]);
    adapter.dispose();
  });
});
