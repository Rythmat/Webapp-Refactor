import { useMotionValueEvent, type MotionValue } from 'framer-motion';
import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { TOUR_BY_ID } from '../../tourSteps';
import type { SceneProps } from '../sceneTypes';
import { autoFrame, type AutoFrame } from './studioScript';

/** A Studio step's duration in the tour config. */
export const studioStepMs = (step: number) =>
  TOUR_BY_ID.studio.steps[step]?.durationMs ?? 0;

/** A Studio step's `data-tour-target` in the tour config. */
export const studioStepTarget = (step: number) =>
  TOUR_BY_ID.studio.steps[step]?.target ?? '';

/**
 * Counts entries into auto mode (setState during render, so the new epoch is
 * seen in the same render). Scope visitor state with it: an idle return or a
 * fresh auto run discards what they built; auto → user keeps it.
 */
export const useAutoEpoch = (mode: SceneProps['mode']): number => {
  const [track, setTrack] = useState({ mode, epoch: 0 });
  if (track.mode !== mode) {
    const epoch = mode === 'auto' ? track.epoch + 1 : track.epoch;
    setTrack({ mode, epoch });
    return epoch;
  }
  return track.epoch;
};

type ScopedUpdate<T> = T | null | ((prev: T | null) => T | null);

/**
 * State that belongs to one scope (e.g. `${stepIndex}:${epoch}`): it reads as
 * null as soon as the scope changes, with no effect and no stale frame, and is
 * dropped then (setState during render), so coming back to an earlier scope
 * starts fresh too. Updaters see the current scope's value.
 */
export const useScopedState = <T>(
  scope: string,
): [T | null, (next: ScopedUpdate<T>) => void] => {
  const [entry, setEntry] = useState<{ scope: string; value: T | null }>({
    scope,
    value: null,
  });
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const set = useCallback((next: ScopedUpdate<T>) => {
    setEntry((prev) => {
      const current = scopeRef.current;
      const base = prev.scope === current ? prev.value : null;
      const value =
        typeof next === 'function'
          ? (next as (p: T | null) => T | null)(base)
          : next;
      return { scope: current, value };
    });
  }, []);
  if (entry.scope !== scope) setEntry({ scope, value: null });
  return [entry.scope === scope ? entry.value : null, set];
};

/**
 * The auto script's frame for the current moment of the step. Reads the
 * tour's `stepProgress` during render (the tour sets it before a step change
 * renders, so a new step never shows a stale frame) and re-renders only when
 * the frame's `key` changes — a handful of times per step, not every frame.
 * User / static modes get the step's end state (`ms = Infinity`).
 */
export const useAutoFrame = (
  stepProgress: MotionValue<number>,
  stepIndex: number,
  mode: SceneProps['mode'],
): AutoFrame => {
  const auto = mode === 'auto';
  const msAt = (progress: number) =>
    auto ? progress * studioStepMs(stepIndex) : Infinity;
  const frame = autoFrame(stepIndex, msAt(stepProgress.get()));

  const [, rerender] = useState(0);
  const keyRef = useRef(frame.key);
  keyRef.current = frame.key;
  useMotionValueEvent(stepProgress, 'change', (v) => {
    if (!auto) return;
    const key = autoFrame(stepIndex, msAt(v)).key;
    if (key === keyRef.current) return;
    keyRef.current = key;
    rerender((n) => n + 1);
  });
  return frame;
};

/**
 * One tab stop for a roving group: the control focused last (while it is
 * still rendered), else `fallback` (the first or selected control). React is
 * the only writer of `tabIndex`: render `tabIndex={id === stop ? 0 : -1}` and
 * call `onFocus(id)` from each control's focus handler.
 */
export const useRovingStop = <K>(fallback: K, ids: readonly K[]) => {
  const [focused, setFocused] = useState<K | null>(null);
  const stop = focused !== null && ids.includes(focused) ? focused : fallback;
  return { stop, onFocus: setFocused };
};

/**
 * Arrow keys / Home / End move focus between the `[data-roving]` controls of
 * the closest `[role="group"]` (wrapping). Only focus moves; the group's tab
 * stop follows it through `useRovingStop`.
 */
export const rovingKeyDown = (e: KeyboardEvent<HTMLElement>) => {
  const group = (e.target as HTMLElement).closest('[role="group"]');
  if (!group) return;
  const items = [...group.querySelectorAll<HTMLElement>('[data-roving]')];
  const at = items.indexOf(e.target as HTMLElement);
  if (at < 0 || items.length === 0) return;
  const n = items.length;
  const next: Record<string, number> = {
    ArrowRight: (at + 1) % n,
    ArrowDown: (at + 1) % n,
    ArrowLeft: (at - 1 + n) % n,
    ArrowUp: (at - 1 + n) % n,
    Home: 0,
    End: n - 1,
  };
  const to = next[e.key];
  if (to === undefined) return;
  e.preventDefault();
  items[to].focus();
};
