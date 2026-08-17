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
import { colorForUnitId } from './unitColors';

interface DayBarProps {
  classroomId: string;
  day: Day;
  /** Parent unit id — drives the pill color so it matches the Unit bar. */
  parentUnitId: string | null;
  /** Grid column to start at, 1-7 (Sunday-first). */
  startColumn: number;
  /** Grid row for this pill — the caller places it just under its parent Unit's
   *  bar (Month grid: `2*lane+3`, one row below the Unit bar's `2*lane+2`). */
  gridRow: number;
}

export const DayBar = ({
  classroomId,
  day,
  parentUnitId,
  startColumn,
  gridRow,
}: DayBarProps) => {
  const [dragging, setDragging] = useState(false);
  const color = parentUnitId ? colorForUnitId(parentUnitId) : null;
  const bgClass = color?.bg ?? 'bg-white/[0.04]';
  const borderClass = color?.border ?? 'border-white/15';
  const textClass = color?.text ?? 'text-white/85';
  const dotColor = color?.hex ?? '#ffffff';

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
      className={`flex cursor-grab items-center gap-1.5 self-start overflow-hidden rounded-lg border ${bgClass} ${borderClass} px-2 py-1 transition-colors hover:brightness-125 active:cursor-grabbing ${
        dragging ? 'opacity-50' : ''
      }`}
      title={day.label}
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: dotColor }}
      />
      <span
        style={{ fontSize: CAL_FONT.dayLabel }}
        className={`truncate font-medium leading-tight ${textClass}`}
      >
        {day.label}
      </span>
    </Link>
  );
};
