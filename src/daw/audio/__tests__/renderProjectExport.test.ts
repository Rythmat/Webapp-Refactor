import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EFFECTS, type TrackEffectState } from '../EffectChain';
import { renderProject } from '../renderProject';

// ── Export: device rate, Tone always handed back, mastering kept ───────────
// audio-core-01: the bounce rendered at a fixed 44.1 kHz, so on a 48 kHz
// device it met an IR decoded at 48 kHz and threw; and since Tone.Offline
// only gives the live context back when its callback succeeds, Play then
// stayed bound to the dead offline context until a reload. fx-mixer-02: the
// MASTER view's Bypass is a listening A/B, shared in a collab room, so it
// must not take the mastering out of anyone's export.

const tone = vi.hoisted(() => {
  const live = { name: 'live', sampleRate: 48000 };
  const offlineRaw: Record<string, unknown> = {
    createGain: () => ({ gain: { value: 1 }, connect() {} }),
    destination: { name: 'offline-destination' },
  };
  const transport = { PPQ: 0, bpm: { value: 0 }, start() {} };
  const state = {
    live,
    offlineRaw,
    current: live as unknown,
    rates: [] as number[],
  };
  return {
    state,
    transport,
    module: {
      getContext: () => state.current,
      setContext: (context: unknown) => {
        state.current = context;
      },
      getTransport: () => transport,
      // Like Tone's: swaps the global context in for the callback, and only
      // swaps it back once the callback has succeeded.
      Offline: async (
        callback: (ctx: unknown) => Promise<void>,
        _duration: number,
        _channels: number,
        rate: number,
      ) => {
        state.rates.push(rate);
        const original = state.current;
        const offline = { name: 'offline', rawContext: offlineRaw };
        state.current = offline;
        await callback(offline);
        state.current = original;
        return { get: () => ({ sampleRate: rate }) };
      },
    },
  };
});
vi.mock('tone', () => tone.module);

const chains = vi.hoisted(() => ({
  updates: [] as TrackEffectState[][],
  disposed: 0,
  failUpdate: false,
}));
vi.mock('../EffectChain', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../EffectChain')>()),
  EffectChain: class {
    private updates: TrackEffectState[] = [];
    constructor() {
      chains.updates.push(this.updates);
    }
    update(state: TrackEffectState) {
      if (chains.failUpdate) throw new Error('NotSupportedError');
      this.updates.push(state);
    }
    getInputNode() {
      return { connect() {} };
    }
    getOutputNode() {
      return { connect() {} };
    }
    dispose() {
      chains.disposed++;
    }
  },
}));

// The offline graph's native side, where a SoundFont track's rendered audio
// plays: the buffers and sources made on it, and the holds that keep each
// wrapped track input open.
const graph = vi.hoisted(() => {
  const made = {
    engines: [] as Array<{ input: object; nativeInput: object }>,
    buffers: [] as Array<{
      channels: number;
      length: number;
      rate: number;
      copies: number[][];
    }>,
    sources: [] as Array<{
      buffer: unknown;
      connect: (node: unknown) => void;
      start: (when: number) => void;
    }>,
    holds: [] as Array<{
      offset: { value: number };
      connect: (node: unknown) => void;
      start: () => void;
    }>,
  };
  const nativeCtx = {
    createBuffer(channels: number, length: number, rate: number) {
      const buffer = {
        channels,
        length,
        rate,
        copies: [] as number[][],
        copyToChannel(src: Float32Array, ch: number, offset: number) {
          buffer.copies.push([ch, offset, src.length]);
        },
      };
      made.buffers.push(buffer);
      return buffer;
    },
    createBufferSource() {
      const source = { buffer: null, connect: vi.fn(), start: vi.fn() };
      made.sources.push(source);
      return source;
    },
  };
  const wrappedCtx = {
    createConstantSource() {
      const hold = { offset: { value: 1 }, connect: vi.fn(), start: vi.fn() };
      made.holds.push(hold);
      return hold;
    },
  };
  return { made, nativeCtx, wrappedCtx };
});

vi.mock('../TrackEngine', () => ({
  TrackEngine: class {
    input = { name: 'track-input', context: graph.wrappedCtx };
    nativeInput = { name: 'native-track-input', context: graph.nativeCtx };
    constructor() {
      graph.made.engines.push(this);
    }
    setVolume() {}
    setPan() {}
    updateEffects() {}
    setSend() {}
    setInstrument() {}
    getInputNode() {
      return this.input;
    }
    getNativeInputNode() {
      return this.nativeInput;
    }
    dispose() {}
  },
}));

const soundFonts = vi.hoisted(() => ({ render: vi.fn() }));
vi.mock('../soundFontRender', () => ({
  renderSoundFontTracks: soundFonts.render,
}));

const pedals = vi.hoisted(() => ({ apply: vi.fn(), log: [] as string[] }));
vi.mock('../offlinePedalChain', () => ({
  applyOfflinePedalChain: pedals.apply,
}));

const clips = vi.hoisted(() => ({
  scheduled: [] as Array<{ clip: { id: string }; pedalInput?: unknown }>,
}));
vi.mock('../AudioClipScheduler', () => ({
  AudioClipScheduler: class {
    scheduleClip(opts: { clip: { id: string }; pedalInput?: unknown }) {
      pedals.log.push('clip');
      clips.scheduled.push(opts);
    }
  },
}));
vi.mock('../AudioBufferStore', () => ({
  getAudioBuffer: () => ({ duration: 4 }),
  sliceBuffer: () => null,
}));

const ir = vi.hoisted(() => ({ ensureProcessedIr: vi.fn() }));
vi.mock('../reverbIR', () => ({
  ensureProcessedIr: ir.ensureProcessedIr,
  getProcessedIr: () => null,
}));

const device = vi.hoisted(() => ({ rate: 48000 }));
vi.mock('../AudioEngine', () => ({
  audioEngine: { getSampleRate: () => device.rate },
}));

const ticks = vi.hoisted(() => ({ dropRepeatedTicks: vi.fn() }));
vi.mock('../transportTicks', () => ticks);

const instruments = vi.hoisted(() => ({ createInstrument: vi.fn() }));
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  createInstrument: instruments.createInstrument,
  applyDrumPads: () => {},
}));

const midi = vi.hoisted(() => ({ scheduled: 0 }));
vi.mock('../MidiScheduler', () => ({
  MidiScheduler: class {
    scheduleSequence() {
      midi.scheduled++;
    }
  },
}));
vi.mock('../AutomationScheduler', () => ({
  applyOfflineAutomation: () => {},
  applyOfflineLanes: () => {},
}));
vi.mock('@/daw/instruments/TonewheelOrganEngine', () => ({
  TonewheelOrganEngine: class {},
}));
vi.mock('@/daw/instruments/OracleSynthAdapter', () => ({
  OracleSynthAdapter: class {},
}));
vi.mock('@/daw/instruments/DrumMachineEngine', () => ({
  DrumMachineEngine: class {},
}));
vi.mock('@/daw/instruments/ChopsSampler', () => ({
  ChopsSampler: class {},
}));
// The amp tracks' adapters: init, and the pedal-chain input playback joins.
const amps = vi.hoisted(() => {
  class Adapter {
    pedalInput = { name: 'pedal-input' };
    init = vi.fn(() => Promise.resolve());
    getNativePedalInputNode() {
      return this.pedalInput;
    }
    dispose() {}
  }
  return {
    Adapter,
    GuitarFxAdapter: class extends Adapter {},
    VocalFxAdapter: class extends Adapter {},
  };
});
vi.mock('@/daw/instruments/GuitarFxAdapter', () => ({
  GuitarFxAdapter: amps.GuitarFxAdapter,
}));
vi.mock('@/daw/instruments/VocalFxAdapter', () => ({
  VocalFxAdapter: amps.VocalFxAdapter,
}));
vi.mock('@/daw/oracle-synth/synthTrackState', () => ({
  getTrackSynthState: () => undefined,
  applySynthStateToEngine: () => {},
}));

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('@/daw/store', () => ({
  useStore: { getState: () => store.state },
}));

/** Effects with the compressor (and optionally a reverb) switched on. */
function effectsWith(reverb = false): TrackEffectState {
  const fx = structuredClone(DEFAULT_EFFECTS);
  fx.compressor.enabled = true;
  if (reverb) fx.reverb = { ...fx.reverb, enabled: true, decay: 2.5 };
  return fx;
}

const track = (id: string) => ({
  id,
  name: id,
  instrument: 'piano-sampler',
  mute: false,
  solo: false,
  volume: 1,
  pan: 0,
  effects: structuredClone(DEFAULT_EFFECTS),
  sends: {},
  automation: {},
  midiClips: [],
  audioClips: [],
});

beforeEach(() => {
  device.rate = 48000;
  delete tone.state.offlineRaw._nativeContext;
  graph.made.engines.length = 0;
  graph.made.buffers.length = 0;
  graph.made.sources.length = 0;
  graph.made.holds.length = 0;
  soundFonts.render.mockReset();
  soundFonts.render.mockResolvedValue(new Map());
  pedals.apply.mockReset();
  pedals.apply.mockImplementation(async () => {
    pedals.log.push('chain');
  });
  pedals.log.length = 0;
  clips.scheduled.length = 0;
  ticks.dropRepeatedTicks.mockReset();
  tone.state.current = tone.state.live;
  tone.state.rates.length = 0;
  chains.updates.length = 0;
  chains.disposed = 0;
  chains.failUpdate = false;
  midi.scheduled = 0;
  ir.ensureProcessedIr.mockReset();
  ir.ensureProcessedIr.mockResolvedValue(null);
  instruments.createInstrument.mockReset();
  instruments.createInstrument.mockReturnValue(null);
  store.state = {
    tracks: [],
    bpm: 120,
    returns: [{ id: 'A', effects: effectsWith(true), volume: 0.8 }],
    masteringEffects: effectsWith(),
    masteringBypass: false,
    masterVolume: 0.8,
    masterAutomation: {},
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 0,
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('renderProject', () => {
  it("renders at the live engine's rate when none is asked for", async () => {
    const buffer = await renderProject();
    expect(tone.state.rates).toEqual([48000]);
    expect(buffer.sampleRate).toBe(48000);
  });

  it('renders at an explicit rate when asked', async () => {
    await renderProject({ sampleRate: 44100 });
    expect(tone.state.rates).toEqual([44100]);
  });

  it('keeps the device rate within 44.1–48 kHz', async () => {
    // Audio interfaces, a headset in call mode, a 44.1 kHz device.
    for (const rate of [96000, 192000, 88200, 16000, 44100]) {
      device.rate = rate;
      await renderProject();
    }
    expect(tone.state.rates).toEqual([48000, 48000, 48000, 44100, 44100]);
  });

  it('runs each tick of the offline transport once', async () => {
    await renderProject();
    expect(ticks.dropRepeatedTicks).toHaveBeenCalledWith(tone.transport);
  });

  it('prepares every reverb IR it uses on the offline context first', async () => {
    await renderProject();
    expect(ir.ensureProcessedIr).toHaveBeenCalledWith(
      tone.state.offlineRaw,
      'hall',
      2.5,
    );
  });

  it("hands Tone's live context back when the render fails", async () => {
    chains.failUpdate = true;
    await expect(renderProject()).rejects.toThrow('NotSupportedError');
    expect(tone.state.current).toBe(tone.state.live);
    // The half-built graph is torn down too (its gate/duck loops stop).
    expect(chains.disposed).toBe(chains.updates.length);
    expect(chains.disposed).toBeGreaterThan(0);
  });

  it('gives up on an instrument that never loads, and hands Tone back', async () => {
    vi.useFakeTimers();
    let load: () => void = () => {};
    const instrument = {
      init: () =>
        new Promise<void>((resolve) => {
          load = resolve;
        }),
      dispose: vi.fn(),
    };
    instruments.createInstrument.mockReturnValue(instrument);
    store.state.tracks = [track('keys')];

    const result = renderProject();
    const failed = expect(result).rejects.toThrow(/instruments to load/);
    await vi.advanceTimersByTimeAsync(60_000);
    await failed;
    expect(tone.state.current).toBe(tone.state.live);

    // Loading late, it is dropped rather than scheduled anywhere.
    load();
    await vi.advanceTimersByTimeAsync(0);
    expect(instrument.dispose).toHaveBeenCalled();
    expect(midi.scheduled).toBe(0);
  });

  it('runs the stored mastering chain', async () => {
    await renderProject();
    const [mastering] = chains.updates;
    expect(mastering).toEqual([store.state.masteringEffects]);
  });

  it('keeps the mastering in the export while Bypass is on', async () => {
    // A peer's A/B (or one left on) must not export an unmastered mix.
    store.state.masteringBypass = true;
    await renderProject();
    const [mastering] = chains.updates;
    expect(mastering).toEqual([store.state.masteringEffects]);
    expect(mastering[0].compressor.enabled).toBe(true);
  });
});

// ── Every sound in the bounce ──────────────────────────────────────────────
// SoundFont/GM tracks bounced silent (the live synth is a worklet on the live
// context), and Guitar/Bass/Vocal takes bounced dry (their amp and pedals
// never reached the offline graph).

/** One bar of 4/4 at 120 bpm: 2 s. */
const BAR = 1920;

const soundFontTrack = (id: string, extra: Record<string, unknown> = {}) => ({
  ...track(id),
  instrument: 'soundfont',
  gmProgram: 48,
  midiClips: [
    {
      id: `${id}-clip`,
      startTick: 0,
      events: [
        {
          note: 60,
          velocity: 100,
          startTick: 0,
          durationTicks: BAR,
          channel: 0,
        },
      ],
    },
  ],
  ...extra,
});

const take = (id: string) => ({
  id,
  startTick: 0,
  duration: BAR,
  fadeInTicks: 0,
  fadeOutTicks: 0,
});

describe('renderProject: SoundFont tracks', () => {
  it('renders them first, for the window and rate of the bounce', async () => {
    store.state.tracks = [
      soundFontTrack('strings'),
      soundFontTrack('muted', { mute: true }),
      track('keys'),
    ];
    await renderProject({ range: { startTick: BAR, endTick: 2 * BAR } });

    // The audible one only; the window is one bar (2 s) plus the 1 s tail.
    expect(soundFonts.render).toHaveBeenCalledTimes(1);
    const [rendered, window] = soundFonts.render.mock.calls[0];
    expect(rendered.map((t: { id: string }) => t.id)).toEqual(['strings']);
    expect(window).toEqual({
      startTick: BAR,
      bpm: 120,
      sampleRate: 48000,
      lengthFrames: 3 * 48000,
    });
    // No live SoundFont instrument is built for the offline graph.
    expect(
      instruments.createInstrument.mock.calls.map(([type]) => type),
    ).toEqual(['piano-sampler']);
  });

  it("plays each rendered segment into the track's input, at its frame", async () => {
    store.state.tracks = [soundFontTrack('strings')];
    const part = (n: number) =>
      [new Float32Array(n), new Float32Array(n)] as const;
    soundFonts.render.mockResolvedValue(
      new Map([
        [
          'strings',
          [{ startFrame: 4800, length: 5, parts: [part(3), part(2)] }],
        ],
      ]),
    );
    await renderProject();

    const [engine] = graph.made.engines;
    const [buffer] = graph.made.buffers;
    expect(buffer).toMatchObject({ channels: 2, length: 5, rate: 48000 });
    expect(buffer.copies).toEqual([
      [0, 0, 3],
      [1, 0, 3],
      [0, 3, 2],
      [1, 3, 2],
    ]);
    const [source] = graph.made.sources;
    expect(source.buffer).toBe(buffer);
    expect(source.connect).toHaveBeenCalledWith(engine.nativeInput);
    expect(source.start).toHaveBeenCalledWith(0.1);
    // The wrapped input is held open for the native source to be heard.
    const [hold] = graph.made.holds;
    expect(hold.offset.value).toBe(0);
    expect(hold.connect).toHaveBeenCalledWith(engine.input);
    expect(hold.start).toHaveBeenCalled();
  });

  it("doesn't start a SoundFont render for a project without them", async () => {
    store.state.tracks = [track('keys')];
    await renderProject();
    expect(soundFonts.render).not.toHaveBeenCalled();
  });

  it('reports the SoundFont stage, then the mixdown', async () => {
    store.state.tracks = [soundFontTrack('strings')];
    soundFonts.render.mockImplementation(
      async (_t: unknown, _w: unknown, onProgress: (pct: number) => void) => {
        onProgress(0.5);
        onProgress(1);
        return new Map();
      },
    );
    const progress: unknown[] = [];
    await renderProject({ onProgress: (p) => progress.push(p) });
    expect(progress).toEqual([
      { stage: 'instruments', pct: 0.5 },
      { stage: 'instruments', pct: 1 },
      { stage: 'mixdown', pct: 0 },
    ]);
  });

  it('reports the mixdown as it renders, pausing the render for it', async () => {
    const suspend = vi.fn((_at: number) => Promise.resolve());
    const resume = vi.fn(() => Promise.resolve());
    tone.state.offlineRaw._nativeContext = { suspend, resume };
    store.state.tracks = [track('keys')];
    store.state.loopEnabled = true;
    store.state.loopStart = 0;
    store.state.loopEnd = BAR; // 2 s + the 1 s tail
    const progress: Array<{ stage: string; pct: number }> = [];
    await renderProject({
      range: 'loop',
      onProgress: (p) => progress.push(p),
    });
    await vi.waitFor(() => expect(resume).toHaveBeenCalledTimes(19));
    const pauses = suspend.mock.calls.map(([at]) => at);
    expect(pauses).toHaveLength(19);
    pauses.forEach((at, i) => expect(at).toBeCloseTo((3 * (i + 1)) / 20));
    const mixdown = progress.filter((p) => p.stage === 'mixdown');
    expect(mixdown[mixdown.length - 1].pct).toBe(0.95);
  });
});

describe('renderProject: Guitar/Bass/Vocal takes', () => {
  it.each([
    ['guitar-fx', amps.GuitarFxAdapter],
    ['bass-fx', amps.GuitarFxAdapter],
    ['vocal-fx', amps.VocalFxAdapter],
  ])('runs a %s take through its stored chain', async (instrument, Adapter) => {
    const adapter = new Adapter();
    instruments.createInstrument.mockReturnValue(adapter);
    const amped = { ...track('amped'), instrument, audioClips: [take('t1')] };
    store.state.tracks = [amped];
    await renderProject();

    expect(pedals.apply).toHaveBeenCalledWith(adapter, amped, 120);
    expect(clips.scheduled).toEqual([
      expect.objectContaining({
        clip: expect.objectContaining({ id: 't1' }),
        pedalInput: adapter.pedalInput,
      }),
    ]);
    // Scheduled once the chain is ready, not before.
    expect(pedals.log).toEqual(['chain', 'clip']);
  });

  it('bounces the take dry when its chain fails to build', async () => {
    instruments.createInstrument.mockReturnValue(new amps.GuitarFxAdapter());
    pedals.apply.mockRejectedValue(new Error('no worklet'));
    store.state.tracks = [
      { ...track('gtr'), instrument: 'guitar-fx', audioClips: [take('t1')] },
    ];
    await renderProject();
    expect(clips.scheduled).toHaveLength(1);
    expect(clips.scheduled[0].pedalInput).toBeUndefined();
  });

  it('bounces the take dry when its adapter fails to start', async () => {
    const adapter = new amps.GuitarFxAdapter();
    adapter.init.mockRejectedValue(new Error('no context'));
    instruments.createInstrument.mockReturnValue(adapter);
    store.state.tracks = [
      { ...track('gtr'), instrument: 'guitar-fx', audioClips: [take('t1')] },
    ];
    await renderProject();
    expect(pedals.apply).not.toHaveBeenCalled();
    expect(clips.scheduled).toHaveLength(1);
    expect(clips.scheduled[0].pedalInput).toBeUndefined();
  });

  it("plays other tracks' clips straight into the track", async () => {
    store.state.tracks = [{ ...track('drop'), audioClips: [take('t1')] }];
    await renderProject();
    expect(clips.scheduled).toHaveLength(1);
    expect(clips.scheduled[0].pedalInput).toBeUndefined();
  });
});
