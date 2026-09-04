/**
 * InteractionPreview — a compact, READ-ONLY rendering of a slide's student
 * responses (questions) for the authoring surfaces: the WYSIWYG editor canvas
 * and the filmstrip thumbnails. It occupies the `interaction` block on the
 * shared `SlideStage`, so the teacher sees the question + its answer shape while
 * editing ("editing == presenting"), instead of a blank slide.
 *
 * This is intentionally NOT the live answer widget — no Submit button, no live
 * `<canvas>`. The real, interactive inputs live in `live/interactions/*` and are
 * rendered on the projector/student surfaces via `QuestionSlide`. The question
 * text + options are still authored in the side-panel `InteractionEditor`; this
 * only mirrors them onto the slide.
 */
import type { Interaction, StudentLanguage } from '../types';
import { pickLocalized } from './localized';

// Mirrors CheckInInput's option sets (live/interactions/CheckInInput.tsx). Kept
// in sync manually — this is a static preview, so exact parity isn't critical.
const CHECK_IN_PREVIEW: Record<'emoji' | 'scale' | 'word', string[]> = {
  emoji: ['😀', '🙂', '😐', '😕', '😔', '🤔', '⚡', '💤'],
  scale: ['1', '2', '3', '4', '5'],
  word: ['Ready', 'Curious', 'Focused', 'Tired', 'Anxious', 'Excited'],
};

/** A faux, non-interactive answer field: a dashed box with muted hint text. */
const FauxField = ({ children }: { children: string }) => (
  <div className="rounded-lg border border-dashed border-white/20 bg-white/[0.03] px-3 py-2 text-white/45">
    {children}
  </div>
);

const AnswerPreview = ({
  interaction,
  language,
}: {
  interaction: Interaction;
  language: StudentLanguage;
}) => {
  switch (interaction.type) {
    case 'choice': {
      const options = interaction.choice?.options ?? [];
      const glyph = interaction.choice?.multi ? '☐' : '○';
      return (
        <ul className="flex flex-col gap-1.5">
          {options.map((opt, i) => {
            const label = pickLocalized(opt, language).trim();
            return (
              <li key={i} className="flex items-center gap-2 text-white/80">
                <span aria-hidden className="text-white/40">
                  {glyph}
                </span>
                <span className={label ? '' : 'italic text-white/40'}>
                  {label || `Option ${i + 1}`}
                </span>
              </li>
            );
          })}
        </ul>
      );
    }
    case 'text':
      return <FauxField>Students type a response…</FauxField>;
    case 'number': {
      const { min, max } = interaction.number ?? {};
      const parts: string[] = [];
      if (min !== undefined) parts.push(`min ${min}`);
      if (max !== undefined) parts.push(`max ${max}`);
      const range = parts.length ? ` (${parts.join(', ')})` : '';
      return <FauxField>{`Students enter a number${range}`}</FauxField>;
    }
    case 'draw':
      return (
        <FauxField>{`Sketch · ${interaction.draw?.background ?? 'blank'}`}</FauxField>
      );
    case 'check-in': {
      const chips = CHECK_IN_PREVIEW[interaction.checkIn?.style ?? 'emoji'];
      return (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <span
              key={i}
              className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-white/70"
            >
              {chip}
            </span>
          ))}
        </div>
      );
    }
    default:
      return <FauxField>Interactive response</FauxField>;
  }
};

interface InteractionPreviewProps {
  interactions: Interaction[];
  language: StudentLanguage;
}

export const InteractionPreview = ({
  interactions,
  language,
}: InteractionPreviewProps) => (
  <div className="flex h-full flex-col gap-4 overflow-auto">
    {interactions.map((interaction) => {
      const question = pickLocalized(interaction.question, language).trim();
      return (
        <div key={interaction.id} className="flex flex-col gap-2">
          <p
            className={
              question ? 'font-medium text-white' : 'italic text-white/40'
            }
            style={{ fontSize: 'var(--slide-body-fz)' }}
          >
            {question || 'Untitled question'}
          </p>
          <div style={{ fontSize: 'calc(var(--slide-body-fz) * 0.82)' }}>
            <AnswerPreview interaction={interaction} language={language} />
          </div>
        </div>
      );
    })}
  </div>
);
