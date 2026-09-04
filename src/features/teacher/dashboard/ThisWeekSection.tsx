/**
 * ThisWeekSection — Overview "This Week" block: the Calendar's Week grid
 * embedded read-only, showing the current week by default with prev/next
 * navigation (chevrons + a "Today" reset). Mirrors the Home Dashboard section
 * style (icon + title header with an "Open calendar" pill) over a container-query
 * panel that holds `WeekView`. Reuses the exact derivation the Calendar tab uses
 * (`useWeekGridData`) so lessons, images, and status chips match. Cards deep-link
 * into the Day editor but are not drag-to-reschedule here.
 */
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { WeekView } from '@/features/classroom/annual/WeekView';
import {
  getWeekCalendar,
  resolveInitialWeek,
  stepWeek,
} from '@/features/classroom/annual/calendarMath';
import { useAnnualPlan } from '@/features/classroom/annual/useAnnualPlan';
import { useWeekGridData } from '@/features/classroom/annual/useWeekGridData';

interface ThisWeekSectionProps {
  classroomId: string;
}

const noop = () => {};

// Reserve a lesson-card's height for every day column so an empty week stays as
// tall as a populated one (no layout jump when paging). Tracks the responsive
// square LessonThumb (≈ one column width, ~19cqw against the card's container)
// plus the fixed header + title/subtitle/status-chip block (~140px).
const RESERVED_COLUMN_HEIGHT = 'clamp(320px, calc(19cqw + 140px), 480px)';

export const ThisWeekSection = ({ classroomId }: ThisWeekSectionProps) => {
  const { plan, nonSchoolMap } = useAnnualPlan(classroomId);
  // Current week by default; chevrons page it. Anchors are start-of-day Sundays,
  // so getTime() compares them exactly.
  const currentWeekAnchor = useMemo(() => resolveInitialWeek(new Date()), []);
  const [weekAnchor, setWeekAnchor] = useState(currentWeekAnchor);
  const weekLabel = useMemo(
    () => getWeekCalendar(weekAnchor).label,
    [weekAnchor],
  );
  const isCurrentWeek = weekAnchor.getTime() === currentWeekAnchor.getTime();
  const data = useWeekGridData(classroomId, plan);

  const goPrev = () => setWeekAnchor((a) => stepWeek(a, -1));
  const goNext = () => setWeekAnchor((a) => stepWeek(a, 1));
  const goToday = () => setWeekAnchor(currentWeekAnchor);

  return (
    <section aria-label="This Week" className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <CalendarDays className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
          <h2 className="text-xl font-medium text-white md:text-2xl">
            This Week
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous week"
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:border-white/25 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[10ch] text-center text-sm text-white/70 tabular-nums md:text-base">
              {weekLabel}
            </span>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next week"
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:border-white/25 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {!isCurrentWeek && (
              <button
                type="button"
                onClick={goToday}
                className="ml-1 inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/25 hover:text-white"
              >
                Today
              </button>
            )}
          </div>
        </div>
        <Link
          to={TeacherRoutes.annualPlan({ classroomId })}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
        >
          Open calendar
        </Link>
      </div>

      {plan ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 [container-type:inline-size]">
          <WeekView
            classroomId={classroomId}
            weekAnchor={weekAnchor}
            language="en"
            nonSchoolMap={nonSchoolMap}
            dropIso={null}
            onCellDragOver={noop}
            onCellDrop={noop}
            draggableCards={false}
            reserveBandRow
            columnMinHeight={RESERVED_COLUMN_HEIGHT}
            allUnits={data.allUnits}
            unitRanges={data.unitRanges}
            unitByDayId={data.unitByDayId}
            getDay={data.getDay}
            hiddenDayIds={data.hiddenDayIds}
            todayIso={data.todayIso}
            countryFeatures={data.countryFeatures}
            songsReady={data.songsReady}
            statusFor={data.statusFor}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
          <p className="text-base text-white/50 md:text-lg">
            Set up your year plan to see your week here.
          </p>
        </div>
      )}
    </section>
  );
};
