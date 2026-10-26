import { useEffect, useState } from 'react';

/** Space between the roll/notation and the keyboard. */
export const VIEW_KEYBOARD_GAP = 12;
/** Kept clear under the keyboard so it never touches the window edge. */
const BOTTOM_MARGIN = 16;

/** The lesson screens' action bar, pinned at the bottom (GuitarActionBar). */
export const LESSON_BAR_RESERVE = 81;

/**
 * The height the roll/notation may take so the keyboard below it still fits
 * in the window — Aaron's rule: once in an activity, the keyboard is always
 * visible. Measured, not guessed: the view's top edge and the keyboard row's
 * own height (which follows the window width) both come from the DOM.
 *
 * In a lesson the keyboard docks on the bar (lessonKeyboardSlot), so the
 * view runs down to the bar's top edge (past `max`), measured, whatever
 * the keyboard and buttons make its height.
 *
 * Returns `max` until measured, and never less than `min`.
 */
export function useFitAboveKeyboard(
  viewEl: HTMLElement | null,
  keyboardEl: HTMLElement | null,
  {
    max,
    min = 200,
    bottomInset = 0,
  }: {
    max: number;
    min?: number;
    /** Kept clear at the window's bottom too: a bar pinned there. */
    bottomInset?: number;
  },
) {
  const [height, setHeight] = useState(max);

  useEffect(() => {
    if (!viewEl || !keyboardEl) return;
    // The lesson's bar, with the keyboard docked on it, if there is one.
    const bar = viewEl
      .closest('[data-piano-layout], [data-guitar-layout]')
      ?.querySelector<HTMLElement>('[data-guitar-bar]');
    const measure = () => {
      if (bar) {
        const free =
          bar.getBoundingClientRect().top -
          viewEl.getBoundingClientRect().top -
          keyboardEl.offsetHeight -
          VIEW_KEYBOARD_GAP;
        // No cap: the view fills the room down to the docked keys.
        setHeight(Math.max(min, Math.floor(free)));
        return;
      }
      // Page-relative top, so a page that happens to be scrolled measures
      // the same as one at rest.
      const scroller = document.scrollingElement;
      const top =
        viewEl.getBoundingClientRect().top + (scroller?.scrollTop ?? 0);
      const free =
        window.innerHeight -
        top -
        keyboardEl.offsetHeight -
        VIEW_KEYBOARD_GAP -
        BOTTOM_MARGIN -
        bottomInset;
      setHeight(Math.max(min, Math.min(max, Math.floor(free))));
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(keyboardEl);
    if (bar) observer?.observe(bar);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [viewEl, keyboardEl, max, min, bottomInset]);

  return height;
}
