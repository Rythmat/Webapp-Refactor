import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import {
  DashboardLayout,
  DashboardContentSkeleton,
} from '@/layouts/DashboardLayout';

const AdminUsersPage = lazy(() =>
  import('./AdminUsersPage').then(({ AdminUsersPage }) => ({
    default: AdminUsersPage,
  })),
);

const AdminFreeAccessPage = lazy(() =>
  import('./AdminFreeAccessPage').then(({ AdminFreeAccessPage }) => ({
    default: AdminFreeAccessPage,
  })),
);

export const adminPages = () => {
  return {
    path: AdminRoutes.root.definition,
    element: (
      <AppContext>
        <ProtectedPage adminOnly>
          <DashboardLayout fallback={<DashboardContentSkeleton />} />
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      {
        path: AdminRoutes.root.definition,
        element: <Navigate to={AdminRoutes.users()} />,
      },
      {
        path: AdminRoutes.users.definition,
        element: <AdminUsersPage />,
      },
      {
        path: AdminRoutes.freeAccess.definition,
        element: <AdminFreeAccessPage />,
      },
      {
        path: '*',
        element: <Navigate to={AdminRoutes.users()} />,
      },
    ],
  };
};
