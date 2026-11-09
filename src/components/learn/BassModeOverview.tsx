/**
 * A Theory tile's overview on bass: the piano overview's page (ModeOverview:
 * the mode's art and the key wheel) with a line on where the boxes come
 * from, and keys that open the bass lessons. A tile with no bass content
 * goes back to Theory; the premium gate (Ionian free) is the route's.
 * Opening it makes bass this device's Learn instrument.
 */

import { useEffect, useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { LearnRoutes } from '@/constants/routes';
import {
  bassTheoryEntry,
  type BassTheoryEntry,
} from '@/curriculum/data/bass/theoryCatalog';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import type { PrismModeSlug } from '@/hooks/data/prism';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import { ModeOverview, type ModeOverviewVariant } from './ModeOverview';

const THEORY_TAB_ROUTE = LearnRoutes.root(undefined, { tab: 'Theory' });

/** Under the title: where the lesson's boxes come from. */
function subtitleOf(entry: BassTheoryEntry): string {
  if (entry.key === 'ionian') return 'Bass · The Bass Atlas, Book One';
  return entry.hasChords
    ? 'Bass · Scale and arpeggio boxes from The Bass Atlas'
    : 'Bass · Melody, bass lines and play-along';
}

export default function BassModeOverview() {
  const { mode } = useParams<{ mode: string }>();
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const entry = bassTheoryEntry(mode);
  useEffect(() => {
    if (entry) setInstrument('bass');
  }, [entry, setInstrument]);

  const variant = useMemo<ModeOverviewVariant | null>(
    () =>
      entry
        ? {
            subtitle: subtitleOf(entry),
            lessonRoute: (keyLabel) =>
              LearnRoutes.bassLesson({
                mode: entry.slug,
                key: keyLabelToUrlParam(keyLabel),
              }),
          }
        : null,
    [entry],
  );

  if (!entry || !variant) return <Navigate replace to={THEORY_TAB_ROUTE} />;

  return <ModeOverview mode={entry.slug as PrismModeSlug} variant={variant} />;
}
