import { useQuery } from '@tanstack/react-query';
import { loadRepoGraph } from './repoSnapshot';

/**
 * The repo's graph as a query: what the working graph (`useWorkingGraph`)
 * lays the content API's items over, and what the console shows while that
 * is on its way or where the API has no `/export`.
 *
 * The mind map, Integrity and the Table read `useWorkingGraph`, which reads
 * this; one key, so the repo graph is built once per page load whichever of
 * them opens first.
 */

/**
 * Which copy of the Atlas a graph page shows: the API's working items over
 * the repo, or the repo's alone.
 */
export type GraphMode = 'working' | 'repo';

export const GRAPH_MODE_LABEL: Record<GraphMode, string> = {
  working: 'Working copy',
  repo: 'Repo snapshot',
};

export const REPO_GRAPH_KEY = ['console', 'atlas-graph', 'repo'] as const;

export const useAtlasGraph = () =>
  useQuery({
    queryKey: REPO_GRAPH_KEY,
    queryFn: loadRepoGraph,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
