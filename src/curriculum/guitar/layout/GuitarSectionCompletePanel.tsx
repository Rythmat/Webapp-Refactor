import { useId } from 'react';
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
      className="my-auto flex max-h-full min-h-0 flex-col justify-center gap-2 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#151518] p-5"
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
