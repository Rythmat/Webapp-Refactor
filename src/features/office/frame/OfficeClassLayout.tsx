import { Suspense } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { OfficeRoutes } from '@/constants/routes';
import { ReadOnlyBanner } from '@/features/teacher/workspace/ReadOnlyBanner';
import { useClassroomRole } from '@/hooks/data';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';

/**
 * Every page of one class, behind one guard. It checks the ROLE, not
 * ownership: an accepted co-teacher must get in. It only bounces on a
 * CONFIDENT "no" — a failed `/classrooms` request also yields role === null,
 * and ejecting a teacher from their own class on a network blip is far worse
 * than briefly showing a class they turn out not to have. A viewer, or a
 * role that couldn't be confirmed, is told so above the page.
 */
export const OfficeClassLayout = () => {
  const { classroomId = '' } = useParams<{ classroomId: string }>();
  const { role, isResolved, isDegraded } = useClassroomRole(classroomId);

  if (isResolved && classroomId && role === null) {
    return <Navigate to={OfficeRoutes.root()} replace />;
  }

  const banner = role === 'viewer' || isDegraded;
  return (
    <>
      {banner && (
        <div className="px-4 pt-4 md:px-8">
          <ReadOnlyBanner
            role={role === 'viewer' ? 'viewer' : null}
            degraded={isDegraded}
          />
        </div>
      )}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <Outlet />
      </Suspense>
    </>
  );
};
