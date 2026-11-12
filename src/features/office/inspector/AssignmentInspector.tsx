import { BarChart3, ExternalLink, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { ClassroomRoutes, TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { useAssignmentProgress } from '@/features/classroom/assignments/useAssignmentProgress';
import { useAssignments } from '@/features/classroom/assignments/useAssignments';
import { useEnrollments } from '@/features/classroom/enrollments';
import { usePublishedDays } from '@/features/classroom/publish/usePublishedDays';
import { useCanEditClassroom } from '@/hooks/data';
import {
  assignmentGroup,
  formatDue,
  progressCounts,
} from '../class/assignmentState';
import { ProgressBar } from '../ui/ProgressBar';
import { StatusPill } from '../ui/StatusPill';
import { Facts, InspectorBody, InspectorSection } from './InspectorParts';

/**
 * An assignment in the Inspector: what it is, when it's due, how the class
 * stands on it, and the way into its full progress grid, the student's view
 * of it, or closing it.
 */
export const AssignmentInspector = ({
  classroomId,
  assignmentId,
}: {
  classroomId: string;
  assignmentId: string;
}) => {
  const { getAssignment, closeAssignment } = useAssignments(classroomId);
  const { listProgress, countResponses } = useAssignmentProgress(
    classroomId,
    assignmentId,
  );
  const { active } = useEnrollments(classroomId);
  const { getPublishedDay } = usePublishedDays(classroomId);
  const canEdit = useCanEditClassroom(classroomId);
  const assignment = getAssignment(assignmentId);

  if (!assignment) {
    return (
      <EmptyState
        title="This assignment isn't here"
        description="It may have been removed, or it was made on another device."
      />
    );
  }

  const counts = progressCounts(
    listProgress(assignmentId),
    active.map((e) => e.id),
  );
  const group = assignmentGroup(assignment, Date.now());
  const lesson =
    assignment.kind === 'day' && assignment.publishedDayId
      ? getPublishedDay(assignment.publishedDayId)?.snapshot.label
      : null;
  const studentView =
    assignment.kind === 'day'
      ? ClassroomRoutes.assignmentDayRun({ classroomId, assignmentId })
      : ClassroomRoutes.assignmentInstructions({ classroomId, assignmentId });

  return (
    <InspectorBody>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[1.125rem] font-semibold leading-6 text-daw-text">
          {assignment.title}
        </h3>
        <p className={cn(TYPE_CLASS.body, 'text-daw-text-2')}>
          {assignment.kind === 'day'
            ? `Lesson${lesson ? ` · ${lesson}` : ''}`
            : 'Instructions'}
          {assignment.dueAt ? ` · Due ${formatDue(assignment.dueAt)}` : ''}
        </p>
        <span>
          <StatusPill
            tone={
              group === 'overdue'
                ? 'danger'
                : group === 'closed'
                  ? 'neutral'
                  : 'success'
            }
          >
            {group === 'closed'
              ? 'Closed'
              : group === 'overdue'
                ? 'Past due'
                : 'Open'}
          </StatusPill>
        </span>
      </div>

      <Facts
        facts={[
          { label: 'Done', value: counts.done },
          { label: 'Started', value: counts.started },
          { label: 'Not yet', value: counts.notStarted },
        ]}
      />
      <ProgressBar counts={counts} />
      <p className={cn(TYPE_CLASS.label, 'px-0.5 text-daw-text-3')}>
        {countResponses(assignmentId)} responses so far
        {counts.total === 0 ? ' · no students on the roster yet' : ''}
      </p>

      {assignment.instructions && (
        <InspectorSection title="Instructions">
          <p
            className={cn(
              TYPE_CLASS.body,
              'whitespace-pre-wrap px-0.5 text-daw-text-2',
            )}
          >
            {assignment.instructions}
          </p>
        </InspectorSection>
      )}

      <div className="flex flex-col gap-2">
        <Button asChild variant="primary" size="lg">
          <Link
            to={TeacherRoutes.assignmentProgress({ classroomId, assignmentId })}
          >
            <BarChart3 aria-hidden />
            Full progress
          </Link>
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild size="lg">
            <Link to={studentView}>
              <ExternalLink aria-hidden />
              Student view
            </Link>
          </Button>
          <Button
            size="lg"
            disabled={!canEdit || assignment.status === 'closed'}
            title={
              assignment.status === 'closed'
                ? 'Already closed'
                : canEdit
                  ? 'Students can no longer turn it in'
                  : 'Viewers cannot close assignments'
            }
            onClick={() => void closeAssignment(assignmentId).catch(() => {})}
          >
            <Lock aria-hidden />
            Close
          </Button>
        </div>
      </div>
    </InspectorBody>
  );
};
