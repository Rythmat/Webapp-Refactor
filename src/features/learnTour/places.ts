import { getGenreProfile } from '@/curriculum/data/genreProfiles';
import { isEditorPath } from '@/daw/preload';
import type { TourContext, TourPlace } from './types';

// ── Where the tours go ─────────────────────────────────────────────────────

/** The song the How to Navigate tour opens (Peter: "I Long To Be Close to You"). */
export const TOUR_SONG_ID = 'they_long_to_be_close_to_you';
export const TOUR_SONG_HREF = `/songs/${TOUR_SONG_ID}`;
/** The genre course it walks through. */
export const TOUR_GENRE_SLUG = 'hip-hop';

const tabOf = (place: TourPlace) =>
  new URLSearchParams(place.search).get('tab') ?? '';

export const learnHref = (tab?: string) =>
  tab ? `/learn?tab=${tab}` : '/learn';

export const atLearn = (place: TourPlace) => place.pathname === '/learn';
export const atLearnHome = (place: TourPlace) =>
  atLearn(place) && tabOf(place) === '';
export const atLearnTab = (tab: string) => (place: TourPlace) =>
  atLearn(place) && tabOf(place) === tab;
export const atSong = (place: TourPlace) => place.pathname === TOUR_SONG_HREF;
export const atGlobe = (place: TourPlace) =>
  place.pathname.startsWith('/atlas/globe');
export const atSetLists = (place: TourPlace) =>
  place.pathname === '/songs/setlists';
export const atCourse = (place: TourPlace) =>
  place.pathname === `/curriculum/${TOUR_GENRE_SLUG}`;
export const atCourseLesson = (place: TourPlace) =>
  new RegExp(`^/curriculum/${TOUR_GENRE_SLUG}/\\d+$`).test(place.pathname);
export const atIonianLesson = (place: TourPlace) =>
  /^\/learn\/(?:keyboard|guitar)\/ionian\/[^/]+$/i.test(place.pathname);
export const atStudio = (place: TourPlace) => isEditorPath(place.pathname);

const pathOf = (href: string) => href.split(/[?#]/)[0].toLowerCase();

/** At the lesson the tour started in (keys in a path are any case). */
export const atReturnLesson = (place: TourPlace, ctx: TourContext) =>
  place.pathname.toLowerCase() === pathOf(ctx.returnTo);

/**
 * A genre lesson or a Theory lesson: where the lesson tour is offered, and
 * where Lesson Settings offers it again. Not Music Literacy (Start Here),
 * Piano Fundamentals or a mode's overview, which lack most of its controls.
 */
export function isLessonPath(pathname: string): boolean {
  const genre = pathname.match(/^\/curriculum\/([^/]+)\/\d+$/);
  if (genre) return !!getGenreProfile(genre[1]);
  const theory = pathname.match(
    /^\/learn\/(?:keyboard|guitar)\/([^/]+)\/[^/]+$/,
  );
  return !!theory && !['relative', 'parallel'].includes(theory[1]);
}
