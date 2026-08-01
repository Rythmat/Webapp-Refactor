/**
 * DueThisWeekSection — Overview "Due This Week" block in the Home Dashboard
 * section style: an icon + title header with a right-aligned "All assignments"
 * pill, over a list panel of assignments due within 7 days (arrow-chip rows).
 */
import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useAssignments } from '@/features/classroom/assignments/useAssignments';
import { SectionListRow } from './SectionListRow';

interface DueThisWeekSectionProps {
  classroomId: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const relativeDue = (dueAtIso: string): string => {
  const due = new Date(dueAtIso).getTime();
  const now = Date.now();
  const diff = due - now;
  if (diff < 0) return 'overdue';
  const days = Math.floor(diff / DAY_MS);
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  return `due in ${days} days`;
};

export const DueThisWeekSection = ({
  classroomId,
}: DueThisWeekSectionProps) => {
  const { assignments } = useAssignments(classroomId);
  const now = Date.now();
  const upcoming = assignments
    .filter(
      (a) =>
        a.status === 'open' &&
        typeof a.dueAt === 'string' &&
        a.dueAt.length > 0 &&
        new Date(a.dueAt).getTime() >= now &&
        new Date(a.dueAt).getTime() - now <= 7 * DAY_MS,
    )
    .sort(
      (a, b) =>
        new Date(a.dueAt as string).getTime() -
        new Date(b.dueAt as string).getTime(),
    )
    .slice(0, 5);

  return (
    <section
      aria-label="Due This Week"
      className="flex flex-col gap-4 md:gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-3">
          <ClipboardList className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
          <h2 className="text-xl font-medium text-white md:text-2xl">
            Due This Week
          </h2>
        </div>
        <Link
          to={TeacherRoutes.plan({ classroomId })}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
        >
          All lessons
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
        {upcoming.length === 0 ? (
          <p className="text-base text-white/50 md:text-lg">
            Nothing due in the next 7 days.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-white/[0.06]">
            {upcoming.map((a) => (
              <SectionListRow
                key={a.id}
                to={TeacherRoutes.assignmentProgress({
                  classroomId,
                  assignmentId: a.id,
                })}
                title={a.title}
                meta={relativeDue(a.dueAt as string)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
