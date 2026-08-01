/**
 * Resolve a LaunchTile's `{ module, activityRef }` pair to a concrete URL.
 *
 * Phase 2: the real mapping lives in `slides/resolveContentHref.ts` (the ONE
 * shared resolver for app-route slides AND Launch tiles). This delegates to it,
 * falling back to the module's dashboard route when the ref can't be resolved
 * (or when the tile carries no ref). Legacy annual-plan globe tiles carry a
 * bare event id as `activityRef` — the shared resolver handles those.
 */
import { resolveActivityRefHref } from '../slides/resolveContentHref';
import type { LaunchTile } from '../types';

const MODULE_FALLBACKS: Record<LaunchTile['module'], string> = {
  learn: '/learn',
  studio: '/studio',
  // The Globe *dashboard* is at /atlas; the full interactive globe is the sub-route.
  globe: '/atlas/globe',
  arcade: '/arcade',
};

export const resolveModuleUrl = (
  tile: LaunchTile,
  moduleUrls?: Partial<Record<LaunchTile['module'], string>>,
): string | null => {
  // A teacher-configured module URL (Settings) overrides the built-in default
  // base; a specific activityRef still resolves in-SPA.
  const override = moduleUrls?.[tile.module]?.trim();
  const base = override || MODULE_FALLBACKS[tile.module];
  if (!base) return null;
  return resolveActivityRefHref(tile.module, tile.activityRef) ?? base;
};
