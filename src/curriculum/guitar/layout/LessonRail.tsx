import { ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { createContext, useContext, useId } from 'react';
import { cn } from '@/components/utilities';
import { GuitarStepList, StepStatusMark } from './GuitarStepList';
import type { HeaderModel, StepNavModel } from './types';

// ── Lesson rail ────────────────────────────────────────────────────────────
// A second rail beside the app's, after Pickup Music's class rail (owner,
// 2026-10-26): the lesson's name with its key dot, the way back to what it
// belongs to, then its sections as headings, the open one listing its steps
// (the step list the pager's count opens). It collapses to a slim strip (the
// sections are then one press away), and below `lg` LessonFrame leaves it
// out: the section pills in the nav stand in.

/** Whether the rail is there (wide), so the nav drops its section pills. */
export const LessonRailContext = createContext(false);
export const useSectionsInRail = () => useContext(LessonRailContext);

export interface LessonRailProps {
  header: HeaderModel;
  nav: StepNavModel;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const railButton =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white/55 outline-none transition-colors duration-150 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40';

export function LessonRail({
  header,
  nav,
  collapsed,
  onCollapsedChange,
}: LessonRailProps) {
  const titleId = useId();
  const parent = header.crumbs[header.crumbs.length - 1];

  if (collapsed) {
    return (
      <aside
        aria-label="Lesson"
        data-lesson-rail="collapsed"
        className="flex w-12 shrink-0 flex-col items-center border-r border-white/[0.06] pt-4"
      >
        <button
          type="button"
          onClick={() => onCollapsedChange(false)}
          aria-label="Show the lesson's sections"
          aria-expanded={false}
          className={railButton}
        >
          <ChevronsRight className="size-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-labelledby={titleId}
      data-lesson-rail="open"
      className="flex w-80 shrink-0 flex-col border-r border-white/[0.06]"
    >
      <div className="flex items-start gap-2 px-4 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <h2
            id={titleId}
            className="flex min-w-0 items-center gap-2 text-base leading-6 text-white"
          >
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: header.keyColor }}
            />
            <span className="truncate">{header.keyLabel}</span>
          </h2>
          <p className="mt-0.5 truncate text-xs uppercase tracking-[0.14em] text-white/45">
            {header.crumbs.map((crumb) => crumb.label).join(' · ')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onCollapsedChange(true)}
          aria-label="Hide the lesson's sections"
          aria-expanded
          className={cn(railButton, '-mr-1')}
        >
          <ChevronsLeft className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-4">
        {parent && (
          <button
            type="button"
            onClick={parent.onClick}
            className="flex h-10 w-full shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 text-left text-sm text-white/70 outline-none transition-colors duration-150 hover:bg-white/[0.04] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <ChevronLeft aria-hidden className="size-4 shrink-0" />
            <span className="truncate">{parent.label}</span>
          </button>
        )}

        {/* The whole outline (Theory's): every section open, one list. */}
        {nav.outline ? (
          <nav aria-label="Sections" className="flex flex-col gap-1">
            {nav.outline.map((section) => (
              <div key={section.id} className="flex flex-col">
                <button
                  type="button"
                  aria-label={`${section.id} ${section.name}`}
                  aria-current={section.active ? 'true' : undefined}
                  data-section={section.id}
                  onClick={() => nav.onSection(section.id)}
                  className={cn(
                    'flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/40',
                    section.active
                      ? 'bg-white/[0.06] text-white'
                      : 'text-white/60 hover:bg-white/[0.04] hover:text-white',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {section.name}
                  </span>
                  {section.done && <StepStatusMark status="passed" />}
                </button>
                {section.steps.length > 0 && (
                  <div className="pl-1">
                    <GuitarStepList
                      steps={section.steps}
                      index={section.index}
                      onPick={section.onPick}
                      dense
                    />
                  </div>
                )}
              </div>
            ))}
          </nav>
        ) : /* One section per page (Piano Fundamentals): its steps alone. */
        nav.sections.length === 0 ? (
          <RailSteps nav={nav} />
        ) : (
          <nav aria-label="Sections" className="flex flex-col gap-1">
            {nav.sections.map((section) => (
              <div key={section.id} className="flex flex-col">
                <button
                  type="button"
                  aria-label={`${section.id} ${section.name}`}
                  aria-current={section.active ? 'true' : undefined}
                  data-section={section.id}
                  onClick={() => nav.onSection(section.id)}
                  className={cn(
                    'flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/40',
                    section.active
                      ? 'bg-white/[0.06] text-white'
                      : 'text-white/60 hover:bg-white/[0.04] hover:text-white',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {section.name}
                  </span>
                  {section.done && <StepStatusMark status="passed" />}
                </button>
                {section.active && <RailSteps nav={nav} />}
              </div>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
}

/** The open section's steps: the pager's step list, in the rail. */
function RailSteps({ nav }: { nav: StepNavModel }) {
  // A section of one step (Theory's Overview) has nothing to list.
  if (nav.steps.length < 2) return null;
  return (
    <div className="pl-1">
      <GuitarStepList
        steps={nav.steps}
        index={nav.index}
        onPick={nav.goToStep}
        groupAction={nav.groupAction}
        dense
      />
    </div>
  );
}
