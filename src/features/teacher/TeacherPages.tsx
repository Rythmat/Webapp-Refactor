import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router';
import { TeacherRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { ClassroomDashboard } from '@/layouts/DashboardLayout/ClassroomDashboard';

const ClassroomSelectionPage = lazy(() =>
  import('./ClassroomSelectionPage').then(({ ClassroomSelectionPage }) => ({
    default: ClassroomSelectionPage,
  })),
);

const ClassroomStudentsPage = lazy(() =>
  import('./ClassroomStudentsPage').then(({ ClassroomStudentsPage }) => ({
    default: ClassroomStudentsPage,
  })),
);

export const teacherPages = () => {
  return {
    path: TeacherRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage teacherOnly>
          <Suspense>
            <Outlet />
          </Suspense>
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      // Both /teacher (index) and /teacher/classroom/:id/students share the
      // ClassroomDashboard chrome (ClassroomSidebar + TopRail) so the teacher
      // Manage page matches every other classroom surface.
      {
        path: TeacherRoutes.root.definition,
        element: <ClassroomDashboard fallback={<DashboardContentSkeleton />} />,
        children: [
          {
            index: true,
            element: <ClassroomSelectionPage />,
          },
          {
            path: TeacherRoutes.students.definition,
            element: <ClassroomStudentsPage />,
          },
        ],
      },
    ],
  };
};
