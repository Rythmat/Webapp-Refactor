import { Compass } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { START_HERE_TAB } from '@/curriculum/musicLiteracy/literacyPath';
import { startLearnTour, TOURS } from './learnTourStore';
import type { TourId } from './types';

/**
 * The dashboard's tour (the whole of Learn) and each page's part of it.
 * Technique and World Harmony have none yet, so no compass (Peter,
 * 2026-10-21).
 */
const TAB_TOURS: Readonly<Record<string, TourId>> = {
  '': 'navigate',
  [START_HERE_TAB]: 'startHere',
  Songs: 'songs',
  Genre: 'genre',
  Theory: 'theory',
};

export const tourForTab = (tab: string): TourId | null =>
  TAB_TOURS[tab] ?? null;

/**
 * How to Navigate: a compass in a box in the Learn menu, right of World
 * Harmony (Peter, 2026-10-21). On Start Here, Songs, Genre and Theory it
 * tours that page; on the dashboard it runs the whole tour of Learn; on a
 * page without a tour of its own it isn't shown.
 */
export function CompassTourButton() {
  const [params] = useSearchParams();
  const tour = tourForTab(params.get('tab') ?? '');
  if (!tour) return null;
  const label =
    tour === 'navigate' ? 'How to Navigate' : `How to use ${TOURS[tour].title}`;
  return (
    <button
      type="button"
      data-learn-compass
      aria-label={label}
      title={label}
      onClick={() => startLearnTour(tour)}
      className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/25 text-white/75 transition-colors hover:border-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:size-10"
    >
      <Compass className="size-5 md:size-6" aria-hidden />
    </button>
  );
}
