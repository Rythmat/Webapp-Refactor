/**
 * The stage presets (owner, 2026-11-10): slides that are one thing, big.
 *
 *   hero      the live layer alone, centred: the question, or the class's
 *             activity (its cover and name) with the class's status
 *   bleed     the slide's visual edge to edge: a video, an interactive globe.
 *             An interaction slide asks its question on students' devices
 *             only; the room sees the visual until the teacher reveals
 *   portrait  the subject's photo edge to edge, the name and a short bio
 *
 * Pure: no React.
 */
import { SLIDE_GRID, type ZoneRect } from './slideGrid';
import type { Slide, SlideMedia, SlideSurface } from './types';

export type SlideStageKind = 'hero' | 'bleed' | 'portrait';

const STAGE_PRESETS: Readonly<Record<string, SlideStageKind>> = {
  hero: 'hero',
  bleed: 'bleed',
  portrait: 'portrait',
};

export const stageKindOf = (
  slide: Pick<Slide, 'presetId'>,
): SlideStageKind | undefined =>
  slide.presetId ? STAGE_PRESETS[slide.presetId] : undefined;

/**
 * The band a stage slide's live layer and reveal take: the whole safe area
 * from the top margin, above the footer strip (which keeps the question
 * under a reveal).
 */
export const STAGE_BAND: ZoneRect = {
  x: 64,
  y: 64,
  w: 1152,
  h: SLIDE_GRID.footer.rect.y - 16 - 64,
};

/** The whole canvas: a full-screen slide's reveal covers it. */
export const FULL_CANVAS: ZoneRect = { x: 0, y: 0, w: 1280, h: 720 };

/** The slide's own visual: `media`, else `sideMedia`. */
export const stageMedia = (slide: Slide): SlideMedia | undefined =>
  ('media' in slide ? slide.media : undefined) ??
  ('sideMedia' in slide ? slide.sideMedia : undefined);

/**
 * Whether the room's screen shows the question before a reveal. A `bleed`
 * interaction slide is its visual on the room's screen: the question is on
 * the students' devices.
 */
export const projectsQuestion = (
  slide: Pick<Slide, 'presetId' | 'kind'>,
  surface: SlideSurface,
): boolean =>
  !(
    surface !== 'student' &&
    slide.kind === 'interaction' &&
    stageKindOf(slide) === 'bleed'
  );

/**
 * Whether the stage paints the slide's visual edge to edge on this surface.
 * A student's device gets a `bleed` interaction slide's question, not its
 * video (videos play on the room's screen).
 */
export const paintsBleed = (slide: Slide, surface: SlideSurface): boolean => {
  const kind = stageKindOf(slide);
  if (kind === 'portrait') return true;
  if (kind !== 'bleed') return false;
  return !(surface === 'student' && slide.kind === 'interaction');
};
