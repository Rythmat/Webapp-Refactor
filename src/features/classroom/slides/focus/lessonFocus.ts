import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { EntityId } from '@/content/graph/types';
import type { Interaction } from '../../types';
import type { LessonGraph } from '../cortex/graphQueries';
import { LESSON_ATLAS_KEY, loadLessonAtlas } from '../cortex/loadLessonAtlas';
import { planCortexLesson } from '../cortex/planLesson';
import {
  DEFAULT_TUTORIAL,
  GENRE_TUTORIAL,
  SUBGENRE_TUTORIAL,
  focusGenres,
} from '../cortex/producerTutorial';
import { focusById } from '../cortex/suggestFocus';
import type { CortexLessonPlan, GroupRole } from '../cortex/types';

// ── The lesson's subject (owner, 2026-11-10) ────────────────────────────────
// A lesson hangs on its Showcase: the artist or the place it spotlights
// (`deck.templateRef.focusId`). The Group Project is always ABOUT that
// subject: for Michael Jackson, the Promoter tours his Globe, the Producer
// makes Funk or Pop in the Studio, the Performer plays a Funk lesson or one of
// his songs. What "related" means is the lesson generator's plan for the
// subject, so the picker and the editor's check agree with what it builds.

export const GROUP_ROLES: readonly GroupRole[] = [
  'promoter',
  'producer',
  'performer',
];

/** Which role an activity's module is. */
export const ROLE_OF_MODULE = {
  globe: 'promoter',
  studio: 'producer',
  learn: 'performer',
} as const satisfies Record<string, GroupRole>;

/** One activity the class can do together for a role. */
export interface RelatedOption {
  role: GroupRole;
  /** The activity ref the Group Project slide's interaction carries. */
  ref: string;
  label: string;
  /** "Picked for Funk", "Level 1", … */
  detail?: string;
}

/**
 * The Studio tutorials that are the subject's sound: each of its genres'
 * tutorial (a subgenre's own, else its genre's), and the default one for a
 * genre with none of its own (Pop, Soul). The generator's own list keeps
 * every tutorial after its pick; the Group Project keeps to these.
 */
export const relatedTutorialIds = (
  graph: LessonGraph,
  focusId: string,
): Set<string> => {
  const ids = new Set<string>();
  for (const genre of focusGenres(graph, focusId as EntityId)) {
    const slug = genre.id.slice(genre.id.indexOf(':') + 1);
    ids.add(
      (genre.kind === 'subgenre'
        ? SUBGENRE_TUTORIAL[slug]
        : GENRE_TUTORIAL[slug]) ?? DEFAULT_TUTORIAL,
    );
  }
  return ids;
};

/** Everything the Group Project may be, by role, for a plan's subject. */
export const relatedForFocus = (
  plan: CortexLessonPlan,
  graph: LessonGraph,
): Record<GroupRole, RelatedOption[]> => {
  const tutorials = relatedTutorialIds(graph, plan.focus.id);
  const sound = plan.producer.filter((o) => tutorials.has(o.tutorial.id));
  // Never empty: the generator's pick is related by construction.
  const producer = sound.length > 0 ? sound : plan.producer.slice(0, 1);
  return {
    promoter: plan.promoter
      ? [
          {
            role: 'promoter',
            ref: 'globe:mindmap',
            label: `${plan.focus.label}'s connections`,
            detail: 'Mind map on the Globe',
          },
        ]
      : [],
    producer: producer.map((o) => ({
      role: 'producer' as const,
      ref: `studio:tutorial:${o.tutorial.id}`,
      label: o.tutorial.title,
      ...(o.genre ? { detail: `Picked for ${o.genre}` } : {}),
    })),
    performer: plan.performer.map((o) => ({
      role: 'performer' as const,
      ref: o.activityRef,
      label: o.label.en,
    })),
  };
};

/** The role and ref a Group Project interaction runs, if it runs one. */
export const groupActivityOf = (
  interaction: Interaction | undefined,
): { role: GroupRole; ref: string } | null => {
  const atlas = interaction?.atlas;
  if (!atlas) return null;
  const role = (ROLE_OF_MODULE as Record<string, GroupRole | undefined>)[
    atlas.module
  ];
  return role ? { role, ref: atlas.activityRef } : null;
};

/** Whether an activity ref is one of the subject's related activities. */
export const groupMatchesFocus = (
  ref: string,
  related: Record<GroupRole, RelatedOption[]>,
): boolean =>
  GROUP_ROLES.some((role) => related[role].some((o) => o.ref === ref));

/**
 * The plan for a lesson's subject, loading the Atlas on first use (the same
 * query as the generator, so it loads once a page). Undefined while loading,
 * when there is no subject, or when the Atlas no longer has it.
 */
export const useLessonPlan = (
  focusId: string | undefined,
): {
  plan: CortexLessonPlan | undefined;
  related: Record<GroupRole, RelatedOption[]> | undefined;
  loading: boolean;
} => {
  const atlas = useQuery({
    queryKey: LESSON_ATLAS_KEY,
    queryFn: loadLessonAtlas,
    enabled: Boolean(focusId),
    staleTime: Infinity,
  });
  const { plan, related } = useMemo(() => {
    if (!focusId || !atlas.data) return { plan: undefined, related: undefined };
    const { graph, catalog } = atlas.data;
    const focus = focusById(graph, catalog, focusId);
    if (!focus) return { plan: undefined, related: undefined };
    const next = planCortexLesson(graph, catalog, focus);
    return { plan: next, related: relatedForFocus(next, graph) };
  }, [atlas.data, focusId]);
  return { plan, related, loading: Boolean(focusId) && atlas.isPending };
};
