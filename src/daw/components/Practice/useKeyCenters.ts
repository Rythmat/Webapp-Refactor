/**
 * useKeyCenters.ts — Where each key of a rendered PianoKeyboard actually is.
 *
 * The Practice Track writes note names and scale degrees above the keys they
 * belong to. `PianoKeyboard` doesn't expose positions, and the gaming layout
 * leaves its own octave labels out, so the labels are drawn over the keyboard
 * and placed from measurements of it. Measured rather than computed: the key
 * widths come from CSS and change with the viewport.
 */

import { useLayoutEffect, useState, type RefObject } from 'react';

/** PianoKeyboard draws a black key inside a zero-width container, so its own
 *  element is the child's child. */
export const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);

/**
 * The horizontal centre of every key under `ref`, by MIDI note, relative to
 * `ref` — measured from the rendered keyboard and kept current on resize.
 *
 * `selector` finds the board holding one wrapper per octave, inside whichever
 * element the caller marked.
 */
export function useKeyCenters(
  ref: RefObject<HTMLDivElement | null>,
  startC: number,
  /**
   * The CSS scale `ref` is rendered at, when the keyboard has been shrunk to
   * fit a narrow screen. `getBoundingClientRect` reports what is on the screen,
   * which is scaled; the labels are positioned inside the same scaled element,
   * so their offsets have to be given back in its own unscaled coordinates.
   */
  scale = 1,
  selector = '[data-practice-keyboard] > div > div',
): Map<number, number> {
  const [centers, setCenters] = useState<Map<number, number>>(new Map());

  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    const measure = () => {
      const origin = host.getBoundingClientRect().left;
      const board = host.querySelector(selector);
      const next = new Map<number, number>();
      [...(board?.children ?? [])].forEach((wrapper, octave) => {
        const keys = wrapper.firstElementChild?.children;
        if (!keys || keys.length !== 12) return;
        [...keys].forEach((key, pc) => {
          const el = BLACK_KEYS.has(pc) ? key.firstElementChild : key;
          if (!el) return;
          const r = el.getBoundingClientRect();
          next.set(
            (startC + octave) * 12 + pc,
            (r.left + r.width / 2 - origin) / scale,
          );
        });
      });
      setCenters(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [ref, startC, scale, selector]);

  return centers;
}
