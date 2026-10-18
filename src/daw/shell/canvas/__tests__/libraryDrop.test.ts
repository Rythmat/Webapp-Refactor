import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Drops on the timeline (milestone 2.14, F11) ────────────────────────────
// Nothing wrote the Library's drag data before 2.14, so no drop branch could
// run. A Library row now carries its item id, and the drop hands it to the
// browser's add with the lane and bar it landed on; a .mid file imports as
// Import MIDI file… does, in one undo step. Anything else is refused at
// dragover, so the cursor doesn't promise a drop that does nothing.

const h = vi.hoisted(() => ({
  drop: vi.fn(async () => true),
  importMidi: vi.fn(async () => 1),
  toast: vi.fn(),
}));
vi.mock('@/daw/shell/inspector/browser/addItem', () => ({
  dropLibraryItem: h.drop,
}));
vi.mock('@/daw/midi/importMidiToTracks', () => ({
  importMidiToTracks: h.importMidi,
}));
vi.mock('@/hooks/use-toast', () => ({ toast: h.toast }));

import { DRAG_MIME } from '@/daw/data/libraryItems';
import {
  acceptsDrop,
  dropOnTimeline,
  onTimelineDragOver,
} from '../libraryDrop';

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
    const file = new File([new Uint8Array([1, 2])], 'Song.MID');
    await dropOnTimeline(dragEvent({}, [file]), { trackId: null, tick: 0 });
    expect(h.importMidi).toHaveBeenCalledTimes(1);

    h.importMidi.mockRejectedValueOnce(new Error('bad file'));
    await dropOnTimeline(dragEvent({}, [file]), { trackId: null, tick: 0 });
    expect(h.toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );

    await dropOnTimeline(dragEvent({}, [new File(['x'], 'notes.txt')]), {
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
});
