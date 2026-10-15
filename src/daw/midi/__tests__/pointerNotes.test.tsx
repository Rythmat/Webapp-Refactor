// @vitest-environment jsdom
/**
 * The practice screen's keys play (milestone 1.15, practice-tutorial-04 and
 * -11): a press sounds on the student's track through the live-notes path,
 * lights the key and goes into a take, and lets go wherever the pointer is
 * released, or when the window loses focus or the keys unmount. While the
 * practice screen shows, every live note goes to its track alone.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import type { PointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore, type Track } from '@/daw/store';

const engines = vi.hoisted(
  () => new Map<string, { noteOn: unknown; noteOff: unknown }>(),
);
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  trackEngineRegistry: {
    get: (id: string) => {
      const engine = engines.get(id);
      return engine ? { trackEngine: engine } : undefined;
    },
  },
}));
vi.mock('@/daw/collab/studioRealtime', () => ({
  studioRealtime: { shouldBroadcast: () => false, send: vi.fn() },
}));

import { liveMidiTargets, registerLiveRecorder } from '../liveNotes';
import {
  practiceLiveTrackId,
  recordTargetTrackId,
  setPracticeLiveTrack,
} from '../liveTarget';
import { POINTER_VELOCITY, usePointerNotes } from '../usePointerNotes';

const track = (id: string, extra: Partial<Track> = {}) =>
  ({
    id,
    type: 'midi',
    recordArmed: false,
    monitoring: false,
    ...extra,
  }) as Track;

const press = (pointerId = 1, button = 0) =>
  ({
    button,
    pointerId,
    timeStamp: 1000,
    preventDefault: vi.fn(),
  }) as unknown as PointerEvent<Element>;

const engine = () => ({ noteOn: vi.fn(), noteOff: vi.fn() });
const s = () => useStore.getState();

beforeEach(() => {
  engines.clear();
  useStore.setState({
    tracks: [
      track('drums', { monitoring: true }),
      track('keys', { recordArmed: true }),
      track('melody'),
    ],
    selectedTrackId: 'drums',
    isRecording: false,
    hwActiveNotes: new Set<number>(),
  });
});
afterEach(() => {
  setPracticeLiveTrack(null);
  cleanup();
});

describe('where live notes and takes go', () => {
  it('outside practice: the monitored tracks, and the first armed MIDI track records', () => {
    expect(liveMidiTargets()).toEqual(['drums']);
    expect(recordTargetTrackId()).toBe('keys');
  });

  it('on the practice screen: its student track, for both', () => {
    setPracticeLiveTrack('melody');
    expect(practiceLiveTrackId()).toBe('melody');
    expect(liveMidiTargets()).toEqual(['melody']);
    expect(recordTargetTrackId()).toBe('melody');
  });

  it('a practice track that has gone falls back', () => {
    setPracticeLiveTrack('deleted');
    expect(practiceLiveTrackId()).toBeNull();
    expect(liveMidiTargets()).toEqual(['drums']);
    expect(recordTargetTrackId()).toBe('keys');
  });
});

describe('usePointerNotes', () => {
  it('a press sounds on the student’s track, lights the key and goes into a take', () => {
    const melody = engine();
    const drums = engine();
    engines.set('melody', melody);
    engines.set('drums', drums);
    setPracticeLiveTrack('melody');
    const recorder = { captureNoteOn: vi.fn(), captureNoteOff: vi.fn() };
    const unregister = registerLiveRecorder(recorder);
    useStore.setState({ isRecording: true });

    const { result } = renderHook(() => usePointerNotes());
    const down = press();
    act(() => result.current(62, down));
    expect(down.preventDefault).toHaveBeenCalled();
    expect(melody.noteOn).toHaveBeenCalledWith(62, POINTER_VELOCITY);
    expect(drums.noteOn).not.toHaveBeenCalled();
    expect([...s().hwActiveNotes]).toEqual([62]);
    expect(recorder.captureNoteOn).toHaveBeenCalledWith(
      62,
      POINTER_VELOCITY,
      1000,
    );

    // Let go anywhere on the page.
    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('pointerup'), { pointerId: 1 }),
      );
    });
    expect(melody.noteOff).toHaveBeenCalledWith(62);
    expect([...s().hwActiveNotes]).toEqual([]);
    expect(recorder.captureNoteOff).toHaveBeenCalledWith(
      62,
      expect.any(Number),
    );
    unregister();
  });

  it('only the main button plays', () => {
    const melody = engine();
    engines.set('melody', melody);
    setPracticeLiveTrack('melody');
    const { result } = renderHook(() => usePointerNotes());
    act(() => result.current(60, press(1, 2)));
    expect(melody.noteOn).not.toHaveBeenCalled();
  });

  it('leaves no note hanging when the window loses focus or the keys go', () => {
    const melody = engine();
    engines.set('melody', melody);
    setPracticeLiveTrack('melody');
    const first = renderHook(() => usePointerNotes());
    act(() => first.result.current(60, press(1)));
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(melody.noteOff).toHaveBeenCalledWith(60);

    act(() => first.result.current(64, press(2)));
    first.unmount();
    expect(melody.noteOff).toHaveBeenCalledWith(64);
    expect([...s().hwActiveNotes]).toEqual([]);
  });
});
