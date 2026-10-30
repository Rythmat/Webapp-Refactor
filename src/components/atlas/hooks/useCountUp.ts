import { useEffect, useRef, useState } from 'react';
import { introDelayMs, useIntro } from '@/components/atlas/layout/intro';
import { useStageSignals } from '@/components/atlas/state/stageSignals';
import { ATLAS_MS, easeOut, tween } from '@/components/atlas/theme/motion';
import { usePrefersReducedMotion } from './useMediaQuery';

/**
 * A number that counts up to `value` when it first shows and when it
 * changes (from where it was), over ATLAS_MS.count; at once under reduced
 * motion. It waits for its card to land in the intro, and while the map
 * flies to a new stop for the flight to settle (ATLAS_MS.settleMax at most).
 */
export function useCountUp(value: number, delayMs = 0): number {
  const reduced = usePrefersReducedMotion();
  const intro = useIntro();
  const phase = useStageSignals().mapPhase;
  const [shown, setShown] = useState(reduced ? value : 0);
  const from = useRef(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    let cancel = () => {};
    const wait =
      delayMs +
      introDelayMs(intro) +
      (phase.get() === 'flying' ? ATLAS_MS.settleMax : 0);
    const timer = window.setTimeout(() => {
      cancel = tween(ATLAS_MS.count, easeOut, (p) => {
        const v = Math.round(start + (value - start) * p);
        from.current = v;
        setShown(v);
      });
    }, wait);
    return () => {
      window.clearTimeout(timer);
      cancel();
    };
  }, [value, reduced, delayMs, intro, phase]);
  return shown;
}
