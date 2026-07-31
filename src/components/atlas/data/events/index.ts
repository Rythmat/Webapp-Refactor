/**
 * The bundled globe-event dataset.
 *
 * This is no longer the runtime source of truth — published content is fetched
 * from the CDN by src/content/contentStore.ts, which imports this module
 * DYNAMICALLY as its fallback. Keep that dynamic: a static import from anywhere
 * would pull ~1.3MB of event data back onto the eager bundle graph, which is
 * exactly what moving to CDN-served content removed.
 *
 * Retained deliberately as the Level-1 rollback path (and for local dev and
 * tests, where no CDN is configured). Behind `await import()` it costs nothing.
 */
import type { HistoricalEvent } from '@/components/atlas/types';
import { CITIES } from '../cities';
import { AFRICAN_EVENTS } from './african';
import { BLUES_EVENTS } from './blues';
import { CLASSICAL_EVENTS } from './classical';
import { ELECTRONIC_EVENTS } from './electronic';
import { FOLK_EVENTS } from './folk';
import { HIPHOP_EVENTS } from './hiphop';
import { JAMBAND_EVENTS } from './jamband';
import { JAZZ_EVENTS } from './jazz';
import { LATIN_EVENTS } from './latin';
import { MUSICFORMEDIA_EVENTS } from './musicForMedia';
import { POP_EVENTS } from './pop';
import { REGGAE_EVENTS } from './reggae';
import { RNBSOULFUNK_EVENTS } from './rnbSoulFunk';
import { ROCK_EVENTS } from './rock';
import { SONG_LIBRARY_EVENTS } from './songLibrary';
import { WORLD_EVENTS } from './world';

export const BUNDLED_MUSIC_HISTORY: HistoricalEvent[] = [
  ...SONG_LIBRARY_EVENTS,
  ...JAZZ_EVENTS,
  ...BLUES_EVENTS,
  ...ROCK_EVENTS,
  ...HIPHOP_EVENTS,
  ...ELECTRONIC_EVENTS,
  ...RNBSOULFUNK_EVENTS,
  ...FOLK_EVENTS,
  ...POP_EVENTS,
  ...LATIN_EVENTS,
  ...REGGAE_EVENTS,
  ...AFRICAN_EVENTS,
  ...CLASSICAL_EVENTS,
  ...JAMBAND_EVENTS,
  ...WORLD_EVENTS,
  ...MUSICFORMEDIA_EVENTS,
];

/**
 * Deduplicated genres across cities + events, for search matching.
 *
 * Was a module-scope IIFE, which cannot work now that events arrive
 * asynchronously. Made a function rather than deleted outright even though it
 * currently has no callers — the atlas copy was only ever re-exported through
 * the data barrels, while every real `ALL_GENRES` consumer imports the unrelated
 * list from `@/types/userProfile`.
 */
export const getBundledGenres = (): string[] => {
  const cityGenres = CITIES.flatMap((c) => c.genres);
  const eventGenres = BUNDLED_MUSIC_HISTORY.flatMap((e) => e.genre);
  return [...new Set([...cityGenres, ...eventGenres])].sort();
};
