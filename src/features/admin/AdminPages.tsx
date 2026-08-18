import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  DashboardLayout,
  DashboardContentSkeleton,
} from '@/layouts/DashboardLayout';
import { consoleHomeRoute, isConsoleAdmin } from './consoleRoles';

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

const AdminDatabasePage = lazy(() =>
  import('./telemetry/AdminDatabasePage').then(({ AdminDatabasePage }) => ({
    default: AdminDatabasePage,
  })),
);

const AdminContentListPage = lazy(() =>
  import('./content/AdminContentListPage').then(({ AdminContentListPage }) => ({
    default: AdminContentListPage,
  })),
);

const AdminContentEditPage = lazy(() =>
  import('./content/AdminContentEditPage').then(({ AdminContentEditPage }) => ({
    default: AdminContentEditPage,
  })),
);

const AdminLessonCoursePage = lazy(() =>
  import('./content/lessons/AdminLessonCoursePage').then(
    ({ AdminLessonCoursePage }) => ({
      default: AdminLessonCoursePage,
    }),
  ),
);

const AdminReleasesPage = lazy(() =>
  import('./content/AdminReleasesPage').then(({ AdminReleasesPage }) => ({
    default: AdminReleasesPage,
  })),
);

/**
 * Send a console user to the landing page their role can actually open.
 *
 * Both the /console index and the in-console catch-all used to point at the
 * Users page unconditionally, which for an editor is a redirect into a page
 * AdminOnly bounces them out of — i.e. a loop out of the console entirely.
 */
const ConsoleHome = () => {
  const { role } = useAuthContext();
  return <Navigate replace to={consoleHomeRoute(role)} />;
};

/**
 * Wrap an admin-only page inside the console.
 *
 * The outer ProtectedPage admits editors, because the Content tab lives on the
 * same route tree. Everything an editor must not reach is wrapped here instead
 * of relying on the nav simply not linking to it — a typed URL has to fail too.
 */
const AdminOnly = ({ children }: { children: React.ReactNode }) => {
  const { role } = useAuthContext();
  if (!isConsoleAdmin(role))
    return <Navigate replace to={consoleHomeRoute(role)} />;
  return <>{children}</>;
};

export const adminPages = () => {
  return {
    path: AdminRoutes.root.definition,
    element: (
      <AppContext>
        {/* Admits admins and content editors; the routes below narrow it. */}
        <ProtectedPage adminOnly>
          <DashboardLayout fallback={<DashboardContentSkeleton />} />
        </ProtectedPage>
      </AppContext>
    ),
    children: [
      {
        path: AdminRoutes.root.definition,
        element: <ConsoleHome />,
      },
      {
        path: AdminRoutes.users.definition,
        element: (
          <AdminOnly>
            <AdminUsersPage />
          </AdminOnly>
        ),
      },
      {
        path: AdminRoutes.freeAccess.definition,
        element: (
          <AdminOnly>
            <AdminFreeAccessPage />
          </AdminOnly>
        ),
      },
      {
        path: AdminRoutes.telemetry.definition,
        element: (
          <AdminOnly>
            <AdminTelemetryLayout />
          </AdminOnly>
        ),
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
          {
            path: 'database',
            element: <AdminDatabasePage />,
          },
        ],
      },
      {
        path: AdminRoutes.content.definition,
        element: (
          <Navigate to={AdminRoutes.contentKind({ kind: 'activity_flow' })} />
        ),
      },
      {
        path: AdminRoutes.contentKind.definition,
        element: <AdminContentListPage />,
      },
      {
        path: AdminRoutes.contentItem.definition,
        element: <AdminContentEditPage />,
      },
      {
        path: AdminRoutes.lessonCourse.definition,
        element: <AdminLessonCoursePage />,
      },
      {
        path: AdminRoutes.releases.definition,
        element: (
          <AdminOnly>
            <AdminReleasesPage />
          </AdminOnly>
        ),
      },
      {
        path: '*',
        element: <ConsoleHome />,
      },
    ],
  };
};
