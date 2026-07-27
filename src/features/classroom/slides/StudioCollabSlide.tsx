/**
 * studio-collab slide (Phase 3, user-flow step 6) — pairs students into a
 * shared Studio session (or sends solo students into their own).
 *
 * Firewall: the pairing action (which reads the roster + auto-joins a collab
 * room) arrives as a pre-gated `pairAction` slot from StudentSlideView. The
 * PROJECTOR renders instructions ONLY — it must never show enrollment ids
 * (pairs carry identifiers; Rule 2). The teacher's pairing controls live in
 * the dashboard's PairingPanel, not here.
 */
import { pickLocalized, secondaryLine } from '../presentation/localized';
import type { LocalizedText, StudentLanguage } from '../types';
import type { SlideSlots } from './SlideRenderer';
import { SlideFrame } from './parts/SlideFrame';
import { SlideHeading } from './parts/SlideHeading';
import type {
  StudioCollabSlide as StudioCollabSlideModel,
  SlideSurface,
} from './types';

const PROJECTOR_INSTRUCTION: LocalizedText = {
  en: 'Open the Studio on your device and build together.',
  es: 'Abre el Studio en tu dispositivo y creen juntos.',
};

export interface StudioCollabSlideProps {
  slide: StudioCollabSlideModel;
  surface: SlideSurface;
  language: StudentLanguage;
  slots?: SlideSlots;
}

const BiLine = ({
  text,
  language,
  className,
}: {
  text: LocalizedText;
  language: StudentLanguage;
  className?: string;
}) => {
  const alt = secondaryLine(text, language);
  return (
    <p className={className} style={{ fontSize: 'var(--slide-body-fz)' }}>
      {pickLocalized(text, language)}
      {alt && <span className="text-white/40"> · {alt}</span>}
    </p>
  );
};

export const StudioCollabSlide = ({
  slide,
  surface,
  language,
  slots,
}: StudioCollabSlideProps) => {
  if (surface === 'student') {
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <SlideHeading
            title={slide.title}
            prompt={slide.prompt}
            language={language}
          />
          {slots?.pairAction}
        </div>
      </SlideFrame>
    );
  }

  if (surface === 'projector') {
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 text-center">
          <SlideHeading
            title={slide.title}
            prompt={slide.prompt}
            language={language}
          />
          <BiLine
            text={PROJECTOR_INSTRUCTION}
            language={language}
            className="text-white/60"
          />
        </div>
      </SlideFrame>
    );
  }

  // Teacher preview (wizard DeckPreview) — pairing itself is run from the
  // dashboard PairingPanel, not through SlideRenderer.
  return (
    <SlideFrame slide={slide} surface={surface} language={language}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <SlideHeading
          title={slide.title}
          prompt={slide.prompt}
          language={language}
        />
        <span
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/60"
          style={{ fontSize: 'var(--slide-body-fz)' }}
        >
          {slide.grouping === 'pairs'
            ? 'Students pair up in the Studio'
            : 'Students each open the Studio'}
        </span>
      </div>
    </SlideFrame>
  );
};
