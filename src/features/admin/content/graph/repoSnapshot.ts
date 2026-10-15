/**
 * The repo's graph, as the console loads it. It lives in
 * `src/content/graph/repoGraph.ts` so the classroom's lesson generator can
 * load the same graph without importing console code.
 */
export {
  loadRepoGraph,
  loadRepoSnapshot,
  type AtlasGraph,
} from '@/content/graph/repoGraph';
