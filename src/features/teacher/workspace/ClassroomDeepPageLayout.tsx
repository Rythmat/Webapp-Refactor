/**
 * ClassroomDeepPageLayout — puts the classroom navigation tab bar above a "deep"
 * teacher page (Plan Days, Day editor, Reports, Assignment progress, the live
 * session dashboard, etc.) so navigation stays consistent across the whole
 * classroom workspace.
 *
 * Unlike ClassroomWorkspaceLayout (which also supplies the content column the
 * five header-free tab pages rely on), this layout renders ONLY the tab-bar
 * strip and then the page's own `<Outlet/>` — each deep page keeps its own
 * container/max-width/back-link below the tabs. Full-screen projected surfaces
 * (Presentation Mode, Projector) are intentionally NOT wrapped by this layout.
 *
 * Mirrors the workspace layout's ownership guard so the tab bar renders
 * identically and the deep pages are protected too.
 */
import { Suspense } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useClassroomRole } from '@/hooks/data';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomTabBar } from './ClassroomTabBar';
import { ReadOnlyBanner } from './ReadOnlyBanner';

export const ClassroomDeepPageLayout = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = classroomId ?? '';
  // ROLE, not ownership. The old check was `classroom.teacherId === me.id`,
  // which bounced an accepted co-teacher straight back out of the classroom
  // they had just been invited into.
  const {
    role,
    isResolved: isRoleResolved,
    isDegraded,
  } = useClassroomRole(cid);
  const canOpenThisClassroom = role !== null;

  // Same guard as ClassroomWorkspaceLayout: bounce URL tampering / a classroom
  // this teacher has no role in back to the teacher landing.
  // Only bounce on a CONFIDENT "no". A failed `/classrooms` request also
  // yields role === null, and ejecting a teacher from their own classroom on a
  // transient network error is far worse than briefly showing a classroom they
  // turn out not to have access to.
  if (isRoleResolved && cid && !canOpenThisClassroom) {
    return <Navigate to={TeacherRoutes.root()} replace />;
  }

  return (
    <div className="flex w-full flex-col">
      <div className="px-6 pt-4 md:px-10">
        <ClassroomTabBar classroomId={cid} />
        <ReadOnlyBanner
          role={role === 'viewer' ? 'viewer' : null}
          degraded={isDegraded}
        />
      </div>

      <Suspense fallback={<DashboardContentSkeleton />}>
        <Outlet />
      </Suspense>
    </div>
  );
};
