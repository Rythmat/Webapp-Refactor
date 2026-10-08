// @vitest-environment jsdom
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';

// ── Track engines across a load that reuses track ids (milestone 1.3) ──────
// Track ids now survive a cloud reopen, and a kept session restored reuses
// them. The engine reconciler used to keep a track's engine whenever its id
// and instrument matched, but the Oracle patch and the bass voice reach an
// engine only when it is made, so the reopened project played the previous
// project's sound (audio-core-08). A load or reset now bumps the session
// generation, and every engine from an earlier generation is made again.

const audio = vi.hoisted(() => ({
  engines: [] as Array<{
    instrument: unknown;
    disposed: boolean;
  }>,
  clearedAutomation: [] as string[],
}));

vi.mock('@/daw/audio/AudioEngine', () => ({
  audioEngine: {
    getContext: () => ({}),
    getMasterGain: () => ({
      gain: { setTargetAtTime() {} },
      context: { currentTime: 0 },
    }),
    updateMasteringEffects() {},
    updateReturnEffects() {},
    setReturnVolume() {},
    getReturnIds: () => [],
    getReturnBusInput: () => null,
    getMonitorBus: () => null,
  },
}));

vi.mock('@/daw/audio/TrackEngine', () => ({
  TrackEngine: class {
    instrument: unknown = null;
    disposed = false;
    constructor() {
      audio.engines.push(this);
    }
    setVolume() {}
    setAudible() {}
    setPan() {}
    updateEffects() {}
    setSend() {}
    setKeySourceResolver() {}
    setInstrument(instrument: unknown) {
      this.instrument = instrument;
    }
    allNotesOff() {}
    panic() {}
    dispose() {
      this.disposed = true;
    }
    getInputNode() {
      return {};
    }
  },
}));
vi.mock('@/daw/audio/MidiScheduler', () => ({
  MidiScheduler: class {
    scheduleSequence() {}
    cancelAll() {}
  },
}));
vi.mock('@/daw/audio/AudioClipScheduler', () => ({
  AudioClipScheduler: class {
    scheduleClip() {}
    cancelAll() {}
  },
}));
vi.mock('@/daw/audio/AutomationScheduler', () => ({
  AutomationScheduler: class {
    cancelAll() {}
    clearTrack(trackId: string) {
      audio.clearedAutomation.push(trackId);
    }
    scheduleTrack() {}
    scheduleLanes() {}
  },
}));
vi.mock('@/daw/audio/MetronomeEngine', () => ({
  MetronomeEngine: class {
    init() {}
    setTimeSignature() {}
    setEnabled() {}
    start() {}
    stop() {}
    dispose() {}
  },
  clickPitch: () => 'C4',
}));

/** Every Oracle adapter made, oldest first. Its init waits for the test to
 *  finish it when `holdInit` is set. */
const oracle = vi.hoisted(() => ({
  adapters: [] as Array<{
    engine: { made: number };
    disposed: boolean;
    finishInit: () => void;
  }>,
  holdInit: false,
}));
vi.mock('@/daw/instruments/OracleSynthAdapter', () => ({
  OracleSynthAdapter: class {
    engine = { made: oracle.adapters.length };
    disposed = false;
    finishInit = () => {};
    constructor() {
      oracle.adapters.push(this);
    }
    init() {
      if (!oracle.holdInit) return Promise.resolve();
      return new Promise<void>((resolve) => {
        this.finishInit = resolve;
      });
    }
    getEngine() {
      return this.engine;
    }
    allNotesOff() {}
    dispose() {
      this.disposed = true;
    }
  },
}));

/** Each track's patch in the per-track cache, as the loader seeded it. */
const patches = vi.hoisted(() => ({
  byTrack: new Map<string, { name: string }>(),
  apply: vi.fn(),
}));
vi.mock('@/daw/oracle-synth/synthTrackState', () => ({
  getTrackSynthState: (trackId: string) => patches.byTrack.get(trackId),
  applySynthStateToEngine: patches.apply,
  defaultSynthTrackState: () => ({ name: 'default patch' }),
}));

/** The bass voices sampler instruments are made with, in order. */
const voices = vi.hoisted(() => ({ made: [] as string[] }));
vi.mock('@/daw/instruments/SamplerInstrument', () => ({
  SamplerInstrument: class {
    constructor(config: { name: string }) {
      voices.made.push(config.name);
    }
    init() {
      return Promise.resolve();
    }
    allNotesOff() {}
    dispose() {}
  },
}));

import { bumpSessionGeneration } from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import {
  getTrackAudioState,
  subscribeEngineReady,
  usePlaybackEngine,
} from '../usePlaybackEngine';

const s = () => useStore.getState();

/** Lets pending promises (instrument init) settle. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

/**
 * What a load of the same project does to the store and the caches: bump the
 * generation, seed the patch cache, then set tracks with the same ids.
 */
function reopen(seed: () => void = () => {}): void {
  act(() => {
    bumpSessionGeneration('reopen');
    seed();
    useStore.setState({ tracks: s().tracks.map((t) => ({ ...t })) });
  });
}

beforeEach(() => {
  audio.engines.length = 0;
  audio.clearedAutomation.length = 0;
  oracle.adapters.length = 0;
  oracle.holdInit = false;
  patches.byTrack.clear();
  patches.apply.mockReset();
  voices.made.length = 0;
  useStore.setState({
    tracks: [],
    bpm: 120,
    isPlaying: false,
    isRecording: false,
  });
});

afterEach(cleanup);

describe('a load that reuses an Oracle track id', () => {
  it("makes the engine again with the reopened project's patch", async () => {
    const id = s().addTrack('midi', 'oracle-synth', 'Synth');
    patches.byTrack.set(id, { name: 'open patch' });
    renderHook(() => usePlaybackEngine(true, null));
    await settle();
    expect(patches.apply).toHaveBeenLastCalledWith(
      oracle.adapters[0].engine,
      { name: 'open patch' },
      { projectBpm: 120 },
    );

    reopen(() => patches.byTrack.set(id, { name: 'reopened patch' }));
    await settle();

    expect(audio.engines).toHaveLength(2);
    expect(audio.engines[0].disposed).toBe(true);
    expect(audio.clearedAutomation).toContain(id);
    expect(patches.apply).toHaveBeenLastCalledWith(
      oracle.adapters[1].engine,
      { name: 'reopened patch' },
      { projectBpm: 120 },
    );
  });

  it('makes it again on a bump alone, with tracks left as they are', async () => {
    s().addTrack('midi', 'oracle-synth', 'Synth');
    renderHook(() => usePlaybackEngine(true, null));
    await settle();

    act(() => {
      bumpSessionGeneration('reset');
    });
    await settle();
    expect(audio.engines).toHaveLength(2);
    expect(audio.engines[0].disposed).toBe(true);
  });

  // The meters and the instrument panels read a track's engine from the
  // registry by id. The ids stay the same, so they need telling.
  it('tells the engine readers, with the new engine in place', async () => {
    const id = s().addTrack('midi', 'oracle-synth', 'Synth');
    renderHook(() => usePlaybackEngine(true, null));
    await settle();

    const seen: unknown[] = [];
    const stop = subscribeEngineReady(() => {
      seen.push(getTrackAudioState(id)?.trackEngine);
    });
    reopen();
    stop();
    expect(seen).toEqual([audio.engines[1]]);
  });

  // A load can start between a render and its effects (a child's effect
  // runs first). The render the load schedules builds the new session's
  // engines; building for the stale one only made instruments to throw away.
  it('builds nothing for a render a load has already replaced', async () => {
    s().addTrack('midi', 'oracle-synth', 'Synth');
    function Load() {
      useEffect(() => {
        bumpSessionGeneration('restore');
      }, []);
      return null;
    }
    function Editor() {
      usePlaybackEngine(true, null);
      return <Load />;
    }
    render(<Editor />);
    await settle();
    expect(audio.engines).toHaveLength(1);
    expect(oracle.adapters).toHaveLength(1);
  });

  it('keeps the engine for an edit within the session', async () => {
    const id = s().addTrack('midi', 'oracle-synth', 'Synth');
    renderHook(() => usePlaybackEngine(true, null));
    await settle();

    act(() => s().updateTrack(id, { volume: 0.5 }));
    await settle();
    expect(audio.engines).toHaveLength(1);
    expect(audio.engines[0].disposed).toBe(false);
  });
});

describe('an instrument still loading when its engine goes', () => {
  it('is let go, never wired into the disposed engine', async () => {
    oracle.holdInit = true;
    const id = s().addTrack('midi', 'oracle-synth', 'Synth');
    patches.byTrack.set(id, { name: 'patch' });
    renderHook(() => usePlaybackEngine(true, null));

    reopen();
    expect(oracle.adapters).toHaveLength(2);

    await act(async () => oracle.adapters[0].finishInit());
    expect(oracle.adapters[0].disposed).toBe(true);
    expect(audio.engines[0].instrument).toBeNull();
    expect(patches.apply).not.toHaveBeenCalled();

    await act(async () => oracle.adapters[1].finishInit());
    expect(audio.engines[1].instrument).toBe(oracle.adapters[1]);
    expect(patches.apply).toHaveBeenCalledWith(
      oracle.adapters[1].engine,
      { name: 'patch' },
      { projectBpm: 120 },
    );
  });

  it('is let go when its track is deleted', async () => {
    oracle.holdInit = true;
    const id = s().addTrack('midi', 'oracle-synth', 'Synth');
    renderHook(() => usePlaybackEngine(true, null));

    act(() => s().removeTrack(id));
    await act(async () => oracle.adapters[0].finishInit());
    expect(oracle.adapters[0].disposed).toBe(true);
    expect(audio.engines[0].instrument).toBeNull();
  });
});

// A track with no patch of its own plays the default patch its panel shows.
// The engine's own starting sound differs from it (filter 1 at 20 kHz, not
// 13.4), so the track changed sound when its panel first opened, and went
// back after a reload, which made the engine again without a patch.
describe('an Oracle track with no patch of its own', () => {
  it('plays the default patch from the moment its engine is made', async () => {
    s().addTrack('midi', 'oracle-synth', 'Synth');
    renderHook(() => usePlaybackEngine(true, null));
    await settle();
    expect(patches.apply).toHaveBeenCalledWith(
      oracle.adapters[0].engine,
      { name: 'default patch' },
      { projectBpm: 120 },
    );

    reopen();
    await settle();
    expect(patches.apply).toHaveBeenLastCalledWith(
      oracle.adapters[1].engine,
      { name: 'default patch' },
      { projectBpm: 120 },
    );
  });
});

describe('a bass track', () => {
  it('is made with its bass voice, again when the voice changes', async () => {
    const id = s().addTrack('midi', 'bass-electric', 'Bass');
    act(() => s().updateTrack(id, { bassVoice: 'fretless' }));
    renderHook(() => usePlaybackEngine(true, null));
    await settle();
    expect(voices.made).toEqual(['Fretless (FluidR3)']);

    act(() => s().updateTrack(id, { bassVoice: 'upright' }));
    await settle();
    expect(voices.made).toEqual(['Fretless (FluidR3)', 'Upright (FluidR3)']);
    expect(audio.engines[0].disposed).toBe(true);
  });

  it("is made again with the reopened project's voice", async () => {
    const id = s().addTrack('midi', 'bass-electric', 'Bass');
    act(() => s().updateTrack(id, { bassVoice: 'fretless' }));
    renderHook(() => usePlaybackEngine(true, null));
    await settle();

    reopen(() => s().updateTrack(id, { bassVoice: 'finger' }));
    await settle();
    expect(voices.made.at(-1)).toBe('Finger electric (FluidR3)');
  });
});
