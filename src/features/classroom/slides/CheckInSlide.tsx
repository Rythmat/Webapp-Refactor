/**
 * Check-in slide (step 2) — emotional check-in.
 *
 * Rule 2 by construction: check-ins are structurally teacher-only. The
 * projector surface renders title + question + the status chip (typically a
 * ParticipationPulse — counts and anonymous dots) and NEVER mounts any
 * response payload or reveal slot. Only the teacher surface mounts
 * `slots.reveal` (the identified check-in aggregate, pre-gated upstream).
 */
import { pickLocalized, secondaryLine } from '../presentation/localized';
import type { Interaction, LocalizedText, StudentLanguage } from '../types';
import type { SlideSlots } from './SlideRenderer';
import { SlideFrame } from './parts/SlideFrame';
import { SlideHeading } from './parts/SlideHeading';
import type {
  InteractionSlide as InteractionSlideModel,
  SlideSurface,
} from './types';

const TEACHER_ONLY_NOTE: LocalizedText = {
  en: 'Only your teacher sees your answer',
  es: 'Solo tu maestro ve tu respuesta',
};

export interface CheckInSlideProps {
  slide: InteractionSlideModel;
  surface: SlideSurface;
  language: StudentLanguage;
  interactions: Interaction[];
  slots?: SlideSlots;
}

const QuestionText = ({
  question,
  language,
}: {
  question: LocalizedText;
  language: StudentLanguage;
}) => {
  const text = pickLocalized(question, language);
  const alt = secondaryLine(question, language);
  return (
    <div className="flex flex-col gap-1.5">
      <p
        className="font-semibold leading-tight text-white"
        style={{ fontSize: 'var(--slide-question-fz)' }}
      >
        {text}
      </p>
      {alt && (
        <p
          className="text-white/50"
          style={{ fontSize: 'calc(var(--slide-question-fz) * 0.6)' }}
        >
          {alt}
        </p>
      )}
    </div>
  );
};

export const CheckInSlide = ({
  slide,
  surface,
  language,
  interactions,
  slots,
}: CheckInSlideProps) => {
  if (surface === 'student') {
    // The input slot is the star — oversized, with the teacher-only
    // reassurance line underneath.
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <SlideHeading
            title={slide.title}
            prompt={slide.prompt}
            language={language}
          />
          {interactions.map((interaction) => (
            <div key={interaction.id} className="flex flex-1 flex-col gap-4">
              <QuestionText
                question={interaction.question}
                language={language}
              />
              <div className="flex-1">{slots?.input?.(interaction)}</div>
            </div>
          ))}
          <p
            className="text-center text-white/40"
            style={{ fontSize: 'calc(var(--slide-body-fz) * 0.9)' }}
          >
            {pickLocalized(TEACHER_ONLY_NOTE, language)}
            {secondaryLine(TEACHER_ONLY_NOTE, language) && (
              <span> · {secondaryLine(TEACHER_ONLY_NOTE, language)}</span>
            )}
          </p>
        </div>
      </SlideFrame>
    );
  }

  if (surface === 'teacher') {
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <SlideHeading title={slide.title} language={language} />
            {slots?.statusChip}
          </div>
          {interactions.map((interaction) => (
            <div key={interaction.id} className="flex flex-col gap-3">
              <QuestionText
                question={interaction.question}
                language={language}
              />
              {slots?.reveal?.(interaction)}
            </div>
          ))}
        </div>
      </SlideFrame>
    );
  }

  // Projector — title + question + status chip ONLY. No reveal slot, no
  // response payload of any kind (Rule 2: check-ins never reach the class).
  return (
    <SlideFrame slide={slide} surface={surface} language={language}>
      <div className="flex min-h-0 flex-1 flex-col gap-8">
        <SlideHeading title={slide.title} language={language} />
        {interactions.map((interaction) => (
          <QuestionText
            key={interaction.id}
            question={interaction.question}
            language={language}
          />
        ))}
        {slots?.statusChip && (
          <div className="flex items-center gap-3">{slots.statusChip}</div>
        )}
      </div>
    </SlideFrame>
  );
};
