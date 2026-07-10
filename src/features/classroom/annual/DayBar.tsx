/**
 * A single-day pill on the Annual Plan calendar — one Day scheduled to a
 * specific date. Deep-links to the DayEditor.
 */
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import type { Day } from '../types';
import { colorForUnitId } from './unitColors';

interface DayBarProps {
  classroomId: string;
  day: Day;
  /** Parent unit id — drives the pill color so it matches the Unit bar. */
  parentUnitId: string | null;
  /** Grid column to start at, 1-7 (Sunday-first). */
  startColumn: number;
}

export const DayBar = ({
  classroomId,
  day,
  parentUnitId,
  startColumn,
}: DayBarProps) => {
  const color = parentUnitId ? colorForUnitId(parentUnitId) : null;
  const bgClass = color?.bg ?? 'bg-white/[0.04]';
  const borderClass = color?.border ?? 'border-white/15';
  const textClass = color?.text ?? 'text-white/85';

  return (
    <Link
      to={TeacherRoutes.dayEditor({ classroomId, dayId: day.id })}
      style={{
        gridColumnStart: startColumn,
        gridColumnEnd: 'span 1',
      }}
      className={`flex items-center overflow-hidden rounded-md border ${bgClass} ${borderClass} px-1.5 py-0.5 transition-colors hover:brightness-125`}
      title={day.label}
    >
      <span
        className={`truncate text-[10px] font-medium leading-tight ${textClass}`}
      >
        {day.label}
      </span>
    </Link>
  );
};
