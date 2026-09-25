import type React from 'react';

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

/* ── Filing a whole set list into a band or a show ────────────────────── */

/**
 * A different drag from the one above: that one reorders songs inside a set,
 * this one carries a whole set list from the flat grid into the organiser.
 * Its own MIME, so neither can be dropped where the other belongs.
 */
export const SETLIST_CARD_MIME = 'application/x-ma-setlist-card';

export interface SetListCardDrag {
  setListId: string;
}

export function setCardDrag(dt: DataTransfer, item: SetListCardDrag): void {
  dt.setData(SETLIST_CARD_MIME, JSON.stringify(item));
  dt.effectAllowed = 'move';
}

export const hasCardDrag = (dt: DataTransfer): boolean =>
  Array.from(dt.types).includes(SETLIST_CARD_MIME);

export function readCardDrag(dt: DataTransfer): SetListCardDrag | null {
  try {
    const raw = dt.getData(SETLIST_CARD_MIME);
    if (!raw) return null;
    const item = JSON.parse(raw) as SetListCardDrag;
    return typeof item?.setListId === 'string' ? item : null;
  } catch {
    return null;
  }
}

/* ── Dragging a show into a band, or into order ───────────────────────── */

export const SETLIST_SHOW_MIME = 'application/x-ma-setlist-show';

export interface ShowDrag {
  showId: string;
  /** The band it is currently in, so a drop can refuse a hand-off. */
  artistId?: string;
}

export function setShowDrag(dt: DataTransfer, item: ShowDrag): void {
  dt.setData(SETLIST_SHOW_MIME, JSON.stringify(item));
  dt.effectAllowed = 'move';
}

export const hasShowDrag = (dt: DataTransfer): boolean =>
  Array.from(dt.types).includes(SETLIST_SHOW_MIME);

export function readShowDrag(dt: DataTransfer): ShowDrag | null {
  try {
    const raw = dt.getData(SETLIST_SHOW_MIME);
    if (!raw) return null;
    const item = JSON.parse(raw) as ShowDrag;
    return typeof item?.showId === 'string' ? item : null;
  } catch {
    return null;
  }
}

/* ── Claiming a drop ──────────────────────────────────────────────────── */

/**
 * Take a drop only if the payload is ours, and otherwise leave it alone.
 *
 * Drop zones nest — a strip for set lists sits inside a show, which sits
 * inside a band — so a handler that calls `stopPropagation()` before looking
 * at what was dropped silently eats drags meant for its parent. That is
 * exactly how dropping a second show into a band came to do nothing: the set
 * list strip claimed the drop and then discarded it.
 *
 * Read first; claim only what you can use.
 */
export function claimDrop<T>(
  event: Pick<
    React.DragEvent,
    'dataTransfer' | 'preventDefault' | 'stopPropagation'
  >,
  read: (dt: DataTransfer) => T | null,
): T | null {
  const item = read(event.dataTransfer);
  if (!item) return null;
  event.preventDefault();
  event.stopPropagation();
  return item;
}
