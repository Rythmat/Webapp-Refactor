import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router';
import { TeacherRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import {
  DashboardContentSkeleton,
  DashboardLayout,
} from '@/layouts/DashboardLayout';

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
      // same DashboardLayout chrome — persistent sidebar + TopRail — so the
      // teacher landing feels like every other authenticated app surface.
      {
        path: TeacherRoutes.root.definition,
        element: <DashboardLayout fallback={<DashboardContentSkeleton />} />,
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
