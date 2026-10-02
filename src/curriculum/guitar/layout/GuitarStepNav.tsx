import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { FixedDigits } from '@/components/common/FixedDigits';
import { cn } from '@/components/utilities';
import { GuitarStepList, StepStatusMark } from './GuitarStepList';
import type { GuitarStepStatus, StepNavModel } from './types';

// ── Sections and steps ─────────────────────────────────────────────────────
// Left: the sections as one segmented control (Melody / Chords / Play-Along,
// ✓ once every step passed) and the ♪ Practice Track button, exactly as
// before but in the neutral pill. Right: the pager — ‹ "3 / 20" › — whose
// count opens the step list. Under them, a 2px line with a segment per step;
// the current one takes the key colour.

const COUNT_STATUS: Record<GuitarStepStatus, string> = {
  passed: ', passed',
  selfReported: ', counted by you',
  attempted: ', attempted',
  todo: '',
};

const SEGMENT_CLASS: Record<GuitarStepStatus, string> = {
  passed: 'bg-white/55',
  selfReported: 'bg-white/55',
  attempted: 'bg-white/20',
  todo: 'bg-white/[0.08]',
};

const secondaryPill =
  'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm font-normal text-[#e8e8f0] transition-colors duration-150 hover:bg-white/[0.08] max-[639px]:h-11';

const pagerButton =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[#e8e8f0] transition-colors duration-150 hover:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-transparent max-[639px]:size-11';

export interface GuitarStepNavProps {
  nav: StepNavModel;
  /** The key colour: the current step's segment of the progress line. */
  keyColor: string;
}

export function GuitarStepNav({ nav, keyColor }: GuitarStepNavProps) {
  const [listOpen, setListOpen] = useState(false);
  const { sections, steps, index, goToStep, practiceTrack } = nav;
  const count = steps.length;
  const current = steps[index];
  const activeSection = sections.find((section) => section.active);

  return (
    <div data-guitar-nav className="flex shrink-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-3">
        <div
          role="group"
          aria-label="Sections"
          className="flex h-9 shrink-0 items-center rounded-full ring-1 ring-inset ring-white/10 max-[639px]:h-11 max-[639px]:w-full"
        >
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              // Assistive tech (and the tests) keep the section letter.
              aria-label={`${section.id} ${section.name}`}
              aria-current={section.active ? 'true' : undefined}
              title={section.done ? 'Every step passed' : undefined}
              data-section={section.id}
              onClick={() => nav.onSection(section.id)}
              className={cn(
                'inline-flex h-full items-center justify-center gap-1.5 rounded-full px-4 text-sm font-normal transition-colors duration-150 max-[639px]:flex-1 max-[639px]:px-2',
                section.active
                  ? 'bg-white text-[#101012]'
                  : 'text-white/55 hover:text-[#e8e8f0]',
              )}
            >
              {section.name}
              {section.done && (
                <Check data-section-done className="size-3.5 shrink-0" />
              )}
            </button>
          ))}
        </div>

        {practiceTrack && (
          <button
            type="button"
            onClick={practiceTrack.onOpen}
            title={
              activeSection
                ? `Play over the ${activeSection.name} groove`
                : undefined
            }
            className={secondaryPill}
          >
            &#9834; Practice Track
          </button>
        )}

        <div
          role="group"
          aria-label="Steps"
          className="ml-auto flex shrink-0 items-center gap-1"
        >
          <button
            type="button"
            aria-label="Previous step"
            disabled={index <= 0}
            onClick={() => goToStep(index - 1)}
            className={pagerButton}
          >
            <ChevronLeft className="size-4" />
          </button>

          <Popover.Root open={listOpen} onOpenChange={setListOpen}>
            <Popover.Trigger asChild>
              <button
                type="button"
                aria-label={`Step ${index + 1} of ${count}${
                  current ? COUNT_STATUS[current.status] : ''
                }`}
                data-guitar-step-count
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-normal text-white/55 transition-colors duration-150 hover:bg-white/[0.08] data-[state=open]:bg-white/[0.08] max-[639px]:h-11"
              >
                <FixedDigits
                  text={String(index + 1)}
                  className="font-bold text-[#e8e8f0]"
                />
                <span>/</span>
                <FixedDigits text={String(count)} />
                {current &&
                  (current.status === 'passed' ||
                    current.status === 'selfReported') && (
                    <StepStatusMark status={current.status} />
                  )}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={8}
                collisionPadding={16}
                aria-label="All steps in this section"
                data-guitar-overlay
                onOpenAutoFocus={(event) => {
                  // Land on the current step, not the first row.
                  event.preventDefault();
                  const content = event.currentTarget as HTMLElement | null;
                  const row = content?.querySelector<HTMLElement>(
                    '[aria-current="step"]',
                  );
                  row?.focus();
                  row?.scrollIntoView?.({ block: 'nearest' });
                }}
                className="z-50 max-h-[min(480px,var(--radix-popover-content-available-height))] w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-xl border border-white/[0.08] bg-[#141416] p-2 text-[#e8e8f0] shadow-xl outline-none motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0"
              >
                <GuitarStepList
                  steps={steps}
                  index={index}
                  onPick={(i) => {
                    setListOpen(false);
                    // The current step too: back to its preview, as the
                    // step dots did.
                    goToStep(i);
                  }}
                />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <button
            type="button"
            aria-label="Next step"
            disabled={index >= count - 1}
            onClick={() => goToStep(index + 1)}
            className={pagerButton}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div
        aria-hidden
        data-guitar-progress
        className="flex h-0.5 w-full gap-0.5"
      >
        {steps.map((step, i) => (
          <span
            key={i}
            data-segment={i === index ? 'current' : step.status}
            className={cn(
              'h-full min-w-0 flex-1 rounded-full transition-colors duration-150',
              i === index ? undefined : SEGMENT_CLASS[step.status],
            )}
            style={i === index ? { backgroundColor: keyColor } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
