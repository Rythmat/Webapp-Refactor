import { lazy } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { AppContext } from '@/contexts/AppContext';
import { ProtectedPage } from '@/contexts/AuthContext';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import {
  ConsolePage,
  DashboardLayout,
  DashboardContentSkeleton,
} from '@/layouts/DashboardLayout';
import { consoleHomeRoute, isConsoleAdmin } from './consoleRoles';
import { ContentAreaLayout } from './content/ContentAreaLayout';
import { GuardOutlet } from './content/mirror/UnsavedChangesGuard';
import { LEGACY_KIND_SEGMENTS } from './content/mirror/mirrorPaths';
// The Table's ids only, which are tiny and eager-safe (eagerBoundary.test.ts):
// its pages, model and bar stay in its own lazy chunks.
import { TABLE_FOR_CONTENT_KIND, type TableId } from './table/tableIds';

const AdminUsersPage = lazy(() =>
  import('./AdminUsersPage').then(({ AdminUsersPage }) => ({
    default: AdminUsersPage,
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

const AdminVocabularyPage = lazy(() =>
  import('./content/AdminVocabularyPage').then(({ AdminVocabularyPage }) => ({
    default: AdminVocabularyPage,
  })),
);

const AdminSongImportPage = lazy(() =>
  import('./content/songImport/AdminSongImportPage').then(
    ({ AdminSongImportPage }) => ({ default: AdminSongImportPage }),
  ),
);

// Cortex's graph pages carry the whole repo's content in their chunk
// (charts, events, the Teach year); they load only when opened.
const MindMapPage = lazy(() =>
  import('./content/graph/MindMapPage').then(({ MindMapPage }) => ({
    default: MindMapPage,
  })),
);

const IntegrityPage = lazy(() =>
  import('./content/graph/IntegrityPage').then(({ IntegrityPage }) => ({
    default: IntegrityPage,
  })),
);

const LegacyLinkPage = lazy(() =>
  import('./content/graph/LegacyLinkPage').then(({ LegacyLinkPage }) => ({
    default: LegacyLinkPage,
  })),
);

// Tesseract, the map of progression openings, brings the same renderer and
// the opening trees; it loads only when its pill is opened.
const TesseractPage = lazy(() =>
  import('./content/graph/tesseract/TesseractPage').then(
    ({ TesseractPage }) => ({ default: TesseractPage }),
  ),
);

const ConsoleMirrorShell = lazy(() =>
  import('./content/mirror/ConsoleMirrorShell').then(
    ({ ConsoleMirrorShell }) => ({ default: ConsoleMirrorShell }),
  ),
);

// The Cortex section's layout (TableLayout, with its bar) and the Table's
// pages load only when they are opened. Only their route constants and
// tablePaths.ts may be eager (eagerBoundary.test.ts).
const TableLayout = lazy(() =>
  import('./table/TableLayout').then(({ TableLayout }) => ({
    default: TableLayout,
  })),
);

const TablePage = lazy(() =>
  import('./table/TablePage').then(({ TablePage }) => ({
    default: TablePage,
  })),
);

/**
 * The table a content kind's records now live in, for the eight kinds that
 * are categories of the Table; null for the rest (lessons, fundamentals,
 * artist locations) and for anything that is not a kind. Own keys only, so
 * a URL spelling `constructor` is not a kind.
 */
const tableForKind = (kind: string | undefined): TableId | null =>
  kind !== undefined &&
  Object.prototype.hasOwnProperty.call(TABLE_FOR_CONTENT_KIND, kind)
    ? (TABLE_FOR_CONTENT_KIND[kind as ContentKind] ?? null)
    : null;

/**
 * A table's URL, keeping the search a list was asked with. Only `?q` means
 * the same thing in the Table; anything else was the old list's.
 */
const tableSearching = (table: TableId, search: string): string =>
  AdminRoutes.tableList(
    { table },
    { q: new URLSearchParams(search).get('q') || undefined },
  );

/**
 * The six kinds' tables used to live at /console/content/<kind>; that prefix
 * now mirrors the app, so their old links (bookmarks, review notes) land on
 * the tables' new home with their search: a kind the Table holds goes
 * straight to its table, in one hop; the others to their list under "Other
 * records". An item's link still opens its full editor.
 */
const LegacyKindRedirect = ({ kind }: { kind: string }) => {
  const { search } = useLocation();
  const { id } = useParams();
  const table = id ? null : tableForKind(kind);
  if (table) return <Navigate replace to={tableSearching(table, search)} />;
  const to = id
    ? AdminRoutes.contentItem({ kind, id })
    : AdminRoutes.contentKind({ kind });
  return <Navigate replace to={`${to}${search}`} />;
};

/**
 * `records/:kind`, the content area's per-kind lists. The eight kinds that
 * are categories now live in the Table, so their lists redirect there,
 * keeping the search (a review note's "records/song?q=Africa" lands on the
 * songs table searching Africa). Lessons, fundamentals and artist locations
 * stay here, as "Other records"; the list page sends anything else to the
 * Table. `records/:kind/:id`, the full editor, is untouched.
 */
const RecordsKindRoute = () => {
  const { kind } = useParams();
  const { search } = useLocation();
  const table = tableForKind(kind);
  if (table) return <Navigate replace to={tableSearching(table, search)} />;
  return <AdminContentListPage />;
};

/** An old console URL → where that page lives now, keeping its search. */
const MovedTo = ({ to }: { to: string }) => {
  const { search } = useLocation();
  return <Navigate replace to={`${to}${search}`} />;
};

/**
 * The graph's old home, /console/content/graph and everything under it →
 * the same page in Cortex, its new home: the map, a row open beside it,
 * Integrity or Links. The rest of the path is carried over as it was
 * written (still encoded), and so are the query and the hash, so a
 * bookmarked local graph or a review note's row opens as it was left.
 */
const LegacyGraphRedirect = () => {
  const { pathname, search, hash } = useLocation();
  const rest = pathname.slice(AdminRoutes.legacyGraph().length);
  return (
    <Navigate replace to={`${AdminRoutes.cortex()}${rest}${search}${hash}`} />
  );
};

/**
 * The Recording pill's name typed as a URL, which names no table of its
 * own → the table it opens on, keeping any row and search, like the
 * console's other redirects.
 */
const TableRedirect = ({ table }: { table: TableId }) => {
  const { search } = useLocation();
  const { row } = useParams();
  const to = row
    ? AdminRoutes.tableRow({ table, row })
    : AdminRoutes.tableList({ table });
  return <Navigate replace to={`${to}${search}`} />;
};

// Publishing: one layout, its tabs lazy with it.
const PublishingLayout = lazy(() =>
  import('./content/publishing/PublishingLayout').then(
    ({ PublishingLayout }) => ({ default: PublishingLayout }),
  ),
);

const PublishingOverview = lazy(() =>
  import('./content/publishing/PublishingOverview').then(
    ({ PublishingOverview }) => ({ default: PublishingOverview }),
  ),
);

const PublishHistorySection = lazy(() =>
  import('./content/publishing/PublishHistorySection').then(
    ({ PublishHistorySection }) => ({ default: PublishHistorySection }),
  ),
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
        // Console pages: the padded, scrolling frame.
        element: <ConsolePage />,
        children: [
          {
            path: AdminRoutes.users.definition,
            element: (
              <AdminOnly>
                <AdminUsersPage />
              </AdminOnly>
            ),
          },
          {
            // Insider access is managed in the Users table now; old links and
            // bookmarks land on it filtered to insider access.
            path: AdminRoutes.freeAccess.definition,
            element: (
              <AdminOnly>
                <Navigate
                  replace
                  to={AdminRoutes.users(undefined, {
                    subscription: 'insider_access',
                  })}
                />
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
              { index: true, element: <AdminTelemetryOverviewPage /> },
              { path: 'api', element: <AdminApiPerformancePage /> },
              { path: 'routing', element: <AdminRoutingPage /> },
              { path: 'audio', element: <AdminAudioPage /> },
              { path: 'product', element: <AdminProductFunnelPage /> },
              { path: 'errors', element: <AdminErrorsPage /> },
              { path: 'database', element: <AdminDatabasePage /> },
            ],
          },
        ],
      },
      // Pages that moved into the content area; old links keep working.
      {
        path: `${AdminRoutes.root()}/releases`,
        element: <MovedTo to={AdminRoutes.contentPublishing()} />,
      },
      {
        path: `${AdminRoutes.root()}/import-songs`,
        element: <MovedTo to={AdminRoutes.contentPublishingImport()} />,
      },
      {
        path: `${AdminRoutes.root()}/vocabulary`,
        element: <MovedTo to={AdminRoutes.contentVocabulary()} />,
      },
      {
        // The graph moved out of the content area into Cortex (owner, 1 Oct
        // 2026). More specific than the mirror's `content/*`, so it wins;
        // the splat matches the bare /console/content/graph too.
        path: `${AdminRoutes.legacyGraph.definition}/*`,
        element: <LegacyGraphRedirect />,
      },
      {
        // One unsaved-changes guard over the content area and Cortex (the
        // graph and the Table), so a way out of either — the sidebar, a bar,
        // Back — asks first. React Router runs one blocker at a time; this
        // is it.
        element: <GuardOutlet />,
        children: [
          {
            // The content area: the edit bar over the mirrored app, the
            // records, the vocabulary and Publishing. The graph is Cortex's
            // now, below.
            element: <ContentAreaLayout />,
            children: [
              {
                path: AdminRoutes.content.definition,
                element: (
                  <Navigate replace to={`${AdminRoutes.content()}/home`} />
                ),
              },
              {
                element: <ConsolePage />,
                children: [
                  {
                    // Static, so it outranks `records/:kind`.
                    path: AdminRoutes.contentVocabulary.definition,
                    element: <AdminVocabularyPage />,
                  },
                  {
                    path: AdminRoutes.contentKind.definition,
                    element: <RecordsKindRoute />,
                  },
                  {
                    path: AdminRoutes.contentItem.definition,
                    element: <AdminContentEditPage />,
                  },
                  {
                    // Admin only, tabs and all: publishing, restoring and the
                    // import each change what students read.
                    path: AdminRoutes.contentPublishing.definition,
                    element: (
                      <AdminOnly>
                        <PublishingLayout />
                      </AdminOnly>
                    ),
                    children: [
                      { index: true, element: <PublishingOverview /> },
                      {
                        path: AdminRoutes.contentPublishingHistory.definition,
                        element: <PublishHistorySection />,
                      },
                      {
                        // Temporary: until the store matches the repo.
                        path: AdminRoutes.contentPublishingImport.definition,
                        element: <AdminSongImportPage />,
                      },
                    ],
                  },
                  {
                    path: AdminRoutes.lessonCourse.definition,
                    element: <AdminLessonCoursePage />,
                  },
                ],
              },
              ...LEGACY_KIND_SEGMENTS.flatMap((kind) => [
                {
                  path: `${AdminRoutes.content()}/${kind}`,
                  element: <LegacyKindRedirect kind={kind} />,
                },
                {
                  path: `${AdminRoutes.content()}/${kind}/:id`,
                  element: <LegacyKindRedirect kind={kind} />,
                },
              ]),
              {
                // Everything else under /console/content is the app, mirrored.
                path: `${AdminRoutes.content()}/*`,
                element: <ConsoleMirrorShell />,
              },
            ],
          },
          {
            // Cortex (owner, 1 Oct 2026): the graph, the section's home and
            // default view, and the Table's category views, under one bar
            // (TableLayout). Every console role, like the content area (an
            // editor's saves are proposals an admin approves).
            id: 'cortex',
            element: <TableLayout />,
            children: [
              {
                // Full height, no page padding: the map is the page. A dot
                // clicked opens its row beside the map at `:table/:row`, a
                // child route, so the page (and the map's canvas, worker and
                // layout) stays mounted while rows open and close. The child
                // draws nothing itself: the page reads the row from the path
                // and draws the drawer (map/GraphDrawerOutlet). Its element
                // is an explicit null: the router warns in development about
                // a matched leaf route with no element at all. The static
                // integrity and links pages below are one segment shorter,
                // so neither is ever read as a row.
                path: AdminRoutes.cortex.definition,
                element: <MindMapPage />,
                children: [{ path: ':table/:row', element: null }],
              },
              {
                path: AdminRoutes.cortexIntegrity.definition,
                element: <IntegrityPage />,
              },
              {
                path: AdminRoutes.cortexLinks.definition,
                element: <LegacyLinkPage />,
              },
              {
                // Tesseract: full height like the map, and like it a
                // progression's row opens beside it as a child route, so
                // the page (its canvas and its open branches) stays mounted
                // while rows open and close.
                path: AdminRoutes.cortexTesseract.definition,
                element: <TesseractPage />,
                children: [{ path: ':table/:row', element: null }],
              },
              {
                // The tables keep their own URLs inside Cortex.
                path: AdminRoutes.table.definition,
                children: [
                  {
                    // The bare /console/table names no table: it opens the
                    // section's default view, the graph, its query kept.
                    index: true,
                    element: <MovedTo to={AdminRoutes.cortex()} />,
                  },
                  {
                    // The Recording pill's name, typed as a URL, with or
                    // without a row: its first view. Static, so it outranks
                    // `:table/:row?`.
                    path: 'recording/:row?',
                    element: <TableRedirect table="records" />,
                  },
                  {
                    // One route for a table with or without a row open, so
                    // the table stays mounted (and keeps its scroll) as rows
                    // change.
                    path: ':table/:row?',
                    element: <TablePage />,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <ConsoleHome />,
      },
    ],
  };
};
