import { useCallback, useEffect, useRef } from 'react';
import { SlideRenderer, type SlideSlots } from '../slides/SlideRenderer';
import type { Slide } from '../slides/types';
import type { Interaction, StudentLanguage } from '../types';
import { PresentStepsContext, type SlideSteps } from './presentControls';

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
  /**
   * Pre-gated surface slots for a LIVE session — in practice just `reveal`,
   * built with the SAME anonymized gating the projector uses. Present is a
   * projected surface, so it shows the anonymized aggregate, never identified
   * data. `SlideRenderer` decides which interactions the slot is even called
   * for (`interactionPolicy`), so a check-in can never reach it.
   */
  slots?: SlideSlots;
}

/** The keys that move the lesson on, and back (a clicker sends Page Down/Up). */
const NEXT_KEYS = new Set(['ArrowRight', 'PageDown']);
const PREV_KEYS = new Set(['ArrowLeft', 'PageUp']);

/**
 * Focus — one deck slide, filling the window, rendered through
 * `SlideRenderer` at `surface="present"` — the same single path the
 * projector and the student device use, so Present cannot drift from what
 * the class sees.
 *
 * Nothing on it but the slide (owner, 2026-11-10: no bar, no controls). The
 * teacher's keyboard drives it: → / ← move through the slide's own steps
 * (the globe's places, the Studio tutorial's steps; `usePresentSteps`), then
 * on to the next or back to the previous slide; Esc exits.
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
  slots,
}: FocusProps) => {
  // The current slide's own steps, when it has any.
  const steps = useRef<SlideSteps | null>(null);
  const registerSteps = useCallback((next: SlideSteps | null) => {
    steps.current = next;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
        return;
      }
      if (NEXT_KEYS.has(e.key)) {
        e.preventDefault();
        if (steps.current?.next()) return;
        if (hasNext) onNext();
      } else if (PREV_KEYS.has(e.key)) {
        e.preventDefault();
        if (steps.current?.prev()) return;
        if (hasPrev) onPrev();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onExit, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <PresentStepsContext.Provider value={registerSteps}>
        <SlideRenderer
          key={slide.id}
          slide={slide}
          surface="present"
          language={language}
          interactions={interactions}
          slots={slots}
        />
      </PresentStepsContext.Provider>
    </div>
  );
};
