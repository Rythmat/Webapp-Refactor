/**
 * Theme additive-merge: canonical wins for months. The canonical 12 monthly
 * themes (months 1–12, ids theme-january…theme-december) replace our 10 month
 * themes by id and add theme-june/theme-july; our genre + location themes
 * (ids not present in the canonical set) are kept untouched.
 *
 * Ordering is monthly-block-first so `byMonth` stays deterministic — genre and
 * location themes carry month numbers too, but they follow the monthly block.
 * All 24 annual-plan unit `themeId` bindings stay valid (ids unchanged).
 */
import type { Theme } from '../types';

export const mergeThemes = (
  ourThemes: Theme[],
  canonicalThemes: Theme[],
): Theme[] => {
  const canonicalIds = new Set(canonicalThemes.map((t) => t.id));
  const monthly = [...canonicalThemes].sort(
    (a, b) => (a.month ?? 99) - (b.month ?? 99),
  );
  const extras = ourThemes.filter((t) => !canonicalIds.has(t.id));
  return [...monthly, ...extras];
};
