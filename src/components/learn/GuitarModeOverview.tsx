/**
 * A Theory tile's overview on guitar: Learn → Theory → Ionian (Major),
 * Phrygian Dominant, Minor Blues … with Guitar as the instrument. The piano
 * overview's page (ModeOverview: the mode's art and the key wheel) with a
 * line on where the shapes come from, and keys that open the guitar
 * lessons: Book One's for Ionian, the modes built on it, and the rest of
 * Theory's generated ones.
 *
 * A tile with no guitar content goes back to Theory. The premium gate
 * (Ionian free, as on piano) is the route's. Opening it makes guitar this
 * device's Learn instrument. Loaded on demand: the book stays out of the
 * piano bundle.
 */

import { useEffect, useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { LearnRoutes } from '@/constants/routes';
import {
  guitarTheoryEntry,
  type GuitarTheoryEntry,
} from '@/curriculum/data/guitar/theoryCatalog';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import type { PrismModeSlug } from '@/hooks/data/prism';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import { ModeOverview, type ModeOverviewVariant } from './ModeOverview';

const THEORY_TAB_ROUTE = LearnRoutes.root(undefined, { tab: 'Theory' });

/** Under the title: where the lesson's shapes come from. */
function subtitleOf(entry: GuitarTheoryEntry): string {
  if (entry.key === 'ionian') return 'Guitar · The Guitar Atlas, Book One';
  if (entry.family === 'diatonic') {
    return 'Guitar · Shapes from The Guitar Atlas, Book One';
  }
  return entry.hasChords
    ? 'Guitar · Drop 2 and four-string chord shapes'
    : 'Guitar · Melody and play-along';
}

export default function GuitarModeOverview() {
  const { mode } = useParams<{ mode: string }>();
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const entry = guitarTheoryEntry(mode);
  useEffect(() => {
    if (entry) setInstrument('guitar');
  }, [entry, setInstrument]);

  const variant = useMemo<ModeOverviewVariant | null>(
    () =>
      entry
        ? {
            subtitle: subtitleOf(entry),
            lessonRoute: (keyLabel) =>
              LearnRoutes.guitarLesson({
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
