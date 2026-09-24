import { describe, expect, it } from 'vitest';
import {
  SETLIST_DRAG_MIME,
  dropIndex,
  hasDragItem,
  readDragItem,
  setDragItem,
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
