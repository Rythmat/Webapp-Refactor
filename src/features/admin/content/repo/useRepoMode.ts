import { ContentApiError } from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { CONTENT_REPO } from '../mock/mockSwitch';

/**
 * Whether the console saves into the repo's data files on this machine
 * (repo mode): this dev server was started with the switch that sends every
 * content request there (`CONTENT_REPO`), or the server says
 * `store: 'repo'` in `/capabilities`. The badges, Publishing, the decisions
 * banner, the status control and the roster toggle all ask this one
 * question, so they never disagree.
 *
 * DEV only, both halves: a production build answers false whatever a
 * server says, so the console there never switches into repo mode's UI.
 * Each caller also gates its own repo branch on a literal
 * `import.meta.env.DEV` (`const repo = import.meta.env.DEV && repoMode`),
 * so the minifier drops that branch, and its words, from the build.
 */
export function useRepoMode(): boolean {
  const { store } = useCapabilities();
  return import.meta.env.DEV && (CONTENT_REPO || store === 'repo');
}

/**
 * Whether a content API error is repo mode refusing someone who is not an
 * admin (403 `REPO_ADMIN_ONLY`): an answer, not a server that is down, so
 * there is nothing to try again.
 */
export const isRepoAdminOnly = (error: unknown): boolean =>
  error instanceof ContentApiError && error.code === 'REPO_ADMIN_ONLY';
