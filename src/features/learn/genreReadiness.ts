import { useEffect, useState } from 'react';
import { GENRE_COURSES } from '@/components/learn/genreCourses';
import { getActivityFlow } from '@/curriculum/data/activityFlows';

// ── Which genre lessons are built (owner, 2026-10-25) ──────────────────────
// Most courses' levels are still placeholders: one "Coming Soon" step per
// section. The Genre pages' prompt bar suggests only the built ones. The
// lessons load at runtime (the content CDN, or the bundled copy), so this is
// read from them, not written down.

/** A lesson section's steps, as far as this needs them. */
interface SectionLike {
  id: string;
  steps?: readonly { subsection?: string; activity?: string }[];
}

/** Built: it has a step that isn't a "Coming Soon" placeholder. */
export function isSectionBuilt(section: SectionLike): boolean {
  return (section.steps ?? []).some(
    (step) => !/coming soon/i.test(`${step.subsection} ${step.activity}`),
  );
}

export interface GenreReadiness {
  /** The course has a built section at some level. */
  course: (slug: string) => boolean;
  /** That level's section (A–D) is built. */
  section: (slug: string, level: number, id: string) => boolean;
}

/** Readiness from the built sections' keys (`slug:level:id`). */
export function genreReadinessFrom(built: ReadonlySet<string>): GenreReadiness {
  return {
    course: (slug) => [...built].some((key) => key.startsWith(`${slug}:`)),
    section: (slug, level, id) => built.has(`${slug}:${level}:${id}`),
  };
}

const LEVELS = [1, 2, 3] as const;

/**
 * The genre lessons' readiness, read once the lessons load; null until then
 * (or while `enabled` is false: only the Genre pages need it).
 */
export function useGenreReadiness(enabled: boolean): GenreReadiness | null {
  const [readiness, setReadiness] = useState<GenreReadiness | null>(null);
  useEffect(() => {
    if (!enabled || readiness) return;
    let live = true;
    Promise.all(
      GENRE_COURSES.flatMap((course) =>
        LEVELS.map(async (level) => {
          const flow = await getActivityFlow(course.slug, level);
          const sections = (flow?.sections ?? []) as readonly SectionLike[];
          return sections
            .filter(isSectionBuilt)
            .map((s) => `${course.slug}:${level}:${s.id}`);
        }),
      ),
    ).then((keys) => {
      if (live) setReadiness(genreReadinessFrom(new Set(keys.flat())));
    });
    return () => {
      live = false;
    };
  }, [enabled, readiness]);
  return readiness;
}
