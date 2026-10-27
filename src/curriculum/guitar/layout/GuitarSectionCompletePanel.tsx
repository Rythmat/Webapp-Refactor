import { useId } from 'react';
import {
  PROMPT_FRAME,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import type { SectionCompleteModel } from './types';

// ── Section complete ───────────────────────────────────────────────────────
// The Practice Track offer at the end of a section, in the big visuals area
// above the TAB, at its own height and centred there: the heading and blurb
// exactly as before. Its two buttons (Enter Practice Track,
// Continue to …) are in the action bar.

export interface GuitarSectionCompletePanelProps {
  offer: SectionCompleteModel;
}

export function GuitarSectionCompletePanel({
  offer,
}: GuitarSectionCompletePanelProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      data-guitar-section-complete
      // The prompt box's card, as Home's and Learn's.
      className={cn(
        PROMPT_FRAME,
        PROMPT_WASH,
        'my-auto flex max-h-full min-h-0 flex-col justify-center gap-2 overflow-y-auto p-5',
      )}
    >
      <h2
        id={headingId}
        className="text-2xl font-normal leading-8 text-[#e8e8f0]"
      >
        {offer.heading}
      </h2>
      <p className="max-w-[640px] text-[15px] leading-6 text-white/55">
        {offer.blurb}
      </p>
    </section>
  );
}
