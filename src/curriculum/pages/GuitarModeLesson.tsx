/**
 * A mode's guitar lesson in one key: Learn → Theory → Ionian (Major) … Locrian
 * on guitar. Ionian is a key center of The Guitar Atlas: Book One; the other
 * diatonic modes are built on it (data/guitar/modes).
 *
 * The guitar counterpart of the piano mode lessons at /learn/:mode/:key. A
 * mode with no guitar content goes back to Theory. The premium gate (C Ionian
 * free, the rest Premium) is the route's, as for piano (ClassroomPages).
 * Opening it (from the overview or a shared link) makes guitar this device's
 * Learn instrument, so Theory shows guitar on return.
 *
 * `?section=A|B|D` opens that chapter; the Practice Track comes back to it.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { LearnRoutes } from '@/constants/routes';
import { buildGuitarModeFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import {
  GUITAR_MODE_TITLE,
  isGuitarMode,
} from '@/curriculum/data/guitar/modes';
import { GenreLessonContainerV2 } from '@/curriculum/pages/GenreLessonContainerV2';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { urlParamToKeyLabel } from '@/lib/musicKeyUrl';

const THEORY_TAB_ROUTE = LearnRoutes.root(undefined, { tab: 'Theory' });
const ROOT_CRUMB = { label: 'Theory', route: THEORY_TAB_ROUTE };

export default function GuitarModeLesson() {
  const { mode, key = '' } = useParams<{ mode: string; key: string }>();
  const [searchParams] = useSearchParams();
  // Same conversion as the piano routes: display label ("F♯") → ASCII ("F#").
  // The builder maps other spellings of a book key (e.g. G♭) onto it.
  const keyName = urlParamToKeyLabel(key).replace('♯', '#').replace('♭', 'b');
  const guitarMode = isGuitarMode(mode) ? mode : null;
  const flow = useMemo(
    () => buildGuitarModeFlow(keyName, guitarMode ?? 'ionian'),
    [keyName, guitarMode],
  );

  // A section the flow doesn't have (guitar has no C) opens the first.
  const requested = searchParams.get('section');
  const section: ActivitySectionId =
    flow.sections.find((s) => s.id === requested)?.id ?? 'A';

  const practiceReturnTo = useCallback(
    (sectionId: ActivitySectionId) =>
      LearnRoutes.guitarLesson(
        { mode: guitarMode ?? 'ionian', key },
        { section: sectionId },
      ),
    [guitarMode, key],
  );

  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  useEffect(() => {
    if (guitarMode) setInstrument('guitar');
  }, [guitarMode, setInstrument]);

  if (!guitarMode) return <Navigate replace to={THEORY_TAB_ROUTE} />;

  return (
    <GenreLessonContainerV2
      // A new key or ?section= starts the lesson there.
      key={`${guitarMode}|${key}|${section}`}
      flow={flow}
      genre={flow.genre}
      level={1}
      initialSection={section}
      displayName={`Guitar · ${GUITAR_MODE_TITLE[guitarMode]}`}
      overviewRoute={LearnRoutes.guitarOverview({ mode: guitarMode })}
      rootCrumb={ROOT_CRUMB}
      practiceReturnTo={practiceReturnTo}
    />
  );
}
