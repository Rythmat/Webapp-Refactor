// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import {
  DEFAULT_EFFECTS,
  type TrackEffectState,
} from '@/daw/audio/EffectChain';

// ── What Play hands the engine (fx-mixer-02, synth-store-04, never lose work) ─
// The mastering chain, with every slot off while Bypass is on and the stored
// chain back after; a reloaded Oracle track's tempo; and a take still running
// when the editor closes, which is kept as Stop would keep it. renderProject
// has its own tests: these cover live playback.

const engine = vi.hoisted(() => ({
  updateMasteringEffects: vi.fn(),
  context: {
    createMediaStreamSource: () => ({ connect() {}, disconnect() {} }),
    createAnalyser: () => ({
      fftSize: 0,
      connect() {},
      disconnect() {},
      getFloatTimeDomainData() {},
    }),
  },
  masterGain: {
    gain: { setTargetAtTime() {} },
    context: { currentTime: 0 },
  },
}));
vi.mock('@/daw/audio/AudioEngine', () => ({
  audioEngine: {
    getContext: () => engine.context,
    getMasterGain: () => engine.masterGain,
    updateMasteringEffects: engine.updateMasteringEffects,
    updateReturnEffects() {},
    setReturnVolume() {},
    getReturnIds: () => [],
    getReturnBusInput: () => null,
    getMonitorBus: () => null,
  },
}));

vi.mock('@/daw/audio/TrackEngine', () => ({
  TrackEngine: class {
    setVolume() {}
    setAudible() {}
    setPan() {}
    updateEffects() {}
    setSend() {}
    setKeySourceResolver() {}
    setInstrument() {}
    allNotesOff() {}
    panic() {}
    dispose() {}
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
    clearTrack() {}
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

const oracle = vi.hoisted(() => ({ engine: { name: 'oracle engine' } }));
vi.mock('@/daw/instruments/OracleSynthAdapter', () => ({
  OracleSynthAdapter: class {
    init() {
      return Promise.resolve();
    }
    getEngine() {
      return oracle.engine;
    }
    dispose() {}
  },
}));
const synth = vi.hoisted(() => ({ patch: { name: 'patch' }, apply: vi.fn() }));
vi.mock('@/daw/oracle-synth/synthTrackState', () => ({
  getTrackSynthState: () => synth.patch,
  applySynthStateToEngine: synth.apply,
}));

/** Every AudioRecorder the hook makes, newest last. */
const takes = vi.hoisted(() => ({
  recorders: [] as Array<{
    isRecording(): boolean;
    stopRecording: ReturnType<typeof vi.fn>;
  }>,
}));
vi.mock('@/daw/audio/AudioRecorder', () => ({
  AudioRecorder: class {
    private recording = false;
    stopRecording = vi.fn(async () => {
      this.recording = false;
      return {
        buffer: { duration: 2 } as AudioBuffer,
        originalBytes: new ArrayBuffer(8),
        originalContentType: 'audio/webm',
      };
    });
    constructor() {
      takes.recorders.push(this);
    }
    async startRecording() {
      this.recording = true;
    }
    isRecording() {
      return this.recording;
    }
  },
}));

const mic = vi.hoisted(() => {
  const track = { stop: vi.fn() };
  return { track, stream: { getTracks: () => [track] } };
});
const getUserMedia = vi.fn(async () => mic.stream);

import { useStore } from '@/daw/store';
import { usePlaybackEngine } from '../usePlaybackEngine';

/** Lets pending promises (instrument init, the mic, a take's decode) settle. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const s = () => useStore.getState();

/** An audio track with no instrument, armed: a plain mic take. */
function armedMicTrack(): string {
  const id = s().addTrack('audio', 'none', 'Mic');
  s().updateTrack(id, { recordArmed: true });
  return id;
}

beforeEach(() => {
  engine.updateMasteringEffects.mockReset();
  synth.apply.mockReset();
  takes.recorders.length = 0;
  mic.track.stop.mockReset();
  getUserMedia.mockClear();
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  const effects: TrackEffectState = structuredClone(DEFAULT_EFFECTS);
  effects.compressor.enabled = true;
  useStore.setState({
    tracks: [],
    bpm: 120,
    position: 0,
    isPlaying: false,
    isRecording: false,
    masteringEffects: effects,
    masteringBypass: false,
  });
});

afterEach(cleanup);

describe('the mastering chain', () => {
  it('runs every slot off under Bypass, and the stored chain after', () => {
    renderHook(() => usePlaybackEngine(true, null));
    const stored = s().masteringEffects;
    expect(engine.updateMasteringEffects).toHaveBeenLastCalledWith(stored);

    act(() => s().toggleMasteringBypass());
    const [bypassed] = engine.updateMasteringEffects.mock.lastCall!;
    for (const slot of Object.values(bypassed as TrackEffectState)) {
      expect(slot.enabled).toBe(false);
    }
    // Only the engine's copy changed: saves, undo and collab keep the chain.
    expect(s().masteringEffects).toBe(stored);

    act(() => s().toggleMasteringBypass());
    expect(engine.updateMasteringEffects).toHaveBeenLastCalledWith(stored);
  });
});

describe('an Oracle track as it loads', () => {
  it("gets the project's tempo, not the one saved in its patch", async () => {
    useStore.setState({ bpm: 92 });
    s().addTrack('midi', 'oracle-synth', 'Synth');
    renderHook(() => usePlaybackEngine(true, null));
    await settle();
    expect(synth.apply).toHaveBeenCalledWith(oracle.engine, synth.patch, {
      projectBpm: 92,
    });
  });
});

describe('a take when the editor closes', () => {
  it('is kept as a clip where recording started', async () => {
    const id = armedMicTrack();
    useStore.setState({ position: 960 });
    const { unmount } = renderHook(() => usePlaybackEngine(true, null));
    act(() => useStore.setState({ isPlaying: true, isRecording: true }));
    await settle();
    const [recorder] = takes.recorders;
    expect(recorder.isRecording()).toBe(true);

    unmount();
    expect(recorder.stopRecording).toHaveBeenCalledTimes(1);
    await settle();
    const clips = s().tracks.find((t) => t.id === id)!.audioClips;
    expect(clips).toHaveLength(1);
    expect(clips[0].startTick).toBe(960);
  });

  it('leaves nothing behind when nothing was recording', () => {
    const id = armedMicTrack();
    const { unmount } = renderHook(() => usePlaybackEngine(true, null));
    unmount();
    expect(takes.recorders).toHaveLength(0);
    expect(s().tracks.find((t) => t.id === id)!.audioClips).toHaveLength(0);
  });
});

describe('a mic that arrives after Stop', () => {
  it('starts no take, and is let go', async () => {
    let grant: (stream: typeof mic.stream) => void = () => {};
    getUserMedia.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    );
    armedMicTrack();
    renderHook(() => usePlaybackEngine(true, null));
    act(() => useStore.setState({ isPlaying: true, isRecording: true }));
    act(() => useStore.setState({ isPlaying: false, isRecording: false }));

    grant(mic.stream);
    await settle();
    const [recorder] = takes.recorders;
    expect(recorder.isRecording()).toBe(false);
    expect(mic.track.stop).toHaveBeenCalled();
  });
});
