import { useMotionValue, useReducedMotion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useInView } from '../motion/useInView';
import {
  createTourState,
  tourReducer,
  type TourAction,
  type TourState,
} from './tourMachine';
import type { TourTab } from './tourSteps';

/**
 * Drives one module's guided demo with the pure `tourMachine` (a single tab
 * whose steps loop). One rAF clock ticks it only while `ref` is ≥35% in view
 * and the page is visible; React re-renders only on step/status changes, while
 * `stepProgress` (0–1 within the current step) updates every frame for
 * progress bars. Reduced motion → static mode (end state, no clock).
 */
export const useModuleTour = (tab: TourTab, ref: RefObject<Element>) => {
  const reduce = useReducedMotion();
  const tabs = useRef([tab]).current;
  const [state, setState] = useState<TourState>(() =>
    createTourState(tabs, { isStatic: !!reduce }),
  );
  const stateRef = useRef(state);
  const stepProgress = useMotionValue(reduce ? 1 : 0);

  const dispatch = useCallback(
    (action: TourAction) => {
      const prev = stateRef.current;
      const next = tourReducer(prev, action, tabs);
      if (next === prev) return;
      stateRef.current = next;
      const dur = tabs[0].steps[next.step].durationMs;
      stepProgress.set(
        next.status === 'playing' ? Math.min(1, next.elapsed / dur) : 1,
      );
      if (
        prev.step !== next.step ||
        prev.status !== next.status ||
        prev.pauses !== next.pauses
      ) {
        setState(next);
      }
    },
    [tabs, stepProgress],
  );

  // Reduced-motion preference can resolve after mount.
  useEffect(() => {
    const s = createTourState(tabs, { isStatic: !!reduce });
    stateRef.current = s;
    stepProgress.set(reduce ? 1 : 0);
    setState(s);
  }, [reduce, tabs, stepProgress]);

  const inView = useInView(ref, { threshold: 0.35 });
  const [docHidden, setDocHidden] = useState(false);
  useEffect(() => {
    dispatch({ type: inView ? 'RESUME' : 'PAUSE', reason: 'offscreen' });
  }, [inView, dispatch]);
  useEffect(() => {
    const onVis = () => {
      setDocHidden(document.hidden);
      dispatch({
        type: document.hidden ? 'PAUSE' : 'RESUME',
        reason: 'hidden',
      });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [dispatch]);

  const visible = inView && !docHidden;

  useEffect(() => {
    if (state.status === 'static' || !visible) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      dispatch({ type: 'TICK', dt: t - last });
      last = t;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state.status, visible, dispatch]);

  return {
    state,
    dispatch,
    stepProgress,
    visible,
    reduce: !!reduce,
    step: tab.steps[state.step],
    selectStep: (i: number) => dispatch({ type: 'SELECT_STEP', step: i }),
    onUserAction: () => dispatch({ type: 'USER_ACTION' }),
  };
};
