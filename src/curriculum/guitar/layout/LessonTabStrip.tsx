import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
import { cn } from '@/components/utilities';
import type { GuitarStepStatus } from './types';

// ── Lesson tab strip ───────────────────────────────────────────────────────
// After Pickup Music's tabs over their lesson video (owner, 2026-10-26): the
// column's full width in equal tabs, each its name and a quieter line under
// it, a › between them. The open tab's name is white with a 4px bar of the
// lesson's key colour along its foot, on a hairline under the whole strip.
// A tab can open a view (the Overview's Scale, Chords) or go somewhere (its
// Practice Track, in the Studio). Tabs over a section's steps (Melody's,
// Chords') carry the step line instead (owner, 2026-10-26): under each tab a
// thin segment per step of its group, the current one the key colour, the
// passed ones bright, each opening its step; no bar and no hairline then.

/** A step line segment's look, by how the step went (as the nav's). */
const SEGMENT_CLASS: Record<GuitarStepStatus, string> = {
  passed: 'bg-white/55',
  selfReported: 'bg-white/55',
  attempted: 'bg-white/20',
  todo: 'bg-white/[0.08]',
};

export interface LessonTab {
  id: string;
  label: string;
  /** Its full name, when the label is short ("1" for "1. Ascend"): what
   *  assistive tech says and the tooltip shows. */
  name?: string;
  /** The quieter line under the name. */
  sub?: string;
  /** The group's steps, for the step line under the tab (in order): each
   *  segment opens its step. */
  steps?: readonly {
    status: GuitarStepStatus;
    current: boolean;
    /** The step's name, for assistive tech and the tooltip. */
    label: string;
    onSelect: () => void;
  }[];
  active: boolean;
  onSelect: () => void;
}

export function LessonTabStrip({
  tabs,
  keyColor,
  label,
}: {
  tabs: readonly LessonTab[];
  keyColor: string;
  /** What the tabs choose between, for assistive tech. */
  label: string;
}) {
  // The step line replaces the bar and the hairline when tabs have steps.
  const stepLine = tabs.some((tab) => tab.steps?.length);
  return (
    <div
      role="group"
      aria-label={label}
      data-lesson-tabs
      className={cn(
        'relative flex w-full shrink-0',
        !stepLine && 'border-b border-white/10',
      )}
    >
      {tabs.map((tab, i) => (
        <Fragment key={tab.id}>
          {i > 0 && (
            <ChevronRight
              aria-hidden
              className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-white/35"
              style={{ left: `${(i / tabs.length) * 100}%` }}
            />
          )}
          {/* The tab, and under it (beside, not in, its button) its steps. */}
          <div className="relative flex min-w-0 flex-1">
            <button
              type="button"
              aria-current={tab.active ? 'true' : undefined}
              aria-label={tab.name}
              title={tab.name}
              data-lesson-tab={tab.id}
              onClick={tab.onSelect}
              className={cn(
                'relative -mb-px flex h-14 min-w-0 flex-1 flex-col items-center justify-center px-3.5 pb-1 outline-none transition-colors duration-150 focus-visible:bg-white/[0.04]',
                tab.active
                  ? 'text-white'
                  : 'text-white/55 hover:bg-white/[0.03] hover:text-white/85',
              )}
            >
              <span className="max-w-full truncate text-sm leading-[1.125rem]">
                {tab.label}
              </span>
              {tab.sub && (
                <span
                  className={cn(
                    'max-w-full truncate text-xs leading-4',
                    tab.active ? 'text-white/60' : 'text-white/40',
                  )}
                >
                  {tab.sub}
                </span>
              )}
              {!stepLine && tab.active && (
                <span
                  aria-hidden
                  data-lesson-tab-bar
                  className="absolute inset-x-0 bottom-0 h-1"
                  style={{ backgroundColor: keyColor }}
                />
              )}
            </button>
            {tab.steps?.length ? (
              <div
                role="group"
                aria-label={`${tab.name ?? tab.label}: steps`}
                data-lesson-tab-steps
                // A 12px strip to press, the 2px line at its foot.
                className="absolute inset-x-1 bottom-0 flex h-3 gap-0.5"
              >
                {tab.steps.map((step, n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={step.label}
                    aria-current={step.current ? 'step' : undefined}
                    title={step.label}
                    data-segment={step.current ? 'current' : step.status}
                    onClick={step.onSelect}
                    className="group/segment flex h-full min-w-0 flex-1 items-end rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                  >
                    <span
                      className={cn(
                        'h-0.5 w-full rounded-full transition-[height,background-color] duration-150 group-hover/segment:h-1',
                        !step.current && SEGMENT_CLASS[step.status],
                        !step.current && 'group-hover/segment:bg-white/70',
                      )}
                      style={
                        step.current ? { backgroundColor: keyColor } : undefined
                      }
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
