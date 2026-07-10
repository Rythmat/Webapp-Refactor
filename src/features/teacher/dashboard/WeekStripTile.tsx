/**
 * WeekStripTile — a slim horizontal calendar strip showing the current week.
 * Each day surfaces which Units are active on that date via a colored dot.
 * Reuses `colorForUnitId` + `resolveUnitDateRange` from the Annual Plan build.
 */
import { CalendarRange } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import {
  resolveSchoolYear,
  resolveUnitDateRange,
} from '@/features/classroom/annual/calendarMath';
import { colorForUnitId } from '@/features/classroom/annual/unitColors';
import { useAnnualPlan } from '@/features/classroom/annual/useAnnualPlan';
import type { Unit } from '@/features/classroom/types';
import { DashboardTile } from './DashboardTile';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfWeek = (d: Date): Date => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
};

const dayInRange = (day: Date, start: Date, end: Date): boolean => {
  const t = day.getTime();
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(23, 59, 59, 999);
  return t >= s.getTime() && t <= e.getTime();
};

interface WeekStripTileProps {
  classroomId: string;
}

export const WeekStripTile = ({ classroomId }: WeekStripTileProps) => {
  const { plan } = useAnnualPlan(classroomId);

  const cells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek(today);
    const allUnits: Unit[] = plan
      ? [...plan.year.semesters.autumn, ...plan.year.semesters.spring]
      : [];
    const schoolYear = resolveSchoolYear(today);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const isToday = date.getTime() === today.getTime();
      const activeUnits = allUnits.filter((u) => {
        const range = resolveUnitDateRange(u, schoolYear);
        return dayInRange(date, range.start, range.end);
      });
      return { date, isToday, activeUnits };
    });
  }, [plan]);

  return (
    <DashboardTile
      title="This Week"
      icon={<CalendarRange className="h-3.5 w-3.5" />}
      colSpanMd={12}
      footerLink={{
        to: TeacherRoutes.annualPlan({ classroomId }),
        label: 'Open Annual Plan',
      }}
    >
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`flex flex-col gap-2 rounded-lg border px-2 py-2 ${
              cell.isToday
                ? 'border-white/25 bg-white/[0.06]'
                : 'border-white/[0.06] bg-white/[0.01]'
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-wider text-white/40">
                {WEEKDAY_LABELS[i]}
              </span>
              <span
                className={`text-sm tabular-nums ${
                  cell.isToday ? 'text-white' : 'text-white/60'
                }`}
              >
                {cell.date.getDate()}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {cell.activeUnits.length === 0 ? (
                <span className="text-[10px] text-white/25">—</span>
              ) : (
                cell.activeUnits.map((u) => {
                  const color = colorForUnitId(u.id);
                  return (
                    <Link
                      key={u.id}
                      to={TeacherRoutes.annualUnit({
                        classroomId,
                        unitId: u.id,
                      })}
                      className={`inline-block h-2 w-2 rounded-full ${color.bg} border ${color.border}`}
                      title={u.label}
                    />
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardTile>
  );
};
