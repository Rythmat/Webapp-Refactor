/**
 * A single-day pill on the Annual Plan calendar — one Day scheduled to a
 * specific date. Deep-links to the DayEditor, and is a drag source: drop it on
 * a calendar date-cell to reschedule the Day (see CalendarView).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import type { Day } from '../types';
import { setDragItem } from './calendarDnd';
import { CAL_FONT } from './calendarSizing';

interface DayBarProps {
  classroomId: string;
  day: Day;
  /** Grid column to start at, 1-7 (Sunday-first). */
  startColumn: number;
  /** Grid row for this pill — the caller stacks lessons sharing a date
   *  (Month grid: `lane+2`, under the date header row). */
  gridRow: number;
}

export const DayBar = ({
  classroomId,
  day,
  startColumn,
  gridRow,
}: DayBarProps) => {
  const [dragging, setDragging] = useState(false);

  return (
    <Link
      to={TeacherRoutes.dayEditor({ classroomId, dayId: day.id })}
      draggable
      onDragStart={(e) => {
        setDragItem(e.dataTransfer, { kind: 'day', id: day.id });
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      style={{
        gridColumnStart: startColumn,
        gridColumnEnd: 'span 1',
        gridRowStart: gridRow,
      }}
      className={`flex cursor-grab items-center gap-1.5 self-start overflow-hidden rounded-lg border border-white/15 bg-white/[0.04] px-2 py-1 transition-colors hover:brightness-125 active:cursor-grabbing ${
        dragging ? 'opacity-50' : ''
      }`}
      title={day.label}
    >
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-white" />
      <span
        style={{ fontSize: CAL_FONT.dayLabel }}
        className="truncate font-medium leading-tight text-white/85"
      >
        {day.label}
      </span>
    </Link>
  );
};
