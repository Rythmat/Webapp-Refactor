import { useMemo } from 'react';
import { ClassroomRoutes } from '@/constants/routes';
import { useClassrooms } from '@/hooks/data/classrooms/useClassrooms';
import { CATEGORY_META, CATEGORY_ORDER } from './categories';
import { scoreKeywords } from './match';
import { browseStatic, searchStatic } from './searchStatic';
import { PER_GROUP_CAP, type SearchGroup } from './types';

/** Element type of the classrooms list, inferred from the data hook. */
type ClassroomItem = NonNullable<
  ReturnType<typeof useClassrooms>['data']
>[number];

/**
 * Per-user classrooms group (async; role-independent — every user has
 * classrooms). An empty query includes all classrooms (browse mode); a
 * non-empty query filters them by name / code / description.
 */
function buildClassroomGroup(
  q: string,
  classrooms: ClassroomItem[],
  isLoading: boolean,
): SearchGroup | null {
  const meta = CATEGORY_META.classrooms;
  const scored = classrooms
    .map((c) => ({
      c,
      score: q
        ? scoreKeywords(
            [c.name, c.code, c.description ?? ''].filter(Boolean),
            q,
          )
        : 0,
    }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name));

  // While loading, keep a placeholder group so the page can show a skeleton;
  // once loaded with no matches, drop the group entirely.
  if (!isLoading && scored.length === 0) return null;

  return {
    category: 'classrooms',
    label: meta.label,
    icon: meta.icon,
    results: scored.slice(0, PER_GROUP_CAP).map(({ c }) => ({
      id: `classroom-${c.id}`,
      category: 'classrooms' as const,
      title: c.name,
      subtitle: c.code ? `Class code ${c.code}` : 'Classroom',
      to: ClassroomRoutes.home({ classroomId: c.id }),
      icon: meta.icon,
    })),
    total: scored.length,
    loading: isLoading,
    seeAllTo: ClassroomRoutes.root(),
  };
}

export interface GlobalSearchResult {
  groups: SearchGroup[];
  hasQuery: boolean;
}

/**
 * Aggregates content for `query`. With no query it returns a default browse view
 * (a capped preview of every category); with a query it filters across all
 * content.
 *
 * Static sources (songs, artists, courses, theory, globe, arcade, pages) resolve
 * synchronously via {@link browseStatic}/{@link searchStatic}. Per-user sources
 * are layered in via their data hooks — currently classrooms; assignments,
 * studio projects, rooms, and students/teachers are the queued fast-follow.
 */
export function useGlobalSearch(query: string): GlobalSearchResult {
  const q = query.trim().toLowerCase();
  const hasQuery = q.length > 0;

  const staticGroups = useMemo(
    () => (hasQuery ? searchStatic(query) : browseStatic()),
    [query, hasQuery],
  );

  const { data: classrooms, isLoading: classroomsLoading } = useClassrooms();
  const classroomGroup = useMemo(
    () => buildClassroomGroup(q, classrooms ?? [], classroomsLoading),
    [q, classrooms, classroomsLoading],
  );

  const groups = useMemo(() => {
    const all = [...staticGroups];
    if (classroomGroup) all.push(classroomGroup);
    return all.sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
    );
  }, [staticGroups, classroomGroup]);

  return { groups, hasQuery };
}
