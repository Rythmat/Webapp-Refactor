// @vitest-environment jsdom
/**
 * The demo plays a guitar lesson through its voice — chords strummed whole —
 * and leaves the piano path exactly as it was when no voice is given.
 */

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenreNoteEvent } from '../../engine/genreGeneration/resolveStepContent';
import { useDemoPlayback, type LessonVoice } from '../useDemoPlayback';

const piano = vi.hoisted(() => ({
  startPianoSampler: vi.fn(async () => {}),
  triggerPianoAttackRelease: vi.fn(async () => {}),
}));
vi.mock('@/audio/pianoSampler', () => piano);
vi.mock('@/audio/core/toneBridge', () => ({
  startTone: vi.fn(async () => {}),
}));

// At 80 BPM the demo runs 750 ms a beat.
const BEAT_MS = 750;
const KEY_C = 60;

/** A single C4, then a C major triad on beat 2. */
const NOTES: GenreNoteEvent[] = [
  { midi: 60, onset: 0, duration: 480 },
  { midi: 67, onset: 480, duration: 480 },
  { midi: 60, onset: 480, duration: 480 },
  { midi: 64, onset: 480, duration: 480 },
];

function fakeVoice() {
  return {
    load: vi.fn(async () => {}),
    attackRelease: vi.fn(),
    stop: vi.fn(),
  } satisfies LessonVoice;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useDemoPlayback', () => {
  it('plays the piano sampler note by note when no voice is given', async () => {
    const { result } = renderHook(() => useDemoPlayback(KEY_C, 80));
    await act(() => result.current.playDemo(NOTES));
    act(() => vi.advanceTimersByTime(BEAT_MS));

    expect(piano.startPianoSampler).toHaveBeenCalledTimes(1);
    expect(piano.triggerPianoAttackRelease.mock.calls).toEqual([
      ['C4', 0.75, 80],
      ['G4', 0.75, 80],
      ['C4', 0.75, 80],
      ['E4', 0.75, 80],
    ]);
  });

  // The container's effects list stopDemo as a dependency.
  it('keeps stopDemo stable across renders, with or without a voice', () => {
    const voice = fakeVoice();
    const { result, rerender } = renderHook(
      ({ v }: { v?: LessonVoice }) => useDemoPlayback(KEY_C, 80, v),
      { initialProps: {} },
    );
    const pianoStop = result.current.stopDemo;
    rerender({});
    expect(result.current.stopDemo).toBe(pianoStop);

    rerender({ v: voice });
    const voiceStop = result.current.stopDemo;
    rerender({ v: voice });
    expect(result.current.stopDemo).toBe(voiceStop);
  });

  it('plays through the voice, strumming a chord whole, and never loads the piano', async () => {
    const voice = fakeVoice();
    const { result } = renderHook(() => useDemoPlayback(KEY_C, 80, voice));
    await act(() => result.current.playDemo(NOTES));

    expect(voice.load).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(0));
    expect(voice.attackRelease).toHaveBeenLastCalledWith(60, 0.75, 80);
    expect(result.current.demoHighlightMidis).toEqual(new Set([60]));

    act(() => vi.advanceTimersByTime(BEAT_MS));
    expect(voice.attackRelease).toHaveBeenCalledTimes(2);
    // In the order given; the voice decides how to strum them.
    expect(voice.attackRelease).toHaveBeenLastCalledWith(
      [67, 60, 64],
      0.75,
      80,
    );

    expect(piano.startPianoSampler).not.toHaveBeenCalled();
    expect(piano.triggerPianoAttackRelease).not.toHaveBeenCalled();
  });

  it('stops the voice with the demo', async () => {
    const voice = fakeVoice();
    const { result } = renderHook(() => useDemoPlayback(KEY_C, 80, voice));
    await act(() => result.current.playDemo(NOTES));
    voice.stop.mockClear();

    act(() => result.current.stopDemo());
    expect(voice.stop).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(10 * BEAT_MS));
    expect(voice.attackRelease).not.toHaveBeenCalled();
    expect(result.current.isPlayingDemo).toBe(false);
  });
});
