// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import {
  resetDraftAutosaveForTests,
  setDraftStoreForTests,
  useDraftAutosave,
  whenDraftWritesSettled,
} from '@/daw/persistence/drafts/autosave';
import {
  getDraftSessionPort,
  resetDraftSessionPortForTests,
} from '@/daw/persistence/drafts/draftSessionPort';
import { useDraftStatusStore } from '@/daw/persistence/drafts/draftStatusStore';
import { resetPendingMediaForTests } from '@/daw/persistence/drafts/pendingMedia';
import { markDocumentBaseline } from '@/daw/persistence/saveStatusStore';
import type { SessionData } from '@/daw/persistence/SessionSerializer';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import { beginTake } from '@/daw/session/takesInFlight';
import { useStore } from '@/daw/store';
import { setDefaultLockManager } from '@/lib/studio-projects/drafts/draftLock';
import {
  createDraftStore,
  type DraftStore,
} from '@/lib/studio-projects/drafts/draftStore';
import { MemoryStorage } from '@/lib/studio-projects/drafts/__tests__/draftTestUtils';
import { useMidiRecording } from '../useMidiRecording';
import { useTransport } from '../useTransport';

// ── A MIDI take when the editor closes mid-take ────────────────────────────
// Leaving the editor while recording keeps the take, as Stop would. The
// editor mounts useTransport before the MIDI hooks (DawApp), so its unmount
// pause clears isRecording first; the take must survive that. It must also
// reach the device draft (milestone 1.4's draft autosave), whose unmount
// flush runs after the MIDI hooks' cleanup only because DawApp declares
// them first.

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

describe('a take kept on the way out, in the device draft', () => {
  let store: DraftStore;
  let draftId = '';

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    setDefaultLockManager(() => null);
    resetDraftAutosaveForTests();
    resetDraftSessionPortForTests();
    resetPendingMediaForTests();
    useDraftStatusStore.setState(useDraftStatusStore.getInitialState(), true);
    useSessionStore.setState({ ...INITIAL_SESSION_STATE }, true);
    store = createDraftStore({
      indexedDB: null,
      storage: new MemoryStorage(),
      now: () => Date.now(),
    });
    setDraftStoreForTests(store);
    // The editor's boot has opened a session by the time anyone records:
    // claim, activate, baseline and begin, as openSession does.
    const port = getDraftSessionPort();
    const claim = await port.claim(
      { userId: 'student-1', userKey: 'student-1' },
      { boot: false },
    );
    port.activate(claim);
    markDocumentBaseline();
    await port.begin({ source: 'new', reopenable: true, fingerprint: null });
    draftId = claim.draftId;
    await whenDraftWritesSettled();
  });

  afterEach(() => {
    resetDraftAutosaveForTests();
    setDraftStoreForTests(null);
    setDefaultLockManager(null);
  });

  /** DawApp's order: the transport, then MIDI input, then the autosave. */
  function mountWithAutosave() {
    return renderHook(() => {
      useTransport();
      const recorder = useMidiRecording();
      useDraftAutosave();
      return recorder;
    });
  }

  /** The keys track as the draft holds it, once its writes have landed. */
  async function draftedKeys() {
    for (let i = 0; i < 5; i++) {
      await whenDraftWritesSettled();
      await Promise.resolve();
    }
    const body = await store.readBody(draftId);
    const session = body ? (JSON.parse(body.text) as SessionData) : null;
    return session?.data.tracks.find((t) => t.id === 'keys');
  }

  // A student who leaves mid-take and then closes the tab without coming
  // back has only the draft to restore from.
  it('is written to the draft as the editor closes', async () => {
    const { result, unmount } = mountWithAutosave();
    recordTake(result.current);

    unmount();

    const saved = await draftedKeys();
    expect(saved?.midiClips).toHaveLength(1);
    expect(saved?.midiClips[0].startTick).toBe(1920);
    expect(saved?.midiClips[0].events.notes).toEqual([60, 64]);
  });

  // An audio take ends later than a MIDI one: usePlaybackEngine's unmount
  // stops the recorder, and the clip lands when stopRecording resolves,
  // after the editor (and the autosave's subscriptions) are gone. The
  // autosave keeps listening until the take settles (takesInFlight), so a
  // student who then closes the tab from the dashboard still has it.
  it('holds an audio take that lands after the editor closed', async () => {
    const { unmount } = mountWithAutosave();
    const settleTake = beginTake('audio');

    unmount();
    // The recorder's stop resolves: the clip lands, the take settles.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      useStore.getState().updateTrack('keys', {
        audioClips: [
          {
            id: 'late-take',
            startTick: 0,
            duration: 1920,
            fadeInTicks: 0,
            fadeOutTicks: 0,
            assetId: null,
          },
        ] as never,
      });
      settleTake();
    });

    await vi.waitFor(
      async () => {
        const saved = await draftedKeys();
        expect(saved?.audioClips.map((c) => c.id)).toEqual(['late-take']);
      },
      { timeout: 4000, interval: 50 },
    );
  });

  // React cleans up one component's effects in the order they were declared,
  // so the test above holds in the editor only while DawApp keeps this order.
  it('relies on DawApp declaring the MIDI hooks before the draft autosave', () => {
    const dawApp = readFileSync(resolve(__dirname, '../../DawApp.tsx'), 'utf8');
    const midiHooks = dawApp.indexOf('useMidiInputRouting();');
    const autosave = dawApp.indexOf('useDraftAutosave();');

    expect(midiHooks).toBeGreaterThan(-1);
    expect(autosave).toBeGreaterThan(-1);
    expect(midiHooks).toBeLessThan(autosave);
  });
});
