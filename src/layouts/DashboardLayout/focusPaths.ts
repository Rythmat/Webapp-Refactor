import { GlobeRoutes } from '@/constants/routes';
import { audioModule } from '@/curriculum/audio/catalog';
import { isGuidedLessonPath } from '@/curriculum/guided/guidedPaths';
import { isFundamentalsLessonPath } from '@/curriculum/piano/fundamentals/course';
import { isEditorPath } from '@/daw/preload';

/** The Globe: one full-window page (owner, 2026-10-29). */
export const isGlobePath = (pathname: string): boolean =>
  pathname === GlobeRoutes.root() || pathname === `${GlobeRoutes.root()}/`;

export { isFundamentalsLessonPath, isGuidedLessonPath };

/** A guided Audio lesson: the whole window, one screen at a time. */
export function isAudioPlayerPath(pathname: string): boolean {
  const match = /^\/learn\/audio\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (!match) return false;
  return (
    audioModule(match[1])?.lessons.some(
      (lesson) => lesson.kind === 'guided' && lesson.id === match[2],
    ) ?? false
  );
}

/**
 * The pages that take the whole window — no sidebar, TopRail, mobile tab bar
 * or chord-notation bar: the Studio editor, and the Globe in the Studio's
 * frame (owner, 2026-10-29).
 */
export const isFocusPath = (pathname: string): boolean =>
  isEditorPath(pathname) ||
  isGlobePath(pathname) ||
  isAudioPlayerPath(pathname) ||
  isFundamentalsLessonPath(pathname) ||
  isGuidedLessonPath(pathname);
