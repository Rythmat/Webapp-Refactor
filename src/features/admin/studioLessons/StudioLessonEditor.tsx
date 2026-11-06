/* eslint-disable react/jsx-sort-props */
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AdminRoutes } from '@/constants/routes';
import { lessonNeedsPremium } from '@/content/studioLessons/premium';
import {
  STUDIO_LESSON_COURSES,
  STUDIO_LESSON_DIFFICULTIES,
  type StudioLesson,
  type StudioLessonStep,
} from '@/content/studioLessons/schemas';
import { blankStudioStep } from '@/content/studioLessons/template';
import { useUnsavedChanges } from '../content/mirror/UnsavedChangesGuard';
import { InlineSelect } from '../content/visual/Editable';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { useUndoable } from '../drumGrooves/useUndoable';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { UndoRedo } from '../ui/UndoRedo';
import { CONSOLE_LABEL, CONSOLE_PANEL, consoleTabClass } from '../ui/styles';
import { AddStepButton, INPUT, StepFields } from './StepFields';
import {
  canonicalLesson,
  downloadLesson,
  lessonIssues,
  moveStep,
  newStepId,
  sameLesson,
} from './studioLessonDraft';
import { previewHref } from './studioLessonLinks';

/**
 * One Studio lesson: its tile (title, subtitle, difficulty, length, course),
 * who sees it, and its steps, each opened to change its words, spotlight,
 * what the Studio does as it starts and what makes it pass. Saved only when
 * the body schema accepts it, laid out as its file is (canonicalLesson),
 * through the dev server (instrumentStore.ts). A code lesson opens as it
 * ships (`fromCode`); its first save makes the console's copy.
 */

const NO_COURSE = 'None';

export const StudioLessonEditor: FC<{
  lesson: StudioLesson;
  /** The lesson ships in the code and has no console copy yet. */
  fromCode: boolean;
  /** A code lesson's id: saving this one replaces it. */
  replacesCode: boolean;
}> = ({ lesson: initial, fromCode, replacesCode }) => {
  const history = useUndoable<StudioLesson>(initial);
  const draft = history.value;
  const [saved, setSaved] = useState<StudioLesson | null>(
    fromCode ? null : initial,
  );
  const [open, setOpen] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const store = useInstrumentStore();
  const canSave = store.canSave('studio_lesson');

  const issues = useMemo(() => lessonIssues(draft), [draft]);
  const dirty = useMemo(
    () => (saved ? !sameLesson(draft, saved) : !sameLesson(draft, initial)),
    [draft, saved, initial],
  );
  useUnsavedChanges(dirty);
  const premium = lessonNeedsPremium(draft.steps);

  const set = history.set;
  const patch = (next: Partial<StudioLesson>) =>
    set((l) => ({ ...l, ...next }));
  const patchStep = (index: number, next: Partial<StudioLessonStep>) =>
    set((l) => ({
      ...l,
      steps: l.steps.map((s, i) => (i === index ? { ...s, ...next } : s)),
    }));

  const save = useCallback(async () => {
    if (issues.length || saving) return;
    const body = canonicalLesson(draft);
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await store.save('studio_lesson', body);
      history.replace(body);
      setSaved(body);
      setNotice(
        body.status === 'live'
          ? 'Saved. Students get it once the file ships (commit it). Preview runs it now.'
          : 'Saved as a draft: Preview runs it here; students don’t see it until it’s Live.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [draft, issues.length, saving, store, history]);

  // ⌘S saves, as the other editors do.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (canSave && dirty) void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canSave, dirty, save]);

  const addStep = () => {
    const at = open === null ? draft.steps.length : open + 1;
    const step = {
      ...blankStudioStep(newStepId(draft)),
      stage: draft.steps[at - 1]?.stage ?? 'STAGE 1',
    };
    set((l) => ({
      ...l,
      steps: [...l.steps.slice(0, at), step, ...l.steps.slice(at)],
    }));
    setOpen(at);
  };

  const showStep = (index: number) => {
    setOpen(index);
    requestAnimationFrame(() =>
      document
        .querySelector(`[data-step="${index}"]`)
        ?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }),
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-30 -mx-6 -mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-background px-6 py-2 md:-mx-10 md:px-10">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild size="icon" variant="ghost">
            <Link
              to={AdminRoutes.studioLessons()}
              aria-label="Back to Studio lessons"
            >
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="truncate text-xl tracking-[-0.01em] text-white">
            {draft.title || 'Untitled Lesson'}
          </h1>
          <ConsoleBadge tone={draft.status === 'live' ? 'success' : 'warning'}>
            {draft.status === 'live' ? 'Live' : 'Draft'}
          </ConsoleBadge>
          {premium && <ConsoleBadge tone="neutral">Premium</ConsoleBadge>}
          {dirty && <ConsoleBadge tone="info">Unsaved changes</ConsoleBadge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <UndoRedo history={history} />
          <Button asChild variant="outline" size="sm">
            <Link
              to={previewHref(draft.id)}
              title="Run it in the Studio, as last saved"
            >
              <Eye /> Preview
            </Link>
          </Button>
          {canSave ? (
            <Button
              onClick={() => void save()}
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

      {fromCode && (
        <ConsoleCallout tone="info">
          This lesson ships in the code. Its steps keep their code checks and
          demos, so you can reword, retarget and reorder them safely. Saving
          makes the console’s copy, which replaces it; Revert on the list goes
          back to the code.
        </ConsoleCallout>
      )}
      {!canSave && (
        <ConsoleCallout tone="info">
          Studio lessons are saved as repo files, so saving works on the local
          dev server (npm run dev). Here you can edit a lesson and export it as
          JSON.
        </ConsoleCallout>
      )}
      {notice && <ConsoleCallout tone="success">{notice}</ConsoleCallout>}
      {error && (
        <ConsoleCallout tone="danger" title="Couldn’t Save">
          {error}
        </ConsoleCallout>
      )}
      {issues.length > 0 && (
        <ConsoleCallout
          tone="warning"
          title={`${issues.length} Thing${issues.length === 1 ? '' : 's'} to Fix Before Saving`}
        >
          <ul className="list-disc pl-4">
            {issues.slice(0, 8).map((issue, i) => (
              <li key={i}>
                {issue.step !== null ? (
                  <button
                    type="button"
                    onClick={() => showStep(issue.step!)}
                    className="text-left underline-offset-2 hover:text-white hover:underline"
                  >
                    {issue.where}: {issue.message}
                  </button>
                ) : (
                  `${issue.where}: ${issue.message}`
                )}
              </li>
            ))}
            {issues.length > 8 && <li>and {issues.length - 8} more</li>}
          </ul>
        </ConsoleCallout>
      )}

      {/* ── The lesson ── */}
      <div
        className={`${CONSOLE_PANEL} grid grid-cols-1 gap-x-6 gap-y-4 p-4 md:grid-cols-4`}
      >
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className={CONSOLE_LABEL}>Title</span>
          <input
            className={INPUT}
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Funk — Lock the groove"
          />
        </label>
        <div className="flex flex-col gap-1 md:col-span-2">
          <span className={CONSOLE_LABEL}>Who sees it</span>
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
        </div>
        <label className="flex flex-col gap-1 md:col-span-4">
          <span className={CONSOLE_LABEL}>Subtitle</span>
          <input
            className={INPUT}
            value={draft.subtitle}
            onChange={(e) => patch({ subtitle: e.target.value })}
            placeholder="One line on the tile: what the student makes."
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Difficulty</span>
          <InlineSelect
            value={draft.difficulty}
            options={STUDIO_LESSON_DIFFICULTIES}
            onChange={(difficulty) =>
              patch({
                difficulty:
                  difficulty as (typeof STUDIO_LESSON_DIFFICULTIES)[number],
              })
            }
            ariaLabel="Difficulty"
          />
        </div>
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Minutes</span>
          <input
            type="number"
            min={1}
            max={60}
            className={INPUT}
            value={draft.estMinutes}
            onChange={(e) => patch({ estMinutes: Number(e.target.value) })}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Course</span>
          <div className="flex items-center gap-2">
            <InlineSelect
              value={draft.course ?? NO_COURSE}
              options={[NO_COURSE, ...STUDIO_LESSON_COURSES]}
              onChange={(course) =>
                patch(
                  course === NO_COURSE
                    ? { course: undefined, courseOrder: undefined }
                    : {
                        course:
                          course as (typeof STUDIO_LESSON_COURSES)[number],
                        courseOrder: draft.courseOrder ?? 1,
                      },
                )
              }
              ariaLabel="Course"
            />
            {draft.course && (
              <input
                type="number"
                min={1}
                className={`${INPUT} w-20`}
                value={draft.courseOrder ?? 1}
                onChange={(e) => patch({ courseOrder: Number(e.target.value) })}
                aria-label="Place in the course"
                title="Place in the course"
              />
            )}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Opens on song</span>
          <input
            className={INPUT}
            value={draft.seed ?? ''}
            onChange={(e) => patch({ seed: e.target.value || undefined })}
            placeholder="A blank project"
          />
        </label>
        <div className="text-xs text-white/40 md:col-span-4">
          <span className="tabular-nums">{draft.id}</span>
          {replacesCode && ' · replaces the code lesson with this id'}
          {' · '}
          {premium
            ? 'Premium: a step is in Prism.'
            : 'Free: no step is in Prism.'}
        </div>
      </div>

      {/* ── The steps ── */}
      <section className="flex flex-col gap-2">
        <h2 className={CONSOLE_LABEL}>Steps · {draft.steps.length}</h2>
        {draft.steps.map((step, i) => (
          <div
            key={`${i}-${step.id}`}
            data-step={i}
            className={`${CONSOLE_PANEL} scroll-mt-16`}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                {open === i ? (
                  <ChevronDown className="size-4 shrink-0 text-white/50" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-white/50" />
                )}
                <span className="w-6 shrink-0 tabular-nums text-xs text-white/40">
                  {i + 1}
                </span>
                <span className="shrink-0 text-xs uppercase tracking-wide text-white/45">
                  {step.stage}
                </span>
                <span className="truncate text-sm text-white/85">
                  {step.instruction.replace(/\*\*/g, '')}
                </span>
              </button>
              <ConsoleBadge tone="muted">
                {!step.check
                  ? 'Next'
                  : step.check.kind === 'code'
                    ? 'Code check'
                    : 'Ready-made'}
              </ConsoleBadge>
              <StepTool
                label="Move up"
                disabled={i === 0}
                onClick={() => {
                  set((l) => moveStep(l, i, i - 1));
                  setOpen(i - 1);
                }}
              >
                <ArrowUp className="size-4" />
              </StepTool>
              <StepTool
                label="Move down"
                disabled={i === draft.steps.length - 1}
                onClick={() => {
                  set((l) => moveStep(l, i, i + 1));
                  setOpen(i + 1);
                }}
              >
                <ArrowDown className="size-4" />
              </StepTool>
              <StepTool
                label="Duplicate"
                onClick={() => {
                  set((l) => ({
                    ...l,
                    steps: [
                      ...l.steps.slice(0, i + 1),
                      { ...step, id: newStepId(l, step.id) },
                      ...l.steps.slice(i + 1),
                    ],
                  }));
                  setOpen(i + 1);
                }}
              >
                <Copy className="size-4" />
              </StepTool>
              <StepTool
                label="Delete step"
                danger
                disabled={draft.steps.length === 1}
                onClick={() => {
                  set((l) => ({
                    ...l,
                    steps: l.steps.filter((_, j) => j !== i),
                  }));
                  setOpen(null);
                }}
              >
                <Trash2 className="size-4" />
              </StepTool>
            </div>
            {open === i && (
              <div className="border-t border-white/[0.06] p-4">
                <StepFields
                  step={step}
                  onPatch={(next) => patchStep(i, next)}
                />
              </div>
            )}
          </div>
        ))}
        <AddStepButton onClick={addStep} />
      </section>
    </div>
  );
};

const StepTool = ({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={`rounded p-1 text-white/40 transition-colors disabled:opacity-20 ${
      danger
        ? 'hover:bg-red-500/15 hover:text-red-400'
        : 'hover:bg-white/10 hover:text-white'
    }`}
  >
    {children}
  </button>
);
