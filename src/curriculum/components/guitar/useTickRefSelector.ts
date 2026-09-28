import { useLayoutEffect, useRef, useState } from 'react';

// ── useTickRefSelector ─────────────────────────────────────────────────────
// Follow a value the lesson clock writes every frame (the roll's playhead
// tick, kept in a ref) and re-render only when what this component shows
// from it changes: the chord or note at the playhead, not the tick. Lifting
// the tick into state would re-render the whole lesson container 60 times a
// second; this polls the ref from its own animation frame instead.

/**
 * `select(ref.current)`, re-read every animation frame while `active`. The
 * component re-renders only when the selected value changes (Object.is);
 * while inactive the hook keeps the last value it read.
 */
export function useTickRefSelector<T>(
  ref: { readonly current: number },
  select: (tick: number) => T,
  active: boolean,
): T {
  const [selected, setSelected] = useState(() => select(ref.current));
  const selectedRef = useRef(selected);
  // The newest selector, without restarting the loop when it changes.
  const selectRef = useRef(select);
  selectRef.current = select;

  useLayoutEffect(() => {
    if (!active) return;
    let frame = 0;
    const read = () => {
      const next = selectRef.current(ref.current);
      if (!Object.is(next, selectedRef.current)) {
        selectedRef.current = next;
        setSelected(() => next);
      }
      frame = requestAnimationFrame(read);
    };
    // Read at once, before the browser paints (hence the layout effect), so
    // a run that starts again never shows where the last one ended.
    read();
    return () => cancelAnimationFrame(frame);
  }, [ref, active]);

  return selected;
}
