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

const AdminTelemetryLayout = lazy(() =>
  import('./telemetry/AdminTelemetryLayout').then(
    ({ AdminTelemetryLayout }) => ({
      default: AdminTelemetryLayout,
    }),
  ),
);

const AdminTelemetryOverviewPage = lazy(() =>
  import('./telemetry/AdminTelemetryOverviewPage').then(
    ({ AdminTelemetryOverviewPage }) => ({
      default: AdminTelemetryOverviewPage,
    }),
  ),
);

const AdminApiPerformancePage = lazy(() =>
  import('./telemetry/AdminApiPerformancePage').then(
    ({ AdminApiPerformancePage }) => ({
      default: AdminApiPerformancePage,
    }),
  ),
);

const AdminRoutingPage = lazy(() =>
  import('./telemetry/AdminRoutingPage').then(({ AdminRoutingPage }) => ({
    default: AdminRoutingPage,
  })),
);

const AdminAudioPage = lazy(() =>
  import('./telemetry/AdminAudioPage').then(({ AdminAudioPage }) => ({
    default: AdminAudioPage,
  })),
);

const AdminProductFunnelPage = lazy(() =>
  import('./telemetry/AdminProductFunnelPage').then(
    ({ AdminProductFunnelPage }) => ({
      default: AdminProductFunnelPage,
    }),
  ),
);

const AdminErrorsPage = lazy(() =>
  import('./telemetry/AdminErrorsPage').then(({ AdminErrorsPage }) => ({
    default: AdminErrorsPage,
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
        path: AdminRoutes.telemetry.definition,
        element: <AdminTelemetryLayout />,
        children: [
          {
            index: true,
            element: <AdminTelemetryOverviewPage />,
          },
          {
            path: 'api',
            element: <AdminApiPerformancePage />,
          },
          {
            path: 'routing',
            element: <AdminRoutingPage />,
          },
          {
            path: 'audio',
            element: <AdminAudioPage />,
          },
          {
            path: 'product',
            element: <AdminProductFunnelPage />,
          },
          {
            path: 'errors',
            element: <AdminErrorsPage />,
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to={AdminRoutes.users()} />,
      },
    ],
  };
};
