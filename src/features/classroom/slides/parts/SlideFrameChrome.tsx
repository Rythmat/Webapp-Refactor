/**
 * SlideFrameChrome — the shell shared by every slide surface: the optional
 * left accent bar, and on the room's screen a quiet line of the lesson's six
 * sections along the bottom edge, the current one lit.
 *
 * No words (owner, 2026-11-10: "no extra text at all"). The section chip that
 * used to sit top-left is gone from every surface; the editor's filmstrip and
 * the teacher's panel still name the sections.
 */
import { SECTIONS, sectionOf } from '../sections';
import { SLIDE_GRID } from '../slideGrid';
import { stageKindOf } from '../stage';
import type { Slide, SlideSurface } from '../types';

interface SlideFrameChromeProps {
  slide: Slide;
  surface: SlideSurface;
}

/** Projected surfaces only: a student's own device needs no map of the room. */
const SHOWS_PROGRESS: ReadonlySet<SlideSurface> = new Set([
  'projector',
  'present',
]);

export const SectionProgress = ({ slide }: { slide: Slide }) => {
  const current = sectionOf(slide);
  return (
    <div
      aria-hidden
      data-section-progress=""
      className="pointer-events-none absolute inset-x-[64px] bottom-[20px] z-10 flex gap-[6px]"
    >
      {SECTIONS.map((section) => (
        <span
          key={section}
          className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${
            section === current ? 'bg-white/80' : 'bg-white/[0.12]'
          }`}
        />
      ))}
    </div>
  );
};

/** Whether a surface shows the section line for a slide. */
export const showsSectionProgress = (slide: Slide, surface: SlideSurface) =>
  // A full-screen video or globe is left whole.
  SHOWS_PROGRESS.has(surface) && stageKindOf(slide) !== 'bleed';

/**
 * The accent bar, on the canvas. The section line is the stage's own, along
 * the bottom of whatever it fills (the window, on the room's screen).
 */
export const SlideFrameChrome = ({ slide }: SlideFrameChromeProps) => (
  <>
    {slide.accentBar && (
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: SLIDE_GRID.accentBar.rect.x,
          top: SLIDE_GRID.accentBar.rect.y,
          width: SLIDE_GRID.accentBar.rect.w,
          height: SLIDE_GRID.accentBar.rect.h,
          background: 'var(--slide-accent, #ffffff)',
        }}
      />
    )}
  </>
);
