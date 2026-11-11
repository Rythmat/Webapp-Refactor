import { createContext, useContext, useEffect, useRef } from 'react';

/**
 * Present has no bar (owner, 2026-11-10): the teacher moves the lesson with
 * the arrow keys, through a slide's own steps (the globe's places, the
 * Studio tutorial's steps) and then on to the next slide. A slide with
 * steps registers them here; each returns true when it moved, and false at
 * its first or last step, where the arrow moves the slide instead.
 */
export interface SlideSteps {
  next: () => boolean;
  prev: () => boolean;
}

export type RegisterSlideSteps = (steps: SlideSteps | null) => void;

/** Present's registry; null off Present (the room's screen, the editor). */
export const PresentStepsContext = createContext<RegisterSlideSteps | null>(
  null,
);

/**
 * A slide's steps, for Present's arrow keys. Returns whether the slide is
 * being presented, so it draws no controls of its own.
 */
export const usePresentSteps = (steps: SlideSteps | null): boolean => {
  const register = useContext(PresentStepsContext);
  const latest = useRef(steps);
  latest.current = steps;
  useEffect(() => {
    if (!register) return;
    register({
      next: () => latest.current?.next() ?? false,
      prev: () => latest.current?.prev() ?? false,
    });
    return () => register(null);
  }, [register]);
  return register !== null;
};
