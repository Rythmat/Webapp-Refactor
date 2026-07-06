import { CalendarDays, Play, PlusCircle, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClassroomRoutes } from '@/constants/routes';
import { newBlankDay } from './newBlankDay';
import { useLocalPlan } from './useLocalPlan';

/**
 * Plan overview for a classroom. Lists the teacher's authored Days from
 * localStorage and offers a "New Day" affordance. Clicking a Day opens the
 * DayEditor; clicking Present opens Presentation Mode for that Day.
 */
export const PlanPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const { listDays, saveDay, deleteDay } = useLocalPlan();

  const days = listDays();
  const cid = classroomId ?? '';

  const handleNew = () => {
    const day = newBlankDay();
    saveDay(day);
    navigate(ClassroomRoutes.dayEditor({ classroomId: cid, dayId: day.id }));
  };

  const handleDelete = (dayId: string, dayLabel: string) => {
    if (window.confirm(`Delete “${dayLabel}”? This cannot be undone.`)) {
      deleteDay(dayId);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-8 px-6 py-6 md:gap-12 md:px-10 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <CalendarDays className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
            <h1 className="text-xl font-medium text-white md:text-2xl">
              Plan Days
            </h1>
          </div>
          <p className="text-sm text-white/60">
            Author lesson Days for this classroom. Everything saves locally in
            your browser.
          </p>
        </div>
        <button
          type="button"
          onClick={handleNew}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
        >
          <PlusCircle className="h-4 w-4" />
          New Day
        </button>
      </header>

      {days.length === 0 ? (
        <EmptyState onNew={handleNew} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {days.map((day) => (
            <li
              key={day.id}
              className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={ClassroomRoutes.dayEditor({
                    classroomId: cid,
                    dayId: day.id,
                  })}
                  className="text-lg font-medium text-white hover:underline"
                >
                  {day.label}
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(day.id, day.label)}
                  aria-label={`Delete ${day.label}`}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/80"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-white/40">
                {countFilledPhases(day)} of 5 phases with content
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link
                  to={ClassroomRoutes.present({
                    classroomId: cid,
                    dayId: day.id,
                  })}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
                >
                  <Play className="h-4 w-4" />
                  Present
                </Link>
                <Link
                  to={ClassroomRoutes.dayEditor({
                    classroomId: cid,
                    dayId: day.id,
                  })}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
                >
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface EmptyStateProps {
  onNew: () => void;
}

const EmptyState = ({ onNew }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
    <CalendarDays className="h-16 w-16 text-white/40" />
    <h2 className="text-xl font-medium text-white">No Days yet</h2>
    <p className="max-w-md text-base text-white/60">
      Create your first Day and drop in the five phases — Connect, Practice,
      Create, Share, Reflect — then project it in Presentation Mode.
    </p>
    <button
      type="button"
      onClick={onNew}
      className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
    >
      <PlusCircle className="h-4 w-4" />
      Create Your First Day
    </button>
  </div>
);

const countFilledPhases = (day: import('../types').Day): number => {
  let filled = 0;
  for (const cell of Object.values(day.cells)) {
    if (
      cell.presentation.title.en.trim() ||
      cell.presentation.prompt.en.trim()
    ) {
      filled += 1;
    }
  }
  return filled;
};
