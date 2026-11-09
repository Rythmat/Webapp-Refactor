import { useEffect, useState } from 'react';
import { INTRO, useIntro } from '@/components/atlas/layout/intro';
import { easeOut } from '@/components/atlas/theme/motion';

/**
 * How far round the globe's rim is drawn (GlobeRim's `progress`): all of it,
 * but none while the intro holds the map back, and drawn on as it plays.
 */
export function useIntroRim(): number {
  const intro = useIntro();
  const [progress, setProgress] = useState(intro === 'none' ? 1 : 0);
  useEffect(() => {
    if (intro === 'none') {
      setProgress(1);
      return;
    }
    if (intro === 'wait') {
      setProgress(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / INTRO.rimMs);
      setProgress(easeOut(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [intro]);
  return progress;
}
