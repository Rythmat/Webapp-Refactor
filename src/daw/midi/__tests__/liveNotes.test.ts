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

const track = (id: string, monitoring = false) =>
  ({ id, type: 'midi', monitoring }) as unknown as Track;

const engine = (id: string) => engines.get(id)!;

beforeEach(() => {
  for (const id of ['t1', 't2']) {
    engines.set(id, { noteOn: vi.fn(), noteOff: vi.fn() });
  }
  sent.length = 0;
  useStore.setState({
    tracks: [track('t1'), track('t2')],
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
    useStore.setState({ selectedTrackId: 't2' });

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
