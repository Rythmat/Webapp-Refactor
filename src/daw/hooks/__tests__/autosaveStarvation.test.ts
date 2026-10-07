// @vitest-environment jsdom
/**
 * Autosave starvation: when is the crash-recovery autosave written today?
 *
 * useAutosave subscribes to every main-store write and restarts a 1.5 s
 * debounce each time. That loses work in four ways (audit shell-07,
 * bundle-load-01, synth-store-01):
 *
 * - While the transport plays, useTransport pushes the playhead into the
 *   store about every 33 ms, so the debounce never runs out and nothing is
 *   saved until playback stops. An edit made over a looping section is lost
 *   if the tab is refreshed, closed or crashes before the student presses
 *   Stop.
 * - A synth-only edit writes the separate synth store, which the autosave
 *   does not watch, so it schedules no write at all.
 * - Unmounting (leaving the editor) clears the pending write instead of
 *   flushing it.
 * - Nothing flushes on pagehide or when the tab is hidden, so closing or
 *   refreshing the tab inside the debounce loses the edit.
 *
 * The hook is mounted for real (renderHook) against the real store, under
 * fake timers. Playback is simulated by writing setPosition at the rate
 * useTransport does, because the real transport loop needs Tone.js and
 * requestAnimationFrame. writeLocalSession is wrapped in a spy that still
 * writes, so each test can also read back what reached localStorage.
 *
 * This file is a ratchet. Each of today's losses is `it.fails`, with its
 * finding named above it. When milestone 1.1 (an autosave driven by persisted
 * fields, with a 5 s maxWait and a flush on pagehide or hidden) makes one
 * pass, vitest fails it ("Expect test to fail"): flip it to `it`. The cases
 * mount useAutosave, plus the synth panel's store bridge for the synth case;
 * if the autosave or its flush moves elsewhere (such as the 1.4 draft store),
 * mount that instead. The idle case passes today. It checks that the write
 * lands within today's 1.5 s, not the exact delay, so a shorter debounce
 * still passes.
 *
 * Run: npx vitest run src/daw/hooks/__tests__/autosaveStarvation.test.ts
 */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { useStore } from '@/daw/store';
import {
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

  // shell-07 / bundle-load-01: every store write restarts the 1.5 s debounce,
  // and the ~30 Hz playhead writes keep restarting it, so it never fires.
  it.fails('writes an edit made while the transport plays', () => {
    renderHook(() => useAutosave());
    s().play();
    play(1000);
    drawNote();
    play(10_000);

    expect(autosaveWrites).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });

  // synth-store-01 / synth-ui-04: the autosave subscribes only to the main
  // store, and a knob turned on the synth writes only useSynthStore.
  it.fails('writes a synth-only edit', () => {
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

  // bundle-load-01: leaving the editor inside the debounce clears the pending
  // write instead of flushing it, so the next plain boot restores the older
  // autosave.
  it.fails('flushes a pending edit when the editor unmounts', () => {
    const { unmount } = renderHook(() => useAutosave());
    drawNote();
    vi.advanceTimersByTime(500);
    unmount();

    expect(autosaveWrites).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });

  // shell-07: nothing listens for pagehide, so closing or refreshing the tab
  // inside the debounce loses the edit.
  it.fails('flushes a pending edit on pagehide', () => {
    renderHook(() => useAutosave());
    drawNote();
    window.dispatchEvent(new Event('pagehide'));

    expect(autosaveWrites).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });

  // shell-07: nor for the tab being hidden, the last event a background tab
  // that is later discarded or crashes reliably gets.
  it.fails('flushes a pending edit when the tab is hidden', () => {
    renderHook(() => useAutosave());
    drawNote();
    hideTab();

    expect(autosaveWrites).toHaveBeenCalled();
    expect(savedPitches()).toEqual([60]);
  });
});
