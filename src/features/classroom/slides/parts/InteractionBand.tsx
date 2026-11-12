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
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { EnergyRail } from '../../feelings/EnergyRail';
import { FeelingsPreview } from '../../feelings/FeelingsPicker';
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { Interaction, LocalizedText, StudentLanguage } from '../../types';
import type { SlideSlots } from '../SlideRenderer';
import type { SlideSurface } from '../types';

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

export interface InteractionBandProps {
  interactions: Interaction[];
  surface: SlideSurface;
  language: StudentLanguage;
  slots?: SlideSlots;
  /** True for the all-check-in variant: the room sees the tool, never answers. */
  teacherOnly?: boolean;
  /**
   * A stage slide (owner, 2026-11-10): the question is the slide, centred and
   * large, with the faces or the class's count under it.
   */
  hero?: boolean;
  /**
   * The live layer in a small place of its own beside the slide's content
   * (the portrait's check-in): the question small, the tool under it.
   */
  compact?: boolean;
  /**
   * A split slide's questions (owner, 2026-11-12): numbered, one under the
   * other, each with its choices on the room's screen; a revealed one shows
   * its results in its place (`reveals`, by interaction id).
   */
  list?: boolean;
  reveals?: Readonly<Record<string, ReactNode>>;
}

export const InteractionBand = ({
  interactions,
  surface,
  language,
  slots,
  teacherOnly = false,
  hero = false,
  compact = false,
  list = false,
  reveals,
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
      <div
        className={`flex h-full w-full overflow-y-auto ${hero ? '' : 'slide-band-scroll'} ${
          list ? 'px-[40px] py-[48px]' : ''
        }`}
      >
        <div
          className={`m-auto flex w-full flex-col gap-5 ${hero ? 'max-w-[880px] items-center text-center' : ''}`}
        >
          {interactions.map((interaction) => (
            <div key={interaction.id} className="flex min-h-0 flex-col gap-3">
              <QuestionText
                question={interaction.question}
                language={language}
                {...(compact ? { scale: 0.6 } : {})}
              />
              {slots?.input?.(interaction)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // The energy slider: the question small, the class's count beside it,
  // the slider under it (owner, 2026-11-10: like the Globe's era rail). The
  // teacher's preview shows it as the room does; the dots stay in the panel.
  // On Present the teacher slides it too, to show the room how they are
  // (owner, 2026-11-10): theirs only, kept on Present, never sent.
  const energy = teacherOnly
    ? interactions.find(
        (i) => i.checkIn?.style === 'feelings' && i.checkIn.level === 'energy',
      )
    : undefined;
  if (energy) {
    return (
      <div
        className="flex h-full w-full flex-col justify-end gap-[0.6em] overflow-hidden pb-[1.2em]"
        style={{ fontSize: 'calc(var(--slide-body-fz) * 0.85)' }}
      >
        <div className="flex items-end gap-4">
          <QuestionText
            question={energy.question}
            language={language}
            scale={compact ? 0.6 : 1}
          />
          {slots?.statusChip && (
            <div className="ml-auto shrink-0">{slots.statusChip}</div>
          )}
        </div>
        {surface === 'present' ? (
          <TeacherEnergy language={language} />
        ) : (
          <FeelingsPreview level="energy" language={language} />
        )}
      </div>
    );
  }

  // A feelings check-in, projected: the room sees the question and the faces
  // (or the wheel) to answer with on their own device — never the answers,
  // which are teacher-only (Rule 2). The wheel sits beside the question; the
  // faces sit on one line under it.
  const feelings =
    teacherOnly && surface !== 'teacher'
      ? interactions.find((i) => i.checkIn?.style === 'feelings')
      : undefined;
  if (feelings?.checkIn) {
    const level = feelings.checkIn.level ?? 'simple';
    // No words when there is no live count (a thumbnail, the editor).
    const status = slots?.statusChip ? (
      <div className="flex items-center gap-3">{slots.statusChip}</div>
    ) : null;
    if (hero && level !== 'complex') {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-12 overflow-hidden text-center">
          <QuestionText question={feelings.question} language={language} />
          <div
            className="shrink-0"
            style={{
              fontSize:
                level === 'simple'
                  ? 'calc(var(--slide-body-fz) * 1.6)'
                  : 'var(--slide-body-fz)',
            }}
          >
            <FeelingsPreview
              level={level}
              language={language}
              row
              className="justify-center"
            />
          </div>
          {status}
        </div>
      );
    }
    if (level === 'complex') {
      return (
        <div className="flex h-full w-full items-center gap-12 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-6">
            <QuestionText question={feelings.question} language={language} />
            {status}
          </div>
          <FeelingsPreview
            level="complex"
            language={language}
            className="h-full w-auto shrink-0"
          />
        </div>
      );
    }
    return (
      <div className="flex h-full w-full flex-col justify-center gap-5 overflow-hidden">
        <QuestionText question={feelings.question} language={language} />
        <div
          className="shrink-0"
          style={{
            fontSize:
              level === 'simple'
                ? 'var(--slide-body-fz)'
                : 'calc(var(--slide-body-fz) * 0.8)',
          }}
        >
          <FeelingsPreview
            level={level}
            language={language}
            row
            className="justify-start"
          />
        </div>
        {status}
      </div>
    );
  }

  if (list) {
    return (
      <QuestionList
        interactions={interactions}
        language={language}
        reveals={reveals}
        statusChip={slots?.statusChip}
      />
    );
  }

  // Projected surfaces and the teacher panel, pre-reveal: the question big,
  // with the live participation chip under it. Once the teacher shares, the
  // reveal replaces this whole band (see `SlideStage`).
  return (
    <div
      className={`flex h-full w-full flex-col justify-center overflow-hidden ${
        hero ? 'items-center gap-10 text-center' : 'gap-4'
      }`}
    >
      {interactions.map((interaction) => (
        <QuestionText
          key={interaction.id}
          question={interaction.question}
          language={language}
          scale={surface === 'teacher' ? 0.9 : 1}
        />
      ))}
      {slots?.statusChip && (
        <div className="flex items-center gap-3">{slots.statusChip}</div>
      )}
    </div>
  );
};

/** The teacher's own feeling, on Present: slid there, shown, not sent. */
const TeacherEnergy = ({ language }: { language: StudentLanguage }) => {
  const [value, setValue] = useState<number | null>(null);
  return (
    <EnergyRail
      value={value}
      onChange={setValue}
      language={language}
      keyboard={false}
    />
  );
};

/**
 * A split slide's questions on the room's screen: numbered, each with its
 * choices to answer on a device, or its results once the teacher reveals it.
 */
const QuestionList = ({
  interactions,
  language,
  reveals,
  statusChip,
}: {
  interactions: Interaction[];
  language: StudentLanguage;
  reveals?: Readonly<Record<string, ReactNode>>;
  statusChip?: ReactNode;
}) => (
  <div
    data-question-list=""
    className="flex h-full w-full flex-col justify-center gap-[28px] overflow-hidden px-[40px] py-[48px]"
  >
    {interactions.map((interaction, n) => {
      const reveal = reveals?.[interaction.id];
      return (
        <div
          key={interaction.id}
          className={`flex flex-col gap-[12px] ${reveal ? 'min-h-0 flex-1' : 'shrink-0'}`}
        >
          <div className="flex items-baseline gap-[14px]">
            <span
              aria-hidden
              className="shrink-0 tabular-nums text-white/40"
              style={{ fontSize: 'calc(var(--slide-question-fz) * 0.5)' }}
            >
              {n + 1}
            </span>
            <QuestionText
              question={interaction.question}
              language={language}
              scale={0.5}
            />
          </div>
          {reveal ? (
            <FitBox>{reveal}</FitBox>
          ) : interaction.choice ? (
            <ul
              className="flex flex-wrap gap-[8px] pl-[34px]"
              style={{ fontSize: 'calc(var(--slide-body-fz) * 0.75)' }}
            >
              {interaction.choice.options.map((option, i) => (
                <li
                  key={i}
                  className="rounded-full border border-white/15 px-[0.75em] py-[0.25em] leading-tight text-white/80"
                >
                  {pickLocalized(option, language)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    })}
    {statusChip && <div className="flex items-center gap-3">{statusChip}</div>}
  </div>
);

/**
 * Its content shrunk to fit the room it has, never cut: a revealed question's
 * bars beside three others. Layout px, so the stage's own scale is not counted
 * twice.
 */
const FitBox = ({ children }: { children: ReactNode }) => {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    const fit = () => {
      const need = content.scrollHeight;
      const room = box.clientHeight;
      setScale(need > 0 && room > 0 ? Math.min(1, room / need) : 1);
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={outer} className="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref={inner}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${100 / scale}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
