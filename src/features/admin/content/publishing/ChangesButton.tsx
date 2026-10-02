import { ChevronDown } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { AdminRoutes } from '@/constants/routes';
import {
  useContentOverview,
  usePendingEdits,
} from '@/hooks/data/admin/useAdminContent';
import { CONSOLE_LABEL, consoleTabClass } from '../../ui/styles';
import { segmentForKind } from '../mirror/mirrorPaths';
import { useRepoMode } from '../repo/useRepoMode';
import { kindLabel } from './kindLabels';
import { kindsToPublish, usePublishActions, usePublishRun } from './publishRun';

// Read only when the popover is open, and loaded then: the bar is eager
// console code, the suggestions client is not (eagerBoundary.test.ts).
const BulkUnreviewedLines = lazy(() =>
  import('./BulkUnreviewed').then(({ BulkUnreviewedLines }) => ({
    default: BulkUnreviewedLines,
  })),
);

/**
 * The edit bar's "Changes (n)": what is waiting, from wherever the admin is.
 *
 * n counts the proposals awaiting review and the items changed since their
 * last publish; the popover also names the facts accepted in bulk that
 * nobody has reviewed (C29), read only while it is open. It offers Publish
 * for the kinds of the section
 * showing (Songs on a Learn page, the globe's kinds on the Globe) and the way
 * to Publishing for everything else. Admin only; the bar decides.
 *
 * In repo mode (a save goes straight into the repo's files) it counts the
 * data files git has not committed, and leads to "Commit and deploy":
 * there are no proposals to wait on and nothing to publish from here.
 */
export const ChangesButton = ({ section }: { section: string | null }) => {
  // Repo mode has no proposals and no releases: what waits is what git has
  // not committed, and Publishing is "Commit and deploy".
  // The literal DEV gate here, not only in the hook, lets the build drop
  // every repo branch below (useRepoMode.ts).
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  const overview = useContentOverview();
  const pending = usePendingEdits(!repo);
  const run = usePublishRun();
  const { publish } = usePublishActions();

  const rows = overview.data ?? [];
  const waiting = repo ? 0 : (pending.data?.length ?? 0);
  const changed = rows.reduce((n, row) => n + row.changedSincePublish, 0);
  const here =
    section && !repo
      ? kindsToPublish(rows).filter((kind) => segmentForKind(kind) === section)
      : [];
  const count = waiting + changed;

  return (
    <Popover>
      <PopoverTrigger className={consoleTabClass(false, 'sm')}>
        Changes{count > 0 && ` (${count})`}
        <ChevronDown className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <div className="flex flex-col gap-3 text-sm">
          {!repo && (
            <div>
              <p className={CONSOLE_LABEL}>Awaiting review</p>
              <p className="mt-1 text-white/75">
                {waiting === 0
                  ? 'Nothing from an editor.'
                  : `${waiting} proposal${waiting === 1 ? '' : 's'}.`}
              </p>
            </div>
          )}
          <div>
            <p className={CONSOLE_LABEL}>
              {repo ? 'Not yet committed' : 'Not yet published'}
            </p>
            <p className="mt-1 text-white/75">
              {repo
                ? changed === 0
                  ? 'The data files match the last commit.'
                  : `${changed} data file${changed === 1 ? '' : 's'} changed and not committed.`
                : changed === 0
                  ? 'Everything is live.'
                  : `${changed} item${changed === 1 ? '' : 's'} changed since the last publish.`}
            </p>
            <Suspense fallback={null}>
              <BulkUnreviewedLines />
            </Suspense>
          </div>
          {run.status === 'running' ? (
            <p className="text-white/60">
              Publishing {run.current ? kindLabel(run.current) : '…'}
              {run.progress && ` (${run.progress.done}/${run.progress.total})`}
            </p>
          ) : (
            here.length > 0 && (
              <button
                type="button"
                onClick={() => void publish(here)}
                className="rounded-full bg-white px-3 py-1.5 text-xs text-[#101012] hover:bg-white/90"
              >
                Publish {here.map(kindLabel).join(', ')}
              </button>
            )
          )}
          <Link
            to={AdminRoutes.contentPublishing()}
            className="text-xs text-white/60 underline-offset-2 hover:text-white hover:underline"
          >
            {repo ? 'Open Commit and deploy' : 'Open Publishing'}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};
