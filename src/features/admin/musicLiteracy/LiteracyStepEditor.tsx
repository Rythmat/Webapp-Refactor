/* eslint-disable react/jsx-sort-props */
import {
  ExternalLink,
  KeyboardMusic,
  Loader2,
  Play,
  Plus,
  Square,
  Trash2,
} from 'lucide-react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import {
  isChordEcho,
  isEchoStep,
  isMelodicEcho,
  type LiteracyChooseChordsStep,
  type LiteracyChooseKeyStep,
  type LiteracyChooseModeStep,
  type LiteracyChordEchoStep,
  type LiteracyEchoStep,
  type LiteracyMelodicEchoStep,
  type LiteracyReplayStep,
  type LiteracyStep,
  type MusicLiteracyLesson,
  stepModuleTitles,
  stepRound,
} from '@/content/musicLiteracy/schemas';
import { blankLiteracyStep } from '@/content/musicLiteracy/template';
import { callBars } from '@/curriculum/engine/musicLiteracy/literacy';
import {
  DetailCell,
  InlineNumber,
  InlineText,
} from '../content/visual/Editable';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { CONSOLE_LABEL } from '../ui/styles';
import {
  CHOOSE_CHORDS_FIELDS,
  CHORD_ECHO_FIELDS,
  ChooseBody,
  ChooseChordsBody,
  ChordEchoBody,
  REPLAY_FIELDS,
  ReplayBody,
} from './ChordStepEditors';
import { FigureEditor } from './FigureEditor';
import { usesPart2 } from './LiteracyLessonSettings';
import { WordsEditor } from './WordsEditor';
import { control } from './literacyControls';
import { Choice, FieldIssues, SectionPicker, StepPart } from './literacyFields';
import { choiceInfo, choiceOf } from './literacyKinds';
import {
  issueItems,
  issuesAt,
  issuesOutside,
  sectionNames,
  tonicLabel,
  withStepPass,
  type LessonIssue,
  type StepField,
} from './literacyLesson';
import type { Segment } from './literacyPart';
import type { LitNote } from './useStepPreview';

/**
 * One step of a Music Literacy lesson, opened. Every kind has its title,
 * direction, section and tempo; then what its kind has:
 *
 *   melody        the words the teacher sings (optional), the call the
 *                 teacher plays and the response the student plays back
 *                 (the call echoed, unless it has one of its own)
 *   chords        the chords Atlas plays and their rhythm (ChordStepEditors)
 *   choose chords the template the student fills, and what it's saved as
 *   replay        the saved progression Atlas plays back
 *   choose key,   what the student sees
 *   choose mode
 *
 * and an echo (melody or chords) its passes and pass mark. The schema's
 * problems show at the field they're about; anything no field claims is
 * listed at the end.
 */

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

/** The head's fields, which show their own problems. */
const HEAD_FIELDS: readonly StepField[] = [
  ['tag'],
  ['section'],
  ['title'],
  ['direction'],
  ['tempo'],
  ['passMark'],
  ['kind'],
];

const MELODY_FIELDS: readonly StepField[] = [['words'], ['call'], ['response']];

/** The chip editors say when notes run past their bars, in their words. */
const notOverrun = (issues: readonly LessonIssue[]) =>
  issues.filter((issue) => !/runs past its/.test(issue.message));

export interface StepPreview {
  playing: boolean;
  loading: boolean;
  lit: LitNote | null;
  /** Play the step, or a stand-in for it (a choose-chords step's sample). */
  play: (standIn?: LiteracyStep) => void;
  stop: () => void;
}

export const LiteracyStepEditor: FC<{
  lesson: MusicLiteracyLesson;
  step: LiteracyStep;
  index: number;
  issues: readonly LessonIssue[];
  /** Whether the step's tag is the one it was saved with, so fixed. */
  tagFixed: boolean;
  onChange: (patch: Partial<LiteracyStep>) => void;
  /** An edit to the lesson beyond this step. */
  onLesson: (
    edit: (lesson: MusicLiteracyLesson) => MusicLiteracyLesson,
  ) => void;
  onRename: (title: string) => void;
  onRoll: (segment: Segment) => void;
  preview: StepPreview;
  learnHref: string;
}> = ({
  lesson,
  step,
  index,
  issues,
  tagFixed,
  onChange,
  onLesson,
  onRename,
  onRoll,
  preview,
  learnHref,
}) => {
  const name = `Step ${index + 1}`;
  const choice = choiceOf(step);
  const lit = preview.lit;
  const body = { lesson, index, issues, onLesson, name, lit };
  const claimed: StepField[] = [...HEAD_FIELDS, ['passes']];

  let kindBody;
  if (isMelodicEcho(step)) {
    claimed.push(...MELODY_FIELDS);
    kindBody = (
      <MelodyBody {...body} step={step} onChange={onChange} onRoll={onRoll} />
    );
  } else if (isChordEcho(step)) {
    claimed.push(...CHORD_ECHO_FIELDS);
    kindBody = (
      <ChordEchoBody
        {...body}
        step={step}
        onChange={onChange as (p: Partial<LiteracyChordEchoStep>) => void}
      />
    );
  } else if (step.kind === 'chooseChords') {
    claimed.push(...CHOOSE_CHORDS_FIELDS);
    kindBody = (
      <ChooseChordsBody
        {...body}
        step={step}
        onChange={onChange as (p: Partial<LiteracyChooseChordsStep>) => void}
        preview={preview}
      />
    );
  } else if (step.kind === 'replay') {
    claimed.push(...REPLAY_FIELDS);
    kindBody = (
      <ReplayBody
        {...body}
        step={step}
        onChange={onChange as (p: Partial<LiteracyReplayStep>) => void}
      />
    );
  } else {
    kindBody = (
      <ChooseBody
        {...body}
        step={step as LiteracyChooseKeyStep | LiteracyChooseModeStep}
        onChange={onChange}
      />
    );
  }
  const left = issuesOutside(issues, claimed);
  const playable = choice !== 'chooseKey' && choice !== 'chooseMode';

  return (
    <div className="flex flex-col gap-4 border-t border-white/[0.06] px-4 pb-5 pt-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <DetailCell label="Title" field="title">
          <InlineText
            value={step.title}
            onChange={onRename}
            placeholder="A note called C"
            ariaLabel={`${name} title`}
            className="text-base font-medium text-white"
          />
          <FieldIssues issues={issuesAt(issues, ['title'])} />
        </DetailCell>
        <DetailCell
          label="Direction (what the student is told)"
          field="direction"
        >
          <InlineText
            value={step.direction}
            onChange={(value) =>
              onChange({ direction: value.trim() ? value : undefined })
            }
            placeholder={choiceInfo(choice).directionHint}
            ariaLabel={`${name} direction`}
          />
          <FieldIssues issues={issuesAt(issues, ['direction'])} />
        </DetailCell>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <DetailCell label="Section" field="section">
          <SectionPicker
            value={step.section}
            sections={sectionNames(lesson)}
            label={`${name} section`}
            onChange={(section) => onChange({ section })}
          />
          <FieldIssues issues={issuesAt(issues, ['section'])} />
        </DetailCell>
        <DetailCell label="Tag" field="tag">
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
          <FieldIssues issues={issuesAt(issues, ['tag'])} />
        </DetailCell>
        <DetailCell label="Tempo for this step" field="tempo">
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
        {isEchoStep(step) && (
          <DetailCell label="Pass mark" field="passMark">
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
            <FieldIssues issues={issuesAt(issues, ['passMark'])} />
          </DetailCell>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {playable && choice !== 'chooseChords' && (
            <Button
              size="sm"
              onClick={preview.playing ? preview.stop : () => preview.play()}
              className={preview.playing ? 'bg-rose-500 hover:bg-rose-400' : ''}
              title={playTitle(choice, lesson)}
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
          )}
          <Button asChild size="sm" variant="outline">
            <Link to={learnHref} title="The student’s page, as last saved">
              <ExternalLink /> Open in Learn
            </Link>
          </Button>
        </div>
      </div>

      {kindBody}

      {isEchoStep(step) && (
        <PassFields
          lesson={lesson}
          step={step}
          name={name}
          issues={issues}
          onChange={onChange}
        />
      )}

      {left.length > 0 && (
        <ConsoleCallout tone="danger" title="Fix before saving">
          <ul className="list-disc pl-4">
            {left.map((issue, i) => (
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

function playTitle(
  choice: ReturnType<typeof choiceOf>,
  lesson: MusicLiteracyLesson,
): string {
  const key = `${tonicLabel(lesson.key.tonic)} ${lesson.key.mode}`;
  if (choice === 'melody')
    return 'The count-in, the words and the call, at the step’s tempo';
  if (choice === 'chords')
    return `The count-in and the chords, in ${key}, at the step’s tempo`;
  return `The progression once in each harmony, in ${key} (a sample until a student chooses)`;
}

// ── A melody ───────────────────────────────────────────────────────────────

const MelodyBody: FC<{
  lesson: MusicLiteracyLesson;
  step: LiteracyMelodicEchoStep;
  issues: readonly LessonIssue[];
  name: string;
  lit: LitNote | null;
  onChange: (patch: Partial<LiteracyMelodicEchoStep>) => void;
  onRoll: (segment: Segment) => void;
}> = ({ lesson, step, issues, name, lit, onChange, onRoll }) => {
  const ts = lesson.timeSignature;
  const echo = step.response === undefined;
  const scale = lesson.numbering === 'scale';
  const follows = scale
    ? ' Numbers follow major or minor: in minor, 3, 6 and 7 are ♭3, ♭6 and ♭7.'
    : '';

  return (
    <>
      {step.words ? (
        <StepPart
          title="Words · the teacher’s line"
          hint="Sung on the notes below, after the count-in; a pickup, at its end, into the downbeat (‖)."
          field="words"
          actions={
            <>
              <RollButton what="words" onClick={() => onRoll('words')} />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onChange({ words: undefined })}
                title="The call comes in right after the count-in"
              >
                <Trash2 /> Remove words
              </Button>
            </>
          }
          issues={notOverrun(issuesAt(issues, ['words']))}
        >
          <WordsEditor
            words={step.words}
            timeSignature={ts}
            stepLabel={name}
            scale={scale}
            invalid={issueItems(issues, ['words', 'notes'])}
            lit={lit?.segment === 'words' ? lit.index : null}
            onChange={(words) => onChange({ words })}
          />
        </StepPart>
      ) : (
        <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({ words: blankLiteracyStep('words', 'Words').words })
            }
          >
            <Plus /> Add words
          </Button>
          <span className="text-xs text-white/40">
            No words: the call comes in right after the count-in. Words are a
            line the teacher sings first.
          </span>
        </div>
      )}

      <StepPart
        title={`Call · what ${usesPart2(lesson) ? 'Atlas' : 'the teacher'} plays`}
        hint={`${step.words ? 'Played right after the words.' : 'Played right after the count-in.'}${follows}`}
        field="call"
        actions={<RollButton what="call" onClick={() => onRoll('call')} />}
        issues={notOverrun(issuesAt(issues, ['call']))}
      >
        <FigureEditor
          figure={step.call}
          timeSignature={ts}
          label={`${name} call`}
          scale={scale}
          invalid={issueItems(issues, ['call', 'notes'])}
          lit={lit?.segment === 'call' ? lit.index : null}
          onChange={(call) => onChange({ call })}
        />
      </StepPart>

      <StepPart
        title="Response · what the student plays back"
        hint={
          echo
            ? 'The student plays the call back, note for note.'
            : 'The student plays this back, graded note by note.'
        }
        field="response"
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
        issues={notOverrun(issuesAt(issues, ['response']))}
      >
        {step.response ? (
          <FigureEditor
            figure={step.response}
            timeSignature={ts}
            label={`${name} response`}
            scale={scale}
            invalid={issueItems(issues, ['response', 'notes'])}
            onChange={(response) => onChange({ response })}
          />
        ) : (
          <p className="text-sm text-white/45">
            Same as the call. Untick “Echo the call” to write a different
            answer.
          </p>
        )}
      </StepPart>
    </>
  );
};

// ── An echo's place in its module's round ──────────────────────────────────

/**
 * Whether the echo is played again in its module's round (the module's
 * header picks the round): in it, the default, or left out; and how long a
 * melody's own call is in a create round.
 */
const PassFields: FC<{
  lesson: MusicLiteracyLesson;
  step: LiteracyEchoStep;
  name: string;
  issues: readonly LessonIssue[];
  onChange: (patch: Partial<LiteracyEchoStep>) => void;
}> = ({ lesson, step, name, issues, onChange }) => {
  const chords = isChordEcho(step);
  const round = stepRound(lesson, step);
  const index = lesson.steps.indexOf(step);
  const module =
    (index >= 0 ? stepModuleTitles(lesson.steps)[index] : step.section) ??
    'the lesson';
  const bars = callBars(lesson, step.call);
  const createBars = step.passes?.createBars;
  const pass = round === 'none' ? null : round;
  // A chord call sits out a challenge: it's for melodies.
  const sitsOut = pass === 'challenge' && chords;
  const included = pass !== null && !sitsOut && step.passes?.[pass] !== false;
  const roundName = pass === 'create' ? 'create round' : 'challenge round';
  return (
    <StepPart
      title="In the round"
      hint={
        pass === null
          ? `${module === 'the lesson' ? 'The lesson' : `“${module}”`} has no round: set one on its header.`
          : `Once students pass “${module}”, its ${roundName} goes through its steps again.`
      }
      field="passes"
      issues={
        chords
          ? issuesAt(issues, ['passes'])
          : issuesAt(issues, ['passes'], true)
      }
    >
      {pass !== null && (
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
          {sitsOut ? (
            <p className="text-xs text-white/40 md:col-span-3">
              A chord call sits out the challenge round: it’s for melodies.
            </p>
          ) : (
            <div className="flex min-w-0 flex-col gap-1">
              <div className={CONSOLE_LABEL}>
                {pass === 'create' ? 'Create round' : 'Challenge round'}
              </div>
              <Choice
                label={`${name} in the ${roundName}`}
                value={included ? 'in' : 'out'}
                onChange={(value) =>
                  onChange({
                    passes: withStepPass(
                      step.passes,
                      pass,
                      value === 'in' ? undefined : false,
                    ),
                  })
                }
                options={[
                  { value: 'in', label: 'In it' },
                  { value: 'out', label: 'Skip this step' },
                ]}
              />
              <p className="text-[11px] text-white/35">
                {pass === 'create'
                  ? 'The student plays a call of their own on this step’s notes or chords, then repeats it.'
                  : 'The student plays ALL the notes along with Atlas.'}
              </p>
              <FieldIssues issues={issuesAt(issues, ['passes', pass])} />
            </div>
          )}
          {!chords &&
            ((pass === 'create' && included) || createBars !== undefined) && (
              <div className="flex min-w-0 flex-col gap-1">
                <div className={CONSOLE_LABEL}>Their call lasts</div>
                <select
                  aria-label={`${name} create pass bars`}
                  value={createBars ?? ''}
                  onChange={(e) =>
                    onChange({
                      passes: withStepPass(
                        step.passes,
                        'createBars',
                        e.target.value ? Number(e.target.value) : undefined,
                      ),
                    })
                  }
                  className={cn(control, 'w-fit py-1 text-sm')}
                >
                  <option value="">
                    As long as the call ({bars} bar{bars === 1 ? '' : 's'})
                  </option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} bar{n === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-white/35">
                  How long the student’s own call is, and their repeat of it.
                </p>
                <FieldIssues
                  issues={issuesAt(issues, ['passes', 'createBars'])}
                />
              </div>
            )}
        </div>
      )}
      {pass === null && createBars !== undefined && (
        <FieldIssues issues={issuesAt(issues, ['passes', 'createBars'])} />
      )}
    </StepPart>
  );
};
