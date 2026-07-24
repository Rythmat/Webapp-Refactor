/**
 * Exit-poll slide (step 8) — multiple interactions stacked (typically a
 * "one thing you learned" text + a feelings check-in).
 *
 * Firewall shape: the projector mounts the reveal slot ONLY for shareable
 * text interactions (the closing knowledge wall); check-in responses are
 * structurally excluded from the projector no matter what the slots return.
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

export interface ExitPollSlideProps {
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

export const ExitPollSlide = ({
  slide,
  surface,
  language,
  interactions,
  slots,
}: ExitPollSlideProps) => {
  if (surface === 'student') {
    // Stacked cards, one per interaction.
    return (
      <SlideFrame slide={slide} surface={surface} language={language}>
        <div className="flex min-h-0 flex-1 flex-col gap-5">
          <SlideHeading
            title={slide.title}
            prompt={slide.prompt}
            language={language}
          />
          {interactions.map((interaction) => (
            <div
              key={interaction.id}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
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

  // Projector — title + status chip + reveal for SHARED text interactions
  // only. Check-ins (and unshared interactions) never reach this surface.
  const projectable = interactions.filter(
    (interaction) => interaction.type === 'text' && interaction.shareable,
  );

  return (
    <SlideFrame slide={slide} surface={surface} language={language}>
      <div className="flex min-h-0 flex-1 flex-col gap-8">
        <SlideHeading title={slide.title} language={language} />
        {slots?.statusChip && (
          <div className="flex items-center gap-3">{slots.statusChip}</div>
        )}
        {projectable.map((interaction) => {
          const reveal = slots?.reveal?.(interaction) ?? null;
          if (!reveal) return null;
          return (
            <div
              key={interaction.id}
              className="flex min-h-0 flex-1 flex-col gap-4"
            >
              <QuestionText
                question={interaction.question}
                language={language}
              />
              {reveal}
            </div>
          );
        })}
      </div>
    </SlideFrame>
  );
};
