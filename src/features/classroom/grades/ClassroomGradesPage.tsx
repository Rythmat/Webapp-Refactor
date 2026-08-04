/**
 * ClassroomGradesPage — the Grades tab of the teacher classroom workspace.
 *
 * A thin gradebook: one row per assignment with turned-in / in-progress counts,
 * linking to the existing per-assignment progress grid. No backend changes.
 * (Phase 4 of the content-integration plan adds a "Learning goals" standards-
 * alignment view alongside this list.)
 */
import { GraduationCap } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import type { Assignment } from '../assignments/assignmentsStore';
import { useAssignmentProgress } from '../assignments/useAssignmentProgress';
import { useAssignments } from '../assignments/useAssignments';

export const ClassroomGradesPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = classroomId ?? '';
  const { assignments } = useAssignments(cid);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm uppercase tracking-wider text-white/60">
          Gradebook
        </span>
        <span className="text-sm text-white/40">
          {assignments.length} assignment{assignments.length === 1 ? '' : 's'}
        </span>
      </div>

      {assignments.length === 0 ? (
        <GradesEmptyState />
      ) : (
        <ul className="flex flex-col gap-3">
          {assignments.map((a) => (
            <GradeRow key={a.id} classroomId={cid} assignment={a} />
          ))}
        </ul>
      )}
    </div>
  );
};

const GradeRow = ({
  classroomId,
  assignment,
}: {
  classroomId: string;
  assignment: Assignment;
}) => {
  const { listProgress } = useAssignmentProgress(classroomId, assignment.id);
  const rows = listProgress(assignment.id);
  const doneCount = rows.filter((p) => p.status === 'done').length;
  const inProgressCount = rows.filter((p) => p.status === 'in_progress').length;
  const totalCount = rows.length;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-col gap-1">
        <span className="text-lg font-medium text-white">
          {assignment.title}
        </span>
        <span className="text-sm text-white/50">
          {doneCount} turned in · {inProgressCount} in progress · {totalCount}{' '}
          {totalCount === 1 ? 'student' : 'students'}
        </span>
      </div>
      <Link
        to={TeacherRoutes.assignmentProgress({
          classroomId,
          assignmentId: assignment.id,
        })}
        className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
      >
        View progress
      </Link>
    </li>
  );
};

const GradesEmptyState = () => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
    <GraduationCap className="h-16 w-16 text-white/40" />
    <h2 className="text-xl font-medium text-white">No grades yet</h2>
    <p className="max-w-md text-base text-white/60">
      Once you create assignments and students turn them in, their progress
      shows up here.
    </p>
  </div>
);
