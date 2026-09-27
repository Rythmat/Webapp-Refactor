import { useCallback, useEffect, useReducer } from 'react';

type State = { step: number; rested: boolean };

const reducer = (s: State, action: 'advance' | 'rest'): State => {
  if (action === 'advance') return { step: s.step + 1, rested: false };
  return s.rested ? s : { ...s, rested: true };
};

/**
 * A step counter for a cycle that waits on its own animation: each step starts
 * unrested, `rest()` reports that the step's animation has finished, and the
 * counter advances `ms` after that (or `ms(step)`, per step) while `active`.
 * It holds while the tab is hidden and advances on the first tick after the
 * tab is visible again. `advance()` skips ahead at once.
 *
 * Because the wait only starts from `rest()`, anything that stalls the
 * animation (a hidden tab, an offscreen pause, a slow device) also holds the
 * cycle, so the two never drift apart.
 */
export const useStepper = (
  ms: number | ((step: number) => number),
  active: boolean,
) => {
  const [{ step, rested }, dispatch] = useReducer(reducer, {
    step: 0,
    rested: false,
  });
  const wait = typeof ms === 'function' ? ms(step) : ms;
  const advance = useCallback(() => dispatch('advance'), []);
  const rest = useCallback(() => dispatch('rest'), []);
  const waiting = active && rested;

  useEffect(() => {
    if (!waiting) return;
    let id = 0;
    const arm = () => {
      id = window.setTimeout(() => (document.hidden ? arm() : advance()), wait);
    };
    arm();
    return () => window.clearTimeout(id);
  }, [step, wait, waiting, advance]);

  return { step, advance, rest };
};
