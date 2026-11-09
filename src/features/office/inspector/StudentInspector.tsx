import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { useClassAssignmentProgress } from '@/features/classroom/assignments/useAssignmentProgress';
import { useAssignments } from '@/features/classroom/assignments/useAssignments';
import { useEnrollments } from '@/features/classroom/enrollments';
import { useCanManageClassroom } from '@/hooks/data';
import { PROGRESS_LABEL, PROGRESS_TONE } from '../class/assignmentState';
import { Initial, StatusPill } from '../ui/StatusPill';
import { OFFICE_ROW } from '../ui/styles';
import { Facts, InspectorBody, InspectorSection } from './InspectorParts';

const ENROLLMENT_TONE = {
  active: 'success',
  pending: 'warning',
  removed: 'danger',
} as const;

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        // The year only when it isn't this one.
        ...(new Date(iso).getFullYear() === new Date().getFullYear()
          ? {}
          : { year: 'numeric' as const }),
      })
    : '—';

/**
 * A student in the Inspector: who they are in this class, where they stand
 * on every assignment, and the roster actions the role allows.
 */
export const StudentInspector = ({
  classroomId,
  enrollmentId,
}: {
  classroomId: string;
  enrollmentId: string;
}) => {
  const { getEnrollment, approve, deny, kick, reactivate } =
    useEnrollments(classroomId);
  const { assignments } = useAssignments(classroomId);
  const { listProgress } = useClassAssignmentProgress(
    classroomId,
    assignments.map((a) => a.id),
  );
  const canManage = useCanManageClassroom(classroomId);
  const student = getEnrollment(enrollmentId);

  if (!student) {
    return (
      <EmptyState
        title="This student isn't on the roster"
        description="They may have left the class, or the roster hasn't loaded yet."
      />
    );
  }

  const work = assignments.map((a) => {
    const row = listProgress(a.id).find((p) => p.enrollmentId === enrollmentId);
    return { assignment: a, status: row?.status ?? ('none' as const) };
  });
  const done = work.filter((w) => w.status === 'done').length;
  const open = assignments.filter((a) => a.status === 'open').length;

  return (
    <InspectorBody>
      <div className="flex items-center gap-3">
        <Initial
          name={student.displayName}
          className="size-12 text-[1.125rem]"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="truncate text-[1.125rem] font-semibold leading-6 text-daw-text">
            {student.displayName}
          </h3>
          <span>
            <StatusPill tone={ENROLLMENT_TONE[student.status]}>
              {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
            </StatusPill>
          </span>
        </div>
      </div>

      <Facts
        facts={[
          { label: 'Joined', value: formatDate(student.joinedAt) },
          { label: 'Done', value: `${done} of ${assignments.length}` },
          { label: 'Open', value: open },
        ]}
      />

      {canManage && (
        <div className="flex flex-wrap gap-2">
          {student.status === 'pending' && (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={() => void approve(student.id).catch(() => {})}
              >
                Let them in
              </Button>
              <Button
                size="lg"
                onClick={() => void deny(student.id).catch(() => {})}
              >
                Deny
              </Button>
            </>
          )}
          {student.status === 'active' && (
            <Button
              size="lg"
              onClick={() => void kick(student.id).catch(() => {})}
            >
              Remove from class
            </Button>
          )}
          {student.status === 'removed' && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => void reactivate(student.id).catch(() => {})}
            >
              Bring back
            </Button>
          )}
        </div>
      )}

      <InspectorSection title="Assignments">
        {work.length === 0 ? (
          <p className={cn(TYPE_CLASS.body, 'px-0.5 text-daw-text-3')}>
            No assignments in this class yet.
          </p>
        ) : (
          <ul className="-mx-1 flex flex-col">
            {work.map(({ assignment, status }) => (
              <li key={assignment.id}>
                <Link
                  to={TeacherRoutes.assignmentProgress({
                    classroomId,
                    assignmentId: assignment.id,
                  })}
                  className={cn(OFFICE_ROW, 'min-h-10 py-1.5')}
                >
                  <span className="min-w-0 flex-1 truncate text-[0.875rem] text-daw-text">
                    {assignment.title}
                  </span>
                  <StatusPill tone={PROGRESS_TONE[status]}>
                    {PROGRESS_LABEL[status]}
                  </StatusPill>
                  <ChevronRight
                    aria-hidden
                    className="size-3.5 text-daw-text-3"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </InspectorSection>
    </InspectorBody>
  );
};
