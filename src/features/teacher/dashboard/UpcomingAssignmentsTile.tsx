import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useAssignments } from '@/features/classroom/assignments/useAssignments';
import { DashboardTile } from './DashboardTile';

interface UpcomingAssignmentsTileProps {
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

export const UpcomingAssignmentsTile = ({
  classroomId,
}: UpcomingAssignmentsTileProps) => {
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
    <DashboardTile
      title="Due This Week"
      icon={<ClipboardList className="h-3.5 w-3.5" />}
      footerLink={{
        to: TeacherRoutes.assignments({ classroomId }),
        label: 'All assignments',
      }}
    >
      {upcoming.length === 0 ? (
        <p className="text-xs text-white/40">Nothing due in the next 7 days.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {upcoming.map((a) => (
            <li key={a.id}>
              <Link
                to={TeacherRoutes.assignmentProgress({
                  classroomId,
                  assignmentId: a.id,
                })}
                className="flex items-center justify-between gap-2 text-sm text-white/80 transition-colors hover:text-white"
              >
                <span className="truncate">{a.title}</span>
                <span className="shrink-0 text-[11px] text-white/50">
                  {relativeDue(a.dueAt as string)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardTile>
  );
};
