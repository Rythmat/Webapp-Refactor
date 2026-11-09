import { ArrowLeft, ClipboardList, Eye, Hourglass } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MicroLabel } from '@/components/kit';
import { cn } from '@/components/utilities';
import { ClassroomRoutes, TeacherRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { IdCover } from '@/features/office/ui/ClassCover';
import {
  OFFICE_CARD,
  OFFICE_PAGE,
  OFFICE_PAGE_TITLE,
  OFFICE_SECTION_TITLE,
} from '@/features/office/ui/styles';
import { useClassroom, useIsClassroomOwner, useMe } from '@/hooks/data';
import { useStudentEnrollmentId } from '../assignments/useAssignmentProgress';
import { useAssignments } from '../assignments/useAssignments';
import { useEnrollments } from '../enrollments';
import { useClassroomLiveSession } from '../live/useClassroomLiveSession';
import { LiveNowBanner } from './LiveNowBanner';
import { StudentAssignmentCard } from './StudentAssignmentCard';

const GRID =
  'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]';

/**
 * A student's class (owner, 2026-11-09), in Learn's look: the class's cover
 * and name, the live session when there is one, and their assignments as
 * cards — what's open, then what's closed. A teacher opening their own class
 * here (`?viewAs=student`) sees exactly this, with a way back to the Office.
 */
export const StudentClassPage = () => {
  const { classroomId = '' } = useParams<{ classroomId: string }>();
  const [params] = useSearchParams();
  const { data: classroom, isLoading, error } = useClassroom(classroomId);
  const { data: me } = useMe();
  const { myEnrollment } = useEnrollments(classroomId);
  const { assignments, isLoading: assignmentsLoading } =
    useAssignments(classroomId);
  const enrollmentId = useStudentEnrollmentId(classroomId);
  const live = useClassroomLiveSession(classroomId);
  const isOwner = useIsClassroomOwner(classroomId);
  const previewing = isOwner && params.get('viewAs') === 'student';

  if (error) {
    return (
      <div className={OFFICE_PAGE}>
        <div className={OFFICE_CARD}>
          <EmptyState
            className="py-16"
            titleAs="h2"
            title="This class isn't available"
            description="The link may be wrong, or you may not be in this class yet."
            actions={
              <Button asChild variant="primary" size="lg">
                <Link to={ClassroomRoutes.picker()}>Your classes</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const open = assignments.filter((a) => a.status === 'open');
  const closed = assignments.filter((a) => a.status === 'closed');
  const pending = me?.role === 'student' && myEnrollment?.status === 'pending';

  return (
    <div className={OFFICE_PAGE}>
      <Link
        to={
          isOwner && !previewing
            ? TeacherRoutes.classroomDashboard({ classroomId })
            : ClassroomRoutes.picker()
        }
        className="inline-flex w-fit items-center gap-1.5 text-[0.8125rem] text-daw-text-3 hover:text-daw-text"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        {isOwner && !previewing ? 'Office' : 'Your classes'}
      </Link>

      {previewing && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3"
        >
          <span className="inline-flex items-center gap-2 text-[0.875rem] text-daw-text-2">
            <Eye aria-hidden className="size-4" />
            You're seeing this class as a student does.
          </span>
          <Button asChild size="lg">
            <Link to={TeacherRoutes.classroomDashboard({ classroomId })}>
              Back to the Office
            </Link>
          </Button>
        </div>
      )}

      <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <IdCover id={classroomId} className="w-24 rounded-2xl sm:w-32" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <MicroLabel>Class</MicroLabel>
          <h1 className={cn(OFFICE_PAGE_TITLE, 'truncate')}>
            {isLoading ? ' ' : classroom?.name}
          </h1>
          {classroom?.description && (
            <p className="line-clamp-2 max-w-[60ch] text-[0.875rem] text-daw-text-2">
              {classroom.description}
            </p>
          )}
        </div>
      </header>

      {live && (
        <LiveNowBanner classroomId={classroomId} sessionId={live.sessionId} />
      )}

      {pending && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-[1.25rem] border border-amber-300/25 bg-amber-300/[0.06] px-4 py-3 text-[0.875rem] text-amber-100"
        >
          <Hourglass aria-hidden className="size-4 shrink-0" />
          Your teacher hasn't let you in yet. You can look around; assignments
          open once they do.
        </div>
      )}

      <section aria-label="Your assignments" className="flex flex-col gap-4">
        <h2 className={OFFICE_SECTION_TITLE}>
          Open <span className="text-daw-text-3">{open.length || ''}</span>
        </h2>
        {assignmentsLoading && open.length === 0 ? (
          <div aria-busy className={cn(OFFICE_CARD, 'h-40 animate-pulse')} />
        ) : open.length === 0 ? (
          <div className={OFFICE_CARD}>
            <EmptyState
              className="py-12"
              icon={<ClipboardList />}
              title="Nothing to do right now"
              description="When your teacher assigns something, it shows up here."
            />
          </div>
        ) : (
          <ul className={GRID}>
            {open.map((a) => (
              <li key={a.id}>
                <StudentAssignmentCard
                  classroomId={classroomId}
                  assignment={a}
                  enrollmentId={enrollmentId}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <section aria-label="Closed" className="flex flex-col gap-4">
          <h2 className={OFFICE_SECTION_TITLE}>
            Closed <span className="text-daw-text-3">{closed.length}</span>
          </h2>
          <ul className={GRID}>
            {closed.map((a) => (
              <li key={a.id}>
                <StudentAssignmentCard
                  classroomId={classroomId}
                  assignment={a}
                  enrollmentId={enrollmentId}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
