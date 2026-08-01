import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import type { ContentSlide } from '../slides/types';
import type { StudentLanguage } from '../types';
import { SlidePresentBody } from './SlidePresentBody';

interface FocusProps {
  /** The current deck slide, already adapted for the static present board. */
  slide: ContentSlide;
  language: StudentLanguage;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  /** "3 / 12" — position within the deck. */
  position: string;
}

/**
 * Level 2 — Focus. One deck slide, full-bleed, rendered through the shared
 * present body (`SlidePresentBody` → `SlideFrame`) so Presentation Mode matches
 * the editor + the deck surfaces. "Back to Board" floats top-right so it clears
 * the frame's top-left phase chip; a bottom bar walks the deck slide-by-slide.
 * Esc closes; ←/→ move between slides.
 */
export const Focus = ({
  slide,
  language,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  position,
}: FocusProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur transition-colors hover:border-white/25 hover:text-white"
        aria-label="Back to Board"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Board
      </button>

      <SlidePresentBody slide={slide} language={language} />

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
