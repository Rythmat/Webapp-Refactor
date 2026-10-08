import { useCallback, useState } from 'react';

const LIMIT = 200;

/** A value with undo/redo — the designer's draft groove. */
export function useUndoable<T>(initial: T) {
  const [state, setState] = useState({
    past: [] as T[],
    present: initial,
    future: [] as T[],
  });

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setState((s) => {
      const value =
        typeof next === 'function' ? (next as (p: T) => T)(s.present) : next;
      if (value === s.present) return s;
      return {
        past: [...s.past, s.present].slice(-LIMIT),
        present: value,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) =>
      s.past.length
        ? {
            past: s.past.slice(0, -1),
            present: s.past[s.past.length - 1],
            future: [s.present, ...s.future],
          }
        : s,
    );
  }, []);

  const redo = useCallback(() => {
    setState((s) =>
      s.future.length
        ? {
            past: [...s.past, s.present],
            present: s.future[0],
            future: s.future.slice(1),
          }
        : s,
    );
  }, []);

  return {
    value: state.present,
    set,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
