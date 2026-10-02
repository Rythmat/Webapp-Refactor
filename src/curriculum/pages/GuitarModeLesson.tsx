/**
 * A mode's guitar lesson in one key: Learn → Theory → Ionian (Major) on
 * guitar, one key center of The Guitar Atlas: Book One.
 *
 * The guitar counterpart of the piano mode lessons at /learn/:mode/:key.
 * Only Ionian has guitar content; any other mode goes back to Theory. The
 * premium gate (C free, the other keys Premium) is the route's, as for piano
 * (ClassroomPages). Opening it (from the overview or a shared link) makes
 * guitar this device's Learn instrument, so Theory shows guitar on return.
 *
 * `?section=A|B|D` opens that chapter; the Practice Track comes back to it.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { LearnRoutes } from '@/constants/routes';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { GenreLessonContainerV2 } from '@/curriculum/pages/GenreLessonContainerV2';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { urlParamToKeyLabel } from '@/lib/musicKeyUrl';

/** The one mode with guitar content. */
const GUITAR_MODE = 'ionian';
const THEORY_TAB_ROUTE = LearnRoutes.root(undefined, { tab: 'Theory' });
const ROOT_CRUMB = { label: 'Theory', route: THEORY_TAB_ROUTE };

export default function GuitarModeLesson() {
  const { mode, key = '' } = useParams<{ mode: string; key: string }>();
  const [searchParams] = useSearchParams();
  // Same conversion as the piano routes: display label ("F♯") → ASCII ("F#").
  // The builder maps other spellings of a book key (e.g. G♭) onto it.
  const keyName = urlParamToKeyLabel(key).replace('♯', '#').replace('♭', 'b');
  const flow = useMemo(
    () => buildGuitarAppliedTheoryFundamentalsFlow(keyName),
    [keyName],
  );

  // A section the flow doesn't have (guitar has no C) opens the first.
  const requested = searchParams.get('section');
  const section: ActivitySectionId =
    flow.sections.find((s) => s.id === requested)?.id ?? 'A';

  const practiceReturnTo = useCallback(
    (sectionId: ActivitySectionId) =>
      LearnRoutes.guitarLesson(
        { mode: GUITAR_MODE, key },
        { section: sectionId },
      ),
    [key],
  );

  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const isGuitarMode = mode === GUITAR_MODE;
  useEffect(() => {
    if (isGuitarMode) setInstrument('guitar');
  }, [isGuitarMode, setInstrument]);

  if (!isGuitarMode) return <Navigate replace to={THEORY_TAB_ROUTE} />;

  return (
    <GenreLessonContainerV2
      // A new key or ?section= starts the lesson there.
      key={`${key}|${section}`}
      flow={flow}
      genre={flow.genre}
      level={1}
      initialSection={section}
      displayName="Guitar · Ionian (Major)"
      overviewRoute={LearnRoutes.guitarOverview({ mode: GUITAR_MODE })}
      rootCrumb={ROOT_CRUMB}
      practiceReturnTo={practiceReturnTo}
    />
  );
}
