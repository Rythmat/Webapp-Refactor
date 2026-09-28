import { useMotionValueEvent, type MotionValue } from 'framer-motion';
import { useRef, useState } from 'react';
import type { SceneProps } from './scenes/sceneTypes';

/**
 * A scene script's frame for the current moment of the step (the generic form
 * of the Studio demo's `useAutoFrame`). Reads the tour's `stepProgress` during
 * render — the tour sets it before a step change renders, so a new step never
 * shows a stale frame — and re-renders only when the frame's `key` changes.
 * User / static modes get the step's end state (`ms = Infinity`).
 */
export const useStepFrame = <F extends { key: string }>(
  stepProgress: MotionValue<number>,
  stepIndex: number,
  mode: SceneProps['mode'],
  stepMs: number,
  frameAt: (step: number, ms: number) => F,
): F => {
  const auto = mode === 'auto';
  const msAt = (progress: number) => (auto ? progress * stepMs : Infinity);
  const frame = frameAt(stepIndex, msAt(stepProgress.get()));

  const [, rerender] = useState(0);
  const keyRef = useRef(frame.key);
  keyRef.current = frame.key;
  useMotionValueEvent(stepProgress, 'change', (v) => {
    if (!auto) return;
    const key = frameAt(stepIndex, msAt(v)).key;
    if (key === keyRef.current) return;
    keyRef.current = key;
    rerender((n) => n + 1);
  });
  return frame;
};
