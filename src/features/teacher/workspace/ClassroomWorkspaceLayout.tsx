/**
 * ClassroomWorkspaceLayout — the tabbed workspace shell for a single classroom
 * (`/teacher/classroom/:classroomId`). Renders the inline tab bar
 * (Overview · Classwork · Calendar · People · Grades — mirrors the
 * Learn/Studio/Globe/Arcade dashboards), then the active tab page into its
 * <Outlet/>. The Calendar tab is the Annual Plan (`/plan/annual`). The class
 * name, join code, and Customize action live inside the tab bar itself.
 *
 * Owns the ownership guard for all five tabs (moved here from
 * TeacherDashboardPage). Deeper pages (plan, the Annual Plan's Unit page,
 * present, sessions, assignment progress) are registered as route SIBLINGS, not
 * under this layout, so they render chrome-free.
 */
import { Suspense } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { useClassroomRole } from '@/hooks/data';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomTabBar } from './ClassroomTabBar';
import { ReadOnlyBanner } from './ReadOnlyBanner';

export const ClassroomWorkspaceLayout = () => {
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

  // Guard: URL tampering, or a classroom this teacher has no role in. Bounce
  // back to `/teacher` so the landing decides where they should be. Protects
  // all five tab pages at once.
  // Only bounce on a CONFIDENT "no". A failed `/classrooms` request also
  // yields role === null, and ejecting a teacher from their own classroom on a
  // transient network error is far worse than briefly showing a classroom they
  // turn out not to have access to.
  if (isRoleResolved && cid && !canOpenThisClassroom) {
    return <Navigate to={TeacherRoutes.root()} replace />;
  }

  return (
    <div className="flex w-full flex-col gap-8 px-6 pt-4 pb-6 md:gap-10 md:px-10 md:pb-10">
      <ClassroomTabBar classroomId={cid} />
      <ReadOnlyBanner
        role={role === 'viewer' ? 'viewer' : null}
        degraded={isDegraded}
      />

      <Suspense fallback={<DashboardContentSkeleton />}>
        <Outlet />
      </Suspense>
    </div>
  );
};
