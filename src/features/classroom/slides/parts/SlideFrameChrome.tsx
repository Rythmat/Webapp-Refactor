/**
 * SlideFrameChrome — the decorative shell shared by every slide surface: the
 * soft radial accent glow, the optional left accent bar, and the bilingual
 * section chip pinned top-left. The chip is non-interactive (pointer-events-none) so it never
 * blocks selecting/dragging blocks beneath it in the editor.
 */
import type { StudentLanguage } from '../../types';
import { showsPhaseChip } from '../deck';
import { SLIDE_GRID } from '../slideGrid';
import type { Slide } from '../types';
import { SectionChip } from './SectionChip';

interface SlideFrameChromeProps {
  slide: Slide;
  language: StudentLanguage;
}

export const SlideFrameChrome = ({
  slide,
  language,
}: SlideFrameChromeProps) => {
  return (
    <>
      <div
        aria-hidden
        className="slide-frame__glow pointer-events-none absolute inset-0"
      />
      {slide.accentBar && (
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: SLIDE_GRID.accentBar.rect.x,
            top: SLIDE_GRID.accentBar.rect.y,
            width: SLIDE_GRID.accentBar.rect.w,
            height: SLIDE_GRID.accentBar.rect.h,
            background: 'var(--slide-accent, #7ecfcf)',
          }}
        />
      )}
      {showsPhaseChip(slide) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center px-[4%] pt-[3%]">
          <SectionChip slide={slide} language={language} />
        </div>
      )}
    </>
  );
};
