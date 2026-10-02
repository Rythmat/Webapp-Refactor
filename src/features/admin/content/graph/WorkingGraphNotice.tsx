import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { CONTENT_REPO } from '../mock/mockSwitch';
import { isRepoAdminOnly } from '../repo/useRepoMode';
import { useRetryWorkingGraph } from './useWorkingGraph';
import type { WorkingGraphStatus } from './workingGraphStatus';

/**
 * The notice over a graph page when what it shows is not the working copy it
 * should be, or not the latest one — the same words on the Table, the mind
 * map and Integrity, with a way to try again:
 *
 *  - the working copy did not load, so the repo's copy shows (`failed`);
 *  - the API would not say what it serves (`no-capabilities`);
 *  - a refresh of the working copy failed, so the last one shows (`stale`);
 *  - on the Table only, that this API has no `/export` (`no-export`): its
 *    rows are read-only for that reason, where the map and Integrity lose
 *    nothing (their badge says it), and whether the item list — the rows'
 *    statuses — loaded.
 *
 * In repo mode the first two name the dev server's repo content server,
 * which is what did not answer; and when it did answer, turning away
 * someone who is not an admin (403 `REPO_ADMIN_ONLY`), the notice says
 * that instead, with nothing to try again.
 *
 * Nothing while the working copy is on its way ("Refreshing…" says that),
 * or once it is showing.
 */

const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Try again: whatever the working graph reads that failed (the repo's
 * sources, `/capabilities`, an export or list; `useRetryWorkingGraph`).
 */
export const TryAgain = () => {
  const retry = useRetryWorkingGraph();
  return (
    <button
      type="button"
      className="underline underline-offset-2 hover:text-white"
      onClick={retry}
    >
      Try again
    </button>
  );
};

/** The page a notice is over, for how it says what shows. */
export type NoticeSubject = 'table' | 'map' | 'integrity';

const SHOWS: Record<NoticeSubject, { repo: string; last: string }> = {
  table: {
    repo: 'These rows are the repo’s copy of the Atlas, and the Table is read-only.',
    last: 'These rows are the last working copy that did, and may be missing what was saved since.',
  },
  map: {
    repo: 'The map is drawn from the repo’s copy of the Atlas.',
    last: 'The map is drawn from the last working copy that did, and may be missing what was saved since.',
  },
  integrity: {
    repo: 'These checks are of the repo’s copy of the Atlas.',
    last: 'These checks are of the last working copy that did, and may miss what was saved since.',
  },
};

const Warning = ({
  headline,
  error,
  then,
  className,
}: {
  headline: string;
  error: unknown;
  then: string;
  className?: string;
}) => (
  <ConsoleCallout tone="warning" className={className}>
    <span className="font-medium text-amber-200">{headline}</span> (
    {message(error)}). {then} <TryAgain />
  </ConsoleCallout>
);

/**
 * Repo mode (DEV only): the console asks the dev server's repo content
 * server, so when nothing answers, that is the one to name, and where its
 * errors go.
 */
const REPO_HINT =
  'The repo content server runs inside the dev server; its terminal says why.';

/** Repo mode turned this viewer away: they are not an admin. */
const RepoRefused = ({
  shows,
  className,
}: {
  shows: string;
  className?: string;
}) => (
  <ConsoleCallout tone="warning" className={className}>
    <span className="font-medium text-amber-200">Repo mode is for admins.</span>{' '}
    This dev server saves straight into the repo’s data files, so it serves an
    admin only, and an editor’s proposals need the content API. Ask an admin, or
    restart the dev server with repo mode off to propose edits there. {shows}
  </ConsoleCallout>
);

export const WorkingGraphNotice = ({
  status,
  error,
  subject,
  className = 'px-3 py-2 text-xs',
}: {
  status: WorkingGraphStatus;
  error: unknown;
  subject: NoticeSubject;
  className?: string;
}) => {
  const shows = SHOWS[subject];
  const repo = import.meta.env.DEV && CONTENT_REPO;
  if (
    repo &&
    (status === 'failed' || status === 'no-capabilities') &&
    isRepoAdminOnly(error)
  ) {
    return <RepoRefused shows={shows.repo} className={className} />;
  }
  switch (status) {
    case 'failed':
      return (
        <Warning
          headline={
            repo
              ? 'The repo files did not load'
              : 'The working copy did not load'
          }
          error={error}
          then={repo ? `${shows.repo} ${REPO_HINT}` : shows.repo}
          className={className}
        />
      );
    case 'no-capabilities':
      return (
        <Warning
          headline={
            repo
              ? 'The repo content server did not answer'
              : 'The content API did not say what it serves'
          }
          error={error}
          then={repo ? `${shows.repo} ${REPO_HINT}` : shows.repo}
          className={className}
        />
      );
    case 'stale':
      return (
        <Warning
          headline="The latest changes did not load"
          error={error}
          then={shows.last}
          className={className}
        />
      );
    case 'no-export':
      return subject === 'table' ? (
        <ConsoleCallout tone="info" className={className}>
          <span className="font-medium text-sky-200">
            Repo snapshot, read-only.
          </span>{' '}
          This content API does not serve <code>/export</code> yet, so the rows
          are the repo’s copy of the Atlas, and what is saved in the console
          shows here once it does.
          {error ? (
            <>
              {' '}
              The item list did not load either ({message(error)}), so the
              statuses are the repo’s too. <TryAgain />
            </>
          ) : null}
        </ConsoleCallout>
      ) : null;
    default:
      return null;
  }
};
