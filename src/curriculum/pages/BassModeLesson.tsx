/**
 * A Theory tile's bass lesson in one key: Learn → Theory → Ionian (Major),
 * Dorian, Minor Blues … on bass. Ionian is a key center of The Bass Atlas:
 * Book One; every other Theory scale is played the same way on its own bass
 * center (data/bass). `:mode` is the tile's slug ('ionian#5').
 *
 * The bass counterpart of GuitarModeLesson. A tile with no bass content goes
 * back to Theory. The premium gate (C Ionian free, the rest Premium) is the
 * route's (ClassroomPages). Opening it makes bass this device's Learn
 * instrument. `?section=A|B|D` opens that chapter.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { LearnRoutes } from '@/constants/routes';
import { buildBassTheoryFlow } from '@/curriculum/data/activityFlows/bassTheoryFlows';
import { bassTheoryEntry } from '@/curriculum/data/bass/theoryCatalog';
import { GenreLessonContainerV2 } from '@/curriculum/pages/GenreLessonContainerV2';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { urlParamToKeyLabel } from '@/lib/musicKeyUrl';

const THEORY_TAB_ROUTE = LearnRoutes.root(undefined, { tab: 'Theory' });
const ROOT_CRUMB = { label: 'Theory', route: THEORY_TAB_ROUTE };

export default function BassModeLesson() {
  const { mode, key = '' } = useParams<{ mode: string; key: string }>();
  const [searchParams] = useSearchParams();
  const keyName = urlParamToKeyLabel(key).replace('♯', '#').replace('♭', 'b');
  const entry = bassTheoryEntry(mode);
  const bassMode = entry?.slug ?? null;
  const flow = useMemo(
    () => buildBassTheoryFlow(keyName, bassMode ?? 'ionian'),
    [keyName, bassMode],
  );

  // A section the flow doesn't have (no C; pentatonic and blues have no B)
  // opens the first.
  const requested = searchParams.get('section');
  const section: ActivitySectionId =
    flow.sections.find((s) => s.id === requested)?.id ?? 'A';

  const practiceReturnTo = useCallback(
    (sectionId: ActivitySectionId) =>
      LearnRoutes.bassLesson(
        { mode: bassMode ?? 'ionian', key },
        { section: sectionId },
      ),
    [bassMode, key],
  );

  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  useEffect(() => {
    if (bassMode) setInstrument('bass');
  }, [bassMode, setInstrument]);

  if (!bassMode || !entry) return <Navigate replace to={THEORY_TAB_ROUTE} />;

  return (
    <GenreLessonContainerV2
      key={`${bassMode}|${key}|${section}`}
      flow={flow}
      genre={flow.genre}
      level={1}
      initialSection={section}
      displayName={`Bass · ${entry.title}`}
      overviewRoute={LearnRoutes.bassOverview({ mode: bassMode })}
      rootCrumb={ROOT_CRUMB}
      practiceReturnTo={practiceReturnTo}
    />
  );
}
