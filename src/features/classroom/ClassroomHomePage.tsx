/**
 * ClassroomHomePage — the **student-facing** classroom home at `/classrooms/:cid`.
 *
 * As of the Teacher Dashboard sprint, all teacher management (Plan Days,
 * Assignments authoring, Reports, Roster, Annual Plan) moved to `/teacher`.
 * Teachers can still open a classroom as a student via `?viewAs=student`
 * from the classroom picker — this page shows exactly what a student sees.
 */
import { ClipboardList, Eye, Radio } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ClassroomLayout } from '@/components/ClassroomLayout/ClassroomLayout';
import { ClassroomRoutes, TeacherRoutes } from '@/constants/routes';
import { useClassroom, useClassrooms, useMe } from '@/hooks/data';
import { useAssignments } from './assignments/useAssignments';
import { useEnrollments } from './enrollments';
import { useLocalSessionStore } from './live/useLocalSessionStore';

export const ClassroomHomePage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();

  const {
    data: classroom,
    isLoading: isClassroomLoading,
    error: classroomError,
  } = useClassroom(classroomId);

  const { data: user, isLoading: isUserLoading, error: userError } = useMe();
  const { data: allClassrooms } = useClassrooms();
  const { myEnrollment } = useEnrollments(classroomId ?? '');
  const myStatus = myEnrollment?.status;
  const { assignments } = useAssignments(classroomId ?? '');
  const { getActiveSessionForClassroom } = useLocalSessionStore();
  const activeSession = classroomId
    ? getActiveSessionForClassroom(classroomId)
    : undefined;
  const [searchParams] = useSearchParams();
  const previewAsStudent = searchParams.get('viewAs') === 'student';

  const ownerRow = allClassrooms?.find((c) => c.id === classroomId);
  const isOwner = Boolean(
    user?.id && ownerRow && ownerRow.teacherId === user.id,
  );

  const isLoading = isClassroomLoading || isUserLoading;
  const isError = classroomError || userError;

  const back = useMemo(() => {
    if (isOwner && !previewAsStudent) {
      return { label: 'Dashboard', to: TeacherRoutes.root() };
    }
    return { label: 'All classrooms', to: ClassroomRoutes.picker() };
  }, [isOwner, previewAsStudent]);

  const exitPreviewHref = classroomId
    ? ClassroomRoutes.home({ classroomId })
    : ClassroomRoutes.picker();

  const openAssignments = assignments.filter((a) => a.status === 'open');

  return (
    <ClassroomLayout
      back={back}
      classroomId={classroomId}
      isEmpty={false}
      isLoading={isLoading}
      isNotFound={!!isError}
    >
      {user?.role === 'student' && myStatus === 'pending' && (
        <div
          role="status"
          className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          Waiting for teacher approval — you can view the classroom but
          assignments will unlock once your teacher approves you.
        </div>
      )}
      {previewAsStudent && isOwner && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.05] px-4 py-3 text-sm text-amber-100"
        >
          <span className="inline-flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Previewing as student — teacher tools are hidden.
          </span>
          <Link
            to={exitPreviewHref}
            className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 px-3 py-1 text-xs text-amber-100 transition-colors hover:border-amber-300 hover:text-amber-50"
          >
            Exit preview
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-medium leading-tight text-white md:text-5xl">
            {classroom?.name}
          </h1>
          {classroom?.description && (
            <p className="text-base text-white/60">{classroom.description}</p>
          )}
        </div>
        {classroomId && activeSession && (
          <Link
            to={ClassroomRoutes.live({
              classroomId,
              sessionId: activeSession.sessionId,
            })}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/[0.08] px-4 py-2 text-sm text-emerald-200 transition-colors hover:border-emerald-400 hover:text-emerald-100"
          >
            <Radio className="h-4 w-4" />
            Join Live Session
          </Link>
        )}
      </div>

      {classroomId && (
        <section className="mt-6 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs uppercase tracking-wider text-white/40">
              Your Assignments
            </h2>
            <Link
              to={ClassroomRoutes.assignments({ classroomId })}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 transition-colors hover:border-white/25 hover:text-white"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              All assignments
            </Link>
          </div>
          {openAssignments.length === 0 ? (
            <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-sm text-white/50">
              Nothing to do right now — your teacher will post assignments here
              when they're ready.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {openAssignments.slice(0, 6).map((a) => {
                const to =
                  a.kind === 'instructions'
                    ? ClassroomRoutes.assignmentInstructions({
                        classroomId,
                        assignmentId: a.id,
                      })
                    : ClassroomRoutes.assignmentDayRun({
                        classroomId,
                        assignmentId: a.id,
                      });
                return (
                  <li
                    key={a.id}
                    className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <span className="text-xs uppercase tracking-wide text-white/40">
                      {a.kind}
                    </span>
                    <Link
                      to={to}
                      className="text-base font-medium text-white hover:underline"
                    >
                      {a.title}
                    </Link>
                    {a.dueAt && (
                      <p className="text-xs text-white/50">
                        Due {new Date(a.dueAt).toLocaleDateString()}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </ClassroomLayout>
  );
};
