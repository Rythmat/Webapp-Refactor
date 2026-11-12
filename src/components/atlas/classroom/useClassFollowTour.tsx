/**
 * A Globe tour done by the whole class, at the teacher's pace (owner,
 * 2026-11-10). Opened from a Group Project slide with `follow=1`, the tour
 * keeps the class's stop: a student is flown to it whenever the teacher
 * moves on, and brought back if they step past it (stepping past counts as
 * having finished the stop, which the teacher sees). The teacher, leading
 * from inside the Globe, moves the class by moving through the tour.
 *
 * Runs inside the Globe's store (called by `useAtlasUrlSync`, which renders
 * nothing), so its bar is drawn into a root of its own on the page. Opened
 * any other way, it does nothing.
 */
import { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { GuidedTour, ResolvedTourStop } from '@/components/atlas/data';
import { guidesData } from '@/components/atlas/data/loaders';
import { goToTourStop } from '@/components/atlas/hooks/useStartTour';
import { afterLoad } from '@/components/atlas/navigation/pendingNavigation';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { ClassFollowBar } from '@/features/classroom/follow/ClassFollowBar';
import { useStepFollow } from '@/features/classroom/follow/useStepFollow';

interface LoadedTour {
  tour: GuidedTour;
  stops: readonly ResolvedTourStop[];
}

export function useClassFollowTour(): void {
  const dispatch = useAtlasDispatch();
  const activeTour = useAtlasSelector((s) => s.activeTour);
  const tourId = activeTour?.tourId ?? null;
  const [loaded, setLoaded] = useState<LoadedTour | null>(null);

  // The active tour's stops, once the tours have loaded.
  useEffect(() => {
    setLoaded(null);
    if (!tourId) return;
    let alive = true;
    afterLoad(guidesData, (guides) => {
      const tour = guides?.getTour(tourId);
      if (!alive || !guides || !tour) return;
      setLoaded({ tour, stops: guides.resolveTourStops(tour) });
    });
    return () => {
      alive = false;
    };
  }, [tourId]);

  const position = activeTour?.currentStep ?? 0;
  const total = loaded?.stops.length ?? 0;
  const follow = useStepFollow({
    ...(tourId ? { ref: `globe:tour:${tourId}` } : {}),
    position,
    total,
    ...(loaded?.stops[position] ? { title: loaded.stops[position].title } : {}),
    goTo: (step) => {
      if (loaded) goToTourStop(dispatch, loaded.tour, loaded.stops, step);
    },
    active: Boolean(loaded),
    // The Tours card's Next can't be held: moving on means "done".
    aheadMeansDone: true,
  });

  // The bar, in a root of its own (the hook's caller renders nothing).
  const root = useRef<{ el: HTMLElement; root: Root } | null>(null);
  const shown = follow.following;
  useEffect(() => {
    if (!shown) return;
    const el = document.createElement('div');
    document.body.appendChild(el);
    root.current = { el, root: createRoot(el) };
    return () => {
      const current = root.current;
      root.current = null;
      // Unmounted after this commit, so React doesn't unmount mid-render.
      queueMicrotask(() => {
        current?.root.unmount();
        current?.el.remove();
      });
    };
  }, [shown]);
  const step = follow.leading ? position : (follow.classStep ?? position);
  useEffect(() => {
    root.current?.root.render(
      <ClassFollowBar
        placement="aboveRail"
        leading={follow.leading}
        step={step}
        total={total}
        waiting={follow.waiting}
        doneCount={follow.doneCount}
      />,
    );
  }, [shown, follow.leading, step, total, follow.waiting, follow.doneCount]);
}
