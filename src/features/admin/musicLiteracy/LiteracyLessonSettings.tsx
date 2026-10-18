/* eslint-disable react/jsx-sort-props */
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, type FC } from 'react';
import {
  isMelodicEcho,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { CONSOLE_LABEL } from '../ui/styles';
import { Choice } from './literacyFields';
import { lessonPass, withLessonPass, type PassName } from './literacyLesson';

/**
 * The lesson's Part 2 settings: who picks the key, how its numbers read,
 * and the passes its call-and-response steps offer. A lesson that uses
 * none of Part 2 (Part 1) shows them folded into one line, so it looks as
 * it always has.
 */

type Edit = (lesson: MusicLiteracyLesson) => MusicLiteracyLesson;

/** Whether a lesson uses anything Part 2 brings. */
export const usesPart2 = (lesson: MusicLiteracyLesson) =>
  lesson.part >= 2 ||
  lesson.keyChoice !== undefined ||
  lesson.numbering !== undefined ||
  lesson.passes !== undefined ||
  lesson.steps.some((step) => !isMelodicEcho(step) || step.section);

const KEY_CHOICE_HINT = {
  lesson: 'Everyone plays in the key set above.',
  student:
    'Students pick a key and major or minor in Choose steps. The key above is the default, and what Play uses here.',
};

const NUMBERING_HINT = {
  chromatic:
    'Each number is exactly as you write it: 3 is always the major 3rd, ♭3 the minor.',
  scale:
    'Write plain 1–7: they follow the student’s major or minor, so in minor 3, 6 and 7 are ♭3, ♭6 and ♭7.',
};

const PASSES: { pass: PassName; name: string; hint: string }[] = [
  {
    pass: 'challenge',
    name: 'Challenge',
    hint: '“Want a challenge just for fun? Go again and play ALL the notes!” Melodies only.',
  },
  {
    pass: 'create',
    name: 'Create',
    hint: '“Now Create Your Own Rhythms!” Students play a call of their own on the step’s notes or chords, then repeat it.',
  },
];

export const LiteracyLessonSettings: FC<{
  lesson: MusicLiteracyLesson;
  set: (edit: Edit) => void;
}> = ({ lesson, set }) => {
  const [open, setOpen] = useState(() => usesPart2(lesson));
  const keyChoice = lesson.keyChoice ?? 'lesson';
  const numbering = lesson.numbering ?? 'chromatic';

  if (!open)
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={() => setOpen(true)}
        className="col-span-2 flex items-center gap-1.5 text-left text-xs text-white/40 transition-colors hover:text-white md:col-span-4"
      >
        <ChevronRight className="size-3.5" />
        More settings: who picks the key, numbers, passes
        <span className="text-white/30">
          (the lesson’s key · as written ·{' '}
          {PASSES.filter((p) => lessonPass(lesson, p.pass))
            .map((p) => p.name.toLowerCase())
            .join(' and ') || 'no extra'}{' '}
          pass)
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
        <span className={CONSOLE_LABEL}>Passes, after the echo</span>
        {PASSES.map(({ pass, name, hint }) => (
          <label key={pass} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={lessonPass(lesson, pass)}
              onChange={(e) =>
                set((l) => withLessonPass(l, pass, e.target.checked))
              }
              aria-label={`${name} pass`}
              className="mt-1 accent-white"
            />
            <span className="flex flex-col">
              <span className="text-white/85">{name}</span>
              <span className="text-xs text-white/40">{hint}</span>
            </span>
          </label>
        ))}
        <p className="text-[11px] text-white/30">
          Every call-and-response step, unless it says otherwise.
        </p>
      </div>
    </div>
  );
};
