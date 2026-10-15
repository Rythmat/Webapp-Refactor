import type { Graph } from '@/content/graph/deriveGraph';
import {
  buildLessonCatalog,
  tutorialInfo,
  type LessonCatalog,
} from './catalog';

/**
 * The graph and records the lesson generator reads, loaded on demand: the
 * same repo graph the console's Cortex draws (`content/graph/repoGraph.ts`)
 * and the Studio's tutorial list. Several megabytes of song charts, events
 * and records, so only the generator's page asks for it, and only once per
 * page load.
 */
export interface LessonAtlas {
  graph: Graph;
  catalog: LessonCatalog;
}

let pending: Promise<LessonAtlas> | null = null;

export const loadLessonAtlas = (): Promise<LessonAtlas> =>
  (pending ??= Promise.all([
    import('@/content/graph/repoGraph'),
    import('@/daw/components/Tutorial/tutorials'),
  ])
    .then(async ([{ loadRepoGraph }, { TUTORIALS }]) => {
      const { graph, snapshot } = await loadRepoGraph();
      return {
        graph,
        catalog: buildLessonCatalog(snapshot, TUTORIALS.map(tutorialInfo)),
      };
    })
    .catch((error: unknown) => {
      // A failed chunk load should be retryable, not cached for the session.
      pending = null;
      throw error;
    }));
