/* eslint-disable react/jsx-sort-props */
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, type FC } from 'react';
import {
  isMelodicEcho,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import {
  DEFAULT_LESSON_GOAL,
  lessonGoal,
  lessonModules,
  roundSteps,
} from '@/curriculum/engine/musicLiteracy/modules';
import { CONSOLE_LABEL } from '../ui/styles';
import {
  emptyRoundWarning,
  GoalField,
  RoundChoice,
} from './LiteracyModuleFields';
import { Choice } from './literacyFields';
import { lessonRound, withLessonRound } from './literacyLesson';

/**
 * The lesson's Part 2 settings: who picks the key, how its numbers read,
 * the goal it opens on, and its round: what students are offered once they
 * pass a module, unless the module (its section's header) picks its own. A
 * lesson without sections is one module, and this is its round. A lesson
 * that uses none of Part 2 (Part 1) shows them folded into one line, so it
 * looks as it always has.
 */

type Edit = (lesson: MusicLiteracyLesson) => MusicLiteracyLesson;

/** Whether a lesson uses anything Part 2 brings. */
export const usesPart2 = (lesson: MusicLiteracyLesson) =>
  lesson.part >= 2 ||
  lesson.keyChoice !== undefined ||
  lesson.numbering !== undefined ||
  lesson.passes !== undefined ||
  lesson.goal !== undefined ||
  lesson.modules !== undefined ||
  lesson.steps.some((step) => !isMelodicEcho(step) || step.section);

const KEY_CHOICE_HINT = {
  lesson: 'Everyone plays in the key set above.',
  student:
    'Students pick a key and major or minor once, in the gate: a first section of Choose steps alone. The key above is the default, and what Play uses here.',
};

const NUMBERING_HINT = {
  chromatic:
    'Each number is exactly as you write it: 3 is always the major 3rd, ♭3 the minor.',
  scale:
    'Write plain 1–7: they follow the student’s major or minor, so in minor 3, 6 and 7 are ♭3, ♭6 and ♭7.',
};

const ROUND_NAME = {
  create: 'create round',
  challenge: 'challenge',
  none: 'no round',
} as const;

export const LiteracyLessonSettings: FC<{
  lesson: MusicLiteracyLesson;
  set: (edit: Edit) => void;
}> = ({ lesson, set }) => {
  const [open, setOpen] = useState(() => usesPart2(lesson));
  const keyChoice = lesson.keyChoice ?? 'lesson';
  const numbering = lesson.numbering ?? 'chromatic';
  const round = lessonRound(lesson);
  // Without sections the lesson is one module: this is its round.
  const sectioned = lesson.steps.some((step) => step.section);
  const modules = lessonModules(lesson);
  const shownGoal = lessonGoal({ ...lesson, goal: undefined });

  if (!open)
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={() => setOpen(true)}
        className="col-span-2 flex items-center gap-1.5 text-left text-xs text-white/40 transition-colors hover:text-white md:col-span-4"
      >
        <ChevronRight className="size-3.5" />
        More settings: who picks the key, numbers, goal, round
        <span className="text-white/30">
          (the lesson’s key · as written · {lesson.goal ? 'a goal' : 'no goal'}{' '}
          · {ROUND_NAME[round]})
        </span>
      </button>
    );

  return (
    <div
      data-lesson-settings
      className="col-span-2 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-white/[0.06] pt-4 md:col-span-4 md:grid-cols-3"
    >
      <div className="flex min-w-0 flex-col gap-1.5" data-field="keyChoice">
        <div className="flex items-center gap-1.5">
          {!usesPart2(lesson) && (
            <button
              type="button"
              aria-expanded
              aria-label="Fold these settings away"
              onClick={() => setOpen(false)}
              className="-ml-1 rounded text-white/40 hover:text-white"
            >
              <ChevronDown className="size-3.5" />
            </button>
          )}
          <span className={CONSOLE_LABEL}>Who picks the key</span>
        </div>
        <Choice
          label="Who picks the key"
          value={keyChoice}
          onChange={(value) =>
            set((l) => {
              const next = { ...l };
              if (value === 'student') next.keyChoice = 'student';
              else delete next.keyChoice;
              return next;
            })
          }
          options={[
            { value: 'lesson', label: 'Lesson' },
            { value: 'student', label: 'Student' },
          ]}
        />
        <p className="text-xs text-white/40">{KEY_CHOICE_HINT[keyChoice]}</p>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5" data-field="numbering">
        <span className={CONSOLE_LABEL}>Numbers</span>
        <Choice
          label="Numbers"
          value={numbering}
          onChange={(value) =>
            set((l) => {
              const next = { ...l };
              if (value === 'scale') next.numbering = 'scale';
              else delete next.numbering;
              return next;
            })
          }
          options={[
            { value: 'chromatic', label: 'As written' },
            { value: 'scale', label: 'Follow major/minor' },
          ]}
        />
        <p className="text-xs text-white/40">{NUMBERING_HINT[numbering]}</p>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5" data-field="passes">
        <span className={CONSOLE_LABEL}>
          {sectioned ? 'Round, after each module' : 'Round, at the end'}
        </span>
        <RoundChoice
          label="Lesson round"
          value={round}
          onChange={(next) => set((l) => withLessonRound(l, next))}
          warning={
            sectioned
              ? null
              : emptyRoundWarning(
                  round,
                  modules[0] ? roundSteps(modules[0], lesson).length : 0,
                )
          }
        />
        <p className="text-[11px] text-white/30">
          {sectioned
            ? 'For a section that doesn’t pick its own, on its header.'
            : 'The whole lesson is one module: this follows its last step.'}
        </p>
      </div>

      <div
        className="flex min-w-0 flex-col gap-1.5 md:col-span-3"
        data-field="goal"
      >
        <span className={CONSOLE_LABEL}>Goal</span>
        <GoalField
          label="Lesson goal"
          value={lesson.goal}
          placeholder={
            shownGoal
              ? `${DEFAULT_LESSON_GOAL} (the default)`
              : 'None: no goal card at the start'
          }
          onChange={(goal) =>
            set((l) => {
              const next = { ...l };
              if (goal) next.goal = goal;
              else delete next.goal;
              return next;
            })
          }
        />
        <p className="text-[11px] text-white/40">
          One line students see before the first step on their first visit (and
          in About this step): what they’ll make.
        </p>
      </div>
    </div>
  );
};
