/**
 * Guitar Applied Theory Fundamentals — one key center of The Guitar Atlas.
 *
 * The guitar twin of AppliedTheoryFundamentalsLessonRoute (curriculum
 * routes.tsx): same URL-key handling, same lesson container, a guitar flow.
 * Free, like its piano counterpart. Opening it (from the picker or a shared
 * link) makes guitar this device's Learn instrument, so the Technique tab it
 * returns to shows guitar.
 */

import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { CurriculumRoutes } from '@/constants/routes';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { GenreLessonContainerV2 } from '@/curriculum/pages/GenreLessonContainerV2';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { urlParamToKeyLabel } from '@/lib/musicKeyUrl';

export default function GuitarAppliedTheoryFundamentalsLesson() {
  const { key } = useParams<{ key: string }>();
  // Same conversion as the piano route: display label ("F♯") → ASCII ("F#").
  // The builder maps other spellings of a book key (e.g. G♭) onto it.
  const keyName = urlParamToKeyLabel(key).replace('♯', '#').replace('♭', 'b');
  const flow = useMemo(
    () => buildGuitarAppliedTheoryFundamentalsFlow(keyName),
    [keyName],
  );

  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  useEffect(() => {
    setInstrument('guitar');
  }, [setInstrument]);

  return (
    <GenreLessonContainerV2
      flow={flow}
      genre={flow.genre}
      level={1}
      displayName="Guitar · Applied Theory Fundamentals"
      overviewRoute={CurriculumRoutes.guitarAppliedTheoryFundamentals()}
    />
  );
}
