/**
 * MUSIC_HISTORY's canonical re-export point.
 *
 * The array now lives in src/content/contentStore.ts and is hydrated at runtime
 * from the published CDN bundle, falling back to ./events/*.ts when no CDN is
 * configured. Importers keep the specifier they always used.
 *
 * See the header comment in contentStore.ts for the one rule that matters:
 * never snapshot this array at module scope.
 */
export { MUSIC_HISTORY } from '@/content/contentStore';
