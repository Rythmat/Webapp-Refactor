/**
 * SlideFrameChrome — the decorative shell shared by every slide surface: the
 * soft radial accent glow plus the bilingual phase chip pinned top-left. Shared
 * by the legacy flow `SlideFrame` and the freeform `SlideStage` so both look
 * identical. The chip is non-interactive (pointer-events-none) so it never
 * blocks selecting/dragging blocks beneath it in the editor.
 */
import { STUDENT_PHASE_LABELS } from '../../phases';
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { StudentLanguage } from '../../types';
import type { Slide } from '../types';

interface SlideFrameChromeProps {
  slide: Slide;
  language: StudentLanguage;
}

export const SlideFrameChrome = ({
  slide,
  language,
}: SlideFrameChromeProps) => {
  const phaseLabel = STUDENT_PHASE_LABELS[slide.phase];
  const label = pickLocalized(phaseLabel, language);
  const labelAlt = secondaryLine(phaseLabel, language);

  return (
    <>
      <div
        aria-hidden
        className="slide-frame__glow pointer-events-none absolute inset-0"
      />
      {slide.hidePhaseLabel === false && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center px-[4%] pt-[3%]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
            <span aria-hidden className="slide-frame__chip-dot" />
            <span
              className="font-semibold uppercase tracking-widest text-white/80"
              style={{ fontSize: 'var(--slide-label-fz)' }}
            >
              {label}
              {labelAlt && <span className="text-white/40"> · {labelAlt}</span>}
            </span>
          </span>
        </div>
      )}
    </>
  );
};
