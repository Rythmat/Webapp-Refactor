/**
 * Drag-and-drop payload + Unit-move math for the Annual Plan calendar.
 *
 * Native HTML5 DnD (the app's established pattern): a Unit bar or a Day pill is
 * the drag source, a calendar date-cell is the drop target. The payload is a
 * tiny `{ kind, id }` serialized onto the drag event's `dataTransfer`.
 *
 * `computeUnitReschedule` is the pure "keep spacing" translation used when a
 * whole Unit is dropped on a new date: every member Day shifts so the Unit
 * starts at the drop date, preserving the SCHOOL-DAY gaps between lessons
 * (so nothing lands on a weekend/holiday, and distinct offsets never collide).
 */
import { getNextNSchoolDays, getSchoolDaysInRange } from './calendarMath';
import { toIsoDate } from './schoolCalendar';

export const DRAG_MIME = 'application/x-ma-calendar-item';

export type CalendarDragKind = 'day' | 'unit';

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
    if (
      (parsed.kind === 'day' || parsed.kind === 'unit') &&
      typeof parsed.id === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const parseIso = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Reschedule a Unit's member Days so the block starts at `droppedIso`, keeping
 * each Day's school-day offset from the Unit's first day. Returns the new ISO
 * dates parallel to the SORTED input (caller sorts its Days the same way).
 *
 * Consecutive lessons stay consecutive; gapped lessons keep their gaps; every
 * landing is a school day (skips weekends/holidays via `nonSchool`); distinct
 * offsets map to distinct school days, so no two Days collide.
 */
export const computeUnitReschedule = (
  scheduledIsos: string[],
  droppedIso: string,
  nonSchool: Map<string, unknown>,
): string[] => {
  if (scheduledIsos.length === 0) return [];
  const sorted = [...scheduledIsos].sort();
  const unitStart = parseIso(sorted[0]);
  // Each Day's school-day offset from the Unit's first day, forced strictly
  // increasing: a member Day that itself sits on a non-school date would tie
  // its predecessor's offset (weekends are filtered out of the count), which
  // would collapse two lessons onto one date — bump it to the next slot.
  let prev = -1;
  const offsets = sorted.map((iso) => {
    const raw = Math.max(
      0,
      getSchoolDaysInRange(unitStart, parseIso(iso), nonSchool).length - 1,
    );
    const off = Math.max(raw, prev + 1);
    prev = off;
    return off;
  });
  const maxOffset = offsets.reduce((m, o) => Math.max(m, o), 0);
  const block = getNextNSchoolDays(
    parseIso(droppedIso),
    maxOffset + 1,
    nonSchool,
  );
  return offsets.map((off, i) => {
    const landed = block[off];
    return landed ? toIsoDate(landed) : sorted[i];
  });
};
