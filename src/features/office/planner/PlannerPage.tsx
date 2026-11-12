import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { OfficeRoutes, TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { IconButton } from '@/daw/ui/IconButton';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import {
  hasDragItem,
  readDragItem,
  setDragItem,
} from '@/features/classroom/annual/calendarDnd';
import { stepWeek } from '@/features/classroom/annual/calendarMath';
import { toIsoDate } from '@/features/classroom/annual/schoolCalendar';
import { useAnnualPlan } from '@/features/classroom/annual/useAnnualPlan';
import { useWeekGridData } from '@/features/classroom/annual/useWeekGridData';
import { StatusChip } from '@/features/classroom/plan/lessonStatus';
import { useLocalPlan } from '@/features/classroom/plan/useLocalPlan';
import { useCanEditClassroom, useMyClassrooms } from '@/hooks/data';
import { useOfficeInspector, withInspect } from '../frame/useOfficeInspector';
import { ClassCover } from '../ui/ClassCover';
import { OFFICE_CARD, OFFICE_PAGE, OFFICE_PAGE_TITLE } from '../ui/styles';
import {
  plannerDays,
  plannerLabel,
  weekFromParam,
  type PlannerDay,
} from './plannerWeek';

// Weekdays share the width; the weekend gets half a column each.
const COLUMNS =
  'grid-cols-[11rem_repeat(5,minmax(7.5rem,1fr))_repeat(2,minmax(4.5rem,0.5fr))]';

const HATCH =
  'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 7px)';

/** One class's week: its lessons by day, droppable within the class. */
const PlannerRow = ({
  classroomId,
  name,
  days,
  todayIso,
}: {
  classroomId: string;
  name: string;
  days: PlannerDay[];
  todayIso: string;
}) => {
  const { pathname, search } = useLocation();
  const { scheduledDays, statusFor, getDay } = useWeekGridData(classroomId);
  const { nonSchoolMap } = useAnnualPlan(classroomId);
  const { saveDay } = useLocalPlan(classroomId);
  const canEdit = useCanEditClassroom(classroomId);
  const { target } = useOfficeInspector();
  const [dropIso, setDropIso] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, typeof scheduledDays>();
    for (const day of scheduledDays) {
      const iso = day.scheduledDate as string;
      map.set(iso, [...(map.get(iso) ?? []), day]);
    }
    return map;
  }, [scheduledDays]);

  return (
    <div role="row" className={cn('grid gap-1.5', COLUMNS)}>
      <div role="rowheader" className="flex min-w-0 items-start py-1">
        <Link
          to={TeacherRoutes.plan({ classroomId })}
          className={cn(
            'flex min-w-0 items-center gap-2.5 rounded-lg p-1.5 hover:bg-white/[0.05]',
            FOCUS_RING,
          )}
        >
          <ClassCover classroomId={classroomId} className="size-8 rounded-lg" />
          <span className="truncate text-[0.875rem] font-medium text-daw-text">
            {name}
          </span>
        </Link>
      </div>
      {days.map((d) => {
        const off = nonSchoolMap.get(d.iso);
        const holiday = off && off.kind !== 'weekend';
        const lessons = byDate.get(d.iso) ?? [];
        return (
          <div
            key={d.iso}
            role="cell"
            aria-label={`${name}, ${d.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
            onDragOver={(e) => {
              if (!canEdit || !hasDragItem(e.dataTransfer)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDropIso(d.iso);
            }}
            onDragLeave={() => setDropIso(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDropIso(null);
              const item = readDragItem(e.dataTransfer);
              const day = item ? getDay(item.id) : undefined;
              // A lesson stays in its class: only this row's lessons land.
              if (!canEdit || !day || day.classroomId !== classroomId) return;
              saveDay({ ...day, scheduledDate: d.iso });
            }}
            style={
              holiday || d.weekend ? { backgroundImage: HATCH } : undefined
            }
            className={cn(
              'flex min-h-[5.5rem] min-w-0 flex-col gap-1 rounded-lg border p-1',
              TRANSITION,
              dropIso === d.iso
                ? 'border-white/40 bg-white/[0.06]'
                : d.iso === todayIso
                  ? 'border-white/25'
                  : 'border-white/[0.06]',
            )}
          >
            {holiday && (
              <span className="truncate px-1 text-[0.6875rem] uppercase tracking-wide text-daw-text-3">
                {off.label}
              </span>
            )}
            {lessons.map((day) => {
              const open =
                target?.kind === 'lesson' &&
                target.classroomId === classroomId &&
                target.id === day.id;
              return (
                <Link
                  key={day.id}
                  to={`${pathname}${withInspect(search, { kind: 'lesson', classroomId, id: day.id })}`}
                  draggable={canEdit}
                  onDragStart={(e) =>
                    setDragItem(e.dataTransfer, { kind: 'day', id: day.id })
                  }
                  title={day.label}
                  className={cn(
                    'flex min-w-0 flex-col gap-1 rounded-md px-2 py-1.5',
                    TRANSITION,
                    FOCUS_RING,
                    canEdit && 'cursor-grab active:cursor-grabbing',
                    open
                      ? 'bg-white/[0.14]'
                      : 'bg-white/[0.06] hover:bg-white/[0.1]',
                  )}
                >
                  <span className="line-clamp-2 text-[0.8125rem] font-medium leading-tight text-daw-text">
                    {day.label || 'Untitled lesson'}
                  </span>
                  {!d.weekend && (
                    <span>
                      <StatusChip status={statusFor(day).status} />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Planner (owner, 2026-11-09): the week across every class, one row each,
 * days lined up — Common Planner's view, which teachers asked to keep their
 * classes aligned day by day. A lesson opens in the Inspector; drag it to
 * another day of its class to move it. `?week=` keeps the week.
 */
export const PlannerPage = () => {
  const { classrooms, isLoading } = useMyClassrooms();
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const todayIso = toIsoDate(today);
  const anchor = weekFromParam(params.get('week'), today);
  const days = plannerDays(anchor);
  const thisWeek = weekFromParam(null, today).getTime() === anchor.getTime();

  const goTo = (next: Date | null) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next) p.set('week', toIsoDate(next));
        else p.delete('week');
        return p;
      },
      { replace: true },
    );

  const sorted = [...classrooms].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className={cn(OFFICE_PAGE, 'max-w-none')}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <MicroLabel>{plannerLabel(days)}</MicroLabel>
          <h1 className={OFFICE_PAGE_TITLE}>Planner</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton
            label="Previous week"
            icon={<ChevronLeft />}
            size="lg"
            onClick={() => goTo(stepWeek(anchor, -1))}
          />
          <Button size="lg" disabled={thisWeek} onClick={() => goTo(null)}>
            This week
          </Button>
          <IconButton
            label="Next week"
            icon={<ChevronRight />}
            size="lg"
            onClick={() => goTo(stepWeek(anchor, 1))}
          />
        </div>
      </header>

      {isLoading ? (
        <div aria-busy className={cn(OFFICE_CARD, 'h-64 animate-pulse')} />
      ) : sorted.length === 0 ? (
        <div className={OFFICE_CARD}>
          <EmptyState
            className="py-16"
            titleAs="h2"
            icon={<CalendarPlus />}
            title="No classes to plan yet"
            description="Make a class, and its lessons line up here by day."
            actions={
              <Button asChild variant="primary" size="lg">
                <Link to={`${OfficeRoutes.classes()}?new=1`}>New class</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div
          className={cn(
            OFFICE_CARD,
            'overflow-x-auto p-2 [scrollbar-width:thin]',
          )}
        >
          <div
            role="table"
            aria-label={`Week of ${plannerLabel(days)}`}
            className="flex min-w-[56rem] flex-col gap-1.5"
          >
            <div role="row" className={cn('grid gap-1.5', COLUMNS)}>
              {/* Holds the class column; its name is for screen readers. */}
              <div role="columnheader">
                <span className="sr-only">Class</span>
              </div>
              {days.map((d) => (
                <div
                  key={d.iso}
                  role="columnheader"
                  className="flex items-baseline justify-between gap-1 px-2 pb-1"
                >
                  <MicroLabel>
                    {d.date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </MicroLabel>
                  <span
                    className={cn(
                      'inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-[0.8125rem] tabular-nums',
                      d.iso === todayIso
                        ? 'bg-white font-bold text-black'
                        : 'text-daw-text-2',
                    )}
                  >
                    {d.date.getDate()}
                  </span>
                </div>
              ))}
            </div>
            {sorted.map((c) => (
              <PlannerRow
                key={c.id}
                classroomId={c.id}
                name={c.name}
                days={days}
                todayIso={todayIso}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
