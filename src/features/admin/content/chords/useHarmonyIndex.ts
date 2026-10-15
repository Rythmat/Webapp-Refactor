import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { GraphSnapshot } from '@/content/graph/deriveGraph';
import {
  type HarmonyIndex,
  type HarmonyInput,
  buildHarmonyIndex,
} from '@/content/harmony';
import { useWorkingGraph } from '../graph/useWorkingGraph';

/**
 * The progression crosscheck over the console's working copy: the library's
 * progressions found, by their chords, in the songs the Table shows (live or
 * proposed bodies, as the graph has them), the genre lessons and the
 * curriculum map (`content/harmony`).
 *
 * Built once per snapshot and kept beside it — a row panel opens and closes
 * with every click, and the build reads every chart (about a second). Null
 * until the snapshot is there; the lessons join when they have loaded.
 */

type Lessons = Pick<HarmonyInput, 'flows' | 'curriculum'>;

const built = new WeakMap<GraphSnapshot, Map<Lessons | null, HarmonyIndex>>();

async function loadLessons(): Promise<Lessons> {
  const [{ loadAllFlows }, { GENRE_CURRICULUM_MAP }] = await Promise.all([
    import('@/content/flowStore'),
    import('@/curriculum/data/genreCurriculumMap'),
  ]);
  const flows = [...(await loadAllFlows()).values()].flat();
  return {
    flows: flows as unknown as NonNullable<HarmonyInput['flows']>,
    curriculum: Object.values(GENRE_CURRICULUM_MAP),
  };
}

function indexFor(snapshot: GraphSnapshot, lessons: Lessons | null) {
  let byLessons = built.get(snapshot);
  if (!byLessons) built.set(snapshot, (byLessons = new Map()));
  let index = byLessons.get(lessons);
  if (!index) {
    index = buildHarmonyIndex({
      // The graph's type names only what it links; the bodies carry `chords`.
      progressions:
        snapshot.progressions as unknown as HarmonyInput['progressions'],
      songs: snapshot.songs,
      ...lessons,
    });
    // Only the latest lessons for a snapshot are worth keeping.
    byLessons.clear();
    byLessons.set(lessons, index);
  }
  return index;
}

export function useHarmonyIndex(): HarmonyIndex | null {
  const { snapshot } = useWorkingGraph();
  const lessons = useQuery({
    queryKey: ['console', 'harmony-lessons'],
    queryFn: loadLessons,
    staleTime: Infinity,
    retry: false,
  });
  const loaded = lessons.data ?? null;
  return useMemo(
    () => (snapshot ? indexFor(snapshot, loaded) : null),
    [snapshot, loaded],
  );
}
