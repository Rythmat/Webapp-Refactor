/* eslint-disable react/jsx-sort-props */
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import { flowKey } from '@/content/flowStore';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  uniquePartId,
  type InstrumentPart,
} from '@/curriculum/engine/parts/part';
import {
  lessonTitle,
  withLessonTitle,
} from '@/curriculum/guitar/layout/GuitarLessonHeader';
import {
  LessonTextEditingContext,
  type LessonTextEditing,
} from '@/curriculum/guitar/layout/lessonTextEditing';
import { GenreLessonContainerV2 } from '@/curriculum/pages/GenreLessonContainerV2';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';
import {
  CONTENT_KEY,
  type ContentItemDetail,
  useContentItem,
  useContentItems,
  useSaveContentItem,
} from '@/hooks/data/admin/useAdminContent';
import { isContentEditor } from '../../consoleRoles';
import { useInstrumentStore } from '../../drumGrooves/instrumentStore';
import { useUndoable } from '../../drumGrooves/useUndoable';
import { PartEditor } from '../../parts/PartEditor';
import { usePartList } from '../../parts/partFiles';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { UndoRedo } from '../../ui/UndoRedo';
import { CONSOLE_LABEL, consoleTabClass } from '../../ui/styles';
import { useUnsavedChanges } from '../mirror/UnsavedChangesGuard';
import { CONTENT_MOCK } from '../mock/mockSwitch';
import { InlineText } from '../visual/Editable';
import { StepEditor } from '../visual/StepEditor';
import { LevelSettings } from './LevelSettings';
import {
  addStep,
  deleteStep,
  duplicateStep,
  moveStep,
  renameSection,
  stepAt,
  stepPart,
  stepWithPart,
  withStep,
  type StepPlace,
} from './lessonEdits';

/**
 * A lesson level edited in place: the lesson as a student meets it on the
 * left, live from the unsaved edits, and the step it is on beside it on the
 * right. Notes are the Parts editor's (Piano Roll, Score, capture from a
 * MIDI keyboard, hands, approaches); the step's text and settings are the
 * Step tab's; the level's title, defaults, section and group names are the
 * Level tab's (LevelSettings.tsx). Steps are added, duplicated, moved and
 * deleted here too, and never renumbered (lessonEdits.ts).
 *
 * The level is the store's `activity_flow` item. Saving is a content save
 * like any other: an admin's is the item, an editor's a proposal for review,
 * and Publishing sends it to students.
 */

type Tab = 'notes' | 'step' | 'level';

/** A step name's label: "B1.1" of "B1.1: 1-7 Shells". */
const nameLabel = (activity: string) =>
  /^\s*([A-Z]\d+(?:\.\d+)*[a-z]?):/.exec(activity)?.[1] ?? '';

/** The body an edit builds on: an editor's queued proposal, else the item. */
const workingBody = (item: ContentItemDetail, isEditor: boolean) =>
  ((isEditor && item.pendingBody) || item.body) as unknown as ActivityFlowV2;

export const LessonEditor: FC<{
  genre: string;
  level: number;
  initialSection: ActivitySectionId;
}> = ({ genre, level, initialSection }) => {
  const { role } = useAuthContext();
  const isEditor = isContentEditor(role);
  const slug = flowKey(genre, level);
  const list = useContentItems({ kind: 'activity_flow' });
  const entry = list.data?.items.find((item) => item.slug === slug);
  const detail = useContentItem(entry?.id);
  // Held out here, so a save (which reloads the item) keeps the editor on
  // the step and tab it was on.
  const [place, setPlace] = useState<StepPlace>({
    section: initialSection,
    index: 0,
  });
  const [tab, setTab] = useState<Tab>('notes');

  const failed = list.error ?? detail.error;
  if (failed || (list.data && !entry))
    return (
      <div className="p-6">
        <ConsoleCallout tone="danger">
          {failed
            ? `Couldn’t load the lesson: ${failed.message}`
            : `The content store has no lesson ${slug} yet.`}
        </ConsoleCallout>
      </div>
    );
  if (!detail.data)
    return (
      <div className="flex h-full gap-2 p-2">
        <Skeleton className="h-full flex-1" />
        <Skeleton className="h-full w-[44%]" />
      </div>
    );

  const item = detail.data;
  const body = workingBody(item, isEditor);
  if (body.version !== 'v2')
    return (
      <div className="p-6">
        <ConsoleCallout tone="info">
          This lesson is in the older format, which edits in the course editor.
        </ConsoleCallout>
      </div>
    );
  return (
    <LessonEditorBody
      // A new copy from the server (a save, an approval) starts a session.
      key={`${item.id}:${new Date(item.updatedAt).getTime()}:${item.editState ?? ''}`}
      item={item}
      body={body}
      genre={genre}
      level={level}
      isEditor={isEditor}
      place={place}
      setPlace={setPlace}
      tab={tab}
      setTab={setTab}
    />
  );
};

const LessonEditorBody: FC<{
  item: ContentItemDetail;
  body: ActivityFlowV2;
  genre: string;
  level: number;
  isEditor: boolean;
  place: StepPlace;
  setPlace: (place: StepPlace) => void;
  tab: Tab;
  setTab: (tab: Tab) => void;
}> = ({ item, body, genre, level, isEditor, place, setPlace, tab, setTab }) => {
  const history = useUndoable<ActivityFlowV2>(body);
  const draft = history.value;
  const [saved, setSaved] = useState(body);
  const dirty = draft !== saved;
  const markClean = useUnsavedChanges(dirty);
  const save = useSaveContentItem();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setSearch] = useSearchParams();
  /**
   * Bumped when the step's notes change other than through the Parts editor
   * (an undo, a step moved in): it opens again on the step as it now is.
   */
  const [generation, setGeneration] = useState(0);
  const reopen = () => setGeneration((g) => g + 1);

  // The place, kept on a step that exists (an undo can take one away).
  const here: StepPlace = stepAt(draft, place)
    ? place
    : { section: place.section, index: 0 };
  const step = stepAt(draft, here);

  const saveLesson = useCallback(async () => {
    setError(null);
    setNotice(null);
    try {
      await save.mutateAsync({
        kind: 'activity_flow',
        slug: item.slug,
        body: draft,
        // An editor's save is a proposal; the status is the admin's to set.
        status: isEditor ? undefined : item.status,
      });
      setSaved(draft);
      markClean();
      const message = isEditor
        ? 'Submitted for review. An admin approves it, then Publishing sends it to students.'
        : 'Saved. Publishing sends it to students.';
      setNotice(message);
      return message;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      throw cause;
    }
  }, [save, item, draft, isEditor, markClean]);

  // ⌘S saves the level. On the Notes tab the Parts editor's own ⌘S does,
  // through its commit, which is this save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tab === 'notes') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty) void saveLesson().catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, dirty, saveLesson]);

  /** A change to the level's steps, the editor then at `next`. */
  const restructure = (
    result: { flow: ActivityFlowV2; place: StepPlace } | null,
  ) => {
    if (!result) return;
    history.set(result.flow);
    setPlace(result.place);
    reopen();
  };

  const lessonHistory = {
    undo: () => {
      history.undo();
      reopen();
    },
    redo: () => {
      history.redo();
      reopen();
    },
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };

  const sectionSteps =
    draft.sections.find((s) => s.id === here.section)?.steps.length ?? 0;

  /** A change to the step, from any of the places it edits. */
  const patchStep = (patch: Partial<ActivityStepV2>) =>
    history.set((f) => {
      const st = stepAt(f, here);
      return st ? withStep(f, here, { ...st, ...patch }) : f;
    });
  const setActivity = (activity: string) => patchStep({ activity });
  // The lesson's own header edits its section name, step title and chords
  // in place.
  const textEditing: LessonTextEditing | null = step
    ? {
        activity: step.activity,
        setActivity,
        sectionName:
          draft.sections.find((s) => s.id === here.section)?.name ?? '',
        setSectionName: (name) =>
          history.set((f) => renameSection(f, here.section, name)),
        chordSymbols: step.chordSymbols ?? [],
        setChordSymbols: (symbols) =>
          patchStep({ chordSymbols: symbols.length ? symbols : undefined }),
      }
    : null;

  return (
    <div className="flex h-full min-h-0 gap-2">
      {/* ── the lesson, as a student meets it, from the unsaved edits ── */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <LessonTextEditingContext.Provider value={textEditing}>
          <GenreLessonContainerV2
            flow={draft}
            genre={genre}
            level={level}
            position={here}
            onPositionChange={(section, index) => {
              if (section !== here.section || index !== here.index)
                setPlace({ section, index });
            }}
          />
        </LessonTextEditingContext.Provider>
      </div>

      {/* ── the step it is on ── */}
      <aside
        aria-label="Edit this step"
        className="flex w-[44%] min-w-[440px] max-w-[760px] shrink-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0c0e] font-sans text-white"
      >
        <header className="flex flex-col gap-2 border-b border-white/[0.06] p-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(CONSOLE_LABEL, 'shrink-0 tabular-nums')}
              title={`Step ${step?.stepNumber} of the level: its progress key, which never changes`}
            >
              {here.section} · {here.index + 1} of {sectionSteps}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-white/80">
              {step && (
                <>
                  {nameLabel(step.activity) && (
                    <span className="mr-1.5 tabular-nums text-white/50">
                      {nameLabel(step.activity)}
                    </span>
                  )}
                  <InlineText
                    value={lessonTitle(step.activity)}
                    onChange={(title) =>
                      title.trim() &&
                      setActivity(withLessonTitle(step.activity, title))
                    }
                    ariaLabel="Step title"
                    className="text-sm text-white/85"
                  />
                </>
              )}
            </span>
            {import.meta.env.DEV && CONTENT_MOCK && <ResetTestStore />}
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setSearch(
                  (prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete('edit');
                    next.set('section', here.section);
                    return next;
                  },
                  { replace: true },
                )
              }
              title="Back to the page as students see it"
            >
              <X /> Done
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => void saveLesson().catch(() => {})}
              disabled={!dirty || save.isPending}
            >
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
              {dirty ? (isEditor ? 'Submit level' : 'Save level') : 'Saved'}
            </Button>
            <UndoRedo history={lessonHistory} />
            <div className="mx-1 h-6 w-px bg-white/10" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => restructure(addStep(draft, here))}
              title="A new step after this one, with its settings and no notes"
            >
              <Plus /> New step
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => restructure(duplicateStep(draft, here))}
              title="A copy of this step, notes and all, after it"
            >
              <Copy /> Duplicate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={here.index === 0}
              onClick={() => restructure(moveStep(draft, here, -1))}
              aria-label="Move step earlier"
            >
              <ArrowUp />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={here.index >= sectionSteps - 1}
              onClick={() => restructure(moveStep(draft, here, 1))}
              aria-label="Move step later"
            >
              <ArrowDown />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={sectionSteps < 2}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete “${step?.activity}”? Students’ progress on it goes with it.`,
                  )
                )
                  restructure(deleteStep(draft, here));
              }}
              title={
                sectionSteps < 2
                  ? 'A section keeps at least one step'
                  : 'Delete this step'
              }
              className="hover:text-red-400"
            >
              <Trash2 />
            </Button>
          </div>
          {notice && (
            <p className="text-xs text-emerald-300/90">
              {notice}{' '}
              {!isEditor && (
                <Link
                  to={AdminRoutes.contentPublishing()}
                  className="underline underline-offset-2"
                >
                  Publishing
                </Link>
              )}
            </p>
          )}
          {error && <ConsoleCallout tone="danger">{error}</ConsoleCallout>}
          <div role="tablist" aria-label="Edit" className="flex gap-1.5">
            {(
              [
                ['notes', 'Notes'],
                ['step', 'Step'],
                ['level', 'Level'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={consoleTabClass(tab === id, 'sm')}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {step && tab === 'notes' && (
            <StepNotes
              flow={draft}
              place={here}
              generation={generation}
              onCommit={saveLesson}
              onEdit={(part) =>
                history.set((flow) => {
                  const st = stepAt(flow, here);
                  return st
                    ? withStep(flow, here, stepWithPart(flow, st, part))
                    : flow;
                })
              }
              onLibrary={setNotice}
            />
          )}
          {step && tab === 'step' && (
            <StepEditor
              step={step}
              noteList={false}
              onChange={(next) => history.set((f) => withStep(f, here, next))}
            />
          )}
          {tab === 'level' && (
            <LevelSettings
              flow={draft}
              section={here.section}
              onChange={history.set}
            />
          )}
        </div>
      </aside>
    </div>
  );
};

/**
 * The offline test store (VITE_CONTENT_MOCK) back to its seed — the repo's
 * lessons as they are now — every change made in it thrown away.
 */
const ResetTestStore = () => {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={busy}
      title="This server runs on a test store. Start it again from the repo's lessons, throwing away every change made in it."
      onClick={async () => {
        if (
          !window.confirm(
            'Reset the test store? Every change made in it goes, and it starts again from the repo’s lessons.',
          )
        )
          return;
        setBusy(true);
        const { resetContentMock } = await import('../mock/handleMockRequest');
        await resetContentMock();
        await queryClient.invalidateQueries({ queryKey: CONTENT_KEY });
        setBusy(false);
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} Reset test
      store
    </Button>
  );
};

/**
 * The step's notes in the Parts editor. It opens on the step as it is and
 * hands every edit up; it opens again on another step, or when what it was
 * opened with changes underneath it (the step's key, meter, chords or tempo,
 * or an undo, or a step added or moved).
 *
 * The step is the one at `place`, never one found by its number: numbers
 * repeat across a level's sections in some lessons (Hip Hop's run 1, 2, 3 in
 * each), and a level an older editor saved may repeat them in one.
 */
const StepNotes: FC<{
  flow: ActivityFlowV2;
  place: StepPlace;
  generation: number;
  onCommit: () => Promise<string>;
  onEdit: (part: InstrumentPart) => void;
  onLibrary: (message: string) => void;
}> = ({ flow, place, generation, onCommit, onEdit, onLibrary }) => {
  const parts = usePartList();
  const store = useInstrumentStore();
  const at = place;
  const step = stepAt(flow, at)!;
  const opened = JSON.stringify([
    at.section,
    at.index,
    step.tag,
    step.key,
    step.timeSignature,
    step.chordSymbols,
    step.chordsPerBar,
    step.tempo,
    step.swing,
    generation,
  ]);
  // Opened once per `opened`: the notes it hands up must not reopen it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const part = useMemo(() => stepPart(flow, step), [opened]);
  return (
    <div className="p-3">
      <PartEditor
        key={opened}
        part={part}
        lesson={{
          label: `${at.section}${at.index + 1} · ${step.activity}`,
          backHref: '',
          onCommit,
          embedded: { onDraft: onEdit },
        }}
        onDuplicate={async (notes) => {
          const id = uniquePartId(notes.name, new Set(parts.map((p) => p.id)));
          await store.save('instrument_part', {
            ...notes,
            id,
            status: 'draft',
          });
          onLibrary(`Kept in the Parts Library as “${notes.name}” (${id}).`);
        }}
      />
    </div>
  );
};
