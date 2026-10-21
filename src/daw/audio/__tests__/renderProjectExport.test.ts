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
  // What each gain made on the offline context connects to.
  const gains: Array<{ connectedTo: unknown[] }> = [];
  const offlineRaw = {
    createGain: () => {
      const gain = {
        gain: { value: 1 },
        connectedTo: [] as unknown[],
        connect(target: unknown) {
          gain.connectedTo.push(target);
        },
      };
      gains.push(gain);
      return gain;
    },
    destination: { name: 'offline-destination' },
  };
  const transport = { PPQ: 0, bpm: { value: 0 }, start() {} };
  const state = {
    live,
    offlineRaw,
    gains,
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
    whenDynamicsReady() {
      return Promise.resolve();
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

// What each TrackEngine the render built was given.
interface BuiltTrack {
  resolve?: (key: string) => unknown;
  volume?: number;
  pan?: number;
  effects?: TrackEffectState;
  sends: Array<[string, number]>;
}
const engines = vi.hoisted(() => ({ built: [] as BuiltTrack[] }));
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
      const source = {
        buffer: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
      };
      made.sources.push(source);
      return source;
    },
  };
  const wrappedCtx = {
    createConstantSource() {
      const hold = {
        offset: { value: 1 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
      };
      made.holds.push(hold);
      return hold;
    },
  };
  return { made, nativeCtx, wrappedCtx };
});
vi.mock('../TrackEngine', () => ({
  TrackEngine: class {
    private built: BuiltTrack = { sends: [] };
    input = { name: 'track-input', context: graph.wrappedCtx };
    nativeInput = { name: 'native-track-input', context: graph.nativeCtx };
    constructor() {
      engines.built.push(this.built);
      graph.made.engines.push(this);
    }
    setVolume(volume: number) {
      this.built.volume = volume;
    }
    setPan(pan: number) {
      this.built.pan = pan;
    }
    whenDynamicsReady() {
      return Promise.resolve();
    }
    setKeySourceResolver(fn: (key: string) => unknown) {
      this.built.resolve = fn;
    }
    getAnalyserNode() {
      return { tapOf: this.built };
    }
    updateEffects(effects: TrackEffectState) {
      this.built.effects = effects;
    }
    setSend(id: string, amount: number) {
      this.built.sends.push([id, amount]);
    }
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
const audio = vi.hoisted(() => ({
  scheduled: [] as string[],
  buffers: new Set<string>(),
}));
vi.mock('../AudioClipScheduler', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  AudioClipScheduler: class {
    scheduleClip({ clip }: { clip: { id?: string } }) {
      audio.scheduled.push(clip.id ?? '');
    }
  },
}));
vi.mock('../AudioBufferStore', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAudioBuffer: (id: string) =>
    audio.buffers.has(id) ? { duration: 4, numberOfChannels: 2 } : undefined,
}));
const automation = vi.hoisted(() => ({ trackLanes: [] as unknown[] }));
vi.mock('../AutomationScheduler', () => ({
  applyOfflineAutomation: (_te: unknown, lanes: unknown) => {
    automation.trackLanes.push(lanes);
  },
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
  ticks.dropRepeatedTicks.mockReset();
  tone.state.current = tone.state.live;
  tone.state.rates.length = 0;
  chains.updates.length = 0;
  chains.disposed = 0;
  chains.failUpdate = false;
  engines.built.length = 0;
  graph.made.engines.length = 0;
  graph.made.buffers.length = 0;
  graph.made.sources.length = 0;
  graph.made.holds.length = 0;
  soundFonts.render.mockReset();
  soundFonts.render.mockResolvedValue(new Map());
  automation.trackLanes.length = 0;
  tone.state.gains.length = 0;
  midi.scheduled = 0;
  audio.scheduled.length = 0;
  audio.buffers.clear();
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
  it("keys each ducker by another track's tap, refusing a loop", async () => {
    const duckedBy = (id: string, keyTrackId: string) => {
      const t = track(id);
      t.effects.ducker = { ...t.effects.ducker, enabled: true, keyTrackId };
      return t;
    };
    // A ducks by B and B by A: connecting both would be a cycle (silence).
    store.state.tracks = [duckedBy('a', 'b'), duckedBy('b', 'a'), track('c')];
    await renderProject();
    const [a, b, c] = engines.built;
    expect(a.resolve!('b')).toBeNull();
    expect(b.resolve!('a')).toBeNull();
    expect(a.resolve!('a')).toBeNull();
    expect(a.resolve!('c')).toEqual({ tapOf: c });
    expect(c.resolve!('a')).toEqual({ tapOf: a });
    expect(a.resolve!('gone')).toBeNull();
  });

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

  it('leaves a muted clip out of the export, as playback does (2.12)', async () => {
    instruments.createInstrument.mockReturnValue({
      init: () => Promise.resolve(),
      dispose() {},
    });
    const note = {
      note: 60,
      velocity: 100,
      startTick: 0,
      durationTicks: 480,
      channel: 0,
    };
    store.state.tracks = [
      {
        ...track('keys'),
        midiClips: [
          { id: 'heard', startTick: 0, events: [note] },
          { id: 'muted', startTick: 1920, events: [note], muted: true },
        ],
      },
    ];
    await renderProject();
    expect(midi.scheduled).toBe(1);
  });

  it('leaves a muted audio clip out of the export too (2.12)', async () => {
    audio.buffers.add('take-1').add('take-2');
    const take = (id: string, startTick: number, muted?: true) => ({
      id,
      startTick,
      duration: 1920,
      fadeInTicks: 0,
      fadeOutTicks: 0,
      muted,
    });
    store.state.tracks = [
      {
        ...track('vocal'),
        instrument: 'vocal-fx',
        audioClips: [take('take-1', 0), take('take-2', 1920, true)],
      },
    ];
    await renderProject();
    expect(audio.scheduled).toEqual(['take-1']);
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

// ── Render options (milestone 2.15) ────────────────────────────────────────
// Mastering can be left out (its chain stays, every slot off, so the file
// keeps the mastered one's latency); one track renders alone (a one-track
// export or a stem), even when muted; and dry renders it without its effects,
// sends or mastering, at its fader and pan.

describe('renderProject options (2.15)', () => {
  const playable = () => ({
    init: () => Promise.resolve(),
    dispose() {},
  });

  // Each track tells itself apart: its own instrument, fader, pan and lanes.
  const looks: Record<
    string,
    { instrument: string; volume: number; pan: number }
  > = {
    keys: { instrument: 'piano-sampler', volume: 0.3, pan: -0.6 },
    bass: { instrument: 'bass-synth', volume: 0.6, pan: -0.4 },
    drums: { instrument: 'drum-machine', volume: 0.9, pan: 0.5 },
  };

  /** A track with a reverb on, a send to A, and fader, pan, send and effect
   *  lanes. */
  const busyTrack = (id: string, extra: Record<string, unknown> = {}) => ({
    ...track(id),
    ...looks[id],
    effects: effectsWith(true),
    sends: { A: 0.5 },
    automation: {
      volume: [{ tick: 0, value: looks[id].volume }],
      pan: [{ tick: 0, value: looks[id].pan }],
      'send.A': [{ tick: 0, value: 0.3 }],
      'effect.reverb.wet': [{ tick: 0, value: 0.9 }],
    },
    ...extra,
  });

  const returnEffects = () =>
    (store.state.returns as Array<{ effects: TrackEffectState }>)[0].effects;

  /** Whether every slot of `effects` is switched off. */
  const allOff = (effects: TrackEffectState | undefined) =>
    Object.values(effects ?? {}).every((slot) => slot.enabled === false);

  it('renders every track that plays, with its sends, by default', async () => {
    store.state.tracks = [
      busyTrack('keys'),
      busyTrack('bass', { mute: true }),
      busyTrack('drums'),
    ];
    await renderProject();
    expect(engines.built.map((b) => b.volume)).toEqual([0.3, 0.9]);
    for (const built of engines.built) {
      expect(built.sends).toEqual([['A', 0.5]]);
      expect(built.effects?.reverb.enabled).toBe(true);
    }
    // The mastering chain, then the return's.
    expect(chains.updates).toEqual([
      [store.state.masteringEffects],
      [returnEffects()],
    ]);
  });

  it('keeps the mastering chain, every slot off, with mastering off', async () => {
    await renderProject({ mastering: false });
    // Built first as ever, so the master never skips its latency.
    expect(chains.updates).toHaveLength(2);
    const [[mastering], [ret]] = chains.updates;
    expect(allOff(mastering)).toBe(true);
    expect(ret).toBe(returnEffects());
    // The master gain feeds that chain, not the destination.
    const [master] = tone.state.gains;
    expect(master.connectedTo).toHaveLength(1);
    expect(master.connectedTo).not.toContain(tone.state.offlineRaw.destination);
    // The stored mastering is left as it was.
    const stored = store.state.masteringEffects as TrackEffectState;
    expect(stored.compressor.enabled).toBe(true);
  });

  it('renders the asked-for track alone, even a muted one', async () => {
    instruments.createInstrument.mockImplementation(playable);
    store.state.tracks = [
      busyTrack('keys'),
      busyTrack('bass', { mute: true }),
      busyTrack('drums', { solo: true }),
    ];
    await renderProject({ onlyTrackId: 'bass' });
    expect(engines.built).toHaveLength(1);
    expect(instruments.createInstrument).toHaveBeenCalledTimes(1);
    expect(instruments.createInstrument.mock.calls[0][0]).toBe('bass-synth');
    expect(engines.built[0]).toMatchObject({ volume: 0.6, pan: -0.4 });
    expect(automation.trackLanes).toEqual([
      expect.objectContaining({ volume: [{ tick: 0, value: 0.6 }] }),
    ]);
    // Its send still reaches the return, and the mastering stays.
    expect(engines.built[0].sends).toEqual([['A', 0.5]]);
    expect(chains.updates).toEqual([
      [store.state.masteringEffects],
      [returnEffects()],
    ]);
  });

  it('refuses a track that is not in the song', async () => {
    await expect(renderProject({ onlyTrackId: 'gone' })).rejects.toThrow(
      /no longer in the song/,
    );
    expect(tone.state.rates).toEqual([]);
  });

  it('renders a dry track with no effect, send, return or mastering', async () => {
    instruments.createInstrument.mockImplementation(playable);
    store.state.tracks = [
      busyTrack('keys'),
      busyTrack('bass'),
      busyTrack('drums'),
    ];
    await renderProject({ onlyTrackId: 'bass', dry: true });

    expect(engines.built).toHaveLength(1);
    expect(instruments.createInstrument).toHaveBeenCalledTimes(1);
    expect(instruments.createInstrument.mock.calls[0][0]).toBe('bass-synth');
    const [built] = engines.built;
    expect(allOff(built.effects)).toBe(true);
    expect(built.sends).toEqual([]);
    // Only the mastering chain, every slot off; no return.
    expect(chains.updates).toHaveLength(1);
    expect(allOff(chains.updates[0][0])).toBe(true);
    // No reverb is built, so no IR is prepared.
    expect(ir.ensureProcessedIr).not.toHaveBeenCalled();
    // The fader and pan stay, with their lanes; the others go.
    expect(built).toMatchObject({ volume: 0.6, pan: -0.4 });
    expect(automation.trackLanes).toEqual([
      { volume: [{ tick: 0, value: 0.6 }], pan: [{ tick: 0, value: -0.4 }] },
    ]);
    // The store's track keeps its effects.
    const stored = (
      store.state.tracks as Array<ReturnType<typeof busyTrack>>
    )[1];
    expect(stored.effects.reverb.enabled).toBe(true);
  });

  it('ignores dry without a track to render alone', async () => {
    store.state.tracks = [busyTrack('keys')];
    await renderProject({ dry: true });
    expect(engines.built[0].effects?.reverb.enabled).toBe(true);
    expect(engines.built[0].sends).toEqual([['A', 0.5]]);
    expect(chains.updates).toEqual([
      [store.state.masteringEffects],
      [returnEffects()],
    ]);
  });
});

// ── SoundFont tracks ───────────────────────────────────────────────────────
// The live synth is a worklet on the live context, out of the offline
// graph's reach: SoundFont tracks render first (soundFontRender) and the
// mixdown plays their audio into each track's input.

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

  it('renders only the asked-for track, even a muted one', async () => {
    store.state.tracks = [
      soundFontTrack('strings'),
      soundFontTrack('muted', { mute: true }),
    ];
    await renderProject({ onlyTrackId: 'muted' });
    const [rendered] = soundFonts.render.mock.calls[0];
    expect(rendered.map((t: { id: string }) => t.id)).toEqual(['muted']);
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

  it('gives the SoundFont render the first part of the progress', async () => {
    store.state.tracks = [soundFontTrack('strings')];
    soundFonts.render.mockImplementation(
      async (_t: unknown, _w: unknown, onProgress: (pct: number) => void) => {
        onProgress(0.5);
        onProgress(1);
        return new Map();
      },
    );
    const progress: number[] = [];
    await renderProject({ onProgress: (f) => progress.push(f) });
    expect(progress).toEqual([0.15, 0.3, 1]);
  });
});
