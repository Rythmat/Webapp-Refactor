import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EFFECTS } from '../EffectChain';
import { renderProject } from '../renderProject';

// ── Guitar, bass and vocal tracks export through their pedals (1.11) ───────
// audio-analysis-06: the chain was only ever synced from the panel, and the
// bounce scheduled the clips straight into the track, so amp and vocal
// tracks exported dry. Now the render builds the stored chain on the
// offline context, plays the clips into it and waits for its models.

const tone = vi.hoisted(() => {
  const events: string[] = [];
  const node = (name: string) => ({
    name,
    offset: { value: 1 },
    connectedTo: [] as unknown[],
    connect(target: unknown) {
      this.connectedTo.push(target);
    },
    disconnect() {},
    start() {},
  });
  const offlineRaw = {
    createGain: () => ({ ...node('gain'), gain: { value: 1 } }),
    createConstantSource: () => node('hold'),
    destination: { name: 'offline-destination' },
  };
  const transport = {
    PPQ: 0,
    bpm: { value: 0 },
    start() {
      events.push('transport-start');
    },
  };
  const live = { name: 'live', sampleRate: 48000 };
  let current: unknown = live;
  return {
    events,
    offlineRaw,
    module: {
      getContext: () => current,
      setContext: (c: unknown) => {
        current = c;
      },
      getTransport: () => transport,
      Offline: async (callback: (ctx: unknown) => Promise<void>) => {
        const original = current;
        const offline = { name: 'offline', rawContext: offlineRaw };
        current = offline;
        await callback(offline);
        current = original;
        return { get: () => ({ sampleRate: 48000 }) };
      },
    },
  };
});
vi.mock('tone', () => tone.module);

vi.mock('../EffectChain', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../EffectChain')>()),
  EffectChain: class {
    update() {}
    getInputNode() {
      return { connect() {} };
    }
    getOutputNode() {
      return { connect() {} };
    }
    whenDynamicsReady() {
      return Promise.resolve();
    }
    dispose() {}
  },
}));

const engines = vi.hoisted(() => ({
  built: [] as Array<{ input: object; nativeInput: object }>,
}));
vi.mock('../TrackEngine', () => ({
  TrackEngine: class {
    input = { name: 'track-input' };
    nativeInput = { name: 'track-native-input' };
    constructor() {
      engines.built.push(this);
    }
    setVolume() {}
    setPan() {}
    updateEffects() {}
    setSend() {}
    setInstrument() {}
    setKeySourceResolver() {}
    whenDynamicsReady() {
      return Promise.resolve();
    }
    getInputNode() {
      return this.input;
    }
    getNativeInputNode() {
      return this.nativeInput;
    }
    getAnalyserNode() {
      return {};
    }
    dispose() {}
  },
}));

const pedals = vi.hoisted(() => ({
  builds: [] as Array<{
    ctx: unknown;
    blocks: unknown;
    opts: unknown;
    input: { name: string };
    output: { connect: ReturnType<typeof vi.fn> };
    finish: () => void;
    disposed: boolean;
  }>,
}));
vi.mock('../graph/pedalChainBuilder', () => ({
  buildPedalChain: (ctx: unknown, blocks: unknown, opts: unknown) => {
    let finish = () => {};
    const ready = new Promise((resolve) => {
      finish = () => {
        tone.events.push('pedals-ready');
        resolve({ failedModels: [] });
      };
    });
    const build = {
      ctx,
      blocks,
      opts,
      input: { name: `pedal-input-${pedals.builds.length}` },
      output: { connect: vi.fn() },
      finish,
      disposed: false,
      ready,
      dispose() {
        build.disposed = true;
      },
    };
    pedals.builds.push(build);
    return build;
  },
}));

vi.mock('../reverbIR', () => ({
  ensureProcessedIr: () => Promise.resolve(null),
  getProcessedIr: () => null,
}));
vi.mock('../AudioEngine', () => ({
  audioEngine: { getSampleRate: () => 48000 },
}));
vi.mock('../transportTicks', () => ({ dropRepeatedTicks: () => {} }));
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  createInstrument: () => null,
  applyDrumPads: () => {},
}));
vi.mock('../MidiScheduler', () => ({
  MidiScheduler: class {
    scheduleSequence() {}
  },
}));
const clips = vi.hoisted(() => ({
  scheduled: [] as Array<{ id: string; pedalInput: unknown }>,
}));
vi.mock('../AudioClipScheduler', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  AudioClipScheduler: class {
    scheduleClip({
      clip,
      pedalInput,
    }: {
      clip: { id: string };
      pedalInput?: unknown;
    }) {
      clips.scheduled.push({ id: clip.id, pedalInput });
    }
  },
}));
vi.mock('../AudioBufferStore', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getAudioBuffer: () => ({ duration: 4, numberOfChannels: 1 }),
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
vi.mock('@/daw/oracle-synth/synthTrackState', () => ({
  getTrackSynthState: () => undefined,
  applySynthStateToEngine: () => {},
}));

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('@/daw/store', () => ({
  useStore: { getState: () => store.state },
}));

const AMP_CHAIN = [
  { type: 'overdrive', enabled: true, params: { drive: 0.6 } },
  {
    type: 'nam-amp',
    enabled: true,
    params: { bass: 0.5 },
    namModelId: 'nam-crunch-plexi',
  },
];
const VOCAL_CHAIN = [{ type: 'pitch-correction', enabled: true, params: {} }];

const track = (id: string, instrument: string, extra = {}) => ({
  id,
  name: id,
  instrument,
  mute: false,
  solo: false,
  volume: 1,
  pan: 0,
  effects: structuredClone(DEFAULT_EFFECTS),
  sends: {},
  automation: {},
  midiClips: [],
  audioClips: [
    {
      id: `${id}-take`,
      startTick: 0,
      duration: 1920,
      fadeInTicks: 0,
      fadeOutTicks: 0,
    },
  ],
  ...extra,
});

beforeEach(() => {
  tone.events.length = 0;
  engines.built.length = 0;
  pedals.builds.length = 0;
  clips.scheduled.length = 0;
  store.state = {
    tracks: [],
    bpm: 100,
    returns: [],
    masteringEffects: structuredClone(DEFAULT_EFFECTS),
    masterVolume: 1,
    masterAutomation: {},
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 0,
  };
});

/** Lets the render run until it waits on something. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('renderProject: pedal chains', () => {
  it("plays a guitar track's clips through its stored chain into the track", async () => {
    store.state.tracks = [
      track('gtr', 'guitar-fx', { guitarChain: AMP_CHAIN }),
    ];

    const render = renderProject();
    await settle();

    const [build] = pedals.builds;
    expect(build.ctx).toBe(tone.offlineRaw);
    expect(build.blocks).toBe(AMP_CHAIN);
    expect(build.opts).toEqual({ bpm: 100 });
    const [te] = engines.built;
    expect(build.output.connect).toHaveBeenCalledWith(te.nativeInput);
    expect(clips.scheduled).toEqual([
      { id: 'gtr-take', pedalInput: build.input },
    ]);

    // The transport waits for the chain's model and worklets.
    expect(tone.events).toEqual([]);
    build.finish();
    await render;
    expect(tone.events).toEqual(['pedals-ready', 'transport-start']);
    expect(build.disposed).toBe(true);
  });

  it("uses a bass track's guitar chain and a vocal track's vocal chain", async () => {
    store.state.tracks = [
      track('bass', 'bass-fx', { guitarChain: AMP_CHAIN }),
      track('vox', 'vocal-fx', { vocalChain: VOCAL_CHAIN }),
    ];
    const render = renderProject();
    await settle();
    expect(pedals.builds.map((b) => b.blocks)).toEqual([
      AMP_CHAIN,
      VOCAL_CHAIN,
    ]);
    pedals.builds.forEach((b) => b.finish());
    await render;
    expect(clips.scheduled.map((c) => c.pedalInput)).toEqual(
      pedals.builds.map((b) => b.input),
    );
  });

  it('builds no chain for other tracks or a track with none stored', async () => {
    store.state.tracks = [
      track('keys', 'piano-sampler', { guitarChain: AMP_CHAIN }),
      track('gtr', 'guitar-fx'),
      track('vox', 'vocal-fx', { vocalChain: [] }),
    ];
    await renderProject();
    expect(pedals.builds).toEqual([]);
    expect(clips.scheduled.map((c) => c.pedalInput)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});
