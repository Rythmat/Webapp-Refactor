import { Check, ChevronRight, Hand } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/components/utilities';
import type { GuitarStepStatus, NavGroupAction, NavStep } from './types';

// ── Step list ──────────────────────────────────────────────────────────────
// Every step of the section, grouped by subsection, opened from the pager's
// count. Each row says how the step went in words for assistive tech and by
// mark for the eye: a green ✓ passed, a green ✋ counted by you, a dot once
// attempted. The step the student is on carries a white ✓ at the row's
// start, as a menu marks its current choice. Piano and guitar share it.

/** ": counted by you" and so on, after the step's code and title. */
const STATUS_WORDS: Record<GuitarStepStatus, string> = {
  passed: ': passed',
  selfReported: ': counted by you',
  attempted: ': attempted',
  todo: '',
};

/** A step's further passes worth a mark: those tried. */
const markedPasses = (step: NavStep) =>
  (step.passes ?? []).filter((pass) => pass.status !== 'todo');

/**
 * "A1.1: Major Scale Ascending (Out of Time): counted by you", and any
 * further pass tried: "…: passed; Create: attempted".
 */
export function stepAccessibleName(step: NavStep): string {
  const passes = markedPasses(step)
    .map((pass) => `; ${pass.label}${STATUS_WORDS[pass.status]}`)
    .join('');
  return `${step.code}: ${step.title}${STATUS_WORDS[step.status]}${passes}`;
}

export function StepStatusMark({
  status,
  className,
}: {
  status: GuitarStepStatus;
  className?: string;
}) {
  switch (status) {
    case 'passed':
      return (
        <Check
          data-status-mark="passed"
          className={cn('size-4 shrink-0 text-success-base', className)}
        />
      );
    case 'selfReported':
      return (
        <Hand
          data-status-mark="selfReported"
          className={cn('size-4 shrink-0 text-success-base', className)}
        />
      );
    case 'attempted':
      return (
        <span
          aria-hidden
          data-status-mark="attempted"
          className={cn(
            'size-1.5 shrink-0 rounded-full bg-white/45',
            className,
          )}
        />
      );
    default:
      return null;
  }
}

interface Group {
  subsection: string;
  rows: { step: NavStep; index: number }[];
}

function groupBySubsection(steps: readonly NavStep[]): Group[] {
  const groups: Group[] = [];
  steps.forEach((step, index) => {
    const last = groups[groups.length - 1];
    if (last && last.subsection === step.subsection) {
      last.rows.push({ step, index });
    } else {
      groups.push({ subsection: step.subsection, rows: [{ step, index }] });
    }
  });
  return groups;
}

export interface GuitarStepListProps {
  steps: readonly NavStep[];
  index: number;
  onPick: (index: number) => void;
  /** A group's header button, by its subsection (StepNavModel's). */
  groupAction?: ((subsection: string) => NavGroupAction | null) | null;
}

export function GuitarStepList({
  steps,
  index,
  onPick,
  groupAction,
}: GuitarStepListProps) {
  const baseId = useId();
  return (
    <div data-guitar-step-list className="flex flex-col gap-1">
      {groupBySubsection(steps).map((group, g) => {
        const headingId = `${baseId}-${g}`;
        const action = groupAction?.(group.subsection) ?? null;
        return (
          <section key={headingId} aria-labelledby={headingId}>
            <div className="flex items-end gap-2 px-2 pb-1 pt-2">
              <h3
                id={headingId}
                className="min-w-0 flex-1 text-xs font-normal uppercase tracking-[0.14em] text-white/45"
              >
                {group.subsection}
              </h3>
              {action && (
                <button
                  type="button"
                  data-group-action={group.subsection}
                  data-group-action-status={action.status ?? 'todo'}
                  aria-label={`${action.label}: ${group.subsection}${STATUS_WORDS[action.status ?? 'todo']}`}
                  onClick={action.onPick}
                  className="-my-1 inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-normal text-[#e8e8f0] ring-1 ring-inset ring-white/15 transition-colors duration-150 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-white/60 max-[639px]:h-9"
                >
                  {action.label}
                  {action.status === 'passed' ? (
                    <StepStatusMark status="passed" className="size-3.5" />
                  ) : (
                    <ChevronRight aria-hidden className="size-3.5" />
                  )}
                </button>
              )}
            </div>
            <ul className="flex flex-col">
              {group.rows.map(({ step, index: i }) => (
                <li key={i}>
                  <button
                    type="button"
                    aria-label={stepAccessibleName(step)}
                    aria-current={i === index ? 'step' : undefined}
                    data-step-status={step.status}
                    onClick={() => onPick(i)}
                    className={cn(
                      'flex min-h-9 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm font-normal transition-colors duration-150 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/60 max-[639px]:min-h-11',
                      i === index
                        ? 'bg-white/[0.08] text-[#e8e8f0]'
                        : 'text-white/55',
                    )}
                  >
                    <span
                      className="flex w-4 shrink-0 justify-center"
                      data-current-mark={i === index || undefined}
                    >
                      {i === index && (
                        <Check
                          aria-hidden
                          className="size-4 shrink-0 text-[#e8e8f0]"
                        />
                      )}
                    </span>
                    <span className="w-12 shrink-0 text-xs text-white/45">
                      {step.code}
                    </span>
                    <span className="min-w-0 flex-1">{step.title}</span>
                    {markedPasses(step).map((pass) => (
                      <span
                        key={pass.label}
                        aria-hidden
                        data-pass-mark={pass.label}
                        data-pass-status={pass.status}
                        className="inline-flex shrink-0 items-center gap-1 text-[11px] text-white/45"
                      >
                        {pass.label}
                        <StepStatusMark
                          status={pass.status}
                          className={
                            pass.status === 'attempted' ? undefined : 'size-3.5'
                          }
                        />
                      </span>
                    ))}
                    <span className="flex w-4 shrink-0 justify-center">
                      <StepStatusMark status={step.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
