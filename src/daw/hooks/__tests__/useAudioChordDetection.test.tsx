// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';

// ── Live chord detection runs only while an armed input can be heard ──────
// The detector used to keep a rAF loop for the editor's whole life and push
// the chord and the tuning to the store on every frame. Now it is an
// engineClock task registered only while a record-armed guitar, bass or
// vocal track has a chord analyser, and it writes only on a change.

const det = vi.hoisted(() => ({
  result: null as null | {
    rootPc: number;
    quality: string;
    confidence: number;
    tuningCents?: number;
  },
  instances: 0,
  resets: 0,
}));
vi.mock('@/daw/audio/AudioChordDetector', () => ({
  AudioChordDetector: class {
    constructor() {
      det.instances++;
    }
    analyze() {
      return det.result;
    }
    reset() {
      det.resets++;
    }
    setKeyContext() {}
    clearKeyContext() {}
  },
}));
const playhead = vi.hoisted(() => ({ tick: 0 }));
vi.mock('@/daw/engine/playheadClock', () => ({
  getPlayheadTick: () => playhead.tick,
}));
// The proposal is the regions themselves, so the test can read their ticks.
vi.mock('@/daw/utils/chordAnalysis', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  audioChordAnalysis: (regions: unknown) => regions,
}));

import { useAudioChordDetection } from '../useAudioChordDetection';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from '../usePlaybackEngine';
import { notifyEngineReady } from '@/daw/engine/trackAudio';
import { frameTaskNames } from '@/daw/engine/engineClock';
import {
  resetHistory,
  startHistory,
  undo,
  undoLabel,
} from '@/daw/store/history';

let now = 0;
const frames = (n: number) => vi.advanceTimersByTime(16 * n);

function adapter() {
  return { getChordAnalyserNode: () => ({}) as AnalyserNode };
}

function guitarTrack(recordArmed: boolean) {
  return {
    id: 'g',
    name: 'Guitar',
    type: 'audio',
    instrument: 'audio-input',
    recordArmed,
    audioClips: [],
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  now = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb((now += 16)), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  det.result = null;
  det.instances = 0;
  det.resets = 0;
  playhead.tick = 0;
  useStore.setState({
    tracks: [],
    isPlaying: false,
    isRecording: false,
    liveChordStream: [],
    globalTuningCents: 0,
    bpm: 120,
  } as never);
});

afterEach(() => {
  cleanup();
  trackEngineRegistry.delete('g');
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useAudioChordDetection', () => {
  it('runs no frame task with nothing armed', () => {
    useStore.setState({ tracks: [guitarTrack(false)] } as never);
    trackEngineRegistry.set('g', { instrument: adapter() } as never);
    renderHook(() => useAudioChordDetection());
    frames(30);
    expect(frameTaskNames()).toEqual([]);
    expect(det.instances).toBe(0);
  });

  it('starts when the armed track gets its engine, stops when disarmed', () => {
    const { unmount } = renderHook(() => useAudioChordDetection());
    useStore.setState({ tracks: [guitarTrack(true)] } as never);
    // Armed, but its engine isn't built yet.
    expect(frameTaskNames()).toEqual([]);

    trackEngineRegistry.set('g', { instrument: adapter() } as never);
    notifyEngineReady();
    expect(frameTaskNames()).toEqual(['audio-chord-detection']);

    useStore.setState({ tracks: [guitarTrack(false)] } as never);
    expect(frameTaskNames()).toEqual([]);
    unmount();
  });

  it('pushes a chord once per change and the tuning once per cent', () => {
    useStore.setState({ tracks: [guitarTrack(true)] } as never);
    trackEngineRegistry.set('g', { instrument: adapter() } as never);
    const push = vi.spyOn(useStore.getState(), 'pushLiveChord');
    const tune = vi.spyOn(useStore.getState(), 'setGlobalTuningCents');
    const { unmount } = renderHook(() => useAudioChordDetection());

    det.result = {
      rootPc: 0,
      quality: 'major',
      confidence: 0.9,
      tuningCents: 3.2,
    };
    frames(40);
    det.result = { ...det.result, tuningCents: 3.4 };
    frames(40);
    expect(push).toHaveBeenCalledTimes(1);
    expect(tune).toHaveBeenCalledTimes(1);
    expect(tune).toHaveBeenLastCalledWith(3);

    det.result = {
      rootPc: 7,
      quality: 'major',
      confidence: 0.9,
      tuningCents: 4.6,
    };
    frames(10);
    expect(push).toHaveBeenCalledTimes(2);
    expect(tune).toHaveBeenLastCalledWith(5);
    unmount();
    push.mockRestore();
    tune.mockRestore();
  });

  it('resets the HMM when a new engine replaces the one under the same track', () => {
    useStore.setState({ tracks: [guitarTrack(true)] } as never);
    trackEngineRegistry.set('g', { instrument: adapter() } as never);
    const { unmount } = renderHook(() => useAudioChordDetection());
    frames(5);
    expect(det.instances).toBe(1);
    const resets = det.resets;

    trackEngineRegistry.set('g', { instrument: adapter() } as never);
    notifyEngineReady();
    frames(5);
    expect(det.resets).toBe(resets + 1);
    unmount();
  });

  it('stamps recorded chords at the live playhead and finishes the take without an analyser', () => {
    const propose = vi.fn();
    useStore.setState({
      tracks: [guitarTrack(true)],
      proposeChordSymbols: propose,
      rootNote: 0,
      mode: 'ionian',
      // Auto chords off: the take's chords are proposed, not written.
      chordAutoAnalyze: false,
    } as never);
    trackEngineRegistry.set('g', { instrument: adapter() } as never);
    const { unmount } = renderHook(() => useAudioChordDetection());

    det.result = { rootPc: 0, quality: 'major', confidence: 0.9 };
    playhead.tick = 10000;
    useStore.setState({ isPlaying: true, isRecording: true });
    frames(10);

    // The engine goes away before the stop: the take still finishes.
    trackEngineRegistry.delete('g');
    notifyEngineReady();
    expect(frameTaskNames()).toEqual([]);
    useStore.setState({ isPlaying: false, isRecording: false });

    expect(propose).toHaveBeenCalledTimes(1);
    const regions = propose.mock.calls[0][0] as { startTick: number }[];
    // At the live playhead (less 288 ticks of vote latency, on the beat
    // grid), not at the parked position (0).
    expect(regions[0].startTick).toBe(9600);
    unmount();
  });

  it('with Auto chords on, writes the take’s chords on the ruler as it plays and as one undo step at the end', () => {
    const propose = vi.fn();
    useStore.setState({
      tracks: [guitarTrack(true)],
      proposeChordSymbols: propose,
      rootNote: 0,
      mode: 'ionian',
      chordAutoAnalyze: true,
      chordRecordMode: 'replace',
      chordRegions: [],
    } as never);
    resetHistory();
    const release = startHistory();
    trackEngineRegistry.set('g', { instrument: adapter() } as never);
    const { unmount } = renderHook(() => useAudioChordDetection());
    const perf = vi.spyOn(performance, 'now');
    let clock = 0;
    perf.mockImplementation(() => (clock += 100));

    det.result = { rootPc: 0, quality: 'major', confidence: 0.9 };
    playhead.tick = 10000;
    useStore.setState({ isPlaying: true, isRecording: true });
    frames(20);
    // Live: on the ruler while the take plays.
    expect(useStore.getState().chordRegions.length).toBeGreaterThan(0);
    expect(useStore.getState().chordRegions[0].startTick).toBe(9600);

    useStore.setState({ isPlaying: false, isRecording: false });
    expect(propose).not.toHaveBeenCalled();
    const lane = useStore.getState().chordRegions;
    expect(lane[0].startTick).toBe(9600);
    expect(lane[0].noteName).toMatch(/^C/);
    // One step takes the take's chords away.
    expect(undoLabel()).toBe('Chords from take');
    undo();
    expect(useStore.getState().chordRegions).toEqual([]);
    perf.mockRestore();
    release();
    unmount();
  });
});
