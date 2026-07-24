import {
  AtlasRoutes,
  GameRoutes,
  LearnRoutes,
  SongRoutes,
} from '@/constants/routes';
import { CATEGORY_META } from './categories';
import { scoreKeywords } from './match';
import { getStaticIndex } from './sources/staticIndex';
import {
  PER_GROUP_CAP,
  type SearchCategory,
  type SearchGroup,
  type SearchResult,
} from './types';

type Scored = { result: SearchResult; score: number };

/**
 * Search the static (bundled) content index — songs, artists, courses, theory,
 * globe events, arcade games, and pages. Pure and synchronous; returns one
 * {@link SearchGroup} per matching category (unordered), each capped to
 * {@link PER_GROUP_CAP} with `total` carrying the pre-cap count.
 */
export function searchStatic(query: string): SearchGroup[] {
  const raw = query.trim();
  const q = raw.toLowerCase();
  if (!q) return [];

  const byCategory = new Map<SearchCategory, Scored[]>();
  for (const entry of getStaticIndex()) {
    const score = scoreKeywords(entry.keywords, q);
    if (score < 0) continue;
    const arr = byCategory.get(entry.category);
    if (arr) arr.push({ result: entry.result, score });
    else byCategory.set(entry.category, [{ result: entry.result, score }]);
  }

  const groups: SearchGroup[] = [];
  for (const [category, scored] of byCategory) {
    scored.sort(
      (a, b) =>
        b.score - a.score || a.result.title.localeCompare(b.result.title),
    );
    const meta = CATEGORY_META[category];
    groups.push({
      category,
      label: meta.label,
      icon: meta.icon,
      results: scored.slice(0, PER_GROUP_CAP).map((s) => s.result),
      total: scored.length,
      // Songs overflow into the full Song Library, filtered by the query.
      seeAllTo:
        category === 'songs'
          ? SongRoutes.root(undefined, { q: raw })
          : undefined,
    });
  }
  return groups;
}

/** Section links for the default browse view's "See all" affordance. */
const BROWSE_SEE_ALL: Partial<Record<SearchCategory, string>> = {
  songs: SongRoutes.root(),
  artists: SongRoutes.root(),
  courses: LearnRoutes.root(),
  theory: LearnRoutes.root(),
  globe: AtlasRoutes.root(),
  arcade: GameRoutes.root(),
};

/**
 * Default (no-query) browse view: a capped preview of every static category, in
 * the index's natural order (songs are popularity-sorted at index-build time).
 * One {@link SearchGroup} per category, capped to {@link PER_GROUP_CAP} with
 * `total` carrying the full count.
 */
export function browseStatic(): SearchGroup[] {
  const byCategory = new Map<SearchCategory, SearchResult[]>();
  for (const entry of getStaticIndex()) {
    const arr = byCategory.get(entry.category);
    if (arr) arr.push(entry.result);
    else byCategory.set(entry.category, [entry.result]);
  }

  const groups: SearchGroup[] = [];
  for (const [category, results] of byCategory) {
    const meta = CATEGORY_META[category];
    groups.push({
      category,
      label: meta.label,
      icon: meta.icon,
      results: results.slice(0, PER_GROUP_CAP),
      total: results.length,
      seeAllTo: BROWSE_SEE_ALL[category],
    });
  }
  return groups;
}
