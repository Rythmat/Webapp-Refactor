/**
 * app-route slide (Phase 2, user-flow step 5) — routes students into a real
 * Music Atlas module via the referenced atlas Interaction.
 *
 * Response data NEVER flows through this file (firewall): the student launch
 * affordance arrives as a pre-gated `launch` slot from StudentSlideView; the
 * projector shows instructions-only + the count-only status chip; the teacher
 * preview shows the destination. Identified data never reaches the projector.
 */
import { getSong } from '@/curriculum/data/songs';
import { pickLocalized, secondaryLine } from '../presentation/localized';
import type { Interaction, LocalizedText, StudentLanguage } from '../types';
import { SlideFrame } from './parts/SlideFrame';
import { SlideHeading } from './parts/SlideHeading';
import { resolveActivityRefHref } from './resolveContentHref';
import type { SlideSlots } from './SlideRenderer';
import type { AppRouteSlide as AppRouteSlideModel, SlideSurface } from './types';

const ON_YOUR_DEVICE: LocalizedText = {
  en: 'Open the activity on your own device.',
  es: 'Abre la actividad en tu propio dispositivo.',
};
const COME_BACK: LocalizedText = {
  en: "Come back here when you're done.",
  es: 'Vuelve aquí cuando termines.',
};

export interface AppRouteSlideProps {
  slide: AppRouteSlideModel;
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

export const AppRouteSlide = ({
  slide,
  surface,
  language,
  interactions,
  slots,
}: AppRouteSlideProps) => {
  const interaction = interactions[0];

  if (surface === 'student') {
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <SlideHeading
            title={slide.title}
            prompt={slide.prompt}
            language={language}
          />
          {interaction ? (
            slots?.launch?.(interaction)
          ) : (
            <BiLine
              text={{
                en: 'Ask your teacher — this activity is not ready.',
                es: 'Pregunta a tu maestro — esta actividad no está lista.',
              }}
              language={language}
              className="text-white/60"
            />
          )}
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
            text={ON_YOUR_DEVICE}
            language={language}
            className="text-white/60"
          />
          {slots?.statusChip}
        </div>
      </SlideFrame>
    );
  }

  // Teacher preview (wizard DeckPreview / teacher SlideRenderer path): show the
  // destination so the teacher can confirm where students will land.
  const href = interaction?.atlas
    ? resolveActivityRefHref(
        interaction.atlas.module,
        interaction.atlas.activityRef,
        { getSong },
      )
    : null;

  return (
    <SlideFrame slide={slide} surface={surface} language={language}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <SlideHeading title={slide.title} prompt={slide.prompt} language={language} />
        <div className="flex flex-col gap-2">
          <BiLine text={COME_BACK} language={language} className="text-white/55" />
          {interaction?.atlas && (
            <span
              className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/70"
              style={{ fontSize: 'var(--slide-body-fz)' }}
            >
              <span className="text-[#7ecfcf]">{interaction.atlas.module}</span>
              <span className="text-white/40">{href ?? interaction.atlas.activityRef}</span>
            </span>
          )}
        </div>
      </div>
    </SlideFrame>
  );
};
