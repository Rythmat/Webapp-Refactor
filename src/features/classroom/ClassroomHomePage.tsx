import {
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Eye,
  Radio,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ClassroomLayout } from '@/components/ClassroomLayout/ClassroomLayout';
import { ClassroomRoutes, TeacherRoutes } from '@/constants/routes';
import { useClassroom, useClassrooms, useMe } from '@/hooks/data';
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
  const canManage = user?.role !== 'student' && isOwner && !previewAsStudent;

  const isLoading = isClassroomLoading || isUserLoading;
  const isError = classroomError || userError;

  const back = useMemo(() => {
    if (previewAsStudent) {
      return { label: 'All classrooms', to: ClassroomRoutes.picker() };
    }
    if (canManage) {
      return { label: 'All classrooms', to: TeacherRoutes.root() };
    }
    return { label: 'All classrooms', to: ClassroomRoutes.picker() };
  }, [canManage, previewAsStudent]);

  const exitPreviewHref = classroomId
    ? ClassroomRoutes.home({ classroomId })
    : ClassroomRoutes.picker();

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
        {canManage && classroomId && (
          <Link
            to={ClassroomRoutes.plan({ classroomId })}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
          >
            <CalendarDays className="h-4 w-4" />
            Plan Days
          </Link>
        )}
        {classroomId && (
          <Link
            to={ClassroomRoutes.assignments({ classroomId })}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            <ClipboardList className="h-4 w-4" />
            Assignments
          </Link>
        )}
        {canManage && classroomId && (
          <Link
            to={ClassroomRoutes.reports({ classroomId })}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            <ClipboardCheck className="h-4 w-4" />
            Reports
          </Link>
        )}
        {canManage && classroomId && (
          <Link
            to={TeacherRoutes.students({ classroomId })}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            <Users className="h-4 w-4" />
            Students
          </Link>
        )}
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
    </ClassroomLayout>
  );
};
