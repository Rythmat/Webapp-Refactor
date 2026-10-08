// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { forgetLiveSession } from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import {
  markSessionLoaded,
  readLocalSession,
} from '@/lib/studio-projects/localSession';
import { useAutosave } from '../useAutosave';
import { useMidiRecording } from '../useMidiRecording';
import { useTransport } from '../useTransport';

// ── A MIDI take when the editor closes mid-take ────────────────────────────
// Leaving the editor while recording keeps the take, as Stop would. The
// editor mounts useTransport before the MIDI hooks (DawApp), so its unmount
// pause clears isRecording first; the take must survive that. It must also
// reach the crash-recovery autosave, whose unmount flush runs after the MIDI
// hooks' cleanup only because DawApp declares them first.

const transport = vi.hoisted(() => ({
  state: 'stopped' as 'started' | 'stopped' | 'paused',
  ticks: 0,
  loop: false,
  loopStart: '0i',
  loopEnd: '0i',
  timeSignature: [4, 4] as number[],
  bpm: { value: 120 },
  PPQ: 480,
  start: vi.fn(),
  pause: vi.fn(),
}));

// No look-ahead, so a captured note lands on the transport tick it was
// played at.
vi.mock('tone', () => ({
  getTransport: () => transport,
  getContext: () => ({ lookAhead: 0 }),
}));
vi.mock('@/daw/audio/AudioEngine', () => ({
  audioEngine: { resumeIfNeeded: () => Promise.resolve() },
}));
vi.mock('@/daw/audio/transportTicks', () => ({ dropRepeatedTicks: vi.fn() }));

const armedKeys = {
  id: 'keys',
  name: 'Keys',
  type: 'midi',
  instrument: 'oracle-synth',
  color: '#888888',
  mute: false,
  solo: false,
  volume: 0.8,
  pan: 0,
  monitoring: false,
  midiInputId: null,
  audioInputId: null,
  audioInputChannel: null,
  effects: {},
  activeEffects: [],
  trackRole: 'auto',
  recordArmed: true,
  midiClips: [],
  audioClips: [],
};

/** The editor's hooks in DawApp's order: the transport, then MIDI input. */
function mountEditorHooks() {
  return renderHook(() => {
    useTransport();
    return useMidiRecording();
  });
}

/** Punch in at bar 2, then play a note that ends and one still held. */
function recordTake(recorder: ReturnType<typeof useMidiRecording>) {
  act(() => useStore.setState({ position: 1920, isRecording: true }));
  transport.ticks = 2400;
  recorder.captureNoteOn(60, 100);
  transport.ticks = 2880;
  recorder.captureNoteOff(60);
  transport.ticks = 3000;
  recorder.captureNoteOn(64, 90);
  transport.ticks = 3360;
}

const keysClips = () =>
  useStore.getState().tracks.find((t) => t.id === 'keys')?.midiClips ?? [];

beforeEach(() => {
  transport.state = 'stopped';
  transport.ticks = 0;
  useStore.setState({
    tracks: [structuredClone(armedKeys)] as never,
    isPlaying: false,
    isRecording: false,
    isCountingIn: false,
    position: 0,
  });
});

afterEach(cleanup);

describe('useMidiRecording when the editor closes', () => {
  it('keeps a take that is still running, anchored at punch-in', () => {
    const { result, unmount } = mountEditorHooks();
    recordTake(result.current);

    unmount();

    // The transport's unmount pause ran: nothing re-ran the stop effect.
    expect(useStore.getState().isRecording).toBe(false);
    const clips = keysClips();
    expect(clips).toHaveLength(1);
    expect(clips[0].startTick).toBe(1920);
    expect(clips[0].events).toEqual([
      expect.objectContaining({ note: 60, startTick: 480, durationTicks: 480 }),
      // Still held at the close: it ends where the transport stopped.
      expect.objectContaining({
        note: 64,
        startTick: 1080,
        durationTicks: 360,
      }),
    ]);
    expect(result.current.isRecording()).toBe(false);
  });

  it('keeps a take stopped before the close once, not twice', () => {
    const { result, unmount } = mountEditorHooks();
    recordTake(result.current);

    act(() => useStore.getState().pause());
    expect(keysClips()).toHaveLength(1);

    unmount();
    expect(keysClips()).toHaveLength(1);
  });

  it('adds nothing when no take is running or the take is empty', () => {
    const idle = mountEditorHooks();
    idle.unmount();
    expect(keysClips()).toHaveLength(0);

    const empty = mountEditorHooks();
    act(() => useStore.setState({ position: 1920, isRecording: true }));
    empty.unmount();
    expect(keysClips()).toHaveLength(0);
  });
});

describe('a take kept on the way out, in the crash-recovery autosave', () => {
  beforeEach(() => {
    localStorage.clear();
    // The editor's boot has opened a session by the time anyone records.
    markSessionLoaded();
  });

  afterEach(() => forgetLiveSession());

  /** DawApp's order: the transport, then MIDI input, then the autosave. */
  function mountWithAutosave() {
    return renderHook(() => {
      useTransport();
      const recorder = useMidiRecording();
      useAutosave('student-1');
      return recorder;
    });
  }

  // A student who leaves mid-take and then closes the tab without coming
  // back has only the autosave to restore from.
  it('is written by the autosave as the editor closes', () => {
    const { result, unmount } = mountWithAutosave();
    recordTake(result.current);

    unmount();

    const saved = readLocalSession()?.data.tracks.find((t) => t.id === 'keys');
    expect(saved?.midiClips).toHaveLength(1);
    expect(saved?.midiClips[0].startTick).toBe(1920);
    expect(saved?.midiClips[0].events.notes).toEqual([60, 64]);
  });

  // React cleans up one component's effects in the order they were declared,
  // so the test above holds in the editor only while DawApp keeps this order.
  it('relies on DawApp declaring the MIDI hooks before the autosave', () => {
    const dawApp = readFileSync(resolve(__dirname, '../../DawApp.tsx'), 'utf8');
    const midiHooks = dawApp.indexOf('useMidiInputRouting();');
    const autosave = dawApp.indexOf('useAutosave(userId);');

    expect(midiHooks).toBeGreaterThan(-1);
    expect(autosave).toBeGreaterThan(-1);
    expect(midiHooks).toBeLessThan(autosave);
  });
});
