import { createContext, useContext, useEffect, useRef } from 'react';

/**
 * Present is moved with the arrow keys (owner, 2026-11-10), through a
 * slide's own steps (the globe's places, the Studio tutorial's steps) and
 * then on to the next slide, and with the small selector at its bottom right
 * (`PresentSelector`), which does the same. A slide with steps registers them
 * here; each returns true when it moved, and false at its first or last step,
 * where the arrow moves the slide instead. It also says which step it is on,
 * for the selector.
 */
export interface SlideSteps {
  next: () => boolean;
  prev: () => boolean;
}

/** Where a slide's steps are: `at` 0-based, of `total`. */
export interface StepPosition {
  at: number;
  total: number;
}

export interface PresentSteps {
  register: (steps: SlideSteps | null) => void;
  report: (position: StepPosition | null) => void;
}

/** Present's registry; null off Present (the room's screen, the editor). */
export const PresentStepsContext = createContext<PresentSteps | null>(null);

/**
 * A slide's steps, for Present's arrow keys and selector, and where they are.
 * Returns whether the slide is being presented, so it draws no controls of
 * its own.
 */
export const usePresentSteps = (
  steps: SlideSteps | null,
  position: StepPosition | null = null,
): boolean => {
  const present = useContext(PresentStepsContext);
  const latest = useRef(steps);
  latest.current = steps;
  useEffect(() => {
    if (!present) return;
    present.register({
      next: () => latest.current?.next() ?? false,
      prev: () => latest.current?.prev() ?? false,
    });
    return () => present.register(null);
  }, [present]);

  const at = position?.at;
  const total = position?.total;
  useEffect(() => {
    if (!present) return;
    present.report(
      at !== undefined && total !== undefined && total > 1
        ? { at, total }
        : null,
    );
  }, [present, at, total]);
  useEffect(() => () => present?.report(null), [present]);

  return present !== null;
};
