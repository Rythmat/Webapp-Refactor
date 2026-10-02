import { Check, Hand } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/components/utilities';
import type { GuitarStepStatus, NavStep } from './types';

// ── Step list ──────────────────────────────────────────────────────────────
// Every step of the section, grouped by subsection, opened from the pager's
// count. Each row says how the step went in words for assistive tech and by
// mark for the eye: ✓ passed, ✋ counted by you, a dot once attempted.

/** ": counted by you" and so on, after the step's code and title. */
const STATUS_WORDS: Record<GuitarStepStatus, string> = {
  passed: ': passed',
  selfReported: ': counted by you',
  attempted: ': attempted',
  todo: '',
};

/** "A1.1: Major Scale Ascending (Out of Time): counted by you". */
export function stepAccessibleName(step: NavStep): string {
  return `${step.code}: ${step.title}${STATUS_WORDS[step.status]}`;
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
          className={cn('size-4 shrink-0 text-white/55', className)}
        />
      );
    case 'selfReported':
      return (
        <Hand
          data-status-mark="selfReported"
          className={cn('size-4 shrink-0 text-white/55', className)}
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
}

export function GuitarStepList({ steps, index, onPick }: GuitarStepListProps) {
  const baseId = useId();
  return (
    <div data-guitar-step-list className="flex flex-col gap-1">
      {groupBySubsection(steps).map((group, g) => {
        const headingId = `${baseId}-${g}`;
        return (
          <section key={headingId} aria-labelledby={headingId}>
            <h3
              id={headingId}
              className="px-2 pb-1 pt-2 text-xs font-normal uppercase tracking-[0.14em] text-white/45"
            >
              {group.subsection}
            </h3>
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
                    <span className="w-12 shrink-0 text-xs text-white/45">
                      {step.code}
                    </span>
                    <span className="min-w-0 flex-1">{step.title}</span>
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
