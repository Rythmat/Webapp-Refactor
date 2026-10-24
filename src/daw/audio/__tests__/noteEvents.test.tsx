// @vitest-environment jsdom
/**
 * What a track plays, for the dock's instrument views (owner, 2026-10-23):
 * events come when they're heard, not a look-ahead early, in time order with
 * an all-off before the note-offs and those before the note-ons at one
 * moment; useSoundingNotes holds a key from its note-on to its note-off.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSoundingNotes } from '@/daw/hooks/useSoundingNotes';
import {
  emitNoteEvent,
  subscribeHeardNotes,
  type NoteEvent,
} from '../noteEvents';

const ctx = vi.hoisted(() => ({
  currentTime: 0,
  baseLatency: 0,
  outputLatency: 0,
}));
vi.mock('tone', () => ({ getContext: () => ({ rawContext: ctx }) }));

const TRACK = 'keys';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('subscribeHeardNotes', () => {
  it('passes a note played now at once', () => {
    const heard: NoteEvent[] = [];
    const off = subscribeHeardNotes(TRACK, (e) => heard.push(e));
    emitNoteEvent(TRACK, { type: 'on', note: 60, velocity: 90 });
    expect(heard).toEqual([{ type: 'on', note: 60, velocity: 90 }]);
    off();
  });

  it('holds a scheduled note until it is heard, the device latency included', () => {
    ctx.outputLatency = 0.02;
    const heard: number[] = [];
    const off = subscribeHeardNotes(TRACK, (e) => {
      if (e.type === 'on') heard.push(e.note);
    });
    emitNoteEvent(TRACK, { type: 'on', note: 60, velocity: 90, time: 0.1 });
    vi.advanceTimersByTime(100);
    expect(heard).toEqual([]);
    vi.advanceTimersByTime(40);
    expect(heard).toEqual([60]);
    off();
    ctx.outputLatency = 0;
  });

  it('at one moment, lets go before it plays: all-off, offs, then ons', () => {
    const heard: string[] = [];
    const off = subscribeHeardNotes(TRACK, (e) =>
      heard.push(e.type === 'allOff' ? 'allOff' : `${e.type} ${e.note}`),
    );
    // Booked in the order a loop's seam can book them.
    emitNoteEvent(TRACK, { type: 'on', note: 64, velocity: 90, time: 0.05 });
    emitNoteEvent(TRACK, { type: 'off', note: 60, time: 0.05 });
    emitNoteEvent(TRACK, { type: 'allOff', time: 0.05 });
    vi.advanceTimersByTime(100);
    expect(heard).toEqual(['allOff', 'off 60', 'on 64']);
    off();
  });

  it('hears nothing from another track, nor after unsubscribing', () => {
    const heard: NoteEvent[] = [];
    const off = subscribeHeardNotes(TRACK, (e) => heard.push(e));
    emitNoteEvent('other', { type: 'on', note: 60, velocity: 90 });
    emitNoteEvent(TRACK, { type: 'on', note: 62, velocity: 90, time: 0.05 });
    off();
    vi.advanceTimersByTime(100);
    emitNoteEvent(TRACK, { type: 'on', note: 64, velocity: 90 });
    expect(heard).toEqual([]);
  });
});

describe('useSoundingNotes', () => {
  const sounding = (r: { current: ReadonlySet<number> }) =>
    [...r.current].sort((a, b) => a - b);

  it('holds each key from its note-on to its note-off', () => {
    const { result } = renderHook(() => useSoundingNotes(TRACK));
    act(() => {
      emitNoteEvent(TRACK, { type: 'on', note: 60, velocity: 90 });
      emitNoteEvent(TRACK, { type: 'on', note: 64, velocity: 90 });
    });
    expect(sounding(result)).toEqual([60, 64]);
    act(() => emitNoteEvent(TRACK, { type: 'off', note: 60 }));
    expect(sounding(result)).toEqual([64]);
  });

  it('keeps a pitch two clips hold until both let go', () => {
    const { result } = renderHook(() => useSoundingNotes(TRACK));
    act(() => {
      emitNoteEvent(TRACK, { type: 'on', note: 67, velocity: 90 });
      emitNoteEvent(TRACK, { type: 'on', note: 67, velocity: 90 });
      emitNoteEvent(TRACK, { type: 'off', note: 67 });
    });
    expect(sounding(result)).toEqual([67]);
    act(() => emitNoteEvent(TRACK, { type: 'off', note: 67 }));
    expect(sounding(result)).toEqual([]);
  });

  it('lets go of everything on a stop, a seek or a seam', () => {
    const { result } = renderHook(() => useSoundingNotes(TRACK));
    act(() => {
      emitNoteEvent(TRACK, { type: 'on', note: 60, velocity: 90 });
      emitNoteEvent(TRACK, { type: 'on', note: 72, velocity: 90 });
      emitNoteEvent(TRACK, { type: 'allOff' });
    });
    expect(sounding(result)).toEqual([]);
  });

  it('shows the timeline’s notes as they are heard', () => {
    const { result } = renderHook(() => useSoundingNotes(TRACK));
    act(() => {
      emitNoteEvent(TRACK, { type: 'on', note: 48, velocity: 90, time: 0.1 });
      emitNoteEvent(TRACK, { type: 'off', note: 48, time: 0.3 });
    });
    expect(sounding(result)).toEqual([]);
    act(() => vi.advanceTimersByTime(120));
    expect(sounding(result)).toEqual([48]);
    act(() => vi.advanceTimersByTime(200));
    expect(sounding(result)).toEqual([]);
  });
});
