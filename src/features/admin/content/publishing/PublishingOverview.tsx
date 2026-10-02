import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRepoMode } from '../repo/useRepoMode';
import { GlobePlacementSection } from './GlobePlacementSection';
import { PendingReviewSection } from './PendingReviewSection';
import { PublishKindsSection } from './PublishKindsSection';

/**
 * Repo mode's "Commit and deploy" (DEV only). The literal
 * `import.meta.env.DEV` at the import keeps its chunk, and the git
 * commands it writes out, out of a build.
 */
const RepoCommitSection = import.meta.env.DEV
  ? lazy(() =>
      import('./RepoCommitSection').then(({ RepoCommitSection }) => ({
        default: RepoCommitSection,
      })),
    )
  : null;

/**
 * Review & publish: the queue, then the kinds, then what the globe lacks.
 * In repo mode there is no queue and nothing to publish from here (a save
 * is in the files already), so it is "Commit and deploy" instead.
 */
export const PublishingOverview = () => {
  // The literal DEV gate here, not only in the hook, lets the build drop
  // every repo branch below (useRepoMode.ts).
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  return (
    <div className="flex flex-col gap-8">
      {repo && RepoCommitSection ? (
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <RepoCommitSection />
        </Suspense>
      ) : (
        <>
          <PendingReviewSection />
          <PublishKindsSection />
        </>
      )}
      <GlobePlacementSection />
    </div>
  );
};
