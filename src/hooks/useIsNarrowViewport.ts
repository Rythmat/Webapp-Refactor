/**
 * Does this device get the reading column instead of the fitted slide canvas?
 *
 * Rule 11 states the breakpoint as ">=768px renders the identical stage", and
 * width alone turned out to be the wrong test. The stage scales a 1280x720
 * canvas into whatever width is available, so its type size and its TOUCH
 * TARGETS are the fit scale times the design size. On an iPad in portrait
 * (820px, minus the app rail and page padding) that scale is ~0.53: a Submit
 * button designed at 46px lands at 24px, well under any touch guidance, and
 * nothing about the width tells you that.
 *
 * So the rule is width OR pointer: a coarse pointer on anything narrower than a
 * desktop reads the reflow, where sizes are real px and a button is a button. A
 * mouse keeps the canvas, because a 24px target is fine to click and the
 * identical-stage promise is worth keeping wherever it costs nothing.
 *
 * Defaults to the stage when `matchMedia` is missing (jsdom, SSR) — it is what
 * every other surface renders, and the reflow is the special case.
 */
import { useEffect, useState } from 'react';

/** Below this the canvas cannot be read at all, whatever the pointer. */
export const REFLOW_MAX_WIDTH_PX = 768;

/** A touch device narrower than this cannot hit the canvas's controls. */
export const REFLOW_COARSE_MAX_WIDTH_PX = 1024;

export const STUDENT_REFLOW_QUERY =
  `(max-width: ${REFLOW_MAX_WIDTH_PX - 1}px), ` +
  `(pointer: coarse) and (max-width: ${REFLOW_COARSE_MAX_WIDTH_PX - 1}px)`;

/** True when `query` matches, tracked live. */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
};
