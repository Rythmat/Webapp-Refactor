/* eslint-disable react/jsx-sort-props */
import {
  ExternalLink,
  KeyboardMusic,
  Loader2,
  Play,
  Square,
} from 'lucide-react';
import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type {
  LiteracyStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import {
  DetailCell,
  InlineNumber,
  InlineText,
} from '../content/visual/Editable';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { CONSOLE_LABEL } from '../ui/styles';
import { FigureEditor } from './FigureEditor';
import { WordsEditor } from './WordsEditor';
import type { LessonIssue } from './literacyLesson';
import type { Segment } from './literacyPart';
import type { LitNote } from './useStepPreview';

/**
 * One step of a Music Literacy lesson, opened: its title and direction, the
 * words the teacher sings, the call the teacher plays, and the response the
 * student plays back (the call echoed, unless it has one of its own), each
 * with its bars, and the step's own tempo and pass mark.
 */

const Section: FC<{
  title: string;
  hint: string;
  actions?: ReactNode;
  children: ReactNode;
}> = ({ title, hint, actions, children }) => (
  <section className="flex flex-col gap-2.5 border-t border-white/[0.06] pt-4">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div className="min-w-0">
        <h3 className={CONSOLE_LABEL}>{title}</h3>
        <p className="text-xs text-white/40">{hint}</p>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
    </div>
    {children}
  </section>
);

const RollButton: FC<{ onClick: () => void; what: string }> = ({
  onClick,
  what,
}) => (
  <Button
    size="sm"
    variant="ghost"
    onClick={onClick}
    title={`Open the ${what} in the Parts editor's piano roll and staff`}
  >
    <KeyboardMusic /> Edit in piano roll / staff
  </Button>
);

export const LiteracyStepEditor: FC<{
  lesson: MusicLiteracyLesson;
  step: LiteracyStep;
  index: number;
  issues: readonly LessonIssue[];
  /** Whether the step's tag is the one it was saved with, so fixed. */
  tagFixed: boolean;
  onChange: (patch: Partial<LiteracyStep>) => void;
  onRename: (title: string) => void;
  onRoll: (segment: Segment) => void;
  preview: {
    playing: boolean;
    loading: boolean;
    lit: LitNote | null;
    play: () => void;
    stop: () => void;
  };
  learnHref: string;
}> = ({
  lesson,
  step,
  index,
  issues,
  tagFixed,
  onChange,
  onRename,
  onRoll,
  preview,
  learnHref,
}) => {
  const name = `Step ${index + 1}`;
  const ts = lesson.timeSignature;
  const lit = preview.lit;
  const echo = step.response === undefined;

  return (
    <div className="flex flex-col gap-4 border-t border-white/[0.06] px-4 pb-5 pt-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <DetailCell label="Title">
          <InlineText
            value={step.title}
            onChange={onRename}
            placeholder="A note called C"
            ariaLabel={`${name} title`}
            className="text-base font-medium text-white"
          />
        </DetailCell>
        <DetailCell label="Direction (what the student is told)">
          <InlineText
            value={step.direction}
            onChange={(value) =>
              onChange({ direction: value.trim() ? value : undefined })
            }
            placeholder="Listen, then play it back in time."
            ariaLabel={`${name} direction`}
          />
        </DetailCell>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <DetailCell label="Tag">
          <span
            className="tabular-nums text-white/60"
            title={
              tagFixed
                ? 'Students’ progress is saved against this, so it stays when you rename the step.'
                : 'Made from the title until the lesson is saved; then it stays, since students’ progress keys off it.'
            }
          >
            {step.tag}
          </span>
          <span className="ml-1.5 text-[11px] text-white/30">
            {tagFixed ? 'kept when renamed' : 'follows the title until saved'}
          </span>
        </DetailCell>
        <DetailCell label="Tempo for this step">
          <InlineNumber
            value={step.tempo}
            onChange={(value) =>
              onChange({ tempo: value && value > 0 ? value : undefined })
            }
            placeholder={`the lesson’s ${lesson.tempo}`}
            min={30}
            max={300}
            suffix=" BPM"
            ariaLabel={`${name} tempo`}
          />
        </DetailCell>
        <DetailCell label="Pass mark">
          <InlineNumber
            value={step.passMark}
            onChange={(value) =>
              onChange({
                passMark:
                  value === undefined
                    ? undefined
                    : Math.min(100, Math.max(0, value)),
              })
            }
            placeholder="70%, with 50% timing"
            min={0}
            max={100}
            suffix="%"
            ariaLabel={`${name} pass mark`}
          />
        </DetailCell>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={preview.playing ? preview.stop : preview.play}
            className={preview.playing ? 'bg-rose-500 hover:bg-rose-400' : ''}
            title="The count-in, the words and the call, at the step’s tempo"
          >
            {preview.loading ? (
              <Loader2 className="animate-spin" />
            ) : preview.playing ? (
              <Square />
            ) : (
              <Play />
            )}
            {preview.playing ? 'Stop' : 'Play step'}
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to={learnHref} title="The student’s page, as last saved">
              <ExternalLink /> Open in Learn
            </Link>
          </Button>
        </div>
      </div>

      <Section
        title="Words · the teacher’s line"
        hint="Sung on the notes below, after the count-in; a pickup, at its end, into the downbeat (‖)."
        actions={<RollButton what="words" onClick={() => onRoll('words')} />}
      >
        <WordsEditor
          words={step.words}
          timeSignature={ts}
          stepLabel={name}
          lit={lit?.segment === 'words' ? lit.index : null}
          onChange={(words) => onChange({ words })}
        />
      </Section>

      <Section
        title="Call · what the teacher plays"
        hint="Played right after the words."
        actions={<RollButton what="call" onClick={() => onRoll('call')} />}
      >
        <FigureEditor
          figure={step.call}
          timeSignature={ts}
          label={`${name} call`}
          lit={lit?.segment === 'call' ? lit.index : null}
          onChange={(call) => onChange({ call })}
        />
      </Section>

      <Section
        title="Response · what the student plays back"
        hint={
          echo
            ? 'The student plays the call back, note for note.'
            : 'The student plays this back, graded note by note.'
        }
        actions={
          <>
            <label className="flex items-center gap-1.5 text-xs text-white/70">
              <input
                type="checkbox"
                checked={echo}
                onChange={(e) =>
                  onChange({
                    response: e.target.checked
                      ? undefined
                      : structuredClone(step.call),
                  })
                }
                className="accent-white"
              />
              Echo the call
            </label>
            {!echo && (
              <RollButton what="response" onClick={() => onRoll('response')} />
            )}
          </>
        }
      >
        {step.response ? (
          <FigureEditor
            figure={step.response}
            timeSignature={ts}
            label={`${name} response`}
            onChange={(response) => onChange({ response })}
          />
        ) : (
          <p className="text-sm text-white/45">
            Same as the call. Untick “Echo the call” to write a different
            answer.
          </p>
        )}
      </Section>

      {issues.length > 0 && (
        <ConsoleCallout tone="danger" title="Fix before saving">
          <ul className="list-disc pl-4">
            {issues.map((issue, i) => (
              <li key={i}>
                {issue.where}: {issue.message}
              </li>
            ))}
          </ul>
        </ConsoleCallout>
      )}
    </div>
  );
};
