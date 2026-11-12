import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SlideRenderer, type SlideSlots } from '../slides/SlideRenderer';
import { LessonSongProvider } from '../slides/song/LessonSong';
import type { Slide } from '../slides/types';
import type { Interaction, StudentLanguage } from '../types';
import { PresentSelector } from './PresentSelector';
import {
  PresentStepsContext,
  type SlideSteps,
  type StepPosition,
} from './presentControls';

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
  /** The page, 0-based, of `count`, for the selector. */
  index: number;
  count: number;
  /** Jump to a page from the selector's list. */
  onGoTo?: (index: number) => void;
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
 * Nothing on it but the slide (owner, 2026-11-10: no bar) and a small step
 * and page selector at its bottom right, over it (`PresentSelector`). The
 * teacher's keyboard drives it as the selector does: → / ← move through the
 * slide's own steps (the globe's places, the Studio tutorial's steps;
 * `usePresentSteps`), then on to the next or back to the previous slide; Esc
 * exits.
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
  index,
  count,
  onGoTo,
  slots,
}: FocusProps) => {
  // The current slide's own steps, when it has any, and where they are.
  const steps = useRef<SlideSteps | null>(null);
  const [step, setStep] = useState<StepPosition | null>(null);
  const register = useCallback((next: SlideSteps | null) => {
    steps.current = next;
  }, []);
  const present = useMemo(() => ({ register, report: setStep }), [register]);

  // The slide's step first, then the page: the arrow keys and the selector.
  const forward = useCallback(() => {
    if (steps.current?.next()) return;
    if (hasNext) onNext();
  }, [hasNext, onNext]);
  const back = useCallback(() => {
    if (steps.current?.prev()) return;
    if (hasPrev) onPrev();
  }, [hasPrev, onPrev]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
        return;
      }
      if (NEXT_KEYS.has(e.key)) {
        e.preventDefault();
        forward();
      } else if (PREV_KEYS.has(e.key)) {
        e.preventDefault();
        back();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onExit, forward, back]);

  return (
    // One song for the deck: it plays on from slide to slide.
    <LessonSongProvider>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <PresentStepsContext.Provider value={present}>
          <SlideRenderer
            key={slide.id}
            slide={slide}
            surface="present"
            language={language}
            interactions={interactions}
            slots={slots}
          />
        </PresentStepsContext.Provider>
        <PresentSelector
          index={index}
          count={count}
          step={step}
          onPrev={back}
          onNext={forward}
          onGoTo={onGoTo}
          canPrev={hasPrev || (step !== null && step.at > 0)}
          canNext={hasNext || (step !== null && step.at < step.total - 1)}
        />
      </div>
    </LessonSongProvider>
  );
};
