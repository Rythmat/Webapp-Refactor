import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EFFECTS } from '../EffectChain';
import { renderProject } from '../renderProject';

// ── Export progress and Cancel (milestone 1.11) ────────────────────────────
// The render says how far it is through OfflineAudioContext.suspend() points
// (every half second of the song), and a cancel stops it at the next one:
// the render rejects with an AbortError, Tone gets its live context back (so
// Play works) and what the render built is disposed. Without suspend() there
// is no progress, and a cancel is heard once the render ends. With neither
// option the render registers no point at all (the goldens' path).
//
// Run: npx vitest run src/daw/audio/__tests__/renderProjectCancel.test.ts

const tone = vi.hoisted(() => {
  const live = { name: 'live', sampleRate: 48000 };
  /** The browser's OfflineAudioContext: suspend points, resumed in order. */
  const native = {
    length: 0,
    sampleRate: 48000,
    withSuspend: true,
    points: [] as Array<{ frame: number; resolve: () => void }>,
    resumes: 0,
    reached: [] as number[],
    waiting: null as null | (() => void),
    startRendering: async () => {
      native.points.sort((a, b) => a.frame - b.frame);
      for (const point of native.points) {
        native.reached.push(point.frame);
        await new Promise<void>((resume) => {
          native.waiting = resume;
          point.resolve();
        });
      }
      return { sampleRate: native.sampleRate };
    },
    resume: async () => {
      native.resumes++;
      const go = native.waiting;
      native.waiting = null;
      go?.();
    },
  };
  const suspend = (time: number) =>
    new Promise<void>((resolve) => {
      native.points.push({
        frame: Math.round(time * native.sampleRate),
        resolve,
      });
    });
  const raw = {
    createGain: () => ({ gain: { value: 1 }, connect() {} }),
    destination: {},
    _nativeContext: native as unknown as Record<string, unknown>,
  };
  const transport = { PPQ: 0, bpm: { value: 0 }, starts: 0, start() {} };
  /** Tone's JS clock pass: steps of half a second, a yield each. */
  const clock = { steps: 0, onStep: null as null | ((step: number) => void) };
  transport.start = () => {
    transport.starts++;
  };
  const state = { live, current: live as unknown };
  return {
    state,
    native,
    suspend,
    raw,
    transport,
    clock,
    module: {
      getContext: () => state.current,
      setContext: (context: unknown) => {
        state.current = context;
      },
      getTransport: () => transport,
      // Like Tone's: the global context is swapped in for the callback and
      // back only once the callback has succeeded; then the JS clock runs
      // over the song and the native context renders.
      Offline: async (
        callback: (ctx: unknown) => Promise<void>,
        duration: number,
        _channels: number,
        rate: number,
      ) => {
        native.length = Math.ceil(duration * rate);
        native.sampleRate = rate;
        const original = state.current;
        const offline = {
          name: 'offline',
          rawContext: raw,
          currentTime: 0,
          _duration: duration,
        };
        state.current = offline;
        await callback(offline);
        state.current = original;
        while (offline._duration - offline.currentTime >= 0) {
          offline.currentTime += 0.5;
          clock.steps++;
          clock.onStep?.(clock.steps);
          await new Promise((r) => setTimeout(r, 0));
        }
        await native.startRendering();
        return { get: () => ({ sampleRate: rate, rendered: true }) };
      },
    },
  };
});
vi.mock('tone', () => tone.module);

const chains = vi.hoisted(() => ({ disposed: 0 }));
vi.mock('../EffectChain', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../EffectChain')>()),
  EffectChain: class {
    whenDynamicsReady() {
      return Promise.resolve();
    }
    update() {}
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
const engines = vi.hoisted(() => ({ disposed: 0 }));
vi.mock('../TrackEngine', () => ({
  TrackEngine: class {
    setVolume() {}
    setPan() {}
    whenDynamicsReady() {
      return Promise.resolve();
    }
    setKeySourceResolver() {}
    getAnalyserNode() {
      return null;
    }
    updateEffects() {}
    setSend() {}
    setInstrument() {}
    getInputNode() {
      return {};
    }
    dispose() {
      engines.disposed++;
    }
  },
}));
// A first IR fetch that never answers, when `stuck`.
const ir = vi.hoisted(() => ({ stuck: false }));
vi.mock('../reverbIR', () => ({
  ensureProcessedIr: () =>
    ir.stuck ? new Promise(() => {}) : Promise.resolve(null),
  getProcessedIr: () => null,
}));
vi.mock('../AudioEngine', () => ({
  audioEngine: { getSampleRate: () => 48000 },
}));
vi.mock('../transportTicks', () => ({ dropRepeatedTicks: () => {} }));
const instruments = vi.hoisted(() => ({ createInstrument: vi.fn() }));
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  createInstrument: instruments.createInstrument,
  applyDrumPads: () => {},
}));
vi.mock('../MidiScheduler', () => ({
  MidiScheduler: class {
    scheduleSequence() {}
  },
}));
vi.mock('../AudioClipScheduler', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  AudioClipScheduler: class {
    scheduleClip() {}
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
  // Four seconds at 120 BPM.
  midiClips: [
    {
      id: `${id}-c`,
      startTick: 0,
      events: [{ note: 60, velocity: 100, startTick: 0, durationTicks: 3840 }],
    },
  ],
  audioClips: [],
});

/** The next macrotask, after every pending promise. */
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  tone.state.current = tone.state.live;
  tone.native.points.length = 0;
  tone.native.reached.length = 0;
  tone.native.resumes = 0;
  tone.native.waiting = null;
  tone.native.withSuspend = true;
  (tone.raw._nativeContext as Record<string, unknown>).suspend = tone.suspend;
  tone.transport.starts = 0;
  tone.clock.steps = 0;
  tone.clock.onStep = null;
  ir.stuck = false;
  chains.disposed = 0;
  engines.disposed = 0;
  instruments.createInstrument.mockReset();
  instruments.createInstrument.mockReturnValue(null);
  store.state = {
    tracks: [track('keys')],
    bpm: 120,
    returns: [],
    masteringEffects: structuredClone(DEFAULT_EFFECTS),
    masterVolume: 0.8,
    masterAutomation: {},
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 0,
  };
});

describe('progress', () => {
  it('is reported at each suspend point, rising to 1', async () => {
    const seen: number[] = [];
    const buffer = await renderProject({ onProgress: (f) => seen.push(f) });
    expect(buffer).toMatchObject({ rendered: true });
    // 4 s of song + the 2 s tail: a point every half second, 128-aligned.
    expect(tone.native.points.length).toBe(11);
    expect(tone.native.points.every((p) => p.frame % 128 === 0)).toBe(true);
    expect(tone.native.resumes).toBe(11);
    expect(seen.length).toBeGreaterThanOrEqual(11);
    expect(seen.at(-1)).toBe(1);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThan(seen[i - 1]);
    }
  });

  it('is not reported without suspend(), so the bar is indeterminate', async () => {
    delete (tone.raw._nativeContext as Record<string, unknown>).suspend;
    const seen: number[] = [];
    await renderProject({ onProgress: (f) => seen.push(f) });
    // Only the end, once the file is rendered.
    expect(seen).toEqual([1]);
  });

  it('registers no suspend point without a signal or a listener', async () => {
    await renderProject();
    expect(tone.native.points).toEqual([]);
    expect(tone.native.resumes).toBe(0);
  });
});

describe('Cancel', () => {
  it('stops at the next suspend point, rejects, and hands Tone back', async () => {
    const controller = new AbortController();
    const seen: number[] = [];
    const done = renderProject({
      signal: controller.signal,
      onProgress: (f) => {
        seen.push(f);
        // Cancelled once the render is two points in.
        if (tone.native.resumes === 1) controller.abort();
      },
    });
    await expect(done).rejects.toMatchObject({ name: 'AbortError' });
    // Not resumed after the cancel: the render stays where it was.
    await tick();
    expect(tone.native.resumes).toBe(1);
    expect(tone.native.reached).toHaveLength(2);
    // Nothing is reported once it is cancelled.
    expect(seen).toHaveLength(2);
    // Play works: the live context is Tone's again.
    expect(tone.module.getContext()).toBe(tone.state.live);
    expect(chains.disposed).toBeGreaterThan(0);
    expect(engines.disposed).toBe(1);
  });

  it('while instruments load: rejects at once, restores Tone, starts nothing', async () => {
    let loaded: () => void = () => {};
    const instrument = {
      init: () => new Promise<void>((r) => (loaded = r)),
      dispose: vi.fn(),
    };
    instruments.createInstrument.mockReturnValue(instrument);
    const controller = new AbortController();
    const done = renderProject({ signal: controller.signal });
    await tick();
    // The offline context holds Tone's global while the callback runs.
    expect(tone.module.getContext()).not.toBe(tone.state.live);
    controller.abort();
    await expect(done).rejects.toMatchObject({ name: 'AbortError' });
    // The restore path ran on the abort too (Tone.Offline doesn't).
    expect(tone.module.getContext()).toBe(tone.state.live);
    expect(tone.transport.starts).toBe(0);
    expect(engines.disposed).toBe(1);
    expect(chains.disposed).toBeGreaterThan(0);
    // An instrument that loads afterwards is dropped.
    loaded();
    await tick();
    expect(instrument.dispose).toHaveBeenCalled();
  });

  it('before it starts: rejects without building anything', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      renderProject({ signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(engines.disposed).toBe(0);
    expect(tone.module.getContext()).toBe(tone.state.live);
  });

  it('without suspend(): rejects once the render ends, not with a buffer', async () => {
    delete (tone.raw._nativeContext as Record<string, unknown>).suspend;
    const controller = new AbortController();
    const done = renderProject({ signal: controller.signal });
    // Cancelled once the graph is built, while Tone's clock runs over the
    // song (the live context is back by then).
    for (
      let i = 0;
      i < 100 &&
      (tone.transport.starts === 0 || tone.state.current !== tone.state.live);
      i++
    ) {
      await Promise.resolve();
    }
    expect(tone.state.current).toBe(tone.state.live);
    expect(tone.transport.starts).toBe(1);
    controller.abort();
    await expect(done).rejects.toMatchObject({ name: 'AbortError' });
    expect(tone.module.getContext()).toBe(tone.state.live);
  });
});

describe('Cancel, review fixes', () => {
  it('does not wait for a reverb IR that is still loading', async () => {
    ir.stuck = true;
    const fx = structuredClone(DEFAULT_EFFECTS);
    fx.reverb = { ...fx.reverb, enabled: true };
    store.state = { ...store.state, masteringEffects: fx };
    const controller = new AbortController();
    const done = renderProject({ signal: controller.signal });
    await tick();
    controller.abort();
    await expect(done).rejects.toMatchObject({ name: 'AbortError' });
    expect(tone.module.getContext()).toBe(tone.state.live);
  });

  it('a render started while another builds its graph hands Tone the live context back', async () => {
    ir.stuck = true;
    const fx = structuredClone(DEFAULT_EFFECTS);
    fx.reverb = { ...fx.reverb, enabled: true };
    store.state = { ...store.state, masteringEffects: fx };
    const first = new AbortController();
    const one = renderProject({ signal: first.signal });
    await tick();
    // The first holds Tone's global context while its IR loads.
    expect(tone.module.getContext()).not.toBe(tone.state.live);
    // The dialog closed (cancelling it) and a new export started at once.
    ir.stuck = false;
    store.state = {
      ...store.state,
      masteringEffects: structuredClone(DEFAULT_EFFECTS),
    };
    const two = renderProject();
    first.abort();
    await expect(one).rejects.toMatchObject({ name: 'AbortError' });
    await expect(two).resolves.toMatchObject({ rendered: true });
    expect(tone.module.getContext()).toBe(tone.state.live);
  });

  it('a cancel during the clock pass ends the pass', async () => {
    const controller = new AbortController();
    tone.clock.onStep = (step) => {
      if (step === 2) controller.abort();
    };
    await expect(
      renderProject({ signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    await tick();
    await tick();
    // 6 s of song is 13 steps; it stopped right after the cancel.
    expect(tone.clock.steps).toBe(2);
  });
});
