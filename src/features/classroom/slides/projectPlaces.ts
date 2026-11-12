import type { LaunchTile, LocalizedText, WorkPlace } from '../types';

// ── Where a student works in the Individual Project (owner, 2026-11-11) ────
// Six places, chosen on one slide: each an app icon beaming into the Music
// Atlas logo (`PlaceMenu`; Arcade joined the five on 2026-11-12). The deck
// builder makes the slide's tiles from this list and the slide's menu knows
// a place by its ref, so both read the same six. The clips are recordings of
// the app (public/videos/places), made by scripted runs against the dev
// server, shown where a student's work is featured; Arcade has none.

export type ProjectPlaceId = WorkPlace;

export interface ProjectPlace {
  id: ProjectPlaceId;
  module: LaunchTile['module'];
  /** Resolved by `resolveActivityRefHref`. */
  ref: string;
  label: LocalizedText;
  /** The place, playing: a silent loop, and its first frame for stills. */
  clip?: { src: string; poster: string };
}

const clip = (id: ProjectPlaceId) => ({
  src: `/videos/places/${id}.mp4`,
  poster: `/videos/places/${id}.jpg`,
});

export const PROJECT_PLACES: readonly ProjectPlace[] = [
  {
    id: 'learn',
    clip: clip('learn'),
    module: 'learn',
    ref: 'learn:home',
    label: { en: 'Learn', es: 'Aprende' },
  },
  {
    id: 'songs',
    clip: clip('songs'),
    module: 'learn',
    ref: 'learn:songs',
    label: { en: 'Songs', es: 'Canciones' },
  },
  {
    id: 'library',
    clip: clip('library'),
    module: 'studio',
    ref: 'studio:library',
    label: { en: 'Library', es: 'Biblioteca' },
  },
  {
    id: 'studio',
    clip: clip('studio'),
    module: 'studio',
    ref: 'studio:editor',
    label: { en: 'Studio', es: 'Studio' },
  },
  {
    id: 'globe',
    clip: clip('globe'),
    module: 'globe',
    ref: 'globe:home',
    label: { en: 'Globe', es: 'Globo' },
  },
  {
    id: 'arcade',
    module: 'arcade',
    ref: 'arcade:root',
    label: { en: 'Arcade', es: 'Arcade' },
  },
];

/** The place a tile's ref opens, if it is one of the six. */
export const projectPlaceFor = (ref: string): ProjectPlace | undefined =>
  PROJECT_PLACES.find((place) => place.ref === ref);

/** The six places as a slide's tiles, with ids stable under `prefix`. */
export const projectPlaceTiles = (prefix: string): LaunchTile[] =>
  PROJECT_PLACES.map((place) => ({
    id: `${prefix}-tile-${place.id}`,
    module: place.module,
    activityRef: place.ref,
    label: place.label,
  }));
