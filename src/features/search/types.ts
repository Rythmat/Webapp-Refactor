import type { LucideIcon } from 'lucide-react';

/** Content buckets the global search can surface. */
export type SearchCategory =
  | 'songs'
  | 'artists'
  | 'courses'
  | 'theory'
  | 'globe'
  | 'arcade'
  | 'classrooms'
  | 'pages';

/** Optional thumbnail shown at the start of a result row. */
export interface SearchThumb {
  /** Image URL / public asset path (artist photo, hex tile, globe image). */
  src?: string;
  /** Seed for a generative HexAvatar fallback when there is no `src`. */
  avatarSeed?: string;
  /** Frame shape: circle (photos/avatars), hex (learn tiles), rounded (globe). */
  shape: 'circle' | 'hex' | 'rounded';
}

/** A single navigable search hit. */
export interface SearchResult {
  /** Unique across the whole result set (prefixed by category). */
  id: string;
  category: SearchCategory;
  title: string;
  subtitle?: string;
  /** Route path (may include a query string) passed to react-router `<Link>`. */
  to: string;
  icon: LucideIcon;
  /** Optional thumbnail; falls back to `icon` when absent. */
  thumb?: SearchThumb;
}

/** A category's results for the current query. */
export interface SearchGroup {
  category: SearchCategory;
  label: string;
  icon: LucideIcon;
  /** Capped to {@link PER_GROUP_CAP}. */
  results: SearchResult[];
  /** Total matches before capping. */
  total: number;
  /** Optional link to a full listing filtered by the query. */
  seeAllTo?: string;
  /** True while an async (per-user) source is still loading. */
  loading?: boolean;
}

/** Max rows shown per category before the "See all" affordance. */
export const PER_GROUP_CAP = 6;
