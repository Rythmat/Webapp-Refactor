/**
 * lessonThumbnail — derive a representative image SOURCE for a Lesson (`Day`),
 * used by the Lessons-page card banner. Pure + synchronous (no `getSong`, no
 * fetch) so it's unit-testable; the renderer (`LessonThumb`) resolves the actual
 * image + precedence at render time.
 *
 * A Day can reference a song (structured `presentation.song`, a deck slide's
 * artistImage/chordChart media, a `song:<id>:*` launch tile, or a legacy
 * `/songs/<id>` slug) and/or a globe location (`globe:region:<id>` /
 * `globe:city:<id>` launch tiles). Both signals are returned when present;
 * `LessonThumb` applies precedence (artist image → location polygon → …).
 */
import { CITIES, REGIONS } from '@/components/atlas/data';
import type { SlideMedia } from '../slides/types';
import type { Day, LaunchTile } from '../types';

export interface LessonThumbSource {
  /** A song this lesson features (resolve to `song.artistImageRef`). */
  songId?: string;
  /** A globe region/city this lesson features (render a polygon thumbnail). */
  location?: { center: [number, number]; zoom: number };
}

const idAfter = (ref: string, n: number): string =>
  ref.split(':').slice(n).join(':');

/** Every launch tile across the Day's phase cells + deck content slides. */
const allLaunchTiles = (day: Day): LaunchTile[] => {
  const tiles: LaunchTile[] = [];
  for (const cell of Object.values(day.cells)) {
    tiles.push(...cell.presentation.launchTiles);
  }
  for (const slide of day.deck?.slides ?? []) {
    if (slide.kind === 'content' && slide.launchTiles) {
      tiles.push(...slide.launchTiles);
    }
  }
  return tiles;
};

/** Every media/sideMedia across the deck's slides. */
const allSlideMedia = (day: Day): SlideMedia[] => {
  const media: SlideMedia[] = [];
  for (const slide of day.deck?.slides ?? []) {
    if ('media' in slide && slide.media) media.push(slide.media);
    if ('sideMedia' in slide && slide.sideMedia) media.push(slide.sideMedia);
  }
  return media;
};

const songIdFromDay = (
  day: Day,
  tiles: LaunchTile[],
  media: SlideMedia[],
): string | undefined => {
  // 1. The structured "song of the day" the annual-plan materializer writes.
  for (const cell of Object.values(day.cells)) {
    const id = cell.presentation.song?.id;
    if (id) return id;
  }
  // 2. Deck provenance + song-bearing slide media.
  if (day.deck?.templateRef?.songId) return day.deck.templateRef.songId;
  for (const m of media) {
    if (m.type === 'artistImage' || m.type === 'chordChart') return m.songId;
  }
  // 3. A song launch tile (`song:<id>:*` or `studio:song:<id>`).
  for (const t of tiles) {
    if (t.activityRef.startsWith('song:')) return t.activityRef.split(':')[1];
    if (t.activityRef.startsWith('studio:song:'))
      return idAfter(t.activityRef, 2);
  }
  // 4. Legacy `/songs/<id>` slug scraped from prompt prose (migration only).
  const match = /\/songs\/([A-Za-z0-9_-]+)/.exec(JSON.stringify(day.cells));
  return match ? match[1] : undefined;
};

const locationFromDay = (
  tiles: LaunchTile[],
): { center: [number, number]; zoom: number } | undefined => {
  for (const t of tiles) {
    if (t.activityRef.startsWith('globe:region:')) {
      const region = REGIONS.find((r) => r.id === idAfter(t.activityRef, 2));
      if (region) return { center: region.center, zoom: region.zoom };
    }
    if (t.activityRef.startsWith('globe:city:')) {
      const city = CITIES.find((c) => c.id === idAfter(t.activityRef, 2));
      if (city) return { center: city.coordinates, zoom: 3 };
    }
  }
  return undefined;
};

export const lessonThumbnailSource = (day: Day): LessonThumbSource => {
  const tiles = allLaunchTiles(day);
  const media = allSlideMedia(day);
  const songId = songIdFromDay(day, tiles, media);
  const location = locationFromDay(tiles);
  return { ...(songId ? { songId } : {}), ...(location ? { location } : {}) };
};
