/**
 * The live layer of an interaction slide, painted over the slide's middle band.
 *
 * Rule 9 confines interaction ELEMENTS to the 100px footer strip, which is the
 * right home for the editor's handle on an interaction but far too small to ask
 * a class a question from the back of a room. So the band carries the live
 * layer — the student's input, or the projected question and status — the same
 * way it carries a reveal: as surface-injected content, not as an element and
 * not as a zone. That is the mechanism the spec already uses twice (a draw
 * overlay at `drawTargetElementId`, the projector join code in the footer band).
 *
 * Response data still only ever arrives through the pre-gated `slots`.
 */
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { Interaction, LocalizedText, StudentLanguage } from '../../types';
import type { SlideSlots } from '../SlideRenderer';
import type { SlideSurface } from '../types';

const RESPONSES_INCOMING: LocalizedText = {
  en: 'Responses coming in…',
  es: 'Llegando respuestas…',
};

const TEACHER_ONLY_NOTE: LocalizedText = {
  en: 'Only your teacher sees your answer',
  es: 'Solo tu maestro ve tu respuesta',
};

/** Bilingual interaction question at the slide question scale. */
export const QuestionText = ({
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

export interface InteractionBandProps {
  interactions: Interaction[];
  surface: SlideSurface;
  language: StudentLanguage;
  slots?: SlideSlots;
  /** True for the all-check-in variant: students get the teacher-only note. */
  teacherOnly?: boolean;
}

export const InteractionBand = ({
  interactions,
  surface,
  language,
  slots,
  teacherOnly = false,
}: InteractionBandProps) => {
  if (interactions.length === 0) return null;

  if (surface === 'student') {
    return (
      // A projected band may clip or compress — a class loses nothing it can
      // act on. An INPUT may not: a six-option choice question overflowed the
      // 316px band and the sixth option was simply unreachable, so the student
      // could not give that answer at all. Scroll, and never centre-clip:
      // `justify-center` on a scrolling column puts the top out of reach, so
      // the inner block uses `m-auto` — centred when it fits, scrolled from
      // the top when it does not.
      <div className="slide-band-scroll flex h-full w-full overflow-y-auto">
        <div className="m-auto flex w-full flex-col gap-5">
          {interactions.map((interaction) => (
            <div key={interaction.id} className="flex min-h-0 flex-col gap-3">
              <QuestionText
                question={interaction.question}
                language={language}
              />
              {slots?.input?.(interaction)}
            </div>
          ))}
          {teacherOnly && (
            <p
              className="text-center text-white/40"
              style={{ fontSize: 'calc(var(--slide-body-fz) * 0.9)' }}
            >
              {pickLocalized(TEACHER_ONLY_NOTE, language)}
              {secondaryLine(TEACHER_ONLY_NOTE, language) && (
                <span> · {secondaryLine(TEACHER_ONLY_NOTE, language)}</span>
              )}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Projected surfaces and the teacher panel, pre-reveal: the question big,
  // with the live participation chip under it. Once the teacher shares, the
  // reveal replaces this whole band (see `SlideStage`).
  return (
    <div className="flex h-full w-full flex-col justify-center gap-4 overflow-hidden">
      {interactions.map((interaction) => (
        <QuestionText
          key={interaction.id}
          question={interaction.question}
          language={language}
          scale={surface === 'teacher' ? 0.9 : 1}
        />
      ))}
      <div className="flex items-center gap-3">
        {slots?.statusChip ?? <IncomingChip language={language} />}
      </div>
    </div>
  );
};
