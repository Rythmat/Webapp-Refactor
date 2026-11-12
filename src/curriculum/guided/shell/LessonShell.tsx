import { motion } from 'framer-motion';
import { ArrowLeft, Check, TriangleAlert, Volume2, X } from 'lucide-react';
import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { Rich } from '@/curriculum/audio/player/Rich';
import { isSettled, type Phase } from '@/curriculum/audio/player/playerMachine';

// ── The guided lesson's shell ──────────────────────────────────────────────
// What every guided lesson sits in, Audio's and the played ones alike: one screen
// at a time inside a frame that answers. The bar along the top with its progress,
// the frame's green or amber, the bubble that says what that exact mistake means,
// "Why?" for the depth, the skill check's card and the takeaway.

export const RIGHT = '#34d399';
export const WRONG = '#f59e0b';

export const verdictColorOf = (phase: Phase): string | null =>
  phase === 'right' || phase === 'revealed'
    ? RIGHT
    : phase === 'wrong'
      ? WRONG
      : null;

export interface ShellWhy {
  title: string;
  paragraphs: readonly string[];
}

export function SkillIntro({
  accent,
  onDone,
  reduced,
}: {
  accent: string;
  onDone: () => void;
  reduced: boolean;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, reduced ? 700 : 1700);
    return () => clearTimeout(timer);
  }, [onDone, reduced]);
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4"
      data-skill-intro
    >
      <motion.span
        className="flex size-16 items-center justify-center rounded-full text-[#101012]"
        style={{ backgroundColor: accent }}
        initial={reduced ? false : { rotateY: 180, scale: 0.6 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 170, damping: 14 }}
      >
        <Check className="size-8" strokeWidth={3} aria-hidden />
      </motion.span>
      <p className="text-lg font-bold text-white">Skill check</p>
      <p className="text-[0.9375rem] text-white/60">Three on your own.</p>
    </div>
  );
}

export function WhyDialog({
  why,
  open,
  onOpenChange,
}: {
  why: ShellWhy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!why) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-[34rem] overflow-y-auto rounded-2xl border-white/10 bg-[#1b1b1f] p-7 text-white">
        <DialogTitle className="text-lg font-bold text-white">
          {why.title}
        </DialogTitle>
        <div className="flex flex-col gap-3 text-[0.9375rem] leading-6 text-white/85">
          {why.paragraphs.map((paragraph, i) => (
            <p key={i}>
              <Rich text={paragraph} />
            </p>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TOP_ICON =
  'flex size-9 shrink-0 items-center justify-center rounded-full text-white/70 outline-none transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50';

export function LessonTopBar({
  index,
  count,
  practiceFrom,
  fraction = 0,
  canBack,
  onBack,
  onClose,
  answered,
  firstTry,
  screens,
  volume,
  extra,
}: {
  index: number;
  count: number;
  practiceFrom: number;
  /** How far through the screen it's on, for a screen with several parts. */
  fraction?: number;
  canBack: boolean;
  onBack: () => void;
  onClose: () => void;
  answered: readonly string[];
  firstTry: readonly string[];
  screens: readonly { id: string }[];
  /** The volume control, under its button; none, no button. */
  volume?: ReactNode;
  /** Anything else the lesson keeps up here (what the mic hears). */
  extra?: ReactNode;
}) {
  const [volumeOpen, setVolumeOpen] = useState(false);
  const main = Math.min(1, (index + 1 + fraction) / practiceFrom);
  return (
    <div className="relative flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6">
      <button
        type="button"
        aria-label="Leave the lesson"
        onClick={onClose}
        className={TOP_ICON}
      >
        <X className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Back a screen"
        onClick={onBack}
        disabled={!canBack}
        className={cn(TOP_ICON, 'disabled:opacity-0')}
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      <div
        role="progressbar"
        aria-label="Lesson progress"
        aria-valuemin={0}
        aria-valuemax={count}
        aria-valuenow={index + 1}
        className="mx-auto flex w-full max-w-xl items-center gap-1.5"
      >
        <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.1]">
          <span
            className="block h-full rounded-full bg-emerald-400 transition-[width] duration-300 ease-out"
            style={{ width: `${main * 100}%` }}
          />
        </span>
        {screens.slice(practiceFrom).map((s, i) => {
          const at = practiceFrom + i;
          const done = answered.includes(s.id);
          return (
            <span
              key={s.id}
              data-practice-dot={
                firstTry.includes(s.id) ? 'first-try' : done ? 'done' : 'todo'
              }
              className={cn(
                'size-2.5 shrink-0 rounded-full border',
                firstTry.includes(s.id)
                  ? 'border-emerald-400 bg-emerald-400'
                  : done
                    ? 'border-emerald-400'
                    : at === index
                      ? 'border-white/70'
                      : 'border-white/20',
              )}
            />
          );
        })}
      </div>
      {extra}
      {volume != null && (
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="Volume"
            aria-expanded={volumeOpen}
            onClick={() => setVolumeOpen((open) => !open)}
            className={TOP_ICON}
          >
            <Volume2 className="size-5" aria-hidden />
          </button>
          {volumeOpen && (
            <div className="absolute right-0 top-11 z-30 w-72 rounded-2xl border border-white/10 bg-[#1b1b1f] p-4 shadow-xl">
              {volume}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** The frame that answers: its border, and a glow from its foot. */
export function VerdictFrame({
  phase,
  children,
}: {
  phase: Phase;
  children: ReactNode;
}) {
  const color = verdictColorOf(phase);
  return (
    <div className="relative mx-2 mb-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] sm:mx-4 sm:mb-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[1.25rem] border transition-colors duration-200"
        style={{ borderColor: color ?? 'rgb(255 255 255 / 0.12)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-48 transition-opacity duration-300"
        style={{
          opacity: color ? 0.22 : 0,
          background: `linear-gradient(to top, ${color ?? 'transparent'}, transparent)`,
        }}
      />
      {children}
    </div>
  );
}

/** What they did, in words. */
export function FeedbackBubble({
  phase,
  text,
  reduced,
  aside,
}: {
  phase: Phase;
  text: string;
  reduced: boolean;
  /** The numbers behind it, beside the bubble. */
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <motion.p
        role="status"
        data-feedback={phase}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16 }}
        className="flex w-fit max-w-md gap-2 rounded-2xl px-3.5 py-2.5 text-[0.9375rem] font-bold leading-6 text-[#101012]"
        style={{ backgroundColor: verdictColorOf(phase) ?? '#e8e8f0' }}
      >
        {phase === 'wrong' ? (
          <TriangleAlert className="mt-1 size-4 shrink-0" aria-hidden />
        ) : (
          <Check className="mt-1 size-4 shrink-0" aria-hidden />
        )}
        <span>
          <Rich text={text} />
        </span>
      </motion.p>
      {aside}
    </div>
  );
}

export function ChoiceList({
  choices,
  picked,
  eliminated,
  phase,
  correct,
  onPick,
}: {
  choices: readonly { id: string; text: string }[];
  picked: string | null;
  eliminated: readonly string[];
  phase: Phase;
  correct: string;
  onPick: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Choices" className="flex flex-col gap-2">
      {choices.map((choice) => {
        const gone = eliminated.includes(choice.id);
        const on = picked === choice.id;
        const settled = isSettled(phase);
        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={gone || settled || phase === 'wrong'}
            onClick={() => onPick(choice.id)}
            className={cn(
              'flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-[0.9375rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60',
              on
                ? 'border-white bg-white/[0.1] text-white'
                : 'border-white/20 text-white/90 hover:bg-white/[0.05]',
              gone &&
                'border-white/10 text-white/35 line-through hover:bg-transparent',
              settled &&
                choice.id === correct &&
                'border-emerald-400 bg-emerald-400/10 text-white',
            )}
          >
            <span className="min-w-0 flex-1">
              <Rich text={choice.text} />
            </span>
            {settled && choice.id === correct && (
              <Check className="size-4 shrink-0 text-emerald-400" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TakeawayCard({
  accent,
  points,
  inSession,
  limits,
  next,
}: {
  accent: string;
  points: readonly string[];
  inSession: string;
  limits: string;
  next: string;
}) {
  return (
    <div className="flex flex-col gap-3" data-takeaway>
      <ul className="flex flex-col gap-1.5 text-[0.9375rem] leading-6 text-white/85">
        {points.map((point, i) => (
          <li key={i} className="flex gap-2.5">
            <Check
              className="mt-1 size-4 shrink-0"
              style={{ color: accent }}
              aria-hidden
            />
            <span>
              <Rich text={point} />
            </span>
          </li>
        ))}
      </ul>
      <div
        className="rounded-2xl border p-4"
        style={{ borderColor: `${accent}66` }}
      >
        <p
          className="mb-1 text-xs font-bold uppercase tracking-[0.14em]"
          style={{ color: accent }}
        >
          In your session
        </p>
        <p className="text-[0.9375rem] leading-6 text-white">
          <Rich text={inSession} />
        </p>
      </div>
      <p className="text-[0.8125rem] leading-5 text-white/55">
        <Rich text={limits} /> <Rich text={next} />
      </p>
    </div>
  );
}

/** A primary button's ref, so a result can move the keyboard to what's next. */
export type PrimaryRef = RefObject<HTMLButtonElement>;
