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
import { useClassrooms, useMe } from '@/hooks/data';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomTabBar } from './ClassroomTabBar';

export const ClassroomWorkspaceLayout = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = classroomId ?? '';
  const { data: me } = useMe();
  const { data: allClassrooms = [], isLoading: isClassroomsLoading } =
    useClassrooms();

  const owned = me?.id
    ? allClassrooms.filter((c) => c.teacherId === me.id)
    : [];
  const ownsThisClassroom = owned.some((c) => c.id === cid);

  // Guard: URL tampering or a classroom the teacher no longer owns. Bounce back
  // to `/teacher` so the landing decides where they should be. Protects all
  // five tab pages at once.
  if (!isClassroomsLoading && me?.id && cid && !ownsThisClassroom) {
    return <Navigate to={TeacherRoutes.root()} replace />;
  }

  return (
    <div className="flex w-full flex-col gap-8 px-6 pt-4 pb-6 md:gap-10 md:px-10 md:pb-10">
      <ClassroomTabBar classroomId={cid} />

      <Suspense fallback={<DashboardContentSkeleton />}>
        <Outlet />
      </Suspense>
    </div>
  );
};
