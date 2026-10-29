import { GlobeRoutes } from '@/constants/routes';
import { isEditorPath } from '@/daw/preload';

/** The Globe: one full-window page (owner, 2026-10-29). */
export const isGlobePath = (pathname: string): boolean =>
  pathname === GlobeRoutes.root() || pathname === `${GlobeRoutes.root()}/`;

/**
 * The pages that take the whole window — no sidebar, TopRail, mobile tab bar
 * or chord-notation bar: the Studio editor, and the Globe in the Studio's
 * frame (owner, 2026-10-29).
 */
export const isFocusPath = (pathname: string): boolean =>
  isEditorPath(pathname) || isGlobePath(pathname);
