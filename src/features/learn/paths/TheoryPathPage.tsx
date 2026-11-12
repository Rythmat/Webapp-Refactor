import { useLayoutEffect, useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { PathPage } from '@/components/learn/path/PathPage';
import { exploreHref } from '@/features/learn/catalog/exploreState';
import {
  isLearnInstrumentEnabled,
  useInstrumentStore,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';
import { useProgressSummary } from '@/hooks/data/progress';
import { useIsPremium } from '@/hooks/useIsPremium';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { FAMILY_ACCENT_KEY, theoryFamily } from './theoryFamilies';
import { theoryFamilyPath } from './theoryPath';
import { theoryProgress } from './theoryProgress';

export { FAMILY_ACCENT_KEY } from './theoryFamilies';

/** /learn/<instrument>/theory/:family: a Theory family's path. */
export function TheoryPathPage({
  instrument,
}: {
  instrument: LearnInstrument;
}) {
  const params = useParams<{ family: string }>();
  const family = theoryFamily(params.family);
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const available = isLearnInstrumentEnabled(instrument);
  useLayoutEffect(() => {
    if (available) setInstrument(instrument);
  }, [available, instrument, setInstrument]);
  const { isPremium } = useIsPremium();
  const { data: summary } = useProgressSummary(instrument === 'piano');
  const lessons = summary?.lessons;
  const course = useMemo(
    () =>
      family
        ? theoryFamilyPath(
            family,
            colorForKeyMode(FAMILY_ACCENT_KEY[family.id]),
            {
              instrument,
              isPremium,
              progress: theoryProgress(instrument, lessons ?? []),
            },
          )
        : null,
    [family, instrument, isPremium, lessons],
  );
  if (!course || !available)
    return <Navigate replace to={exploreHref(instrument, 'theory')} />;
  return <PathPage course={course} />;
}
