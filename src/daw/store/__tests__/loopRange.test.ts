/**
 * A loop range that ends where it starts, or before, is refused (milestone
 * 1.11, engine-hooks-18): the transport would spin on one tick. Turning the
 * loop on with an empty MIDI clip selected keeps the current range.
 *
 * Run: npx vitest run src/daw/store/__tests__/loopRange.test.ts
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../index';
import type { Track } from '../tracksSlice';

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState({
    loopEnabled: false,
    loopStart: 1920,
    loopEnd: 3840,
    editorLoop: null,
    selectedClipId: null,
    selectedClipTrackId: null,
    tracks: [],
  });
});

describe('setLoopRange', () => {
  it('sets a range that ends after it starts', () => {
    s().setLoopRange(480, 960);
    expect([s().loopStart, s().loopEnd]).toEqual([480, 960]);
  });

  it('refuses an empty range', () => {
    s().setLoopRange(960, 960);
    expect([s().loopStart, s().loopEnd]).toEqual([1920, 3840]);
  });

  it('refuses a range that ends before it starts', () => {
    s().setLoopRange(960, 480);
    expect([s().loopStart, s().loopEnd]).toEqual([1920, 3840]);
  });

  it('refuses a range that is empty once clamped at 0', () => {
    s().setLoopRange(-480, -10);
    expect([s().loopStart, s().loopEnd]).toEqual([1920, 3840]);
  });

  it('clamps a negative start to 0', () => {
    s().setLoopRange(-480, 960);
    expect([s().loopStart, s().loopEnd]).toEqual([0, 960]);
  });
});

describe('updateEditorLoop', () => {
  beforeEach(() => {
    s().setEditorLoop({ enabled: true, start: 0, end: 1920 });
  });

  it('applies a patch that keeps end after start', () => {
    s().updateEditorLoop({ end: 960 });
    expect(s().editorLoop).toEqual({ enabled: true, start: 0, end: 960 });
  });

  it('refuses a patch that makes the range empty', () => {
    s().updateEditorLoop({ start: 1920 });
    expect(s().editorLoop).toEqual({ enabled: true, start: 0, end: 1920 });
  });

  it('refuses a patch that puts end before start', () => {
    s().updateEditorLoop({ start: 960, end: 480 });
    expect(s().editorLoop).toEqual({ enabled: true, start: 0, end: 1920 });
  });

  it('still toggles enabled', () => {
    s().updateEditorLoop({ enabled: false });
    expect(s().editorLoop?.enabled).toBe(false);
  });

  it('does nothing while the editor is closed', () => {
    s().setEditorLoop(null);
    s().updateEditorLoop({ start: 0, end: 480 });
    expect(s().editorLoop).toBeNull();
  });
});

describe('toggleLoop with a MIDI clip selected', () => {
  function selectMidiClip(clip: Record<string, unknown>): void {
    useStore.setState({
      tracks: [
        {
          id: 't1',
          name: 'Keys',
          type: 'midi',
          midiClips: [clip],
          audioClips: [],
        } as unknown as Track,
      ],
      selectedClipId: clip.id as string,
      selectedClipTrackId: 't1',
    });
  }

  it('keeps the current range for an empty clip', () => {
    selectMidiClip({ id: 'c1', startTick: 7680, events: [] });
    s().toggleLoop();
    expect(s().loopEnabled).toBe(true);
    expect([s().loopStart, s().loopEnd]).toEqual([1920, 3840]);
  });

  it('fits the range to a clip with notes', () => {
    selectMidiClip({
      id: 'c1',
      startTick: 7680,
      events: [{ note: 60, velocity: 100, startTick: 0, durationTicks: 480 }],
    });
    s().toggleLoop();
    expect(s().loopEnabled).toBe(true);
    expect(s().loopStart).toBe(7680);
    expect(s().loopEnd).toBeGreaterThan(7680);
  });

  it('turns off without touching the range', () => {
    useStore.setState({ loopEnabled: true });
    s().toggleLoop();
    expect(s().loopEnabled).toBe(false);
    expect([s().loopStart, s().loopEnd]).toEqual([1920, 3840]);
  });
});
