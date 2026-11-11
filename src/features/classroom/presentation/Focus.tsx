import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SlideRenderer, type SlideSlots } from '../slides/SlideRenderer';
import type { Slide } from '../slides/types';
import type { Interaction, StudentLanguage } from '../types';
import { PresentControlsContext } from './presentControls';

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
  /**
   * The presenter's own controls (Exit, language, fullscreen), at the left
   * of the slide bar's row: Present has no top rail (owner, 2026-11-10).
   */
  presenter?: ReactNode;
}

/**
 * Focus — one deck slide, full-bleed, rendered through `SlideRenderer` at
 * `surface="present"` — the same single path the projector and the student
 * device use, so Present cannot drift from what the class sees.
 *
 * A bottom bar walks the deck slide-by-slide; Esc exits the presentation,
 * ←/→ (and a clicker's Page Up / Page Down) move between slides.
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
  presenter,
}: FocusProps) => {
  useEffect(() => {
    // A presentation clicker sends Page Up / Page Down.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      if ((e.key === 'ArrowLeft' || e.key === 'PageUp') && hasPrev) onPrev();
      if ((e.key === 'ArrowRight' || e.key === 'PageDown') && hasNext) onNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onExit, onPrev, onNext, hasPrev, hasNext]);

  // The slide's own controls (the globe's next place) share the bar's row,
  // which spans the slide as drawn (it may be narrower than the window).
  const [controls, setControls] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [inset, setInset] = useState({ left: 0, right: 0 });
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const frame = root.querySelector('.slide-frame');
      if (!frame) return;
      const r = root.getBoundingClientRect();
      const f = frame.getBoundingClientRect();
      const left = Math.max(0, Math.round(f.left - r.left));
      const right = Math.max(0, Math.round(r.right - f.right));
      setInset((was) =>
        was.left === left && was.right === right ? was : { left, right },
      );
    };
    measure();
    const seen = new ResizeObserver(measure);
    seen.observe(root);
    return () => seen.disconnect();
  }, [slide.id]);

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col">
      <PresentControlsContext.Provider value={controls}>
        <SlideRenderer
          key={slide.id}
          slide={slide}
          surface="present"
          language={language}
          interactions={interactions}
          slots={slots}
        />
      </PresentControlsContext.Provider>

      <div
        className="pointer-events-none absolute bottom-6 z-20 grid grid-cols-[1fr_auto_1fr] items-center px-6"
        style={{ left: inset.left, right: inset.right }}
        aria-hidden={false}
      >
        <div className="flex justify-start">{presenter}</div>
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-daw-edge bg-daw-pill px-3 py-2">
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
        <div ref={setControls} className="flex justify-end" />
      </div>
    </div>
  );
};
