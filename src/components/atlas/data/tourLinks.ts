import { GENRE_COURSES } from '@/components/learn/genreCourses';
import { LearnRoutes, SongRoutes, StudioRoutes } from '@/constants/routes';
import { STYLE_OPTIONS } from '@/features/promptSong/styleOptions';

/**
 * Where a tour leads once its stops are done (owner, 2026-11-09: Hear it on
 * the Globe → Learn it → Make it in the Studio), keyed by Learn's genre slug,
 * the one id all three understand.
 */

/** The Studio's genre project templates (src/daw/data/projectTemplates.ts). */
const STUDIO_TEMPLATES: Readonly<Record<string, string>> = {
  rock: 'project-rock',
  rnb: 'project-rnb',
  pop: 'project-pop',
};

/** Learn's name for a genre course, or null for a slug Learn doesn't teach. */
export const learnTitle = (slug: string): string | null =>
  GENRE_COURSES.find((c) => c.slug === slug)?.title ?? null;

/** The Learn genre course. */
export const learnHref = (slug: string): string =>
  LearnRoutes.genreCourse({ genre: slug });

/** A small stable number from a string, so a tour's track is the same each time. */
function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The Studio with a track in the style: its project template where there is
 * one, else a song idea built from the style's name (`?prompt=`), seeded by
 * the tour so it opens on the same idea each time.
 */
export function studioHref(slug: string, tourId: string): string {
  const template = STUDIO_TEMPLATES[slug];
  if (template) return `${StudioRoutes.editor()}?template=${template}`;
  const text = STYLE_OPTIONS.find((s) => s.id === slug)?.text ?? slug;
  return `${StudioRoutes.editor()}?prompt=${encodeURIComponent(text)}&promptSeed=${seedOf(tourId)}`;
}

/** A song's lead sheet in Learn's library. */
export const songHref = (songId: string): string => SongRoutes.song({ songId });
