/* eslint-disable react/jsx-sort-props */
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  GripVertical,
  Play,
  Plus,
  Square,
  Trash2,
} from 'lucide-react';
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import { cn } from '@/components/utilities';
import {
  isChordEcho,
  isMelodicEcho,
  type LiteracyStep,
  type MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { chordLabel } from '@/curriculum/engine/musicLiteracy/chords';
import { lessonSections } from '@/curriculum/engine/musicLiteracy/literacy';
import { IconButton, InlineText } from '../content/visual/Editable';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { CONSOLE_PANEL } from '../ui/styles';
import { barsText } from './literacyChords';
import { pitchLabel } from './literacyControls';
import {
  choiceInfo,
  choiceOf,
  STEP_CHOICES,
  type StepChoice,
} from './literacyKinds';
import {
  addStepOfChoice,
  duplicateStep,
  indexAfterMove,
  moveStepTo,
  renameSection,
  stepIssues,
  stepMove,
  type LessonIssue,
} from './literacyLesson';
import { useStepDrag } from './useStepDrag';

/**
 * The lesson's steps, in order, under their sections' headers (when it has
 * sections: Part 1 has none, and lists as it always has). A section folds
 * away and is renamed from its header, and takes a new step of any kind at
 * its end. A step is moved by its arrows or dragged by its grip, within its
 * section or into another: at a section's edge an arrow takes it over the
 * line, into the section beyond (`stepMove`).
 */

type Edit = (lesson: MusicLiteracyLesson) => MusicLiteracyLesson;

/** What a step's row says it plays, at a glance. */
function summary(lesson: MusicLiteracyLesson, step: LiteracyStep): string {
  if (isMelodicEcho(step))
    return step.call.notes
      .map((note) => pitchLabel(note.degree, note.octave ?? 0))
      .join(' ');
  if (isChordEcho(step)) {
    const { chords, progression, harmony } = step.call;
    if (!chords) return `plays “${progression}”`;
    return chords
      .map((bar) =>
        bar === 'X' ? 'X' : (chordLabel(lesson.key.mode, bar, harmony) ?? bar),
      )
      .join(' | ');
  }
  if (step.kind === 'chooseChords')
    return `${barsText(step.template)} → “${step.saveAs}”`;
  if (step.kind === 'replay') return `replays “${step.progression}”`;
  return '';
}

const sectionKey = (title: string | null) => `section:${title ?? ''}`;

export const LiteracyStepList: FC<{
  lesson: MusicLiteracyLesson;
  issues: readonly LessonIssue[];
  set: (edit: Edit) => void;
  expanded: number | null;
  setExpanded: (
    next: number | null | ((prev: number | null) => number | null),
  ) => void;
  collapsed: ReadonlySet<string>;
  setCollapsed: (next: Set<string>) => void;
  playingStep: number | null;
  onPlay: (index: number) => void;
  onStop: () => void;
  onDelete: (index: number) => void;
  /** A step's editor, opened. */
  children: (index: number) => ReactNode;
}> = ({
  lesson,
  issues,
  set,
  expanded,
  setExpanded,
  collapsed,
  setCollapsed,
  playingStep,
  onPlay,
  onStop,
  onDelete,
  children,
}) => {
  const sections = lessonSections(lesson);
  const grouped = lesson.steps.some((step) => step.section);
  const count = lesson.steps.length;

  const moveTo = (from: number, to: number, section: string | undefined) => {
    set((l) => moveStepTo(l, from, to, section));
    setExpanded((open) =>
      open === null ? null : indexAfterMove(open, from, to),
    );
  };
  const moveBy = (index: number, delta: number) => {
    const move = stepMove(lesson, index, delta);
    if (move) moveTo(index, move.to, move.section);
  };
  const drag = useStepDrag(
    sections,
    (from, slot, group) =>
      moveTo(
        from,
        slot > from ? slot - 1 : slot,
        sections[group]?.title ?? undefined,
      ),
    moveBy,
  );
  const add = (choice: StepChoice, at?: number, section?: string | null) => {
    const index = at ?? count;
    set((l) => addStepOfChoice(l, choice, index, section));
    setExpanded(index);
  };
  const toggle = (key: string) => {
    const next = new Set(collapsed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCollapsed(next);
  };

  return (
    <div ref={drag.listRef} className="flex flex-col gap-2">
      {sections.map((section, g) => {
        const key = sectionKey(section.title);
        const folded = grouped && collapsed.has(key);
        const end = section.steps.at(-1)! + 1;
        return (
          <div
            key={`${g}:${section.title ?? ''}`}
            data-step-group={g}
            data-section={section.title ?? ''}
            className={cn(
              'flex flex-col gap-2',
              grouped && 'rounded-2xl',
              grouped &&
                drag.mark?.group === g &&
                folded &&
                'ring-1 ring-sky-300/60',
            )}
          >
            {grouped && (
              <SectionHeader
                title={section.title}
                count={section.steps.length}
                folded={folded}
                issues={section.steps.reduce(
                  (n, i) => n + stepIssues(issues, i).length,
                  0,
                )}
                onToggle={() => toggle(key)}
                onRename={(name) =>
                  set((l) => renameSection(l, section.steps, name))
                }
                addMenu={
                  <AddStepMenu
                    lesson={lesson}
                    compact
                    label={`Add a step to ${section.title ?? 'these steps'}`}
                    onAdd={(choice) => add(choice, end, section.title)}
                  />
                }
              />
            )}
            {!folded &&
              section.steps.map((index) => {
                const step = lesson.steps[index];
                return (
                  <Fragment key={index}>
                    {drag.mark?.group === g && drag.mark.before === index && (
                      <DropLine />
                    )}
                    <StepRow
                      lesson={lesson}
                      step={step}
                      index={index}
                      count={count}
                      issues={stepIssues(issues, index)}
                      open={expanded === index}
                      playing={playingStep === index}
                      dragging={drag.dragging === index}
                      grip={drag.handle(index)}
                      onToggle={() =>
                        setExpanded(expanded === index ? null : index)
                      }
                      onPlay={() =>
                        playingStep === index ? onStop() : onPlay(index)
                      }
                      canMove={(delta) =>
                        stepMove(lesson, index, delta) !== null
                      }
                      onMove={(delta) => moveBy(index, delta)}
                      onDuplicate={() => {
                        set((l) => duplicateStep(l, index));
                        setExpanded(index + 1);
                      }}
                      onDelete={() => onDelete(index)}
                    >
                      {children(index)}
                    </StepRow>
                  </Fragment>
                );
              })}
            {drag.mark?.group === g && drag.mark.before === null && !folded && (
              <DropLine />
            )}
          </div>
        );
      })}
      <span role="status" className="sr-only">
        {drag.said}
      </span>

      <AddStepMenu lesson={lesson} label="Add step" onAdd={(c) => add(c)} />
    </div>
  );
};

const DropLine: FC = () => (
  <div
    aria-hidden="true"
    data-step-drop
    className="-my-1 h-[3px] rounded-full bg-sky-300 shadow-[0_0_0_3px_rgba(125,211,252,0.2)]"
  />
);

/** A section's header: fold it, rename it, add a step at its end. */
const SectionHeader: FC<{
  title: string | null;
  count: number;
  folded: boolean;
  issues: number;
  onToggle: () => void;
  onRename: (name: string) => void;
  addMenu: ReactNode;
}> = ({ title, count, folded, issues, onToggle, onRename, addMenu }) => (
  <div className="mt-3 flex items-center gap-2 border-b border-white/[0.08] pb-1.5 first:mt-0">
    <button
      type="button"
      aria-expanded={!folded}
      aria-label={`${folded ? 'Show' : 'Hide'} the steps in ${title ?? 'no section'}`}
      onClick={onToggle}
      className="rounded p-0.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
    >
      {folded ? (
        <ChevronRight className="size-4" />
      ) : (
        <ChevronDown className="size-4" />
      )}
    </button>
    <InlineText
      value={title ?? ''}
      onChange={onRename}
      placeholder="No section (click to name)"
      ariaLabel={`Section name, ${title ?? 'no section'}`}
      className={cn(
        'text-sm font-semibold tracking-[0.01em]',
        title ? 'text-white' : 'italic text-white/40',
      )}
    />
    <span className="text-xs tabular-nums text-white/35">
      {count} step{count === 1 ? '' : 's'}
    </span>
    {issues > 0 && (
      <ConsoleBadge tone="danger" className="shrink-0">
        {issues} to fix
      </ConsoleBadge>
    )}
    <div className="ml-auto">{addMenu}</div>
  </div>
);

/** A step's row: what it is at a glance, its tools, and the step opened. */
const StepRow: FC<{
  lesson: MusicLiteracyLesson;
  step: LiteracyStep;
  index: number;
  count: number;
  issues: readonly LessonIssue[];
  open: boolean;
  playing: boolean;
  dragging: boolean;
  grip: ReturnType<ReturnType<typeof useStepDrag>['handle']>;
  onToggle: () => void;
  onPlay: () => void;
  canMove: (delta: number) => boolean;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: ReactNode;
}> = ({
  lesson,
  step,
  index,
  issues,
  open,
  playing,
  dragging,
  grip,
  onToggle,
  onPlay,
  canMove,
  onMove,
  onDuplicate,
  onDelete,
  children,
}) => {
  const n = index + 1;
  const choice = choiceOf(step);
  const ownResponse = isMelodicEcho(step) && step.response !== undefined;
  const silent = choice === 'chooseKey' || choice === 'chooseMode';
  return (
    <div
      data-step={index}
      data-step-row={index}
      className={cn(
        'overflow-hidden scroll-mt-16',
        CONSOLE_PANEL,
        issues.length > 0 && 'border-red-400/30',
        dragging && 'opacity-40',
      )}
    >
      <div className="flex items-center gap-2 py-2 pl-1.5 pr-3">
        <button
          type="button"
          {...grip}
          aria-label={`Move step ${n} (drag, or Alt+↑ / Alt+↓)`}
          title="Drag to move it, into another section too, or Alt+↑ / Alt+↓"
          className="shrink-0 cursor-grab touch-none rounded p-0.5 text-white/25 outline-none transition-colors hover:text-white/60 focus-visible:text-white focus-visible:ring-1 focus-visible:ring-[#60a5fa] active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </button>
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
          {choice !== 'melody' && (
            <ConsoleBadge tone="neutral" className="shrink-0">
              {choiceInfo(choice).short}
            </ConsoleBadge>
          )}
          <span
            className="hidden max-w-[40%] shrink-0 truncate tabular-nums text-xs text-white/40 sm:inline"
            title={choice === 'melody' ? 'The call' : undefined}
          >
            {summary(lesson, step) || (choice === 'melody' ? '—' : '')}
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
            label={
              silent
                ? `Step ${n} has nothing to play: the student chooses`
                : playing
                  ? `Stop step ${n}`
                  : `Play step ${n}`
            }
            active={playing}
            disabled={silent}
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
            disabled={!canMove(-1)}
            onClick={() => onMove(-1)}
          >
            <ChevronUp className="size-3.5" />
          </IconButton>
          <IconButton
            label={`Move step ${n} down`}
            disabled={!canMove(1)}
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

/**
 * Add step: a menu of the kinds, each with a line on what the student
 * does. The choose steps need a lesson whose key the student picks.
 */
export const AddStepMenu: FC<{
  lesson: MusicLiteracyLesson;
  label: string;
  onAdd: (choice: StepChoice) => void;
  /** A section header's small one. */
  compact?: boolean;
}> = ({ lesson, label, onAdd, compact }) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const student = lesson.keyChoice === 'student';

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <div ref={root} className={cn('relative', !compact && 'w-full')}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={compact ? label : undefined}
        onClick={() => setOpen((o) => !o)}
        className={
          compact
            ? 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white'
            : 'flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-3 text-sm text-white/45 transition-colors hover:border-white/30 hover:bg-white/[0.04] hover:text-white'
        }
      >
        <Plus className={compact ? 'size-3.5' : 'size-4'} />
        {compact ? 'Add step' : label}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            'absolute z-40 mt-1 w-[26rem] max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-[#141416] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.55)]',
            compact ? 'right-0' : 'left-1/2 -translate-x-1/2',
          )}
        >
          {STEP_CHOICES.map((info) => {
            const off = info.studentKeyOnly && !student;
            return (
              <button
                key={info.choice}
                type="button"
                role="menuitem"
                disabled={off}
                onClick={() => {
                  setOpen(false);
                  onAdd(info.choice);
                }}
                className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
              >
                <span className="text-sm text-white">{info.name}</span>
                <span className="text-xs text-white/45">
                  {off
                    ? 'Only when students pick the key: set “Who picks the key” to Student first.'
                    : info.description}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
