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
import { WORLD_EVENTS } from './world';

export const MUSIC_HISTORY: HistoricalEvent[] = [
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

// Deduplicated list of all genres across cities + events for search matching
export const ALL_GENRES: string[] = (() => {
  const cityGenres = CITIES.flatMap((c) => c.genres);
  const eventGenres = MUSIC_HISTORY.flatMap((e) => e.genre);
  return [...new Set([...cityGenres, ...eventGenres])].sort();
})();
