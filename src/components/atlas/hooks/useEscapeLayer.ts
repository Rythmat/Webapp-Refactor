import { useEffect, useRef } from 'react';

/**
 * Escape closes the topmost thing open on the Globe: a popover before the
 * panel under it, an enlarged card before the card.
 *
 * Each open thing registers a layer while it is open; one window listener
 * hands Escape to the newest. A control that uses Escape itself (the search
 * field closing its dropdown) calls preventDefault, and the stack leaves that
 * key press alone.
 */
const stack: { handler: { current: () => void } }[] = [];

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
  const top = stack[stack.length - 1];
  if (!top) return;
  e.preventDefault();
  top.handler.current();
};

export function useEscapeLayer(active: boolean, onEscape: () => void): void {
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const layer = { handler };
    stack.push(layer);
    if (stack.length === 1) window.addEventListener('keydown', onKeyDown);
    return () => {
      const i = stack.indexOf(layer);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) window.removeEventListener('keydown', onKeyDown);
    };
  }, [active]);
}
