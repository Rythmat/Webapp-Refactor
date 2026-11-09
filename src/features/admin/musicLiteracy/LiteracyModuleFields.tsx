/* eslint-disable react/jsx-sort-props */
import { useEffect, useState, type FC } from 'react';
import { cn } from '@/components/utilities';
import type {
  LiteracyRound,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import {
  defaultModuleGoal,
  lessonModules,
  roundSteps,
} from '@/curriculum/engine/musicLiteracy/modules';
import { CONSOLE_LABEL } from '../ui/styles';
import { Choice } from './literacyFields';
import { moduleEntry, withModule } from './literacyLesson';

/**
 * A module's settings, where a teacher meets them: the goal students are
 * given (a line of text, the default shown greyed until one is written)
 * and the round they're offered once they pass it (Create, Challenge or
 * None, with what each does in a line). On each section's header; the
 * lesson's settings hold the lesson's goal and the default round.
 */

type Edit = (lesson: MusicLiteracyLesson) => MusicLiteracyLesson;

export const ROUND_OPTIONS: readonly { value: LiteracyRound; label: string }[] =
  [
    { value: 'create', label: 'Create' },
    { value: 'challenge', label: 'Challenge' },
    { value: 'none', label: 'None' },
  ];

/** What each round does, in a line. */
export const ROUND_HINT: Record<LiteracyRound, string> = {
  create:
    'Once it’s passed, students go through it again: their own call on each step, then they repeat it.',
  challenge:
    'Once it’s passed, students go through it again, just for fun, playing ALL the notes along with Atlas. Melodies only.',
  none: 'Nothing more: students go on.',
};

/** A one-line text field: written as typed, kept on Enter or leaving it. */
export const GoalField: FC<{
  value: string | undefined;
  /** What students see when it's left empty. */
  placeholder: string;
  onChange: (value: string | undefined) => void;
  label: string;
  className?: string;
}> = ({ value, placeholder, onChange, label, className }) => {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);
  const commit = () => {
    const next = draft.trim();
    if (next !== (value ?? '')) onChange(next || undefined);
  };
  return (
    <input
      type="text"
      aria-label={label}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Escape') setDraft(value ?? '');
      }}
      className={cn(
        'w-full min-w-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none placeholder:text-white/30 focus:ring-1 focus:ring-[#60a5fa]',
        className,
      )}
    />
  );
};

/** A module's round: Create, Challenge or None, and what it does. */
export const RoundChoice: FC<{
  value: LiteracyRound;
  onChange: (round: LiteracyRound) => void;
  label: string;
  /** A note under it: the round has nothing to play here. */
  warning?: string | null;
}> = ({ value, onChange, label, warning }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <Choice
      label={label}
      value={value}
      onChange={onChange}
      options={ROUND_OPTIONS}
    />
    <p className="text-[11px] text-white/40">{ROUND_HINT[value]}</p>
    {warning && <p className="text-[11px] text-amber-200/80">{warning}</p>}
  </div>
);

/** Why a round has no steps to play, if it hasn't. */
export function emptyRoundWarning(
  round: LiteracyRound,
  steps: number,
): string | null {
  if (round === 'none' || steps > 0) return null;
  return round === 'challenge'
    ? 'No melodies here, so there’s nothing to challenge: pick Create or None.'
    : 'No call-and-response steps here yet, so there’s nothing to create on.';
}

/** A section's module, on its header: its goal and its round. */
export const ModuleSettings: FC<{
  lesson: MusicLiteracyLesson;
  title: string;
  set: (edit: Edit) => void;
}> = ({ lesson, title, set }) => {
  const module = lessonModules(lesson).find((m) => m.title === title);
  if (!module) return null;
  const own = moduleEntry(lesson, title);
  const fallback = defaultModuleGoal(module, lesson);
  return (
    <div
      data-module-settings={title}
      className="grid grid-cols-1 gap-x-6 gap-y-2 pb-1 pl-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
    >
      <label className="flex min-w-0 flex-col gap-1">
        <span className={CONSOLE_LABEL}>Goal</span>
        <GoalField
          label={`${title} goal`}
          value={own?.goal}
          placeholder={
            fallback
              ? `${fallback} (the default)`
              : 'None: this module has no round'
          }
          onChange={(goal) => set((l) => withModule(l, title, { goal }))}
        />
        <span className="text-[11px] text-white/40">
          Said on the module’s card when it’s passed, and during its round.
        </span>
      </label>
      <div className="flex min-w-0 flex-col gap-1">
        <span className={CONSOLE_LABEL}>Round</span>
        <RoundChoice
          label={`${title} round`}
          value={module.round}
          onChange={(round) => set((l) => withModule(l, title, { round }))}
          warning={emptyRoundWarning(
            module.round,
            roundSteps(module, lesson).length,
          )}
        />
      </div>
    </div>
  );
};
