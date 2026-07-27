/**
 * PresentSlide — renders one legacy phase cell through the deck shell
 * (`SlideFrame` + `SlideHeading` + `SlideMediaPanel`), so Presentation Mode and
 * the deck surfaces share one design language. The phase cell is adapted to a
 * `Slide` by `phaseCellToSlide`; the presentation-only extras (launch tiles,
 * reset checklist) render inside the frame here rather than being pushed into
 * the deck slot vocabulary.
 *
 * Layout fills the frame: the headline (+ optional song artwork beside it) is
 * vertically centred so the canvas is no longer top-hugging, with launch tiles
 * and the reset checklist below. The frame's `--slide-accent` is set per phase
 * so the glow + chip recolour together.
 */
import type { CSSProperties } from 'react';
import type { StudentPhaseView } from '../buildStudentView';
import { SlideFrame } from '../slides/parts/SlideFrame';
import { SlideHeading } from '../slides/parts/SlideHeading';
import { SlideMediaPanel } from '../slides/parts/SlideMediaPanel';
import type { LocalizedText, StudentLanguage } from '../types';
import { LaunchTile } from './LaunchTile';
import { pickLocalized } from './localized';
import { PHASE_ACCENT_HEX } from './phaseAccent';
import { phaseCellToSlide } from './phaseCellToSlide';

interface PresentSlideProps {
  phase: StudentPhaseView;
  language: StudentLanguage;
}

export const PresentSlide = ({ phase, language }: PresentSlideProps) => {
  const slide = phaseCellToSlide(phase);
  const accentStyle = {
    '--slide-accent': PHASE_ACCENT_HEX[phase.phaseKey],
  } as CSSProperties;
  const labelPrimary = pickLocalized(phase.label, language);

  return (
    <SlideFrame
      slide={slide}
      surface="present"
      language={language}
      style={accentStyle}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-8">
        {/* Headline + optional artwork, centred to fill the canvas. */}
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-8 lg:flex-row lg:items-center">
          <SlideHeading
            title={slide.title}
            prompt={slide.prompt}
            language={language}
            className="flex-1"
          />
          {slide.media && (
            <div className="w-full max-w-[min(38%,22rem)] shrink-0 self-center">
              <SlideMediaPanel
                media={slide.media}
                language={language}
                interactive={false}
              />
            </div>
          )}
        </div>

        {phase.launchTiles.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {phase.launchTiles.map((tile) => (
              <LaunchTile
                key={tile.id}
                tile={tile}
                language={language}
                phaseLabel={labelPrimary}
              />
            ))}
          </div>
        )}

        {phase.resetChecklist && phase.resetChecklist.length > 0 && (
          <ResetChecklist items={phase.resetChecklist} language={language} />
        )}
      </div>
    </SlideFrame>
  );
};

interface ResetChecklistProps {
  items: LocalizedText[];
  language: StudentLanguage;
}

/**
 * Reflect-phase reset checklist. Check state is deliberately ephemeral — it
 * lives in the uncontrolled inputs and evaporates when the slide unmounts.
 */
const ResetChecklist = ({ items, language }: ResetChecklistProps) => (
  <ul className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
    {items.map((item, i) => (
      <li key={i}>
        <label className="flex cursor-pointer items-center gap-3 text-white/85">
          <input type="checkbox" className="size-5 accent-white" />
          <span style={{ fontSize: 'var(--slide-body-fz)' }}>
            {pickLocalized(item, language)}
          </span>
        </label>
      </li>
    ))}
  </ul>
);
