/**
 * The Group Practice slide runs the Studio itself (owner, 2026-11-10: "I
 * need the Group Practice to be inside the slides"): the real editor with
 * the class's tutorial, framed from its own page (`SlideStudioPage`,
 * `/studio/slide`), as the lesson globe frames the Globe.
 *
 * What the slide and its frame say to each other, same origin only:
 *
 *   slide → frame   `slide-studio:step`   go to the tutorial's step `at`
 *   frame → slide   `slide-studio:state`  the step it is on, of how many
 *   frame → slide   `slide-studio:key`    a key that moves the lesson
 *
 * Present is moved with the arrow keys (owner, 2026-11-10), the Studio's
 * steps first. While the Studio has the keyboard, an arrow it uses (moving a
 * clip, a Prism suggestion, a field's caret) stays with it; any other, and a
 * clicker's Page Up / Page Down, goes to the lesson.
 */
import { StudioRoutes } from '@/constants/routes';
import type { Interaction } from '../../types';
import type { Slide } from '../types';

const TUTORIAL_PREFIX = 'studio:tutorial:';

/**
 * The tutorial a slide's class does together in the Studio: an app-route
 * slide whose activity is a Studio tutorial. Null for anything else.
 */
export const studioTutorialOf = (
  slide: Slide,
  interactions: readonly Interaction[],
): string | null => {
  if (slide.kind !== 'app-route') return null;
  const atlas = interactions[0]?.atlas;
  if (atlas?.module !== 'studio') return null;
  if (!atlas.activityRef.startsWith(TUTORIAL_PREFIX)) return null;
  const id = atlas.activityRef.slice(TUTORIAL_PREFIX.length);
  return /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
};

/** The class the frame does the tutorial with, in a live session. */
export interface StudioFollow {
  sessionId: string;
  /**
   * The teacher's Present: the class goes where this Studio goes. Otherwise
   * (the room's screen) it only watches the class's step.
   */
  lead: boolean;
  /** The class's step, once the session has one for this slide. */
  step?: number | undefined;
}

/** The page the slide's frame opens. */
export const slideStudioSrc = (
  tutorialId: string,
  follow?: StudioFollow,
): string =>
  StudioRoutes.slide(undefined, {
    tutorial: tutorialId,
    ...(follow
      ? {
          follow: '1',
          session: follow.sessionId,
          activityRef: `${TUTORIAL_PREFIX}${tutorialId}`,
          ...(follow.lead ? { lead: '1' } : { watch: '1' }),
        }
      : {}),
  });

export const SLIDE_STUDIO_STEP = 'slide-studio:step';
export const SLIDE_STUDIO_STATE = 'slide-studio:state';
export const SLIDE_STUDIO_KEY = 'slide-studio:key';

export interface SlideStudioStep {
  type: typeof SLIDE_STUDIO_STEP;
  at: number;
}

export interface SlideStudioState {
  type: typeof SLIDE_STUDIO_STATE;
  /** 0-based. */
  step: number;
  total: number;
}

export interface SlideStudioKey {
  type: typeof SLIDE_STUDIO_KEY;
  key: string;
}

const typed = (data: unknown, type: string): data is Record<string, unknown> =>
  typeof data === 'object' &&
  data !== null &&
  (data as { type?: unknown }).type === type;

const index = (n: unknown): n is number =>
  Number.isInteger(n) && Number(n) >= 0;

export const isSlideStudioStep = (data: unknown): data is SlideStudioStep =>
  typed(data, SLIDE_STUDIO_STEP) && index(data.at);

export const isSlideStudioState = (data: unknown): data is SlideStudioState =>
  typed(data, SLIDE_STUDIO_STATE) &&
  index(data.step) &&
  index(data.total) &&
  Number(data.total) > 0;

/**
 * A clicker's keys, and the lesson key each stands for where Present and the
 * room's screen listen (they move slides on the arrows).
 */
export const CLICKER_KEYS: Readonly<Record<string, string>> = {
  PageDown: 'ArrowRight',
  PageUp: 'ArrowLeft',
};

/** The arrows, which move the lesson when the Studio has no use for them. */
export const ARROW_KEYS: ReadonlySet<string> = new Set([
  'ArrowRight',
  'ArrowLeft',
]);

/** The lesson key a frame's key stands for. */
export const lessonKeyOf = (key: string): string => CLICKER_KEYS[key] ?? key;

export const isSlideStudioKey = (data: unknown): data is SlideStudioKey =>
  typed(data, SLIDE_STUDIO_KEY) &&
  typeof data.key === 'string' &&
  (data.key in CLICKER_KEYS || ARROW_KEYS.has(data.key));
