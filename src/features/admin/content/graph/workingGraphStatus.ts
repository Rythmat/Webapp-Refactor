import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import type { WorkingGraphState } from './useWorkingGraph';

/**
 * Which copy of the Atlas a graph page is showing, and why: one answer for
 * the Table, the mind map and Integrity, so their badges and notices always
 * say the same thing (`GraphModeBadge`, `WorkingGraphNotice`).
 *
 *  - `working`: the API's items over the repo, up to date or rebuilding;
 *  - `stale`: the working copy, but a refresh of it failed since;
 *  - `loading`: the repo's copy, while the working copy is on its way;
 *  - `failed`: the repo's copy, because the working copy did not load;
 *  - `no-export`: the repo's copy, because this API does not serve `/export`
 *    (production today) — all there is, not a failure;
 *  - `no-capabilities`: the repo's copy, because `/capabilities` failed and
 *    the console cannot tell what the API serves.
 */
export type WorkingGraphStatus =
  | 'working'
  | 'stale'
  | 'loading'
  | 'failed'
  | 'no-export'
  | 'no-capabilities';

export type WorkingGraphStatusInput = Pick<
  WorkingGraphState,
  'mode' | 'isRefreshing' | 'error'
>;

/** What the server said about itself: whether it serves `/export`, and whether it said at all. */
export interface ServerState {
  exportServed: boolean;
  capabilitiesFailed: boolean;
}

export function workingGraphStatus(
  { mode, isRefreshing, error }: WorkingGraphStatusInput,
  { exportServed, capabilitiesFailed }: ServerState,
): WorkingGraphStatus {
  if (mode === 'working') return error ? 'stale' : 'working';
  if (isRefreshing) return 'loading';
  if (capabilitiesFailed) return 'no-capabilities';
  return exportServed ? 'failed' : 'no-export';
}

/** The status of a working graph's state, with the server's word on itself. */
export function useWorkingGraphStatus(
  state: WorkingGraphStatusInput,
): WorkingGraphStatus {
  const caps = useCapabilities();
  return workingGraphStatus(state, {
    exportServed: caps.feature('export'),
    capabilitiesFailed: caps.isError === true,
  });
}
