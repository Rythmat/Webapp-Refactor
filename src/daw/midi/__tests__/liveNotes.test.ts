/**
 * A live note's note-off reaches the tracks its note-on went to
 * (engine-hooks-10). It used to go to whatever the targets were when the key
 * came up, so changing the selection or monitoring with a key down left the
 * first track's note ringing for good. And when the targets change while a
 * note is held, the tracks that stopped being targets let go of it at once.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore, type Track } from '@/daw/store';

const engines = vi.hoisted(
  () =>
    new Map<
      string,
      { noteOn: ReturnType<typeof vi.fn>; noteOff: ReturnType<typeof vi.fn> }
    >(),
);
const sent = vi.hoisted(() => [] as Array<Record<string, unknown>>);
vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  trackEngineRegistry: {
    get: (id: string) => {
      const engine = engines.get(id);
      return engine ? { trackEngine: engine } : undefined;
    },
  },
}));
vi.mock('@/daw/collab/studioRealtime', () => ({
  studioRealtime: {
    shouldBroadcast: () => true,
    send: (msg: Record<string, unknown>) => sent.push(msg),
  },
}));

import { heldLiveNotes, playLiveNote, releaseLiveNote } from '../liveNotes';

/** A MIDI track; `monitoring`: heard, armed and monitoring. */
const track = (id: string, monitoring = false) =>
  ({
    id,
    type: 'midi',
    recordArmed: monitoring,
    monitoring,
  }) as unknown as Track;

const engine = (id: string) => engines.get(id)!;

beforeEach(() => {
  for (const id of ['t1', 't2']) {
    engines.set(id, { noteOn: vi.fn(), noteOff: vi.fn() });
  }
  sent.length = 0;
  useStore.setState({
    tracks: [track('t1', true), track('t2')],
    selectedTrackId: 't1',
    hwActiveNotes: new Set(),
  } as never);
});

afterEach(() => {
  for (const note of [...heldLiveNotes().keys()]) releaseLiveNote(note);
});

describe('live note-offs', () => {
  it('go to the tracks the note-on went to, not the current targets', () => {
    playLiveNote(60, 100);
    // Monitoring t2 as well keeps t1 a target: the note stays on t1 only.
    useStore.setState({ tracks: [track('t1', true), track('t2', true)] });
    releaseLiveNote(60);

    expect(engine('t1').noteOff).toHaveBeenCalledWith(60);
    expect(engine('t2').noteOff).not.toHaveBeenCalled();
    expect(sent.filter((m) => m.action === 'off')).toEqual([
      expect.objectContaining({ note: 60, trackId: 't1' }),
    ]);
  });

  it('let go on a track that stops being a target, at once', () => {
    playLiveNote(60, 100);
    useStore.setState({ tracks: [track('t1'), track('t2', true)] });

    expect(engine('t1').noteOff).toHaveBeenCalledWith(60);
    expect(useStore.getState().hwActiveNotes.has(60)).toBe(false);

    // The key coming up later sends nothing to the new target.
    releaseLiveNote(60);
    expect(engine('t2').noteOff).not.toHaveBeenCalled();
    expect(engine('t1').noteOff).toHaveBeenCalledTimes(1);
  });

  it('keep a note on the targets that remain', () => {
    useStore.setState({ tracks: [track('t1', true), track('t2', true)] });
    playLiveNote(62, 90);
    useStore.setState({ tracks: [track('t1'), track('t2', true)] });

    expect(engine('t1').noteOff).toHaveBeenCalledWith(62);
    expect(engine('t2').noteOff).not.toHaveBeenCalled();
    expect(heldLiveNotes().get(62)).toEqual(['t2']);
    expect(useStore.getState().hwActiveNotes.has(62)).toBe(true);

    releaseLiveNote(62);
    expect(engine('t2').noteOff).toHaveBeenCalledWith(62);
  });
});

describe('a track’s MIDI input (the ▾ in its header)', () => {
  const tracked = (id: string, midiInputId: string | null, monitoring = true) =>
    ({
      id,
      type: 'midi',
      recordArmed: monitoring,
      monitoring,
      midiInputId,
    }) as unknown as Track;

  it('plays a device’s notes only on the tracks listening to it or to All Devices', () => {
    useStore.setState({
      tracks: [tracked('t1', 'kbd-a'), tracked('t2', null)],
    } as never);
    playLiveNote(60, 100, 'kbd-b');
    expect(engine('t1').noteOn).not.toHaveBeenCalled();
    expect(engine('t2').noteOn).toHaveBeenCalledWith(60, 100);

    playLiveNote(62, 90, 'kbd-a');
    expect(engine('t1').noteOn).toHaveBeenCalledWith(62, 90);
    expect(engine('t2').noteOn).toHaveBeenCalledWith(62, 90);
  });

  it('lets the computer keyboard (no device) play every target', () => {
    useStore.setState({
      tracks: [tracked('t1', 'kbd-a'), tracked('t2', 'kbd-b')],
    } as never);
    playLiveNote(64, 100);
    expect(engine('t1').noteOn).toHaveBeenCalledWith(64, 100);
    expect(engine('t2').noteOn).toHaveBeenCalledWith(64, 100);
  });

  it('leaves the selected track quiet for a device it isn’t listening to', () => {
    useStore.setState({
      tracks: [tracked('t1', 'kbd-a', false), tracked('t2', null, false)],
      selectedTrackId: 't1',
    } as never);
    playLiveNote(60, 100, 'kbd-b');
    expect(engine('t1').noteOn).not.toHaveBeenCalled();
    expect(engine('t2').noteOn).not.toHaveBeenCalled();
  });
});

describe('what is heard (the record button, 2026-10-22)', () => {
  const t = (id: string, recordArmed: boolean, monitoring: boolean) =>
    ({
      id,
      type: 'midi',
      recordArmed,
      monitoring,
      midiInputId: null,
    }) as unknown as Track;

  it('sends a device’s notes only to tracks armed and monitoring', () => {
    useStore.setState({
      tracks: [t('t1', false, true), t('t2', true, false)],
      selectedTrackId: 't1',
    } as never);
    // Monitoring without the arm, and armed with monitoring off: quiet,
    // and the selected track doesn't take them either.
    playLiveNote(60, 100, 'kbd');
    expect(engine('t1').noteOn).not.toHaveBeenCalled();
    expect(engine('t2').noteOn).not.toHaveBeenCalled();

    useStore.setState({
      tracks: [t('t1', false, true), t('t2', true, true)],
    } as never);
    playLiveNote(62, 100, 'kbd');
    expect(engine('t1').noteOn).not.toHaveBeenCalled();
    expect(engine('t2').noteOn).toHaveBeenCalledWith(62, 100);
  });

  it('never plays the selected track for being selected, from the computer keyboard either', () => {
    useStore.setState({
      tracks: [t('t1', false, false), t('t2', false, true)],
      selectedTrackId: 't1',
    } as never);
    playLiveNote(64, 100);
    expect(engine('t1').noteOn).not.toHaveBeenCalled();
    expect(engine('t2').noteOn).not.toHaveBeenCalled();
  });
});
