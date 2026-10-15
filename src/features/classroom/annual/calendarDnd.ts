/**
 * Drag-and-drop payload for the Annual Plan calendar.
 *
 * Native HTML5 DnD (the app's established pattern): a lesson pill or card is
 * the drag source, a calendar date-cell is the drop target. The payload is a
 * tiny `{ kind, id }` serialized onto the drag event's `dataTransfer`.
 */

export const DRAG_MIME = 'application/x-ma-calendar-item';

export type CalendarDragKind = 'day';

export interface CalendarDragItem {
  kind: CalendarDragKind;
  id: string;
}

/** Serialize a drag item onto the drag event's dataTransfer. */
export const setDragItem = (dt: DataTransfer, item: CalendarDragItem): void => {
  dt.setData(DRAG_MIME, JSON.stringify(item));
  dt.effectAllowed = 'move';
};

/** Whether a drag in progress carries a calendar item (usable during
 *  `dragover`, where the payload itself is not yet readable — only its types). */
export const hasDragItem = (dt: DataTransfer): boolean =>
  Array.from(dt.types).includes(DRAG_MIME);

/** Parse the calendar drag item on drop, tolerating a foreign/garbled payload. */
export const readDragItem = (dt: DataTransfer): CalendarDragItem | null => {
  try {
    const raw = dt.getData(DRAG_MIME);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CalendarDragItem;
    if (parsed.kind === 'day' && typeof parsed.id === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};
