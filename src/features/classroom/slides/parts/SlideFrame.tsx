/**
 * Full-bleed slide shell shared by every slide kind and surface. Near-black
 * field, soft radial teal glow behind the focal area, and the bilingual
 * phase chip top-left. `data-surface` drives the per-surface type scale
 * defined in ../slides.css.
 */
import type { CSSProperties, ReactNode } from 'react';
import { STUDENT_PHASE_LABELS } from '../../phases';
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { StudentLanguage } from '../../types';
import type { Slide, SlideSurface } from '../types';
import '../slides.css';

interface SlideFrameProps {
  slide: Slide;
  surface: SlideSurface;
  language: StudentLanguage;
  children: ReactNode;
  className?: string;
  /** Inline style merged onto the frame element. The Presentation surface uses
   *  it to set a per-phase `--slide-accent` (recolors the glow + chip dot). */
  style?: CSSProperties;
}

export const SlideFrame = ({
  slide,
  surface,
  language,
  children,
  className,
  style,
}: SlideFrameProps) => {
  const phaseLabel = STUDENT_PHASE_LABELS[slide.phase];
  const label = pickLocalized(phaseLabel, language);
  const labelAlt = secondaryLine(phaseLabel, language);

  return (
    <div
      data-surface={surface}
      style={style}
      className={`slide-frame relative flex h-full w-full flex-col overflow-hidden ${className ?? ''}`}
    >
      <div
        aria-hidden
        className="slide-frame__glow pointer-events-none absolute inset-0"
      />

      <div className="relative z-10 flex items-center px-[4%] pt-[3%]">
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

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-[4%] pb-[4%] pt-[2%]">
        {children}
      </div>
    </div>
  );
};
