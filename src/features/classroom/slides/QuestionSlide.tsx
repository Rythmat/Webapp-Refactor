/**
 * Question slide (step 4) — the interaction question rendered big.
 *
 * Response data NEVER flows through this file: student inputs and reveal
 * visualizations arrive as pre-gated `slots` from the owning surface. The
 * projector's reveal slot returns null pre-reveal — until then the slide
 * shows the live status chip ("responses coming in").
 */
import { pickLocalized, secondaryLine } from '../presentation/localized';
import type { Interaction, LocalizedText, StudentLanguage } from '../types';
import { SlideFrame } from './parts/SlideFrame';
import { SlideHeading } from './parts/SlideHeading';
import type { SlideSlots } from './SlideRenderer';
import type {
  InteractionSlide as InteractionSlideModel,
  SlideSurface,
} from './types';

const RESPONSES_INCOMING: LocalizedText = {
  en: 'Responses coming in…',
  es: 'Llegando respuestas…',
};

export interface QuestionSlideProps {
  slide: InteractionSlideModel;
  surface: SlideSurface;
  language: StudentLanguage;
  interactions: Interaction[];
  slots?: SlideSlots;
}

/** Bilingual interaction-question block at the slide question scale. */
const QuestionText = ({
  question,
  language,
  scale = 1,
}: {
  question: LocalizedText;
  language: StudentLanguage;
  scale?: number;
}) => {
  const text = pickLocalized(question, language);
  const alt = secondaryLine(question, language);
  return (
    <div className="flex flex-col gap-1.5">
      <p
        className="font-semibold leading-tight text-white"
        style={{ fontSize: `calc(var(--slide-question-fz) * ${scale})` }}
      >
        {text}
      </p>
      {alt && (
        <p
          className="text-white/50"
          style={{
            fontSize: `calc(var(--slide-question-fz) * ${scale} * 0.6)`,
          }}
        >
          {alt}
        </p>
      )}
    </div>
  );
};

/** Fallback "responses coming in" pill when no statusChip slot is provided. */
const IncomingChip = ({ language }: { language: StudentLanguage }) => (
  <span
    className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-white/60"
    style={{ fontSize: 'var(--slide-body-fz)' }}
  >
    <span aria-hidden className="slide-frame__chip-dot" />
    {pickLocalized(RESPONSES_INCOMING, language)}
    {secondaryLine(RESPONSES_INCOMING, language) && (
      <span className="text-white/35">
        · {secondaryLine(RESPONSES_INCOMING, language)}
      </span>
    )}
  </span>
);

export const QuestionSlide = ({
  slide,
  surface,
  language,
  interactions,
  slots,
}: QuestionSlideProps) => {
  if (surface === 'student') {
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <SlideHeading
            title={slide.title}
            prompt={slide.prompt}
            language={language}
          />
          {interactions.map((interaction) => (
            <div key={interaction.id} className="flex flex-col gap-4">
              <QuestionText
                question={interaction.question}
                language={language}
              />
              {slots?.input?.(interaction)}
            </div>
          ))}
        </div>
      </SlideFrame>
    );
  }

  if (surface === 'teacher') {
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <SlideHeading title={slide.title} language={language} />
          {interactions.map((interaction) => (
            <div key={interaction.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <QuestionText
                  question={interaction.question}
                  language={language}
                  scale={0.9}
                />
                {slots?.statusChip}
              </div>
              {slots?.reveal?.(interaction)}
            </div>
          ))}
        </div>
      </SlideFrame>
    );
  }

  // Projector — the question big; reveal viz once the teacher reveals,
  // otherwise the live "responses coming in" chip.
  return (
    <SlideFrame slide={slide} surface={surface} language={language}>
      <div className="flex min-h-0 flex-1 flex-col gap-8">
        <SlideHeading title={slide.title} language={language} />
        {interactions.map((interaction) => {
          const reveal = slots?.reveal?.(interaction) ?? null;
          return (
            <div
              key={interaction.id}
              className="flex min-h-0 flex-1 flex-col gap-6"
            >
              <QuestionText
                question={interaction.question}
                language={language}
              />
              {reveal ?? (
                <div className="flex items-center gap-3">
                  {slots?.statusChip ?? <IncomingChip language={language} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SlideFrame>
  );
};
