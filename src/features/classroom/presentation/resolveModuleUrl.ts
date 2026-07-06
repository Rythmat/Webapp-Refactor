/**
 * Resolve a LaunchTile's `{ module, activityRef }` pair to a concrete URL.
 *
 * Per the fresh-build brief, Launch tiles resolve their URLs from the tenant's
 * configured module links or the teacher's Atlas Resource Library. Until that
 * config surface exists, this resolver falls back to naïve app-internal routes
 * for the four Atlas modules — Learn, Studio, Globe, Arcade — so the demo
 * Presentation Mode has real click targets.
 *
 * If a module has no fallback (or if a future non-Atlas module gets requested),
 * the resolver returns null; the LaunchTile UI shows "Configure in Settings"
 * instead of dead-linking.
 */
import type { LaunchTile } from '../types';

const MODULE_FALLBACKS: Record<LaunchTile['module'], string> = {
  learn: '/learn',
  studio: '/studio',
  globe: '/atlas',
  arcade: '/arcade',
};

export const resolveModuleUrl = (tile: LaunchTile): string | null => {
  const base = MODULE_FALLBACKS[tile.module];
  if (!base) return null;
  const ref = tile.activityRef?.trim();
  if (!ref) return base;

  // Convention: activityRef is a colon-separated deep-link key. The demo
  // resolver appends it as a slug so a teacher can eyeball it in the URL bar.
  // A real resolver will map this to concrete routes per module.
  const slug = encodeURIComponent(ref);
  return `${base}?ref=${slug}`;
};
