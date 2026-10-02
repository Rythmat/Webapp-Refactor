import { Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminRoutes } from '@/constants/routes';
import { ConsolePageHeader } from '../../ui/ConsolePageHeader';
import { ConsoleTabs } from '../../ui/ConsoleTabs';
import { useRepoMode } from '../repo/useRepoMode';
import { shouldOfferImport } from '../songImport/importMemory';

/**
 * Publishing: review what editors proposed, publish what changed, restore an
 * earlier release — and, while the store still lags the repo, import the
 * repo's charts. One page with tabs, inside the content area.
 *
 * In repo mode the store is the repo itself: there are no releases to
 * publish or restore (git does both), and nothing to import from the repo,
 * so the page is "Commit and deploy" alone, and an address of a tab it does
 * not have (a bookmark of the import, say) lands there.
 */
export const PublishingLayout = () => {
  const { pathname } = useLocation();
  // The literal DEV gate here, not only in the hook, lets the build drop
  // every repo branch below (useRepoMode.ts).
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  const importPath = AdminRoutes.contentPublishingImport();
  if (repo && pathname !== AdminRoutes.contentPublishing()) {
    return <Navigate to={AdminRoutes.contentPublishing()} replace />;
  }
  const tabs = repo
    ? [
        {
          label: 'Commit and deploy',
          to: AdminRoutes.contentPublishing(),
          end: true,
        },
      ]
    : [
        {
          label: 'Review & publish',
          to: AdminRoutes.contentPublishing(),
          end: true,
        },
        {
          label: 'Publish history',
          to: AdminRoutes.contentPublishingHistory(),
        },
        // Temporary; hides once a compare finds nothing left to write.
        ...(shouldOfferImport() || pathname.startsWith(importPath)
          ? [{ label: 'Import from repo', to: importPath }]
          : []),
      ];
  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader
        title="Publishing"
        description={
          repo
            ? 'Repo mode: every save goes straight into the repo’s data files on this machine. Git is the review, and a commit plus a deploy is the publish.'
            : 'Publishing compiles the current database state into immutable versioned bundles on the CDN. Students read those bundles, never the database. Restoring re-points at an earlier version and takes effect within a minute.'
        }
      />
      <ConsoleTabs items={tabs} />
      {/* The tabs are lazy; the header and tabs stay while one loads. */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Outlet />
      </Suspense>
    </div>
  );
};
