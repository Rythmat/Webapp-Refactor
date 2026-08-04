/**
 * Theme topic classification.
 *
 * The canonical Theme Bank has three families — SEASONAL (12 monthly themes),
 * GENRE (10), and LOCATION (4) — but the `Theme` shape carries no category
 * field: seasonal, genre, and location themes are structurally identical (all
 * `source: 'canonical'`, all with a `month`). The only distinguishing marker is
 * the theme `id` slug, so classification is an id-set lookup. Personal/custom
 * themes (`source: 'personal'`) fall outside all three → `null`.
 */
export type ThemeTopic = 'seasonal' | 'genre' | 'location';

const SEASONAL_THEME_IDS = new Set<string>([
  'theme-january',
  'theme-february',
  'theme-march',
  'theme-april',
  'theme-may',
  'theme-june',
  'theme-july',
  'theme-august',
  'theme-september',
  'theme-october',
  'theme-november',
  'theme-december',
]);

const GENRE_THEME_IDS = new Set<string>([
  'theme-blues',
  'theme-jazz',
  'theme-rnb-soul-funk',
  'theme-rock',
  'theme-country',
  'theme-hiphop',
  'theme-latin',
  'theme-reggae-afrobeat',
  'theme-gospel',
  'theme-electronic',
]);

const LOCATION_THEME_IDS = new Set<string>([
  'theme-new-orleans',
  'theme-detroit-motown',
  'theme-memphis',
  'theme-kingston',
]);

/**
 * Classify a theme id into its Topic family, or `null` when the id is absent or
 * outside the canonical inventory (e.g. a teacher's personal theme).
 */
export const topicOf = (
  themeId: string | undefined | null,
): ThemeTopic | null => {
  if (!themeId) return null;
  if (SEASONAL_THEME_IDS.has(themeId)) return 'seasonal';
  if (GENRE_THEME_IDS.has(themeId)) return 'genre';
  if (LOCATION_THEME_IDS.has(themeId)) return 'location';
  return null;
};
