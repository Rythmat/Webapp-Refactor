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
      {
        index: true,
        element: <ClassroomSelectionPage />,
      },
      // Teacher management pages
      {
        path: TeacherRoutes.root.definition,
        element: <DashboardLayout fallback={<DashboardContentSkeleton />} />,
        children: [
          {
            path: TeacherRoutes.students.definition,
            element: <ClassroomStudentsPage />,
          },
        ],
      },
    ],
  };
};
