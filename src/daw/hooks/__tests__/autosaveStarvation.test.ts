// @vitest-environment jsdom
/**
 * Autosave starvation: when is the crash-recovery autosave written?
 *
 * Before milestone 1.1, useAutosave subscribed to every main-store write and
 * restarted a 1.5 s debounce each time. That lost work in four ways (audit
 * shell-07, bundle-load-01, synth-store-01):
 *
 * - While the transport plays, useTransport pushes the playhead into the
 *   store about every 33 ms, so the debounce never ran out and nothing was
 *   saved until playback stopped. An edit made over a looping section was
 *   lost if the tab was refreshed, closed or crashed before Stop.
 * - A synth-only edit writes the separate synth store, which the autosave
 *   did not watch, so it scheduled no write at all.
 * - Unmounting (leaving the editor) cleared the pending write instead of
 *   flushing it.
 * - Nothing flushed on pagehide or when the tab was hidden, so closing or
 *   refreshing the tab inside the debounce lost the edit.
 *
 * 1.1 drives the autosave from the persisted fields only (and the synth
 * patch), with a 5 s maxWait and a flush on pagehide, on hidden and on
 * unmount, so each of those is a plain `it` now, with its finding named
 * above it. The cases below them pin the rest of the contract: playback and
 * UI state alone write nothing, and nothing is written before the page holds
 * a session or after File ▸ New Project has dropped it.
 *
 * The hook is mounted for real (renderHook) against the real store, under
 * fake timers. Playback is simulated by writing setPosition at the rate
 * useTransport does, because the real transport loop needs Tone.js and
 * requestAnimationFrame. writeLocalSession is wrapped in a spy that still
 * writes, so each test can also read back what reached localStorage. The
 * setup marks the session loaded, as the editor's boot always has by the
 * time anyone edits.
 *
 * If the autosave or its flush moves elsewhere (such as the 1.4 draft
 * store), mount that instead. The idle case checks that the write lands
 * within 1.5 s, not the exact delay, so a shorter debounce still passes.
 *
 * Run: npx vitest run src/daw/hooks/__tests__/autosaveStarvation.test.ts
 */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { captureSynthState } from '@/daw/oracle-synth/synthTrackState';
import { forgetLiveSession } from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import {
  clearLocalSession,
  markSessionLoaded,
  readLocalSession,
  writeLocalSession,
} from '@/lib/studio-projects/localSession';
import { useAutosave } from '../useAutosave';
import { useStoreBridge } from '../useStoreBridge';

vi.mock('@/lib/studio-projects/localSession', async (importOriginal) => {
  const real =
    await importOriginal<typeof import('@/lib/studio-projects/localSession')>();
  return { ...real, writeLocalSession: vi.fn(real.writeLocalSession) };
});

const s = () => useStore.getState();
const autosaveWrites = vi.mocked(writeLocalSession);

const AUTOSAVE_KEY = 'musicAtlas:daw:autosave';
const CLIP_ID = 'clip-1';
// useTransport throttles its playhead writes to one per 33 ms (~30 Hz).
const FRAME_MS = 33;
// 120 bpm at 480 ticks per quarter note.
const TICKS_PER_MS = (120 / 60) * (480 / 1000);

let keysId = '';

/** Draw one note into the clip, as the piano roll does. */
function drawNote(): void {
  s().updateMidiClipEvents(keysId, CLIP_ID, [
    { note: 60, velocity: 100, startTick: 0, durationTicks: 480, channel: 0 },
  ]);
}

/** Simulate useTransport while playing: a playhead write every frame. */
function play(ms: number): void {
  for (let elapsed = FRAME_MS; elapsed <= ms; elapsed += FRAME_MS) {
    vi.advanceTimersByTime(FRAME_MS);
    s().setPosition(Math.round(elapsed * TICKS_PER_MS));
  }
}

/** Hide the tab, as switching to another tab or minimising the window does. */
function hideTab(): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'hidden',
  });
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => true,
  });
  // Bubbles, as the browser's does, so window listeners hear it too.
  document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
}

/** The pitches of the saved clip, or [] when nothing was saved. */
function savedPitches(): number[] {
  return readLocalSession()?.data.tracks[0]?.midiClips[0]?.events.notes ?? [];
}

/** Filter 1's cutoff in the Lead's saved Oracle patch, if one was saved. */
function savedLeadCutoff(): number | undefined {
  const lead = readLocalSession()?.data.tracks.find((t) => t.name === 'Lead');
  return lead?.settings?.oracleSynth?.filters[0].cutoff;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useSynthStore.setState(useSynthStore.getInitialState(), true);
  // A fresh project with one empty clip, set up before the hook subscribes so
  // none of it schedules a write.
  useStore.setState(useStore.getInitialState(), true);
  keysId = s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMidiClip(keysId, { id: CLIP_ID, startTick: 0, events: [] });
  markSessionLoaded();
  autosaveWrites.mockClear();
});

afterEach(() => {
  // No vitest globals here, so Testing Library doesn't unmount on its own;
  // a hook left mounted would keep writing in the next test.
  cleanup();
  // Back to jsdom's own (visible) document.
  Reflect.deleteProperty(document, 'visibilityState');
  Reflect.deleteProperty(document, 'hidden');
  vi.useRealTimers();
});

describe('crash-recovery autosave', () => {
  it('writes an edit made while the transport is stopped within 1.5 s', () => {
    renderHook(() => useAutosave());
    drawNote();
    vi.advanceTimersByTime(1500);

    expect(autosaveWrites).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });

  // shell-07 / bundle-load-01: every store write restarted the 1.5 s debounce,
  // and the ~30 Hz playhead writes kept restarting it, so it never fired.
  it('writes an edit made while the transport plays', () => {
    renderHook(() => useAutosave());
    s().play();
    play(1000);
    drawNote();
    play(10_000);

    expect(autosaveWrites).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });

  // synth-store-01 / synth-ui-04: the autosave subscribed only to the main
  // store, and a knob turned on the synth writes only useSynthStore.
  it('writes a synth-only edit', () => {
    // Added before the autosave mounts, so the track schedules nothing.
    const leadId = s().addTrack('midi', 'oracle-synth', 'Lead');
    // The Lead's synth panel is open: its bridge makes the Lead's patch the
    // live one, which the serializer reads from the synth store.
    renderHook(() => useStoreBridge(null, leadId));
    renderHook(() => useAutosave());

    useSynthStore.getState().setFilterParam(0, 'cutoff', 800);
    vi.advanceTimersByTime(10_000);

    expect(autosaveWrites).toHaveBeenCalled();
    expect(savedLeadCutoff()).toBe(800);
  });

  // synth-store-01: the autosave watches the synth store's patch fields
  // through its own list, so each field of a track's patch (what
  // captureSynthState saves) must be on it, including any added later.
  it('writes a change to any field of the synth patch', () => {
    renderHook(() => useAutosave());
    vi.advanceTimersByTime(1500);
    const changed = (value: unknown) =>
      typeof value === 'number'
        ? value + 1
        : typeof value === 'string'
          ? `${value} 2`
          : typeof value === 'boolean'
            ? !value
            : value == null
              ? {}
              : structuredClone(value);

    const unsaved: string[] = [];
    for (const [field, value] of Object.entries(captureSynthState())) {
      autosaveWrites.mockClear();
      useSynthStore.setState({ [field]: changed(value) });
      vi.advanceTimersByTime(1500);
      if (autosaveWrites.mock.calls.length === 0) unsaved.push(field);
    }

    expect(unsaved).toEqual([]);
  });

  // bundle-load-01: leaving the editor inside the debounce cleared the pending
  // write instead of flushing it, so the next plain boot restored the older
  // autosave.
  it('flushes a pending edit when the editor unmounts', () => {
    const { unmount } = renderHook(() => useAutosave());
    drawNote();
    vi.advanceTimersByTime(500);
    unmount();

    expect(autosaveWrites).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });

  // shell-07: nothing listened for pagehide, so closing or refreshing the tab
  // inside the debounce lost the edit.
  it('flushes a pending edit on pagehide', () => {
    renderHook(() => useAutosave());
    drawNote();
    window.dispatchEvent(new Event('pagehide'));

    expect(autosaveWrites).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });

  // shell-07: nor for the tab being hidden, the last event a background tab
  // that is later discarded or crashes reliably gets.
  it('flushes a pending edit when the tab is hidden', () => {
    renderHook(() => useAutosave());
    drawNote();
    hideTab();

    expect(autosaveWrites).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });

  // A stream of edits (a long fader drag) keeps restarting the debounce; the
  // 5 s maxWait still gets the work out.
  it('writes within 5 s while edits keep coming', () => {
    renderHook(() => useAutosave());
    vi.advanceTimersByTime(1500); // the write the editor's arrival makes
    autosaveWrites.mockClear();
    const start = Date.now();
    for (let i = 0; i < 20 && !autosaveWrites.mock.calls.length; i++) {
      s().updateTrack(keysId, { volume: 0.5 - i * 0.01 });
      vi.advanceTimersByTime(500);
    }

    expect(autosaveWrites).toHaveBeenCalledTimes(1);
    expect(Date.now() - start).toBeLessThanOrEqual(5000);
    expect(readLocalSession()?.data.tracks[0]?.volume).toBeLessThan(0.5);
  });

  it('writes nothing for playback, selection or zoom alone', () => {
    renderHook(() => useAutosave());
    vi.advanceTimersByTime(1500);
    autosaveWrites.mockClear();
    s().play();
    play(10_000);
    s().setSelectedTrackId(keysId);
    s().setTimelineZoom(2);
    vi.advanceTimersByTime(10_000);

    expect(autosaveWrites).not.toHaveBeenCalled();
  });

  // The store a page starts with is empty: written before the boot has
  // restored or opened anything, it would replace the work being restored.
  it('writes nothing before the page holds a session', () => {
    drawNote();
    writeLocalSession();
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    forgetLiveSession(); // as on a fresh page, before the boot
    s().updateTrack(keysId, { volume: 0.2 });
    renderHook(() => useAutosave());
    s().updateTrack(keysId, { volume: 0.1 });
    vi.advanceTimersByTime(10_000);
    window.dispatchEvent(new Event('pagehide'));

    expect(saved).not.toBeNull();
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(saved);
  });

  // File ▸ New Project drops the autosave and reloads: the reload's pagehide
  // must not write the project being left back in.
  it('does not write the session back after File ▸ New Project drops it', () => {
    renderHook(() => useAutosave());
    drawNote();
    clearLocalSession();
    window.dispatchEvent(new Event('pagehide'));

    expect(readLocalSession()).toBeNull();
  });
});
