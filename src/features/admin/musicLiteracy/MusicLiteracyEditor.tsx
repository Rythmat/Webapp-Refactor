/* eslint-disable react/jsx-sort-props */
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Play,
  Plus,
  Save,
  Square,
  Trash2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import {
  LITERACY_TONICS,
  isMelodicEcho,
  stepKind,
  type LiteracyStep,
  type LiteracyTonic,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { useUnsavedChanges } from '../content/mirror/UnsavedChangesGuard';
import {
  DetailCell,
  IconButton,
  InlineNumber,
  InlineSelect,
  InlineText,
  InlineTextarea,
} from '../content/visual/Editable';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { useUndoable } from '../drumGrooves/useUndoable';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { UndoRedo } from '../ui/UndoRedo';
import { CONSOLE_LABEL, CONSOLE_PANEL, consoleTabClass } from '../ui/styles';
import { LiteracyRoll } from './LiteracyRoll';
import { LiteracyStepEditor } from './LiteracyStepEditor';
import { pitchLabel } from './literacyControls';
import {
  addStep,
  canonicalLesson,
  downloadLesson,
  duplicateStep,
  learnHrefFor,
  lessonIssues,
  moveStep,
  patchStep,
  removeStep,
  renameStep,
  stepIssues,
  tonicLabel,
  type LessonIssue,
} from './literacyLesson';
import type { Segment } from './literacyPart';
import { useStepPreview } from './useStepPreview';

/**
 * One Music Literacy lesson: its key, tempo and place in the series, and its
 * steps, each opened to edit its words, call and response — or opened in
 * the Parts editor's piano roll and staff (`?roll=<step>:<segment>`, the
 * same page, so the draft and its history carry on). Saved only when the
 * body schema accepts it, laid out as its file is (canonicalLesson), through
 * the content system or the dev server (instrumentStore.ts).
 */

const SEGMENTS: readonly Segment[] = ['words', 'call', 'response'];

/** `?roll=2:call` → step 2's call. */
function rollOf(value: string | null) {
  const [step, segment] = (value ?? '').split(':');
  const index = Number(step);
  return value &&
    Number.isInteger(index) &&
    SEGMENTS.includes(segment as Segment)
    ? { step: index, segment: segment as Segment }
    : null;
}

const TONIC_OPTIONS = LITERACY_TONICS.map((tonic) => ({
  value: tonic,
  label: tonicLabel(tonic),
}));

const TIME_OPTIONS = ['2/4', '3/4', '4/4', '6/8'];

export const MusicLiteracyEditor: FC<{ lesson: MusicLiteracyLesson }> = ({
  lesson: initial,
}) => {
  const history = useUndoable<MusicLiteracyLesson>(initial);
  const draft = history.value;
  const [saved, setSaved] = useState(initial);
  const [expanded, setExpanded] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search] = useSearchParams();
  const { pathname } = useLocation();
  const store = useInstrumentStore();
  const canSave = store.canSave('music_literacy');

  const issues = useMemo(() => lessonIssues(draft), [draft]);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );
  // Leaving the page with unsaved edits asks first; the roll is this page.
  useUnsavedChanges(dirty);

  const savedTags = useMemo(
    () => new Set(saved.steps.map((step) => step.tag)),
    [saved],
  );

  const save = useCallback(async () => {
    if (issues.length || saving) return;
    const body = canonicalLesson(draft);
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await store.save('music_literacy', body);
      // The saved layout, without a step of its own to undo.
      history.replace(body);
      setSaved(body);
      setNotice(
        body.status === 'live'
          ? 'Saved. Students see this lesson once the change ships (commit the file, or publish).'
          : 'Saved as a draft: students don’t see it until it’s Live.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [draft, issues.length, saving, store, history]);

  // The step the roll was opened from, to bring back into view after it.
  const fromRoll = useRef<number | null>(null);
  const roll = rollOf(search.get('roll'));
  const rollStep = roll ? draft.steps[roll.step] : undefined;
  // The roll edits a melody's notes: Part 1's kind of step.
  if (roll && rollStep && isMelodicEcho(rollStep)) {
    fromRoll.current = roll.step;
    return (
      <LiteracyRoll
        lesson={draft}
        step={rollStep}
        stepIndex={roll.step}
        segment={roll.segment}
        backHref={pathname}
        onCommit={(step) =>
          history.set((lesson) => ({
            ...lesson,
            steps: lesson.steps.map((s, i) => (i === roll.step ? step : s)),
          }))
        }
      />
    );
  }

  return (
    <LessonPane
      draft={draft}
      set={history.set}
      history={history}
      issues={issues}
      dirty={dirty}
      saving={saving}
      canSave={canSave}
      notice={notice}
      error={error}
      onSave={save}
      savedTags={savedTags}
      expanded={expanded}
      setExpanded={setExpanded}
      fromRoll={fromRoll}
    />
  );
};

interface PaneProps {
  draft: MusicLiteracyLesson;
  set: (
    next:
      | MusicLiteracyLesson
      | ((prev: MusicLiteracyLesson) => MusicLiteracyLesson),
  ) => void;
  history: Parameters<typeof UndoRedo>[0]['history'];
  issues: LessonIssue[];
  dirty: boolean;
  saving: boolean;
  canSave: boolean;
  notice: string | null;
  error: string | null;
  onSave: () => void;
  savedTags: ReadonlySet<string>;
  expanded: number | null;
  setExpanded: (
    next: number | null | ((prev: number | null) => number | null),
  ) => void;
  fromRoll: { current: number | null };
}

/**
 * The lesson without the roll. Its own component so the preview's player,
 * and the keys, are let go while the roll (which has its own) is open.
 */
const LessonPane: FC<PaneProps> = ({
  draft,
  set,
  history,
  issues,
  dirty,
  saving,
  canSave,
  notice,
  error,
  onSave,
  savedTags,
  expanded,
  setExpanded,
  fromRoll,
}) => {
  const [, setSearch] = useSearchParams();
  const preview = useStepPreview();
  const learnHref = learnHrefFor(draft.id);
  const patch = (next: Partial<MusicLiteracyLesson>) =>
    set((lesson) => ({ ...lesson, ...next }));
  const lessonLevel = issues.filter((issue) => issue.path[0] !== 'steps');

  // Back from the roll: the step it was opened from, in view.
  useLayoutEffect(() => {
    const step = fromRoll.current;
    fromRoll.current = null;
    if (step !== null)
      document
        .querySelector(`[data-step="${step}"]`)
        ?.scrollIntoView({ block: 'start' });
  }, []);

  // ⌘Z / ⌘⇧Z undo and redo outside a field, ⌘S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (canSave && dirty) onSave();
      } else if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canSave, dirty, onSave, history]);

  const openRoll = (step: number, segment: Segment) => {
    preview.stop();
    setSearch({ roll: `${step}:${segment}` });
  };

  const play = (index: number) =>
    void preview.play(draft, index).catch((err: unknown) => {
      window.alert(err instanceof Error ? err.message : String(err));
    });

  const [beats, unit] = draft.timeSignature;

  return (
    <div className="flex flex-col gap-5">
      {/* The lesson's bar, kept in view while the steps scroll under it. */}
      <div className="sticky top-0 z-30 -mx-6 -mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-background px-6 py-2 md:-mx-10 md:px-10">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild size="icon" variant="ghost">
            <Link
              to={AdminRoutes.musicLiteracy()}
              aria-label="Back to Music Literacy"
            >
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="truncate text-xl tracking-[-0.01em] text-white">
            {draft.name || 'Untitled lesson'}
          </h1>
          <ConsoleBadge tone={draft.status === 'live' ? 'success' : 'warning'}>
            {draft.status === 'live' ? 'Live' : 'Draft'}
          </ConsoleBadge>
          {dirty && <ConsoleBadge tone="info">Unsaved changes</ConsoleBadge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <UndoRedo history={history} />
          <Button asChild variant="outline" size="sm">
            <Link to={learnHref} title="The student’s page, as last saved">
              <ExternalLink /> Open in Learn
            </Link>
          </Button>
          {canSave ? (
            <Button
              onClick={onSave}
              disabled={saving || !dirty || issues.length > 0}
              title={
                issues.length
                  ? 'Fix the problems listed below first'
                  : 'Save (⌘S)'
              }
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {dirty ? 'Save' : 'Saved'}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => downloadLesson(canonicalLesson(draft))}
              disabled={issues.length > 0}
            >
              <Download /> Export JSON
            </Button>
          )}
        </div>
      </div>

      {!canSave && (
        <ConsoleCallout tone="info">
          Music Literacy lessons are saved as repo files, so saving works on the
          local dev server (npm run dev). Here you can edit, play and export a
          lesson as JSON.
        </ConsoleCallout>
      )}
      {notice && <ConsoleCallout tone="success">{notice}</ConsoleCallout>}
      {error && (
        <ConsoleCallout tone="danger" title="Couldn’t save">
          {error}
        </ConsoleCallout>
      )}
      {issues.length > 0 && (
        <ConsoleCallout
          tone="warning"
          title={`${issues.length} thing${issues.length === 1 ? '' : 's'} to fix before saving`}
        >
          <ul className="list-disc pl-4">
            {issues.slice(0, 8).map((issue, i) => (
              <li key={i}>
                {issue.where}: {issue.message}
              </li>
            ))}
            {issues.length > 8 && <li>and {issues.length - 8} more</li>}
          </ul>
        </ConsoleCallout>
      )}

      {/* ── The lesson ── */}
      <div
        className={`${CONSOLE_PANEL} grid grid-cols-2 gap-x-6 gap-y-4 p-4 md:grid-cols-4`}
      >
        <DetailCell label="Name" className="col-span-2">
          <InlineText
            value={draft.name}
            onChange={(name) => patch({ name })}
            placeholder="Music Literacy · Part 2"
            ariaLabel="Lesson name"
            className="text-base font-medium tracking-[-0.01em] text-white"
          />
        </DetailCell>
        <DetailCell label="Who sees it" className="col-span-2">
          <div
            role="radiogroup"
            aria-label="Status"
            className="flex flex-wrap items-center gap-1.5"
          >
            {(['draft', 'live'] as const).map((status) => (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={draft.status === status}
                onClick={() => patch({ status })}
                className={consoleTabClass(draft.status === status, 'sm')}
              >
                {status === 'live' ? 'Live' : 'Draft'}
              </button>
            ))}
            <span className="text-xs text-white/40">
              Students see Live lessons only.
            </span>
          </div>
        </DetailCell>
        <DetailCell label="Description" className="col-span-2 md:col-span-4">
          <InlineTextarea
            value={draft.description}
            onChange={(value) =>
              patch({ description: value.trim() ? value : undefined })
            }
            placeholder="What the lesson covers, in a sentence or two"
            rows={2}
            ariaLabel="Lesson description"
          />
        </DetailCell>
        <DetailCell label="Part (place in the series)">
          <InlineNumber
            value={draft.part}
            onChange={(value) =>
              patch({ part: Math.max(1, Math.round(value ?? 1)) })
            }
            min={1}
            ariaLabel="Part"
          />
        </DetailCell>
        <DetailCell label="Order within the part">
          <InlineNumber
            value={draft.order}
            onChange={(value) =>
              patch({
                order: value === undefined ? undefined : Math.round(value),
              })
            }
            placeholder="none"
            ariaLabel="Order"
          />
        </DetailCell>
        <DetailCell label="Key">
          <span className="inline-flex items-center gap-1">
            <InlineSelect
              value={draft.key.tonic}
              onChange={(tonic) =>
                patch({ key: { ...draft.key, tonic: tonic as LiteracyTonic } })
              }
              options={TONIC_OPTIONS}
              ariaLabel="Key"
              className="text-sm"
            />
            <InlineSelect
              value={draft.key.mode}
              onChange={(mode) =>
                patch({
                  key: { ...draft.key, mode: mode as 'major' | 'minor' },
                })
              }
              options={[
                { value: 'major', label: 'major' },
                { value: 'minor', label: 'minor' },
              ]}
              ariaLabel="Mode"
              className="text-sm"
            />
          </span>
        </DetailCell>
        <DetailCell label="Tempo">
          <InlineNumber
            value={draft.tempo}
            onChange={(value) =>
              patch({ tempo: value && value > 0 ? value : draft.tempo })
            }
            min={30}
            max={300}
            suffix=" BPM"
            ariaLabel="Tempo"
          />
        </DetailCell>
        <DetailCell label="Count-in">
          <InlineSelect
            value={String(draft.countInBars)}
            onChange={(value) => patch({ countInBars: Number(value) })}
            options={[
              { value: '0', label: 'None' },
              { value: '1', label: '1 bar' },
              { value: '2', label: '2 bars' },
            ]}
            ariaLabel="Count-in"
            className="text-sm"
          />
        </DetailCell>
        <DetailCell label="Time">
          <InlineSelect
            value={`${beats}/${unit}`}
            onChange={(value) => {
              const [b, u] = value.split('/').map(Number);
              patch({ timeSignature: [b, u] });
            }}
            options={
              TIME_OPTIONS.includes(`${beats}/${unit}`)
                ? TIME_OPTIONS
                : [...TIME_OPTIONS, `${beats}/${unit}`]
            }
            ariaLabel="Time signature"
            className="text-sm"
          />
        </DetailCell>
        {lessonLevel.length > 0 && (
          <p className="col-span-2 text-sm text-red-300 md:col-span-4">
            {lessonLevel.map((i) => `${i.where}: ${i.message}`).join(' · ')}
          </p>
        )}
      </div>

      {/* ── Steps ── */}
      <div className="flex items-baseline gap-3">
        <h2 className={CONSOLE_LABEL}>Steps</h2>
        <span className="text-xs text-white/40">
          Each step: the teacher sings the words and plays the call; the student
          plays the response back.
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {draft.steps.map((step, index) => (
          <StepRow
            key={index}
            step={step}
            index={index}
            count={draft.steps.length}
            issues={stepIssues(issues, index)}
            open={expanded === index}
            playing={preview.playingStep === index}
            onToggle={() => setExpanded(expanded === index ? null : index)}
            onPlay={() =>
              preview.playingStep === index ? preview.stop() : play(index)
            }
            onMove={(delta) => {
              set((lesson) => moveStep(lesson, index, delta));
              setExpanded((open) =>
                open === index
                  ? index + delta
                  : open === index + delta
                    ? index
                    : open,
              );
            }}
            onDuplicate={() => {
              set((lesson) => duplicateStep(lesson, index));
              setExpanded(index + 1);
            }}
            onDelete={() => {
              if (
                !window.confirm(
                  `Delete step ${index + 1}, “${step.title}”? Students’ progress on it goes with it.`,
                )
              )
                return;
              preview.stop();
              set((lesson) => removeStep(lesson, index));
              setExpanded(null);
            }}
          >
            {!isMelodicEcho(step) ? (
              <div className="border-t border-white/[0.06] px-4 pb-5 pt-4">
                <ConsoleCallout tone="info">
                  A Part 2 step ({stepKind(step)}
                  {stepKind(step) === 'echo' ? ', a chord call' : ''}). Its
                  editor is on its way; until then, edit it in the lesson’s
                  file.
                </ConsoleCallout>
              </div>
            ) : (
              <LiteracyStepEditor
                lesson={draft}
                step={step}
                index={index}
                issues={stepIssues(issues, index)}
                tagFixed={savedTags.has(step.tag)}
                onChange={(next) =>
                  set((lesson) => patchStep(lesson, index, next))
                }
                onRename={(title) =>
                  set((lesson) => renameStep(lesson, index, title, savedTags))
                }
                onRoll={(segment) => openRoll(index, segment)}
                preview={{
                  playing: preview.playingStep === index,
                  loading: preview.loading,
                  lit: preview.lit?.step === index ? preview.lit : null,
                  play: () => play(index),
                  stop: preview.stop,
                }}
                learnHref={learnHref}
              />
            )}
          </StepRow>
        ))}

        <button
          type="button"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-3 text-sm text-white/45 transition-colors hover:border-white/30 hover:bg-white/[0.04] hover:text-white"
          onClick={() => {
            const index = draft.steps.length;
            set((lesson) => addStep(lesson));
            setExpanded(index);
          }}
        >
          <Plus className="size-4" />
          Add step
        </button>
      </div>
    </div>
  );
};

/** A step's row: what it is at a glance, its tools, and the step opened. */
const StepRow: FC<{
  step: LiteracyStep;
  index: number;
  count: number;
  issues: readonly LessonIssue[];
  open: boolean;
  playing: boolean;
  onToggle: () => void;
  onPlay: () => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: ReactNode;
}> = ({
  step,
  index,
  count,
  issues,
  open,
  playing,
  onToggle,
  onPlay,
  onMove,
  onDuplicate,
  onDelete,
  children,
}) => {
  const n = index + 1;
  const call = isMelodicEcho(step)
    ? step.call.notes
        .map((note) => pitchLabel(note.degree, note.octave ?? 0))
        .join(' ')
    : stepKind(step);
  const ownResponse = isMelodicEcho(step) && step.response !== undefined;
  return (
    <div
      data-step={index}
      className={cn(
        'overflow-hidden scroll-mt-4',
        CONSOLE_PANEL,
        issues.length > 0 && 'border-red-400/30',
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={onToggle}
        >
          {open ? (
            <ChevronDown className="size-4 shrink-0 text-white/40" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-white/40" />
          )}
          <span className="w-6 shrink-0 text-xs tabular-nums text-white/30">
            {n}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-white/85">
            {step.title || 'Untitled step'}
          </span>
          <span
            className="hidden shrink-0 tabular-nums text-xs text-white/40 sm:inline"
            title="The call"
          >
            {call || '—'}
          </span>
          {ownResponse && (
            <ConsoleBadge tone="muted" className="shrink-0">
              own response
            </ConsoleBadge>
          )}
          {issues.length > 0 && (
            <ConsoleBadge tone="danger" className="shrink-0">
              {issues.length} to fix
            </ConsoleBadge>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            label={playing ? `Stop step ${n}` : `Play step ${n}`}
            active={playing}
            onClick={onPlay}
          >
            {playing ? (
              <Square className="size-3.5" />
            ) : (
              <Play className="size-3.5" />
            )}
          </IconButton>
          <IconButton
            label={`Move step ${n} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp className="size-3.5" />
          </IconButton>
          <IconButton
            label={`Move step ${n} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="size-3.5" />
          </IconButton>
          <IconButton label={`Duplicate step ${n}`} onClick={onDuplicate}>
            <Copy className="size-3.5" />
          </IconButton>
          <IconButton label={`Delete step ${n}`} danger onClick={onDelete}>
            <Trash2 className="size-3.5" />
          </IconButton>
        </div>
      </div>
      {open && children}
    </div>
  );
};
