import { Sparkles, Trophy, X } from 'lucide-react';
import { useId } from 'react';
import { PROMPT_SURFACE } from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import type { LiteracyRound } from '@/content/musicLiteracy/schemas';
import { titleCase } from '@/content/musicLiteracy/titleCase';
import type { LiteracyModule } from '@/curriculum/engine/musicLiteracy/modules';

// ── Modules: the lesson's goal, a module done, its round ───────────────────
// A lesson is a run of modules (engine/musicLiteracy/modules.ts). Part 2
// opens on its one directive, the lesson's goal, before its first step.
// Passing a module's last echo shows its card where the result goes: done,
// and the round it offers (Part 2: create your own; Part 1: the challenge,
// just for fun), its goal said again. The round itself wears a banner over
// the step pager, with the module's goal and the way out of it. Their
// buttons are the action bar's, as every Learn screen has them. Headings,
// names and buttons in Title Case; what a card says, in sentences.

/** A round's name, and the button that starts it. */
export const ROUND_COPY: Readonly<
  Record<
    Exclude<LiteracyRound, 'none'>,
    { name: string; start: string; offer: string }
  >
> = {
  create: {
    name: 'Create Round',
    start: 'Create Your Own',
    offer: 'Now go again and create your own.',
  },
  challenge: {
    name: 'Challenge Round',
    start: 'Play ALL the Notes',
    offer: 'Want a challenge just for fun? Go again and play ALL the notes!',
  },
};

export const RoundIcon = ({
  round,
  className,
  color,
}: {
  round: LiteracyRound;
  className?: string;
  color?: string;
}) =>
  round === 'challenge' ? (
    <Trophy aria-hidden className={className} style={{ color }} />
  ) : (
    <Sparkles aria-hidden className={className} style={{ color }} />
  );

/** "rgb(…)" tints of the key color, for a card's wash. */
function tint(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  if (!Number.isFinite(n)) return `rgba(255, 255, 255, ${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** The goal, set off in the key's color. */
function Goal({
  goal,
  round,
  keyColor,
  className,
}: {
  goal: string;
  round: LiteracyRound;
  keyColor: string;
  className?: string;
}) {
  return (
    <p
      data-literacy-goal
      className={cn(
        'flex items-start gap-2.5 rounded-lg px-4 py-3 text-[17px] leading-6 text-[#e8e8f0]',
        className,
      )}
      style={{ backgroundColor: tint(keyColor, 0.14) }}
    >
      {/* The icon in the key's color: the card's one accent. */}
      <RoundIcon
        round={round}
        color={keyColor}
        className="mt-0.5 size-[18px] shrink-0"
      />
      <span>{goal}</span>
    </p>
  );
}

export interface LessonIntroCardProps {
  /** "Music Literacy · Part 2". */
  lessonName: string;
  goal: string;
  modules: readonly Pick<LiteracyModule, 'title' | 'round'>[];
  /** Which modules have a round to play (the ✦ on their chip). */
  withRound: ReadonlySet<string>;
  keyColor: string;
  stacked: boolean;
}

/** The lesson's goal, at its start: one line, and its modules in order. */
export function LessonIntroCard({
  lessonName,
  goal,
  modules,
  withRound,
  keyColor,
  stacked,
}: LessonIntroCardProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      data-literacy-intro
      className={cn(
        PROMPT_SURFACE,

        'flex min-h-[280px] flex-1 flex-col items-center justify-center gap-6 text-center',
        stacked ? 'p-6' : 'p-10',
      )}
    >
      <p className="text-xs uppercase tracking-[0.14em] text-white/45">
        {lessonName}
      </p>
      <h2
        id={headingId}
        className={cn(
          'max-w-[680px] font-normal text-[#e8e8f0]',
          stacked ? 'text-[24px] leading-8' : 'text-[32px] leading-10',
        )}
      >
        {goal}
      </h2>
      {modules.length > 1 && (
        <ol
          aria-label="The modules"
          className="flex max-w-[760px] flex-wrap items-center justify-center gap-2"
        >
          {modules.map((module, i) => (
            <li
              key={module.title}
              data-intro-module={module.title}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-sm text-[#e8e8f0]"
            >
              <span className="text-xs tabular-nums text-white/45">
                {i + 1}
              </span>
              {module.title}
              {withRound.has(module.title) && (
                <span style={{ color: keyColor }}>
                  <RoundIcon round={module.round} className="size-3.5" />
                  <span className="sr-only">
                    , then{' '}
                    {ROUND_COPY[
                      module.round === 'challenge' ? 'challenge' : 'create'
                    ].start.toLowerCase()}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
      {withRound.size > 0 && (
        <p className="flex items-center gap-1.5 text-[13px] text-white/45">
          <RoundIcon
            round={
              modules.find((m) => withRound.has(m.title))?.round ?? 'create'
            }
            color={keyColor}
            className="size-3.5"
          />
          {modules.some((m) => withRound.has(m.title) && m.round === 'create')
            ? 'Then go again and create your own.'
            : 'Then a challenge, just for fun.'}
        </p>
      )}
    </section>
  );
}

/** A module done's heading: "Module Done!", or for a lesson of one, "Part 1 Done!". */
export const moduleDoneHeading = (whole: { part: number } | null): string =>
  titleCase(whole ? `Part ${whole.part} done!` : 'Module done!');

export interface ModuleDoneCardProps {
  module: Pick<LiteracyModule, 'title' | 'goal'>;
  round: Exclude<LiteracyRound, 'none'>;
  /** The lesson is this one module (Part 1): "Part 1 Done!". */
  whole: { part: number } | null;
  /** The last step's try: "1-7-1 · 92% · Passed". */
  last: { title: string; percent: number } | null;
  /** How many steps the round goes through. */
  steps: number;
  keyColor: string;
}

/**
 * A module passed: where the result goes, its heading, the round it
 * offers and the module's goal again.
 */
export function ModuleDoneCard({
  module,
  round,
  whole,
  last,
  steps,
  keyColor,
}: ModuleDoneCardProps) {
  const headingId = useId();
  const copy = ROUND_COPY[round];
  return (
    <section
      aria-labelledby={headingId}
      data-literacy-module-done={module.title}
      data-round={round}
      className={cn(
        PROMPT_SURFACE,
        'my-auto flex max-h-full min-h-0 flex-col gap-4 overflow-y-auto p-5',
      )}
    >
      {!whole && (
        <p className="text-xs uppercase tracking-[0.14em] text-white/45">
          {module.title}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <h2
          id={headingId}
          className="text-[32px] font-normal leading-10 text-[#e8e8f0]"
        >
          {moduleDoneHeading(whole)}
        </h2>
        <p
          data-literacy-offer={round}
          className="text-[17px] leading-6 text-[#e8e8f0]"
        >
          {copy.offer}
        </p>
      </div>
      {round === 'create' && module.goal && (
        <Goal goal={module.goal} round={round} keyColor={keyColor} />
      )}
      <p className="text-[13px] leading-5 text-white/45">
        {last && (
          <>
            {last.title} · {Math.round(last.percent)}% · Passed
            {' · '}
          </>
        )}
        {copy.name}: {steps} step{steps === 1 ? '' : 's'}
      </p>
    </section>
  );
}

export interface RoundBannerProps {
  module: Pick<LiteracyModule, 'title' | 'goal'>;
  round: Exclude<LiteracyRound, 'none'>;
  /** The lesson is this one module: no module title to name. */
  whole: boolean;
  keyColor: string;
  onLeave: () => void;
  disabled?: boolean;
}

/** Over the step pager in a round: which round, its goal, the way out. */
export function RoundBanner({
  module,
  round,
  whole,
  keyColor,
  onLeave,
  disabled,
}: RoundBannerProps) {
  const copy = ROUND_COPY[round];
  return (
    <section
      aria-label={`${copy.name}${whole ? '' : `: ${module.title}`}`}
      data-literacy-round-banner={round}
      // One line where there's room: the round, its goal, the way out.
      className="flex shrink-0 items-center gap-3 rounded-xl border border-white/[0.08] py-1.5 pl-2 pr-1.5"
      style={{ backgroundColor: tint(keyColor, 0.1) }}
    >
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: tint(keyColor, 0.22), color: keyColor }}
      >
        <RoundIcon round={round} className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <p className="max-w-full truncate text-xs uppercase tracking-[0.14em] text-white/55">
          {copy.name}
          {!whole && <span className="text-white/45"> · {module.title}</span>}
        </p>
        {module.goal && (
          <p
            data-literacy-goal
            className="min-w-0 text-[15px] leading-5 text-[#e8e8f0]"
          >
            {module.goal}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onLeave}
        disabled={disabled}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm text-white/55 transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#e8e8f0] disabled:opacity-40 max-[639px]:size-11 max-[639px]:justify-center max-[639px]:px-0"
      >
        <X aria-hidden className="size-4" />
        {/* A phone keeps the ✕ alone. */}
        <span className="max-[639px]:sr-only">Leave Round</span>
      </button>
    </section>
  );
}
