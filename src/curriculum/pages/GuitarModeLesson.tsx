/**
 * A Theory tile's guitar lesson in one key: Learn → Theory → Ionian (Major),
 * Phrygian Dominant, Minor Blues … on guitar. Ionian is a key center of The
 * Guitar Atlas: Book One; the other diatonic modes are built on it
 * (data/guitar/modes), the rest of Theory on generated grips
 * (data/guitar/scales). `:mode` is the tile's slug ('ionian#5').
 *
 * The guitar counterpart of the piano mode lessons at /learn/:mode/:key. A
 * tile with no guitar content goes back to Theory. The premium gate (C Ionian
 * free, the rest Premium) is the route's, as for piano (ClassroomPages).
 * Opening it (from the overview or a shared link) makes guitar this device's
 * Learn instrument, so Theory shows guitar on return.
 *
 * `?section=A|B|D` opens that chapter; the Practice Track comes back to it.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { LearnRoutes } from '@/constants/routes';
import { buildGuitarTheoryFlow } from '@/curriculum/data/activityFlows/guitarTheoryFlows';
import { guitarTheoryEntry } from '@/curriculum/data/guitar/theoryCatalog';
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
  const entry = guitarTheoryEntry(mode);
  const guitarMode = entry?.slug ?? null;
  const flow = useMemo(
    () => buildGuitarTheoryFlow(keyName, guitarMode ?? 'ionian'),
    [keyName, guitarMode],
  );

  // A section the flow doesn't have (guitar has no C; pentatonic and blues
  // have no B) opens the first.
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

  if (!guitarMode || !entry) return <Navigate replace to={THEORY_TAB_ROUTE} />;

  return (
    <GenreLessonContainerV2
      // A new key or ?section= starts the lesson there.
      key={`${guitarMode}|${key}|${section}`}
      flow={flow}
      genre={flow.genre}
      level={1}
      initialSection={section}
      displayName={`Guitar · ${entry.title}`}
      overviewRoute={LearnRoutes.guitarOverview({ mode: guitarMode })}
      rootCrumb={ROOT_CRUMB}
      practiceReturnTo={practiceReturnTo}
    />
  );
}
