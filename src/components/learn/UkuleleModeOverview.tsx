/**
 * A Theory tile's overview on ukulele: the piano overview's page
 * (ModeOverview: the mode's art and the key wheel) with a line on where the
 * boxes come from, and keys that open the ukulele lessons. A tile with no
 * ukulele content goes back to Theory; the premium gate (Ionian free) is the
 * route's. Opening it makes ukulele this device's Learn instrument.
 */

import { useEffect, useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { LearnRoutes } from '@/constants/routes';
import {
  ukuleleTheoryEntry,
  type UkuleleTheoryEntry,
} from '@/curriculum/data/ukulele/theoryCatalog';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import type { PrismModeSlug } from '@/hooks/data/prism';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import { ModeOverview, type ModeOverviewVariant } from './ModeOverview';

const THEORY_TAB_ROUTE = LearnRoutes.root(undefined, { tab: 'Theory' });

/** Under the title: where the lesson's boxes come from. */
function subtitleOf(entry: UkuleleTheoryEntry): string {
  if (entry.key === 'ionian') return 'Ukulele · The Ukulele Atlas, Book One';
  return entry.hasChords
    ? 'Ukulele · Scale and chord boxes from The Ukulele Atlas'
    : 'Ukulele · Melody, chords and play-along';
}

export default function UkuleleModeOverview() {
  const { mode } = useParams<{ mode: string }>();
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const entry = ukuleleTheoryEntry(mode);
  useEffect(() => {
    if (entry) setInstrument('ukulele');
  }, [entry, setInstrument]);

  const variant = useMemo<ModeOverviewVariant | null>(
    () =>
      entry
        ? {
            subtitle: subtitleOf(entry),
            lessonRoute: (keyLabel) =>
              LearnRoutes.ukuleleLesson({
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
