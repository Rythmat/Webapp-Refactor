/* eslint-disable react/jsx-sort-props */
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
  Plus,
  Square,
  X,
} from 'lucide-react';
import { useEffect, useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import {
  LITERACY_MODES,
  LITERACY_PALETTE_SIZE,
  type LiteracyChooseChordsStep,
  type LiteracyChooseKeyStep,
  type LiteracyChooseModeStep,
  type LiteracyChordBar,
  type LiteracyChordEchoStep,
  type LiteracyChordFigure,
  type LiteracyHarmony,
  type LiteracyReplayStep,
  type LiteracyStep,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { circleOfFifths } from '@/curriculum/engine/musicLiteracy/choices';
import { chordPalette } from '@/curriculum/engine/musicLiteracy/chords';
import {
  replayHarmonies,
  resolveChordFigure,
} from '@/curriculum/engine/musicLiteracy/literacy';
import { IconButton } from '../content/visual/Editable';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { CONSOLE_LABEL } from '../ui/styles';
import { barBeat, chipStarts, moveItem } from './literacyChips';
import {
  addTemplateBar,
  barsText,
  beatsWords,
  chooserStandIn,
  chordBarOptions,
  HARMONY_LABEL,
  MAX_BARS,
  progressionUsers,
  removeTemplateBar,
  renameSaved,
  rhythmPresets,
  rhythmTotal,
  sampleOf,
  savedBefore,
  toggleTemplateBar,
  xCount,
  type SavedName,
} from './literacyChords';
import {
  CHIP,
  ChipHandle,
  control,
  DropMark,
  LengthSelect,
  ReorderStatus,
  RestGlyph,
  RhythmStrip,
} from './literacyControls';
import { Choice, FieldIssues, HarmonyChoice, StepPart } from './literacyFields';
import {
  issueItems,
  issuesAt,
  tonicLabel,
  type LessonIssue,
  type StepField,
} from './literacyLesson';
import { useChipReorder } from './useChipReorder';
import type { LitNote } from './useStepPreview';

/**
 * Part 2's steps, opened: a chord call (its bars' chords, or a saved
 * progression, its rhythm and harmony), a choose-chords step (its
 * template, how many chords, what it saves, the palette and a sample to
 * hear), a replay (the progression, its harmonies, its rhythm) and the
 * choose steps (what the student sees). Chords are named in the lesson's
 * key (the preview key, when the student picks theirs), by the app's hybrid
 * numbering: "4 maj", "♭6 maj", "5 dom7".
 */

/** What every kind's body is given. */
export interface BodyProps<S extends LiteracyStep> {
  lesson: MusicLiteracyLesson;
  step: S;
  index: number;
  /** This step's problems. */
  issues: readonly LessonIssue[];
  onChange: (patch: Partial<S>) => void;
  /** An edit beyond the step: a saved name renamed where it's played. */
  onLesson: (
    edit: (lesson: MusicLiteracyLesson) => MusicLiteracyLesson,
  ) => void;
  /** "Step 3", for the controls' names. */
  name: string;
  lit: LitNote | null;
}

/** "C major", the key a preview plays in. */
const keyName = (lesson: MusicLiteracyLesson) =>
  `${tonicLabel(lesson.key.tonic)} ${lesson.key.mode}`;

const studentKey = (lesson: MusicLiteracyLesson) =>
  lesson.keyChoice === 'student';

/** "in C major, the preview key (students hear their own)". */
const inKey = (lesson: MusicLiteracyLesson) =>
  studentKey(lesson)
    ? `in ${keyName(lesson)}, the preview key (each student hears their own)`
    : `in ${keyName(lesson)}`;

// ── A chord call ───────────────────────────────────────────────────────────

/** The fields a chord call's body shows its problems at. */
export const CHORD_ECHO_FIELDS: readonly StepField[] = [['call']];

export const ChordEchoBody: FC<BodyProps<LiteracyChordEchoStep>> = ({
  lesson,
  step,
  index,
  issues,
  onChange,
  name,
  lit,
}) => {
  const call = step.call;
  const saved = savedBefore(lesson, index);
  const single = saved.filter((s) => s.step.distinct === 1);
  const own = call.chords !== undefined;
  const resolved = resolveChordFigure(lesson, call);
  const setCall = (next: LiteracyChordFigure) => onChange({ call: next });

  const setChords = (chords: LiteracyChordBar[]) => {
    const hasX = chords.includes('X');
    const progression = hasX
      ? (call.progression ?? single.at(-1)?.name)
      : undefined;
    setCall({
      chords,
      ...(progression ? { progression } : {}),
      rhythm: call.rhythm,
      harmony: call.harmony,
    });
  };
  const setSource = (source: 'own' | 'saved') => {
    if (source === 'own')
      setCall({
        chords: ['1', '1'],
        rhythm: call.rhythm,
        harmony: call.harmony,
      });
    else
      setCall({
        progression:
          (call.progression && saved.some((s) => s.name === call.progression)
            ? call.progression
            : saved.at(-1)?.name) ?? '',
        rhythm: call.rhythm,
        harmony: call.harmony,
      });
  };
  const chooser = saved.find((s) => s.name === call.progression);
  const sampleLabels = resolved.chords.map((chord) => chord.label);

  return (
    <>
      <StepPart
        title="Chords · what Atlas plays"
        field="call.chords"
        hint={`One chord a bar, ${inKey(lesson)}. The student plays them back, chord for chord, in as many bars.`}
        actions={
          <Choice<'own' | 'saved'>
            label={`${name} chords from`}
            value={own ? 'own' : 'saved'}
            onChange={setSource}
            options={[
              { value: 'own', label: 'Its own chords' },
              {
                value: 'saved',
                label: 'Use a saved progression',
                disabled: saved.length === 0 && !call.progression,
                title: saved.length
                  ? 'Play a progression the student chose in an earlier step'
                  : 'No Choose chords step comes before this one',
              },
            ]}
          />
        }
        issues={issuesAt(issues, ['call'], true)}
      >
        {own ? (
          <>
            <ChordBars
              lesson={lesson}
              bars={call.chords!}
              harmony={call.harmony}
              xLabel={(b) => sampleLabels[b]}
              litBar={lit?.segment === 'call' ? (lit.bar ?? null) : null}
              invalid={issueItems(issues, ['call', 'chords'])}
              label={name}
              onChange={setChords}
            />
            <FieldIssues issues={issuesAt(issues, ['call', 'chords'])} />
            {call.chords!.includes('X') ? (
              <label className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                X plays the chord the student chose in
                <ProgressionSelect
                  saved={saved}
                  value={call.progression}
                  single
                  label={`${name} X comes from`}
                  onChange={(progression) => setCall({ ...call, progression })}
                />
              </label>
            ) : (
              call.progression && (
                // From a file: a progression no X takes.
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-fit"
                  onClick={() => setChords([...call.chords!])}
                >
                  <X /> Leave out “{call.progression}”: no bar is an X
                </Button>
              )
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            <ProgressionSelect
              saved={saved}
              value={call.progression}
              label={`${name} saved progression`}
              onChange={(progression) => setCall({ ...call, progression })}
            />
            {chooser && (
              <ProgressionNote
                chooser={chooser}
                labels={sampleLabels}
                litBar={lit?.segment === 'call' ? (lit.bar ?? null) : null}
              />
            )}
          </div>
        )}
        <FieldIssues issues={issuesAt(issues, ['call', 'progression'])} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
          Harmony
          <HarmonyChoice
            label={`${name} harmony`}
            value={call.harmony}
            onChange={(harmony) => setCall({ ...call, harmony })}
          />
        </div>
      </StepPart>

      <StepPart
        title="Rhythm · every bar"
        field="call.rhythm"
        hint="Each bar strikes its chord in this rhythm from the downbeat. What’s left of the bar is a rest."
        actions={
          <RhythmPresets
            lesson={lesson}
            onPick={(rhythm) => setCall({ ...call, rhythm })}
          />
        }
        issues={issuesAt(issues, ['call', 'rhythm'])}
      >
        <ChordRhythm
          rhythm={call.rhythm}
          timeSignature={lesson.timeSignature}
          label={`${name} rhythm`}
          litStrike={lit?.segment === 'call' ? (lit.strike ?? null) : null}
          onChange={(rhythm) => setCall({ ...call, rhythm })}
        />
      </StepPart>
    </>
  );
};

/**
 * A chord call's bars, each a chord picker named in the preview key: 1–7
 * (a diminished one unavailable) or X, a bar added or taken out.
 */
const ChordBars: FC<{
  lesson: MusicLiteracyLesson;
  bars: readonly LiteracyChordBar[];
  harmony: LiteracyHarmony;
  /** What an X sounds like here (the bar's chord, a sample until chosen). */
  xLabel: (bar: number) => string | undefined;
  litBar: number | null;
  invalid: ReadonlySet<number>;
  label: string;
  onChange: (bars: LiteracyChordBar[]) => void;
}> = ({ lesson, bars, harmony, xLabel, litBar, invalid, label, onChange }) => {
  const options = chordBarOptions(lesson, harmony);
  const other = lesson.key.mode === 'major' ? 'minor' : 'major';
  return (
    <div className="flex flex-wrap items-stretch gap-1.5">
      {bars.map((bar, b) => {
        const option = options.find((o) => o.bar === bar)!;
        return (
          <div
            key={b}
            data-chord-bar={b}
            data-lit={litBar === b || undefined}
            className={cn(
              CHIP,
              'w-[8.5rem]',
              litBar === b
                ? 'border-sky-300/70 bg-sky-300/15'
                : invalid.has(b)
                  ? 'border-red-400/50 bg-red-400/[0.06]'
                  : 'border-white/[0.08] bg-white/[0.03]',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">
                Bar {b + 1}
              </span>
              <IconButton
                label={`Remove ${label} bar ${b + 1}`}
                danger
                disabled={bars.length <= 1}
                onClick={() => onChange(removeTemplateBar(bars, b))}
              >
                <X className="size-3" />
              </IconButton>
            </div>
            <select
              aria-label={`${label} bar ${b + 1} chord`}
              aria-invalid={invalid.has(b) || undefined}
              value={bar}
              onChange={(e) =>
                onChange(
                  bars.map((x, i) =>
                    i === b ? (e.target.value as LiteracyChordBar) : x,
                  ),
                )
              }
              className={cn(control, 'w-full text-sm font-medium')}
            >
              {options.map((o) => (
                <option
                  key={o.bar}
                  value={o.bar}
                  disabled={!o.available && o.bar !== bar}
                >
                  {o.bar === 'X'
                    ? 'X · their chord'
                    : o.available
                      ? `${o.bar} · ${o.label}`
                      : `${o.bar} · not used (${o.reason})`}
                </option>
              ))}
            </select>
            {bar === 'X' ? (
              <span className="text-[11px] text-white/35">
                Plays {xLabel(b) ?? 'their chord'} here, a sample until they
                choose
              </span>
            ) : !option.available ? (
              <span className="text-[11px] text-red-300">
                {option.reason}: pick another
              </span>
            ) : (
              option.other && (
                <span className="text-[11px] text-white/35">
                  in {other}: {option.other}
                </span>
              )
            )}
          </div>
        );
      })}
      {bars.length < MAX_BARS && (
        <div className="flex flex-col justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange([...bars, bars.at(-1) ?? '1'])}
          >
            <Plus /> Add bar
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * The progressions saved before this step, to pick one; with `single`,
 * only those whose X's are one chord (what a chord call's X can take).
 */
const ProgressionSelect: FC<{
  saved: readonly SavedName[];
  value: string | undefined;
  onChange: (name: string) => void;
  label: string;
  single?: boolean;
}> = ({ saved, value, onChange, label, single }) => {
  if (!saved.length && !value)
    return (
      <span className="text-xs text-amber-200/80">
        No Choose chords step comes before this one: add one above it first.
      </span>
    );
  const known = saved.some((s) => s.name === value);
  return (
    <select
      aria-label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={cn(control, 'w-fit max-w-full py-1 text-sm')}
    >
      {!value && (
        <option value="" disabled>
          Pick a saved progression
        </option>
      )}
      {saved.map((s) => (
        <option
          key={s.name}
          value={s.name}
          disabled={single && s.step.distinct > 1 && s.name !== value}
        >
          “{s.name}”: {barsText(s.step.template)}, chosen in step {s.index + 1}
          {single && s.step.distinct > 1
            ? ` (${s.step.distinct} chords: X needs one)`
            : ''}
        </option>
      ))}
      {value && !known && (
        <option value={value}>“{value}” (not saved before this step)</option>
      )}
    </select>
  );
};

/** What a saved progression is, and what the preview plays for it. */
const ProgressionNote: FC<{
  chooser: SavedName;
  labels: readonly string[];
  litBar: number | null;
}> = ({ chooser, labels, litBar }) => (
  <div className="flex flex-col gap-1 text-xs text-white/50">
    <span>
      Students fill it in step {chooser.index + 1} with {chooser.step.distinct}{' '}
      different chord{chooser.step.distinct === 1 ? '' : 's'}, and hear their
      own here.
    </span>
    <span className="flex flex-wrap items-center gap-1">
      Play step plays a sample:
      <ChordLabels labels={labels} litBar={litBar} />
    </span>
  </div>
);

/** "1 maj | 4 maj": chords in bars, the one sounding lit. */
const ChordLabels: FC<{
  labels: readonly string[];
  litBar?: number | null;
}> = ({ labels, litBar }) => (
  <span className="inline-flex flex-wrap items-center gap-1 tabular-nums">
    {labels.map((label, b) => (
      <span
        key={b}
        data-lit={litBar === b || undefined}
        className={cn(
          'rounded px-1.5 py-0.5 text-xs',
          litBar === b
            ? 'bg-sky-300 text-[#101012]'
            : 'bg-white/[0.06] text-white/80',
        )}
      >
        {label}
      </span>
    ))}
  </span>
);

// ── A chord rhythm ─────────────────────────────────────────────────────────

const RhythmPresets: FC<{
  lesson: MusicLiteracyLesson;
  onPick: (rhythm: number[]) => void;
}> = ({ lesson, onPick }) => (
  <span className="flex flex-wrap items-center gap-1 text-[11px] text-white/35">
    Quick:
    {rhythmPresets(lesson.timeSignature).map((preset) => (
      <button
        key={preset.label}
        type="button"
        onClick={() => onPick(preset.rhythm)}
        className="rounded-full border border-white/[0.08] px-2 py-0.5 text-white/55 transition-colors hover:border-white/20 hover:text-white"
      >
        {preset.label}
      </button>
    ))}
  </span>
);

/**
 * One bar's rhythm, a chip a strike (how long, dragged into a new order,
 * taken out), then the rest to the bar line, and what it adds up to
 * against the bar.
 */
export const ChordRhythm: FC<{
  rhythm: readonly number[];
  timeSignature: readonly [number, number];
  onChange: (rhythm: number[]) => void;
  label: string;
  litStrike?: number | null;
}> = ({ rhythm, timeSignature, onChange, label, litStrike }) => {
  const starts = chipStarts(rhythm.map((duration) => ({ duration })));
  const total = rhythmTotal(rhythm, timeSignature);
  const reorder = useChipReorder(rhythm.length, (from, to) =>
    onChange(moveItem(rhythm, from, to)),
  );
  const set = (i: number, ticks: number) =>
    onChange(rhythm.map((t, j) => (j === i ? ticks : t)));

  return (
    <div className="flex flex-col gap-2.5">
      <div
        ref={reorder.listRef}
        className="flex flex-wrap items-stretch gap-1.5"
      >
        {rhythm.map((ticks, i) => {
          const name = `${label} strike ${i + 1}`;
          return (
            <div
              key={i}
              {...reorder.item(i)}
              data-lit={litStrike === i || undefined}
              className={cn(
                CHIP,
                'relative',
                litStrike === i
                  ? 'border-sky-300/70 bg-sky-300/15'
                  : starts[i] + ticks > total.bar
                    ? 'border-red-400/50 bg-red-400/[0.06]'
                    : 'border-white/[0.08] bg-white/[0.03]',
                reorder.dragging === i && 'opacity-40',
              )}
            >
              <DropMark side={reorder.mark(i)} />
              <ChipHandle
                reorder={reorder}
                index={i}
                label={`${name}: move (drag, or Alt+← / Alt+→)`}
              >
                <span className="min-w-0 flex-1 text-xs text-white/70">
                  strike {i + 1}
                </span>
                <span className="text-[10px] tabular-nums text-white/35">
                  beat {barBeat(starts[i], timeSignature).replace(/^\d+·/, '')}
                </span>
              </ChipHandle>
              <LengthSelect
                ticks={ticks}
                label={`${name}: how long`}
                onChange={(next) => set(i, next)}
              />
              <div className="mt-auto flex items-center justify-between">
                <IconButton
                  label={`Move ${name} earlier`}
                  disabled={i === 0}
                  onClick={() => onChange(moveItem(rhythm, i, i - 1))}
                >
                  <ChevronLeft className="size-3" />
                </IconButton>
                <IconButton
                  label={`Remove ${name}`}
                  danger
                  disabled={rhythm.length <= 1}
                  onClick={() => onChange(rhythm.filter((_, j) => j !== i))}
                >
                  <X className="size-3" />
                </IconButton>
                <IconButton
                  label={`Move ${name} later`}
                  disabled={i === rhythm.length - 1}
                  onClick={() => onChange(moveItem(rhythm, i, i + 1))}
                >
                  <ChevronRight className="size-3" />
                </IconButton>
              </div>
            </div>
          );
        })}
        {total.rest > 0 && (
          <div
            className={cn(
              CHIP,
              'justify-center border-dashed border-white/15 bg-transparent',
            )}
            title="The rest of the bar is silent until the next bar’s chord"
          >
            <span className="flex items-center gap-1 text-xs italic text-white/45">
              <RestGlyph ticks={total.rest} className="text-white/45" /> rest
            </span>
            <span className="text-[11px] text-white/35">
              {beatsWords(total.rest, timeSignature)}, to the bar line
            </span>
          </div>
        )}
        <div className="flex flex-col justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange([...rhythm, rhythm.at(-1) ?? 480])}
          >
            <Plus /> Add strike
          </Button>
        </div>
      </div>
      <ReorderStatus reorder={reorder} />
      <RhythmStrip
        bars={1}
        timeSignature={timeSignature}
        items={rhythm.map((ticks, i) => ({
          start: starts[i],
          duration: ticks,
          label: String(i + 1),
          lit: litStrike === i,
        }))}
      />
      <p
        data-rhythm-total
        className={cn('text-xs', total.over ? 'text-red-300' : 'text-white/45')}
      >
        {rhythmWords(rhythm.length, total, timeSignature)}
      </p>
    </div>
  );
};

/** "3 strikes, 3 beats, then 1 beat of rest to the bar line." */
function rhythmWords(
  strikes: number,
  total: ReturnType<typeof rhythmTotal>,
  timeSignature: readonly [number, number],
): string {
  const head = `${strikes} strike${strikes === 1 ? '' : 's'}, ${beatsWords(total.total, timeSignature)}`;
  if (total.over)
    return `${head}: ${beatsWords(total.over, timeSignature)} longer than the bar. Shorten a strike or take one out.`;
  if (total.rest)
    return `${head}, then ${beatsWords(total.rest, timeSignature)} of rest to the bar line.`;
  return `${head}: a full bar.`;
}

// ── Choose chords ──────────────────────────────────────────────────────────

export const CHOOSE_CHORDS_FIELDS: readonly StepField[] = [
  ['template'],
  ['distinct'],
  ['harmony'],
  ['saveAs'],
];

export const ChooseChordsBody: FC<
  BodyProps<LiteracyChooseChordsStep> & {
    preview: {
      playing: boolean;
      loading: boolean;
      play: (standIn: LiteracyStep) => void;
      stop: () => void;
    };
  }
> = ({
  lesson,
  step,
  index,
  issues,
  onChange,
  onLesson,
  name,
  lit,
  preview,
}) => {
  const xs = xCount(step.template);
  const users = progressionUsers(lesson, step.saveAs);
  const sample = sampleOf(step, lesson.key.mode);
  const standIn = chooserStandIn(lesson, step);

  return (
    <>
      <StepPart
        title="Template · the bars the student fills"
        field="template"
        hint="Click a bar to switch it between the 1 chord and X, a chord the student picks."
        issues={issuesAt(issues, ['template'])}
      >
        <TemplateBars
          template={step.template}
          label={name}
          onChange={(template) => onChange({ template })}
        />
        <p className="text-xs text-white/45">
          {barsText(step.template)} · {xs} X bar{xs === 1 ? '' : 's'} to fill
        </p>
      </StepPart>

      <div className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-white/[0.06] pt-4 md:grid-cols-3">
        <div className="flex flex-col gap-1" data-field="distinct">
          <span className={CONSOLE_LABEL}>Different chords to pick</span>
          <select
            aria-label={`${name} different chords`}
            value={step.distinct}
            onChange={(e) => onChange({ distinct: Number(e.target.value) })}
            className={cn(control, 'w-fit py-1 text-sm')}
          >
            {Array.from({ length: LITERACY_PALETTE_SIZE }, (_, n) => n + 1).map(
              (n) => (
                <option
                  key={n}
                  value={n}
                  disabled={n > xs && n !== step.distinct}
                >
                  {n} {n === 1 ? 'chord' : 'chords'}
                  {n > xs ? ` (needs ${n} X bar${n === 1 ? '' : 's'})` : ''}
                </option>
              ),
            )}
          </select>
          <span className="text-[11px] text-white/35">
            How many different chords the X bars use, the 1 not counted.
          </span>
          <FieldIssues issues={issuesAt(issues, ['distinct'])} />
        </div>
        <div className="flex flex-col gap-1" data-field="harmony">
          <span className={CONSOLE_LABEL}>Harmony</span>
          <HarmonyChoice
            label={`${name} harmony`}
            value={step.harmony}
            onChange={(harmony) => onChange({ harmony })}
          />
          <span className="text-[11px] text-white/35">
            What the palette offers: “4 maj”, or “4 maj7”.
          </span>
        </div>
        <SaveAsField
          value={step.saveAs}
          users={users}
          label={`${name} saved as`}
          issues={issuesAt(issues, ['saveAs'])}
          onChange={(saveAs) => onLesson((l) => renameSaved(l, index, saveAs))}
        />
      </div>

      <StepPart
        title="What the student picks from"
        hint={`The ${HARMONY_LABEL[step.harmony].toLowerCase()} of their major or minor, the 1 left out.`}
      >
        <div className="flex flex-col gap-1.5">
          {LITERACY_MODES.map((mode) => (
            <div
              key={mode}
              data-palette={mode}
              className="flex flex-wrap items-center gap-1.5 text-xs text-white/60"
            >
              <span className="w-12 capitalize">{mode}</span>
              <ChordLabels
                labels={chordPalette(mode, step.harmony).map((c) => c.label)}
              />
              {mode === lesson.key.mode && studentKey(lesson) && (
                <span className="text-[11px] text-white/30">preview</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
          <span>A sample, {inKey(lesson)}:</span>
          <ChordLabels
            labels={sample.labels}
            litBar={
              preview.playing && lit?.segment === 'call'
                ? (lit.bar ?? null)
                : null
            }
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              preview.playing ? preview.stop() : preview.play(standIn)
            }
            title="Common chords in the X bars, in the preview key"
          >
            {preview.loading ? (
              <Loader2 className="animate-spin" />
            ) : preview.playing ? (
              <Square />
            ) : (
              <Play />
            )}
            {preview.playing ? 'Stop' : 'Play sample'}
          </Button>
        </div>
      </StepPart>
    </>
  );
};

/** A template's bars: each 1 or X, switched by a click, added, taken out. */
const TemplateBars: FC<{
  template: LiteracyChooseChordsStep['template'];
  label: string;
  onChange: (template: LiteracyChooseChordsStep['template']) => void;
}> = ({ template, label, onChange }) => (
  <div className="flex flex-wrap items-stretch gap-1.5">
    {template.map((bar, b) => (
      <div
        key={b}
        data-template-bar={b}
        className={cn(
          'flex w-20 flex-col items-stretch gap-1 rounded-lg border p-1.5',
          bar === 'X'
            ? 'border-sky-300/30 bg-sky-300/[0.06]'
            : 'border-white/[0.08] bg-white/[0.03]',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">
            Bar {b + 1}
          </span>
          <IconButton
            label={`Remove ${label} template bar ${b + 1}`}
            danger
            disabled={template.length <= 1}
            onClick={() => onChange(removeTemplateBar(template, b))}
          >
            <X className="size-3" />
          </IconButton>
        </div>
        <button
          type="button"
          aria-label={`${label} template bar ${b + 1}: ${bar === 'X' ? 'X, the student picks' : 'the 1 chord'}. Click to switch.`}
          onClick={() => onChange(toggleTemplateBar(template, b))}
          className={cn(
            'rounded-md py-1.5 text-lg font-semibold tabular-nums transition-colors',
            bar === 'X'
              ? 'text-sky-200 hover:bg-sky-300/10'
              : 'text-white/85 hover:bg-white/10',
          )}
        >
          {bar}
        </button>
      </div>
    ))}
    {template.length < MAX_BARS && (
      <div className="flex flex-col justify-center">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange(addTemplateBar(template))}
        >
          <Plus /> Add bar
        </Button>
      </div>
    )}
  </div>
);

/**
 * The name the progression is saved under: later steps play it by this
 * name, and follow it when it changes.
 */
const SaveAsField: FC<{
  value: string;
  users: readonly number[];
  label: string;
  issues: readonly LessonIssue[];
  onChange: (name: string) => void;
}> = ({ value, users, label, issues, onChange }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft.trim() && draft !== value) onChange(draft);
    else setDraft(value);
  };
  return (
    <div className="flex flex-col gap-1" data-field="saveAs">
      <span className={CONSOLE_LABEL}>Save as</span>
      <input
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') setDraft(value);
        }}
        className={cn(control, 'w-full py-1 text-sm tabular-nums')}
      />
      <span className="text-[11px] text-white/35">
        {users.length
          ? `Played by step${users.length === 1 ? '' : 's'} ${users.map((i) => i + 1).join(', ')}, which follow a new name. Students who already chose choose again.`
          : 'A name later steps play it by. No step plays it yet.'}
      </span>
      <FieldIssues issues={issues} />
    </div>
  );
};

// ── A replay ───────────────────────────────────────────────────────────────

export const REPLAY_FIELDS: readonly StepField[] = [
  ['progression'],
  ['harmonies'],
  ['rhythm'],
];

const DEFAULT_HARMONIES: LiteracyHarmony[] = ['triads', 'sevenths'];
const sameHarmonies = (a: readonly LiteracyHarmony[]) =>
  a.length === DEFAULT_HARMONIES.length &&
  a.every((h, i) => h === DEFAULT_HARMONIES[i]);

export const ReplayBody: FC<BodyProps<LiteracyReplayStep>> = ({
  lesson,
  step,
  index,
  issues,
  onChange,
  name,
  lit,
}) => {
  const saved = savedBefore(lesson, index);
  const chooser = saved.find((s) => s.name === step.progression);
  const harmonies = replayHarmonies(step);
  const setHarmonies = (next: LiteracyHarmony[]) =>
    onChange({ harmonies: sameHarmonies(next) ? undefined : next });
  const sample = chooser ? sampleOf(chooser.step, lesson.key.mode) : null;
  const litBar = lit?.segment === 'call' ? (lit.bar ?? null) : null;

  return (
    <>
      <StepPart
        title="Progression · what Atlas plays back"
        field="progression"
        hint="A progression the student chose in an earlier step, in the key they chose it in. Just listening: nothing is graded."
        issues={issuesAt(issues, ['progression'])}
      >
        <ProgressionSelect
          saved={saved}
          value={step.progression}
          label={`${name} progression`}
          onChange={(progression) => onChange({ progression })}
        />
        {chooser && sample && (
          <ProgressionNote
            chooser={chooser}
            labels={sample.labels}
            litBar={litBar}
          />
        )}
      </StepPart>

      <StepPart
        title="Harmonies, in order"
        field="harmonies"
        hint="Atlas plays the progression through once in each."
        actions={
          step.harmonies && (
            <button
              type="button"
              onClick={() => onChange({ harmonies: undefined })}
              className="text-xs text-white/45 underline-offset-2 hover:text-white hover:underline"
            >
              Back to triads, then 7ths
            </button>
          )
        }
        issues={issuesAt(issues, ['harmonies'])}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {harmonies.map((harmony, h) => (
            <span
              key={h}
              data-harmony={h}
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-1.5 py-1"
            >
              <span className="text-[10px] tabular-nums text-white/35">
                {h + 1}.
              </span>
              <select
                aria-label={`${name} harmony ${h + 1}`}
                value={harmony}
                onChange={(e) =>
                  setHarmonies(
                    harmonies.map((x, i) =>
                      i === h ? (e.target.value as LiteracyHarmony) : x,
                    ),
                  )
                }
                className={cn(control, 'py-0.5 text-sm')}
              >
                <option value="triads">Triads</option>
                <option value="sevenths">7ths</option>
              </select>
              <IconButton
                label={`Remove ${name} harmony ${h + 1}`}
                danger
                disabled={harmonies.length <= 1}
                onClick={() =>
                  setHarmonies(harmonies.filter((_, i) => i !== h))
                }
              >
                <X className="size-3" />
              </IconButton>
            </span>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setHarmonies([
                ...harmonies,
                harmonies.at(-1) === 'triads' ? 'sevenths' : 'triads',
              ])
            }
          >
            <Plus /> Add a time through
          </Button>
          {!step.harmonies && (
            <span className="text-[11px] text-white/35">(the default)</span>
          )}
        </div>
      </StepPart>

      <StepPart
        title="Rhythm"
        field="rhythm"
        hint="Every bar’s rhythm, as a chord call’s. Without one, each chord is held for its bar."
        actions={
          <label className="flex items-center gap-1.5 text-xs text-white/70">
            <input
              type="checkbox"
              checked={step.rhythm !== undefined}
              onChange={(e) =>
                onChange({
                  rhythm: e.target.checked ? [480, 480, 960] : undefined,
                })
              }
              className="accent-white"
            />
            Its own rhythm
          </label>
        }
        issues={issuesAt(issues, ['rhythm'])}
      >
        {step.rhythm ? (
          <ChordRhythm
            rhythm={step.rhythm}
            timeSignature={lesson.timeSignature}
            label={`${name} rhythm`}
            litStrike={lit?.segment === 'call' ? (lit.strike ?? null) : null}
            onChange={(rhythm) => onChange({ rhythm })}
          />
        ) : (
          <p className="text-sm text-white/45">
            One chord a bar, held for the bar.
          </p>
        )}
      </StepPart>
    </>
  );
};

// ── The choose steps ───────────────────────────────────────────────────────

/** What a choose-key or choose-mode student sees, and a fix when it's lost. */
export const ChooseBody: FC<
  BodyProps<LiteracyChooseKeyStep | LiteracyChooseModeStep>
> = ({ lesson, step, issues, onLesson }) => {
  const kindIssues = issuesAt(issues, ['kind']);
  return (
    <StepPart
      title="What the student sees"
      hint={
        step.kind === 'chooseKey'
          ? 'The circle of fifths in the key colors. They tap a color, and its note is their 1 from here on.'
          : 'Two buttons, Major and Minor. Their pick sets their 3, 6 and 7, and their chords, for the steps after it.'
      }
    >
      {step.kind === 'chooseKey' ? (
        <div
          className="flex flex-wrap items-center gap-1.5"
          aria-label="The key colors"
        >
          {circleOfFifths(lesson.key.mode).map((key) => (
            <span
              key={key.tonic}
              title={key.label}
              className="flex size-8 items-center justify-center rounded-full text-[11px] font-semibold text-[#101012]"
              style={{ background: key.color }}
            >
              {key.label}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          {['Major', 'Minor'].map((mode) => (
            <span
              key={mode}
              className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/75"
            >
              {mode}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-white/40">
        Nothing to edit here but the title and the direction. Until a student
        chooses, and when you press Play in this editor, the lesson plays in{' '}
        {keyName(lesson)}.
      </p>
      {kindIssues.length > 0 && (
        <ConsoleCallout tone="danger">
          <FieldIssues issues={kindIssues} />
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => onLesson((l) => ({ ...l, keyChoice: 'student' }))}
          >
            Let students pick the key
          </Button>
        </ConsoleCallout>
      )}
    </StepPart>
  );
};
