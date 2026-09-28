import { describe, expect, it, vi } from 'vitest';
import {
  SETLIST_CARD_MIME,
  SETLIST_DRAG_MIME,
  SETLIST_SHOW_MIME,
  SETLIST_SONG_MIME,
  claimDrop,
  dropIndex,
  hasDragItem,
  hasSongDrag,
  readCardDrag,
  readDragItem,
  readShowDrag,
  readSongDrag,
  setCardDrag,
  setDragItem,
  setSongDrag,
} from '../setListDnd';

/** Just enough DataTransfer for the helpers. */
function fakeDt(initial: Record<string, string> = {}): DataTransfer {
  const data: Record<string, string> = { ...initial };
  const dt = {
    get types() {
      return Object.keys(data);
    },
    effectAllowed: 'none',
    setData: (type: string, value: string) => {
      data[type] = value;
    },
    getData: (type: string) => data[type] ?? '',
  };
  return dt as unknown as DataTransfer;
}

describe('set list drag payload', () => {
  it('round-trips an entry', () => {
    const dt = fakeDt();
    setDragItem(dt, { setListId: 'sl_1', entryId: 'e_1', index: 3 });
    expect(hasDragItem(dt)).toBe(true);
    expect(readDragItem(dt)).toEqual({
      setListId: 'sl_1',
      entryId: 'e_1',
      index: 3,
    });
  });

  it('ignores a drag from somewhere else', () => {
    const foreign = fakeDt({
      'application/x-ma-calendar-item': '{"kind":"day","id":"d1"}',
    });
    expect(hasDragItem(foreign)).toBe(false);
    expect(readDragItem(foreign)).toBeNull();
  });

  it('ignores a garbled payload', () => {
    expect(
      readDragItem(fakeDt({ [SETLIST_DRAG_MIME]: 'not json' })),
    ).toBeNull();
    expect(
      readDragItem(fakeDt({ [SETLIST_DRAG_MIME]: '{"setListId":"x"}' })),
    ).toBeNull();
  });
});

describe('where the entry lands', () => {
  it('drops above or below the row under the pointer', () => {
    // Dragging the 4th entry onto the top half of the 1st row puts it first.
    expect(dropIndex(3, 0, 'top')).toBe(0);
    expect(dropIndex(3, 0, 'bottom')).toBe(1);
    // Dragging the 1st entry down past the 3rd: the gap it leaves closes up.
    expect(dropIndex(0, 2, 'bottom')).toBe(2);
    expect(dropIndex(0, 2, 'top')).toBe(1);
    // Onto itself is a no-op either way.
    expect(dropIndex(2, 2, 'top')).toBe(2);
    expect(dropIndex(2, 2, 'bottom')).toBe(2);
  });
});

describe('claimDrop', () => {
  /**
   * Drop zones nest: a set list strip inside a show inside a band. A handler
   * that stops the event before reading it eats drags meant for its parent —
   * which is what stopped a second show from ever joining a band.
   */
  const dropEvent = (mime?: string, payload?: unknown) => {
    const data = new Map<string, string>();
    if (mime) data.set(mime, JSON.stringify(payload));
    return {
      dataTransfer: {
        types: [...data.keys()],
        getData: (t: string) => data.get(t) ?? '',
      } as unknown as DataTransfer,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };
  };

  it('claims a drop it can read, and stops it going further', () => {
    const e = dropEvent(SETLIST_CARD_MIME, { setListId: 'sl1' });
    expect(claimDrop(e, readCardDrag)).toEqual({ setListId: 'sl1' });
    expect(e.preventDefault).toHaveBeenCalled();
    expect(e.stopPropagation).toHaveBeenCalled();
  });

  it('leaves a drop meant for something else completely alone', () => {
    // A show dragged onto a set list strip belongs to the band around it.
    const e = dropEvent(SETLIST_SHOW_MIME, { showId: 'sh1' });
    expect(claimDrop(e, readCardDrag)).toBeNull();
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(e.stopPropagation).not.toHaveBeenCalled();
  });

  it('leaves an empty drag alone', () => {
    const e = dropEvent();
    expect(claimDrop(e, readShowDrag)).toBeNull();
    expect(e.stopPropagation).not.toHaveBeenCalled();
  });

  it('reads a show drag, carrying the band it is already in', () => {
    const e = dropEvent(SETLIST_SHOW_MIME, { showId: 'sh1', artistId: 'a1' });
    expect(claimDrop(e, readShowDrag)).toEqual({
      showId: 'sh1',
      artistId: 'a1',
    });
  });
});

describe('dragging a lead sheet into a set', () => {
  it('round-trips the song it carries', () => {
    const dt = fakeDt();
    setSongDrag(dt, { songId: 'song_1', title: 'Blue Monk' });
    expect(hasSongDrag(dt)).toBe(true);
    expect(readSongDrag(dt)).toEqual({ songId: 'song_1', title: 'Blue Monk' });
  });

  it('asks to copy, not move — the repertoire keeps the chart', () => {
    const dt = fakeDt();
    setSongDrag(dt, { songId: 'song_1', title: 'Blue Monk' });
    expect(dt.effectAllowed).toBe('copy');
  });

  it('is not confused with the other set list drags', () => {
    const card = fakeDt();
    setCardDrag(card, { setListId: 'sl_1' });
    expect(hasSongDrag(card)).toBe(false);
    expect(readSongDrag(card)).toBeNull();

    const song = fakeDt();
    setSongDrag(song, { songId: 'song_1', title: 'Blue Monk' });
    expect(hasDragItem(song)).toBe(false);
    expect(readCardDrag(song)).toBeNull();
    expect(readShowDrag(song)).toBeNull();
  });

  it('refuses a payload missing its song id', () => {
    const dt = fakeDt({ [SETLIST_SONG_MIME]: '{"title":"Blue Monk"}' });
    expect(readSongDrag(dt)).toBeNull();
  });

  it('survives a payload that is not JSON', () => {
    const dt = fakeDt({ [SETLIST_SONG_MIME]: 'not json' });
    expect(readSongDrag(dt)).toBeNull();
  });
});
