import { useCallback, useEffect, useRef } from 'react';

// ── Press and hold to repeat (milestone 2.8) ──────────────────────────────
//
// Rewind and Fast-forward step once on the press and again every
// REPEAT_MS after HOLD_MS, until the pointer lets go or leaves. A key press
// on the focused button (Enter, Space: a click with detail 0) steps once;
// a held key repeats through the keyboard's own repeat.

const HOLD_MS = 400;
const REPEAT_MS = 150;

export function useHoldRepeat(action: () => void) {
  const latest = useRef(action);
  latest.current = action;
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // The main button only (a right-click opens no menu here).
      if (e.button > 0) return;
      stop();
      latest.current();
      const repeat = () => {
        latest.current();
        timer.current = window.setTimeout(repeat, REPEAT_MS);
      };
      timer.current = window.setTimeout(repeat, HOLD_MS);
    },
    [stop],
  );
  const onClick = useCallback((e: React.MouseEvent) => {
    // A pointer press has stepped already; only a key's click steps here.
    if (e.detail === 0) latest.current();
  }, []);

  return {
    onPointerDown,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick,
  };
}
