/**
 * showcase slide (Phase 3, user-flow step 7) — students offer their Studio
 * project; the teacher features one for the class.
 *
 * Firewall: the raw offers are teacher-only (buildProjectorView hard-refuses
 * 'showcase'). The projector only ever shows the SINGLE teacher-featured
 * project via the pre-gated `showcaseFrame` slot (from state.showcase — a
 * deliberate, teacher-approved share). The teacher's offer list + Feature
 * controls live in the dashboard's ShowcasePanel, not here.
 */
import { pickLocalized, secondaryLine } from '../presentation/localized';
import type { Interaction, LocalizedText, StudentLanguage } from '../types';
import type { SlideSlots } from './SlideRenderer';
import { SlideFrame } from './parts/SlideFrame';
import { SlideHeading } from './parts/SlideHeading';
import type {
  ShowcaseSlide as ShowcaseSlideModel,
  SlideSurface,
} from './types';

const WAITING: LocalizedText = {
  en: 'Waiting for the teacher to feature a project…',
  es: 'Esperando a que el maestro muestre un proyecto…',
};

export interface ShowcaseSlideProps {
  slide: ShowcaseSlideModel;
  surface: SlideSurface;
  language: StudentLanguage;
  interactions: Interaction[];
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

export const ShowcaseSlide = ({
  slide,
  surface,
  language,
  interactions,
  slots,
}: ShowcaseSlideProps) => {
  if (surface === 'student') {
    const interaction = interactions[0];
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <SlideHeading
            title={slide.title}
            prompt={slide.prompt}
            language={language}
          />
          {interaction && slots?.input?.(interaction)}
        </div>
      </SlideFrame>
    );
  }

  if (surface === 'projector') {
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 text-center">
          {slots?.showcaseFrame ?? (
            <>
              <SlideHeading title={slide.title} language={language} />
              <BiLine
                text={WAITING}
                language={language}
                className="text-white/50"
              />
            </>
          )}
        </div>
      </SlideFrame>
    );
  }

  // Teacher preview — the offer list + Feature button live in the dashboard.
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
          Offers appear in the teacher panel
        </span>
      </div>
    </SlideFrame>
  );
};
