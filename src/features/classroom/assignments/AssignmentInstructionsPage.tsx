import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClassroomRoutes } from '@/constants/routes';
import {
  useLocalEnrollmentId,
  useMyAssignmentProgress,
} from './useAssignmentProgress';
import { useAssignments } from './useAssignments';

export const AssignmentInstructionsPage = () => {
  const { classroomId, assignmentId } = useParams<{
    classroomId: string;
    assignmentId: string;
  }>();
  const cid = classroomId ?? '';
  const aid = assignmentId ?? '';
  const navigate = useNavigate();

  const { getAssignment } = useAssignments(cid);
  const enrollmentId = useLocalEnrollmentId();
  const { myProgress, setMyProgress } = useMyAssignmentProgress(
    aid,
    enrollmentId,
    cid,
  );

  const assignment = getAssignment(aid);

  if (!assignment) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-6 py-10">
        <p className="text-sm text-white/60">Assignment not available.</p>
        <button
          type="button"
          onClick={() =>
            navigate(ClassroomRoutes.assignments({ classroomId: cid }))
          }
          className="w-fit rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          Back to Assignments
        </button>
      </div>
    );
  }

  const isDone = myProgress?.status === 'done';

  const handleMarkDone = () => {
    void setMyProgress({ status: 'done' }).catch(() => {});
  };
  const handleReopen = () => {
    void setMyProgress({ status: 'in_progress' }).catch(() => {});
  };

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-6 py-6 md:gap-8 md:px-10 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={ClassroomRoutes.assignments({ classroomId: cid })}
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assignments
        </Link>
        {isDone ? (
          <button
            type="button"
            onClick={handleReopen}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:text-white"
          >
            <CheckCircle2 className="h-4 w-4" />
            Done — Undo
          </button>
        ) : (
          <button
            type="button"
            onClick={handleMarkDone}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark Done
          </button>
        )}
      </header>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium text-white md:text-3xl">
          {assignment.title}
        </h1>
        {assignment.dueAt && (
          <p className="text-xs text-white/40">
            Due {new Date(assignment.dueAt).toLocaleString()}
          </p>
        )}
      </div>

      <div className="whitespace-pre-wrap rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm leading-relaxed text-white/85 md:p-6">
        {assignment.instructions || 'No instructions provided.'}
      </div>
    </div>
  );
};
