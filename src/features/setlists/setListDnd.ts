/**
 * Dragging entries into order — native HTML5 DnD with a typed payload, the
 * app's established pattern (see features/classroom/annual/calendarDnd.ts).
 * The MIME type is our own so a drag from the classroom calendar cannot land
 * in a set list, and vice versa.
 */

export const SETLIST_DRAG_MIME = 'application/x-ma-setlist-entry';

export interface SetListDragItem {
  setListId: string;
  entryId: string;
  index: number;
}

export function setDragItem(dt: DataTransfer, item: SetListDragItem): void {
  dt.setData(SETLIST_DRAG_MIME, JSON.stringify(item));
  dt.effectAllowed = 'move';
}

/** During dragover the payload is unreadable; the type list is all we get. */
export const hasDragItem = (dt: DataTransfer): boolean =>
  Array.from(dt.types).includes(SETLIST_DRAG_MIME);

export function readDragItem(dt: DataTransfer): SetListDragItem | null {
  try {
    const raw = dt.getData(SETLIST_DRAG_MIME);
    if (!raw) return null;
    const item = JSON.parse(raw) as SetListDragItem;
    return typeof item?.setListId === 'string' &&
      typeof item?.entryId === 'string' &&
      Number.isInteger(item?.index)
      ? item
      : null;
  } catch {
    return null;
  }
}

/**
 * Where an entry lands when dropped on the row at `over`, given which half of
 * that row the pointer is in. Dragging downwards closes the gap the entry
 * leaves behind, which is why the index steps back by one.
 */
export function dropIndex(
  from: number,
  over: number,
  half: 'top' | 'bottom',
): number {
  const target = half === 'bottom' ? over + 1 : over;
  return from < target ? target - 1 : target;
}
