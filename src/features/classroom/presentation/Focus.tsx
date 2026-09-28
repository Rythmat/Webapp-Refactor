import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { SlideRenderer, type SlideSlots } from '../slides/SlideRenderer';
import type { Slide } from '../slides/types';
import type { Interaction, StudentLanguage } from '../types';

interface FocusProps {
  /** The current deck slide, whatever its kind. */
  slide: Slide;
  language: StudentLanguage;
  /**
   * Interactions resolved for this slide. Present passes the same pre-gated,
   * anonymized set the projector gets; `[]` outside a live session.
   */
  interactions?: Interaction[];
  onExit: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  /** "3 / 12" — position within the deck. */
  position: string;
  /**
   * Pre-gated surface slots for a LIVE session — in practice just `reveal`,
   * built with the SAME anonymized gating the projector uses. Present is a
   * projected surface, so it shows the anonymized aggregate, never identified
   * data. `SlideRenderer` decides which interactions the slot is even called
   * for (`interactionPolicy`), so a check-in can never reach it.
   */
  slots?: SlideSlots;
}

/**
 * Focus — one deck slide, full-bleed, rendered through `SlideRenderer` at
 * `surface="present"` — the same single path the projector and the student
 * device use, so Present cannot drift from what the class sees.
 *
 * A bottom bar walks the deck slide-by-slide; Esc exits the presentation,
 * ←/→ move between slides.
 */
export const Focus = ({
  slide,
  language,
  interactions = [],
  onExit,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  position,
  slots,
}: FocusProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onExit, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SlideRenderer
        slide={slide}
        surface="present"
        language={language}
        interactions={interactions}
        slots={slots}
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center"
        aria-hidden={false}
      >
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/[0.06] bg-[#141416]/90 px-3 py-2 backdrop-blur">
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="Previous slide"
            className="inline-flex size-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-white/50 tabular-nums">{position}</span>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Next slide"
            className="inline-flex size-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
