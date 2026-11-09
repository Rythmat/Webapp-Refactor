/**
 * A Theory tile's ukulele lesson in one key: Learn → Theory → Ionian (Major),
 * Dorian, Minor Blues … on ukulele. Ionian is a key center of The Ukulele
 * Atlas: Book One; every other Theory scale is played the same way on its
 * own ukulele center (data/ukulele). `:mode` is the tile's slug ('ionian#5').
 *
 * The ukulele counterpart of GuitarModeLesson. A tile with no ukulele
 * content goes back to Theory. The premium gate (C Ionian free, the rest
 * Premium) is the route's (ClassroomPages). Opening it makes ukulele this
 * device's Learn instrument. `?section=A|B|D` opens that chapter.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { LearnRoutes } from '@/constants/routes';
import { buildUkuleleTheoryFlow } from '@/curriculum/data/activityFlows/ukuleleTheoryFlows';
import { ukuleleTheoryEntry } from '@/curriculum/data/ukulele/theoryCatalog';
import { GenreLessonContainerV2 } from '@/curriculum/pages/GenreLessonContainerV2';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { urlParamToKeyLabel } from '@/lib/musicKeyUrl';

const THEORY_TAB_ROUTE = LearnRoutes.root(undefined, { tab: 'Theory' });
const ROOT_CRUMB = { label: 'Theory', route: THEORY_TAB_ROUTE };

export default function UkuleleModeLesson() {
  const { mode, key = '' } = useParams<{ mode: string; key: string }>();
  const [searchParams] = useSearchParams();
  const keyName = urlParamToKeyLabel(key).replace('♯', '#').replace('♭', 'b');
  const entry = ukuleleTheoryEntry(mode);
  const ukuleleMode = entry?.slug ?? null;
  const flow = useMemo(
    () => buildUkuleleTheoryFlow(keyName, ukuleleMode ?? 'ionian'),
    [keyName, ukuleleMode],
  );

  // A section the flow doesn't have (no C; pentatonic and blues have no B)
  // opens the first.
  const requested = searchParams.get('section');
  const section: ActivitySectionId =
    flow.sections.find((s) => s.id === requested)?.id ?? 'A';

  const practiceReturnTo = useCallback(
    (sectionId: ActivitySectionId) =>
      LearnRoutes.ukuleleLesson(
        { mode: ukuleleMode ?? 'ionian', key },
        { section: sectionId },
      ),
    [ukuleleMode, key],
  );

  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  useEffect(() => {
    if (ukuleleMode) setInstrument('ukulele');
  }, [ukuleleMode, setInstrument]);

  if (!ukuleleMode || !entry) return <Navigate replace to={THEORY_TAB_ROUTE} />;

  return (
    <GenreLessonContainerV2
      key={`${ukuleleMode}|${key}|${section}`}
      flow={flow}
      genre={flow.genre}
      level={1}
      initialSection={section}
      displayName={`Ukulele · ${entry.title}`}
      overviewRoute={LearnRoutes.ukuleleOverview({ mode: ukuleleMode })}
      rootCrumb={ROOT_CRUMB}
      practiceReturnTo={practiceReturnTo}
    />
  );
}
