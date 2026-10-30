import { useEffect, useRef, useState } from 'react';
import { ATLAS_MS, easeOut, tween } from '@/components/atlas/theme/motion';
import { usePrefersReducedMotion } from './useMediaQuery';

/**
 * A number that counts up to `value` when it first shows and when it
 * changes (from where it was), over ATLAS_MS.count; at once under reduced
 * motion.
 */
export function useCountUp(value: number, delayMs = 0): number {
  const reduced = usePrefersReducedMotion();
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
    const timer = window.setTimeout(() => {
      cancel = tween(ATLAS_MS.count, easeOut, (p) => {
        const v = Math.round(start + (value - start) * p);
        from.current = v;
        setShown(v);
      });
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
      cancel();
    };
  }, [value, reduced, delayMs]);
  return shown;
}
