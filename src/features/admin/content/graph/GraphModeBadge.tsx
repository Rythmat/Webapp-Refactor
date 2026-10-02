import { Loader2 } from 'lucide-react';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { ConsoleBadge } from '../../ui/ConsoleBadge';
import { isRepoAdminOnly, useRepoMode } from '../repo/useRepoMode';
import { GRAPH_MODE_LABEL, type GraphMode } from './useAtlasGraph';
import type { WorkingGraphStatus } from './workingGraphStatus';

/**
 * Which copy of the Atlas a graph page is showing, the same on the Table,
 * the mind map and Integrity: the working copy (the API's items over the
 * repo), or the repo's snapshot — its tooltip says why (`status`): while the
 * working copy loads, because it failed, because this API has no `/export`
 * to build one from, or because it would not say what it serves.
 * "Refreshing…" while a newer graph is building behind the one on screen (a
 * save, then its rebuild).
 *
 * In repo mode (`useRepoMode`) a "Repo mode" badge sits beside it: the
 * working copy is the repo's data files on this machine, and a save writes
 * them.
 *
 * The page works the status out once (`useWorkingGraphStatus`) and hands it
 * to this and to its notice (`WorkingGraphNotice`); repo mode it reads from
 * the capabilities the page has loaded already.
 */

/** The working copy's tooltip in repo mode, where the files are the store. */
const REPO_WORKING =
  'The repo’s data files on this machine, as the dev server holds them';

/** The badge beside it in repo mode. */
const REPO_MODE_TITLE =
  'Saves go straight into the repo’s data files on this machine. Git is the review: commit the files and deploy to publish.';

/** Its words for someone the repo content server turns away: not an admin. */
const REPO_REFUSED_TITLE =
  'This dev server saves straight into the repo’s data files, and only an admin can use it. Nothing can be saved from here.';

const TITLE: Record<WorkingGraphStatus, string> = {
  working: 'The API’s working items merged over the repo',
  stale:
    'The API’s working items merged over the repo, as last loaded: the latest changes did not load',
  loading: 'The repo’s copy of the Atlas, showing while the working copy loads',
  failed: 'The repo’s copy of the Atlas: the working copy did not load',
  'no-export':
    'The content as the repo holds it: this API does not serve /export yet',
  'no-capabilities':
    'The repo’s copy of the Atlas: the content API did not say what it serves',
};

export const GraphModeBadge = ({
  mode,
  status,
  refreshing,
}: {
  mode: GraphMode;
  status: WorkingGraphStatus;
  refreshing?: boolean;
}) => {
  // The literal DEV gate here, not only in the hook, lets the build drop
  // every repo branch below (useRepoMode.ts).
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  // Turned away (`REPO_ADMIN_ONLY`): the badge says so, not that saves land.
  const { error } = useCapabilities();
  const refused = repo && isRepoAdminOnly(error);
  return (
    <>
      {repo && (
        <ConsoleBadge
          tone={refused ? 'muted' : 'info'}
          title={refused ? REPO_REFUSED_TITLE : REPO_MODE_TITLE}
        >
          {refused ? 'Repo mode: admins only' : 'Repo mode'}
        </ConsoleBadge>
      )}
      <ConsoleBadge
        tone={
          status === 'stale'
            ? 'warning'
            : mode === 'working'
              ? 'neutral'
              : 'muted'
        }
        title={repo && status === 'working' ? REPO_WORKING : TITLE[status]}
      >
        {GRAPH_MODE_LABEL[mode]}
      </ConsoleBadge>
      {refreshing && (
        <ConsoleBadge tone="muted" title="Rebuilding with the latest saves">
          <Loader2 aria-hidden className="size-3 animate-spin" />
          Refreshing…
        </ConsoleBadge>
      )}
    </>
  );
};
