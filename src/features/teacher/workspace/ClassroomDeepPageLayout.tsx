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
import { useClassrooms, useMe } from '@/hooks/data';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomTabBar } from './ClassroomTabBar';

export const ClassroomDeepPageLayout = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = classroomId ?? '';
  const { data: me } = useMe();
  const { data: allClassrooms = [], isLoading: isClassroomsLoading } =
    useClassrooms();

  const owned = me?.id
    ? allClassrooms.filter((c) => c.teacherId === me.id)
    : [];
  const ownsThisClassroom = owned.some((c) => c.id === cid);

  // Same guard as ClassroomWorkspaceLayout: bounce URL tampering / a classroom
  // the teacher no longer owns back to the teacher landing.
  if (!isClassroomsLoading && me?.id && cid && !ownsThisClassroom) {
    return <Navigate to={TeacherRoutes.root()} replace />;
  }

  return (
    <div className="flex w-full flex-col">
      <div className="px-6 pt-4 md:px-10">
        <ClassroomTabBar classroomId={cid} />
      </div>

      <Suspense fallback={<DashboardContentSkeleton />}>
        <Outlet />
      </Suspense>
    </div>
  );
};
