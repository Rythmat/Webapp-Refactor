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
  const offlineRaw = {
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

vi.mock('../TrackEngine', () => ({
  TrackEngine: class {
    setVolume() {}
    setPan() {}
    updateEffects() {}
    setSend() {}
    setInstrument() {}
    getInputNode() {
      return {};
    }
    dispose() {}
  },
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
