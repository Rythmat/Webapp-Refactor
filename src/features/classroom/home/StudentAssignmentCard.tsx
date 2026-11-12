import { Link } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { ClassroomRoutes } from '@/constants/routes';
import { FOCUS_RING } from '@/daw/ui/styles';
import { IdCover } from '@/features/office/ui/ClassCover';
import { StatusPill } from '@/features/office/ui/StatusPill';
import type { Assignment } from '../assignments/assignmentsStore';
import { useMyAssignmentProgress } from '../assignments/useAssignmentProgress';

/** Where a student opens an assignment: its lesson, or its instructions. */
export const assignmentHref = (classroomId: string, a: Assignment) =>
  a.kind === 'instructions'
    ? ClassroomRoutes.assignmentInstructions({
        classroomId,
        assignmentId: a.id,
      })
    : ClassroomRoutes.assignmentDayRun({ classroomId, assignmentId: a.id });

const dueLine = (iso: string) => {
  const due = new Date(iso);
  const days = Math.round((due.getTime() - Date.now()) / 86_400_000);
  const date = due.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  if (due.getTime() < Date.now()) return `Was due ${date}`;
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due ${date}`;
};

/**
 * One assignment, as a Learn card for the student (owner, 2026-11-09): its
 * cover, what kind of work it is and when it's due, its name, and where
 * they are with it — To do, Started or Done — from their own progress.
 */
export const StudentAssignmentCard = ({
  classroomId,
  assignment,
  enrollmentId,
}: {
  classroomId: string;
  assignment: Assignment;
  enrollmentId: string | undefined;
}) => {
  const { myProgress } = useMyAssignmentProgress(
    assignment.id,
    enrollmentId,
    classroomId,
  );
  const status = myProgress?.status;
  const overdue =
    status !== 'done' &&
    !!assignment.dueAt &&
    new Date(assignment.dueAt).getTime() < Date.now();

  return (
    <Link
      to={assignmentHref(classroomId, assignment)}
      className={cn('group flex flex-col gap-2 rounded-2xl', FOCUS_RING)}
    >
      <div className="relative transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <IdCover id={assignment.id} className="w-full rounded-2xl" />
        <span className="absolute left-2 top-2">
          {status === 'done' ? (
            <StatusPill tone="success" className="bg-black/55 backdrop-blur">
              Done
            </StatusPill>
          ) : status === 'in_progress' ? (
            <StatusPill tone="warning" className="bg-black/55 backdrop-blur">
              Started
            </StatusPill>
          ) : assignment.status === 'closed' ? (
            <StatusPill className="bg-black/55 backdrop-blur">
              Closed
            </StatusPill>
          ) : overdue ? (
            <StatusPill tone="danger" className="bg-black/55 backdrop-blur">
              Late
            </StatusPill>
          ) : (
            <StatusPill className="bg-black/55 backdrop-blur">To do</StatusPill>
          )}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 px-0.5">
        <MicroLabel className="truncate">
          {assignment.kind === 'instructions' ? 'Practice' : 'Lesson'}
          {assignment.dueAt ? ` — ${dueLine(assignment.dueAt)}` : ''}
        </MicroLabel>
        <span className="line-clamp-2 text-[0.875rem] font-medium leading-snug text-daw-text">
          {assignment.title}
        </span>
      </div>
    </Link>
  );
};
