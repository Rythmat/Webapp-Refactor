/**
 * A mode's overview on guitar: Learn → Theory → Ionian (Major) with Guitar
 * as the instrument. The piano overview's page (ModeOverview) with the book's
 * scale box where the keyboard goes, and key tiles that open the guitar
 * lessons of The Guitar Atlas: Book One.
 *
 * Only Ionian has guitar content; any other mode goes back to Theory. Free,
 * like the piano Ionian overview. Opening it makes guitar this device's Learn
 * instrument. Loaded on demand: the book stays out of the piano bundle.
 */

import { useEffect, useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ScaleBox } from '@/components/guitar';
import { LearnRoutes } from '@/constants/routes';
import {
  GUITAR_ATLAS_BOOK_ONE,
  keyPitchClass,
  toBookKey,
} from '@/curriculum/data/guitar/bookOne';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import {
  ModeOverview,
  type ModeOverviewShow,
  type ModeOverviewVariant,
} from './ModeOverview';

/** The one mode with guitar content. */
const GUITAR_MODE = 'ionian';
const THEORY_TAB_ROUTE = LearnRoutes.root(undefined, { tab: 'Theory' });

/** The book's major-scale position for the key on show, ringing its note. */
function BookScaleBox({
  keyLabel,
  noteIndex,
  keyColor,
  mirrored,
}: ModeOverviewShow & { mirrored: boolean }) {
  const bookKey = toBookKey(keyLabel) ?? 'C';
  const center = GUITAR_ATLAS_BOOK_ONE[bookKey];
  const position = center.majorScale;
  return (
    <div className="flex justify-center">
      <ScaleBox
        playOrder={position.playOrder}
        fretStart={position.fretStart}
        fretEnd={position.fretEnd}
        unusedStrings={position.unusedStrings}
        name={`${center.displayName} Major Scale`}
        tonicPc={keyPitchClass(bookKey)}
        keyColor={keyColor}
        activeIndex={Math.min(noteIndex, position.playOrder.length - 1)}
        mirrored={mirrored}
      />
    </div>
  );
}

export default function GuitarModeOverview() {
  const { mode } = useParams<{ mode: string }>();
  const leftHanded = useInstrumentStore((s) => s.leftHanded);
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const isGuitarMode = mode === GUITAR_MODE;
  useEffect(() => {
    if (isGuitarMode) setInstrument('guitar');
  }, [isGuitarMode, setInstrument]);

  const variant = useMemo<ModeOverviewVariant>(
    () => ({
      subtitle: 'Guitar · The Guitar Atlas, Book One',
      lessonRoute: (keyLabel) =>
        LearnRoutes.guitarLesson({
          mode: GUITAR_MODE,
          key: keyLabelToUrlParam(keyLabel),
        }),
      renderVisual: (show) => <BookScaleBox {...show} mirrored={leftHanded} />,
    }),
    [leftHanded],
  );

  if (!isGuitarMode) return <Navigate replace to={THEORY_TAB_ROUTE} />;

  return <ModeOverview mode={GUITAR_MODE} variant={variant} />;
}
