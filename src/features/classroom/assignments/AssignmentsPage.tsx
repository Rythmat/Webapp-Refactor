import { ClipboardList, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClassroomLayout } from '@/components/ClassroomLayout/ClassroomLayout';
import { ClassroomRoutes, TeacherRoutes } from '@/constants/routes';
import { useMe } from '@/hooks/data';
import { AssignmentComposer } from './AssignmentComposer';
import type { Assignment } from './assignmentsStore';
import {
  useAssignmentProgress,
  useLocalEnrollmentId,
  useMyAssignmentProgress,
} from './useAssignmentProgress';
import { useAssignments } from './useAssignments';

export const AssignmentsPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = classroomId ?? '';
  const { data: user } = useMe();

  const back =
    user?.role === 'teacher'
      ? {
          label: 'Dashboard',
          to: TeacherRoutes.classroomDashboard({ classroomId: cid }),
        }
      : { label: 'Classroom', to: ClassroomRoutes.home({ classroomId: cid }) };

  return (
    <ClassroomLayout
      back={back}
      classroomId={cid}
      isEmpty={false}
      isLoading={false}
      isNotFound={false}
    >
      {user?.role === 'teacher' ? (
        <TeacherAssignmentsPage classroomId={cid} />
      ) : (
        <StudentAssignmentsPage classroomId={cid} />
      )}
    </ClassroomLayout>
  );
};

interface RoleProps {
  classroomId: string;
}

const TeacherAssignmentsPage = ({ classroomId }: RoleProps) => {
  const { assignments } = useAssignments(classroomId);
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <ClipboardList className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
            <h1 className="text-xl font-medium text-white md:text-2xl">
              Assignments
            </h1>
            <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/60">
              {assignments.length}
            </span>
          </div>
          <p className="text-sm text-white/60">
            Create Day or Instructions assignments for this classroom.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
        >
          <PlusCircle className="h-4 w-4" />
          New
        </button>
      </header>

      {assignments.length === 0 ? (
        <EmptyState onNew={() => setComposerOpen(true)} />
      ) : (
        <ul className="flex flex-col gap-3">
          {assignments.map((a) => (
            <TeacherRow key={a.id} classroomId={classroomId} assignment={a} />
          ))}
        </ul>
      )}

      {composerOpen && (
        <AssignmentComposer
          classroomId={classroomId}
          onClose={() => setComposerOpen(false)}
        />
      )}
    </div>
  );
};

const TeacherRow = ({
  classroomId,
  assignment,
}: {
  classroomId: string;
  assignment: Assignment;
}) => {
  const { listProgress } = useAssignmentProgress(classroomId, assignment.id);
  const rows = listProgress(assignment.id);
  const doneCount = rows.filter((p) => p.status === 'done').length;
  const totalCount = rows.length;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-white">
            {assignment.title}
          </span>
          <KindBadge kind={assignment.kind} />
          {assignment.status === 'closed' && (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/50">
              closed
            </span>
          )}
        </div>
        <span className="text-xs text-white/50">
          {doneCount}/{totalCount || 1} done
          {assignment.dueAt
            ? ` · due ${new Date(assignment.dueAt).toLocaleString()}`
            : ''}
        </span>
      </div>
      <div className="flex gap-2">
        <Link
          to={TeacherRoutes.assignmentProgress({
            classroomId,
            assignmentId: assignment.id,
          })}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
        >
          Progress
        </Link>
        <Link
          to={
            assignment.kind === 'day'
              ? ClassroomRoutes.assignmentDayRun({
                  classroomId,
                  assignmentId: assignment.id,
                })
              : ClassroomRoutes.assignmentInstructions({
                  classroomId,
                  assignmentId: assignment.id,
                })
          }
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
        >
          Open
        </Link>
      </div>
    </li>
  );
};

const StudentAssignmentsPage = ({ classroomId }: RoleProps) => {
  const { assignments } = useAssignments(classroomId);
  const openAssignments = assignments.filter((a) => a.status === 'open');

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 md:gap-3">
          <ClipboardList className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
          <h1 className="text-xl font-medium text-white md:text-2xl">
            Assignments
          </h1>
        </div>
        <p className="text-sm text-white/60">Your to-do list.</p>
      </header>

      {openAssignments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/60">
          Nothing here yet.
        </p>
      ) : (
        <StudentSplitList
          classroomId={classroomId}
          assignments={openAssignments}
        />
      )}
    </div>
  );
};

const StudentSplitList = ({
  classroomId,
  assignments,
}: {
  classroomId: string;
  assignments: Assignment[];
}) => {
  const enrollmentId = useLocalEnrollmentId();
  return (
    <ul className="flex flex-col gap-3">
      {assignments.map((a) => (
        <StudentRow
          key={a.id}
          classroomId={classroomId}
          assignment={a}
          enrollmentId={enrollmentId}
        />
      ))}
    </ul>
  );
};

const StudentRow = ({
  classroomId,
  assignment,
  enrollmentId,
}: {
  classroomId: string;
  assignment: Assignment;
  enrollmentId: string;
}) => {
  const { myProgress } = useMyAssignmentProgress(
    assignment.id,
    enrollmentId,
    classroomId,
  );
  const isDone = myProgress?.status === 'done';
  const statusLabel = isDone
    ? 'Done'
    : myProgress?.status === 'in_progress'
      ? 'In progress'
      : 'To do';

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-col gap-1">
        <span className="text-base font-medium text-white">
          {assignment.title}
        </span>
        <span className="text-xs text-white/50">
          {statusLabel}
          {assignment.dueAt
            ? ` · due ${new Date(assignment.dueAt).toLocaleString()}`
            : ''}
        </span>
      </div>
      <Link
        to={
          assignment.kind === 'day'
            ? ClassroomRoutes.assignmentDayRun({
                classroomId,
                assignmentId: assignment.id,
              })
            : ClassroomRoutes.assignmentInstructions({
                classroomId,
                assignmentId: assignment.id,
              })
        }
        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
      >
        {isDone ? 'Review' : 'Start'}
      </Link>
    </li>
  );
};

const KindBadge = ({ kind }: { kind: Assignment['kind'] }) => (
  <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs uppercase tracking-wide text-white/60">
    {kind}
  </span>
);

const EmptyState = ({ onNew }: { onNew: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
    <ClipboardList className="h-16 w-16 text-white/40" />
    <h2 className="text-xl font-medium text-white">No assignments yet</h2>
    <p className="max-w-md text-base text-white/60">
      Publish a Day, then attach it as an assignment students can run on their
      own.
    </p>
    <button
      type="button"
      onClick={onNew}
      className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
    >
      <PlusCircle className="h-4 w-4" />
      New assignment
    </button>
  </div>
);
