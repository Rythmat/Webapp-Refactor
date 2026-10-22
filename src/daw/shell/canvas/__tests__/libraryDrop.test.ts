// @vitest-environment jsdom
import { File as NodeFile } from 'node:buffer';
import { Midi } from '@tonejs/midi';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Drops on the timeline (milestone 2.14, F11) ────────────────────────────
// Nothing wrote the Library's drag data before 2.14, so no drop branch could
// run. A Library row now carries its item id, and the drop hands it to the
// browser's add with the lane and bar it landed on; a .mid file imports as
// Import MIDI file… does, in one undo step. Anything else is refused at
// dragover, so the cursor doesn't promise a drop that does nothing.

const h = vi.hoisted(() => ({
  drop: vi.fn(async () => true),
  importMidi: vi.fn(async (_data: ArrayBuffer) => 1),
  toast: vi.fn(),
}));
vi.mock('@/daw/shell/inspector/browser/addItem', () => ({
  dropLibraryItem: h.drop,
}));
vi.mock('@/daw/midi/importMidiToTracks', () => ({
  importMidiToTracks: h.importMidi,
}));
vi.mock('@/daw/shell/notice', () => ({ notice: h.toast }));

import { DRAG_MIME } from '@/daw/data/libraryItems';
import { useStore } from '@/daw/store';
import {
  historyLabels,
  resetHistory,
  startHistory,
  undo,
} from '@/daw/store/history';
import {
  acceptsDrop,
  dropOnTimeline,
  onTimelineDragOver,
} from '../libraryDrop';

/**
 * A file as a drop carries it. jsdom's File can't be read (no
 * arrayBuffer), so it is Node's.
 */
const file = (bits: BlobPart[], name: string) =>
  new NodeFile(bits as never, name) as unknown as File;

function dragEvent(data: Record<string, string>, files: File[] = []) {
  const types = [...Object.keys(data), ...(files.length ? ['Files'] : [])];
  return {
    preventDefault: vi.fn(),
    dataTransfer: {
      types,
      files,
      dropEffect: 'none',
      getData: (type: string) => data[type] ?? '',
    },
  } as unknown as React.DragEvent & {
    preventDefault: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => {
  h.drop.mockClear();
  h.importMidi.mockClear();
  h.toast.mockClear();
});

afterEach(cleanup);

describe('a drop on the timeline', () => {
  it('takes a Library row and gives the browser its item, lane and bar', async () => {
    const e = dragEvent({
      [DRAG_MIME]: JSON.stringify({ kind: 'library-item', itemId: 'part:x' }),
    });
    expect(acceptsDrop(e)).toBe(true);
    await dropOnTimeline(e, { trackId: 't1', tick: 3840 });
    expect(h.drop).toHaveBeenCalledWith('part:x', {
      trackId: 't1',
      tick: 3840,
    });
    expect(h.importMidi).not.toHaveBeenCalled();
  });

  it('ignores drag data it can’t read', async () => {
    const e = dragEvent({ [DRAG_MIME]: '{not json' });
    await dropOnTimeline(e, { trackId: null, tick: 0 });
    expect(h.drop).not.toHaveBeenCalled();
    const effect = dragEvent({
      [DRAG_MIME]: JSON.stringify({ kind: 'audio-effect', effectType: 'eq' }),
    });
    await dropOnTimeline(effect, { trackId: null, tick: 0 });
    expect(h.drop).not.toHaveBeenCalled();
  });

  it('imports a .mid file as Import MIDI file… does, and says so when it can’t', async () => {
    const mid = file([new Uint8Array([1, 2])], 'Song.MID');
    await dropOnTimeline(dragEvent({}, [mid]), { trackId: null, tick: 0 });
    expect(h.importMidi).toHaveBeenCalledTimes(1);

    h.importMidi.mockRejectedValueOnce(new Error('bad file'));
    await dropOnTimeline(dragEvent({}, [mid]), { trackId: null, tick: 0 });
    expect(h.toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );

    await dropOnTimeline(dragEvent({}, [file(['x'], 'notes.txt')]), {
      trackId: null,
      tick: 0,
    });
    expect(h.importMidi).toHaveBeenCalledTimes(2);
  });

  it('refuses at dragover what it doesn’t take', () => {
    const text = dragEvent({ 'text/plain': 'hello' });
    onTimelineDragOver(text);
    expect(text.preventDefault).not.toHaveBeenCalled();
    const row = dragEvent({ [DRAG_MIME]: '{}' });
    onTimelineDragOver(row);
    expect(row.preventDefault).toHaveBeenCalled();
    expect(row.dataTransfer.dropEffect).toBe('copy');
  });

  it('imports a real .mid file as one Import MIDI step, which one undo takes away', async () => {
    const actual = await vi.importActual<
      typeof import('@/daw/midi/importMidiToTracks')
    >('@/daw/midi/importMidiToTracks');
    h.importMidi.mockImplementationOnce(actual.importMidiToTracks);
    useStore.setState(useStore.getInitialState(), true);
    resetHistory();
    const stop = startHistory();
    try {
      // A tiny two-track file at 480 PPQ.
      const midi = new Midi();
      const bass = midi.addTrack();
      bass.name = 'Bass';
      bass.addNote({ midi: 36, ticks: 0, durationTicks: 480, velocity: 0.8 });
      const keys = midi.addTrack();
      keys.name = 'Keys';
      keys.addNote({ midi: 60, ticks: 0, durationTicks: 960, velocity: 0.8 });
      keys.addNote({ midi: 64, ticks: 960, durationTicks: 960, velocity: 0.8 });
      // Its bytes as a browser's File hands them over (under jsdom, Node's
      // File gives @tonejs/midi a buffer it reads as empty).
      const bytes = midi.toArray();
      const mid = {
        name: 'Song.mid',
        arrayBuffer: async () => bytes.slice().buffer,
      } as unknown as File;

      await dropOnTimeline(dragEvent({}, [mid]), { trackId: null, tick: 0 });
      const tracks = useStore.getState().tracks;
      expect(tracks.map((t) => t.name)).toEqual(['Bass', 'Keys']);
      expect(tracks.map((t) => t.midiClips[0].events.length)).toEqual([1, 2]);
      expect(historyLabels()).toEqual(['Import MIDI']);

      expect(undo()).toBe(true);
      expect(useStore.getState().tracks).toEqual([]);
    } finally {
      stop();
      resetHistory();
    }
  });
});
