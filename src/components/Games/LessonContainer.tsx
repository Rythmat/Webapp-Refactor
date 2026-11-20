import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMspModuleCompletion } from '@/features/classroom/msp';
import { PrismModeSlug } from '@/hooks/data';
import { usePrismMode } from '@/hooks/data/prism/usePrismMode';
import {
  LearnInputProvider,
  useLearnInputStable,
} from '@/learn/context/LearnInputContext';
import { readLessonOrigin } from '@/lib/learn/lessonOrigin';
import { theoryScaleMidis, theoryTonicMidi } from '@/lib/learn/theoryRegister';
import { getLocalModeSteps } from '@/lib/modeStepsFallback';
import { keyLabelToSemitone, urlParamToKeyLabel } from '@/lib/musicKeyUrl';
import { ActivityFlow } from './ActivityFlow';
import '@/components/learn/learn.css';

type LessonContainerProps = {
  modeSlug: PrismModeSlug;
  rootKey?: string;
  /** The chapter (`?section=`) to open at; unset resumes. */
  startAtSection?: string;
};

type KeyOption = { label: string; midi: number };

const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];

const normalizeKeyLabel = (input?: string) => {
  return urlParamToKeyLabel(input);
};

/** The key and its tonic, C3–B3: the scale and chords start there and climb
 *  (lib/learn/theoryRegister). */
const resolveKeyOption = (input?: string): KeyOption => {
  const normalized = normalizeKeyLabel(input);
  const semitone = keyLabelToSemitone(normalized);
  return {
    label: normalized,
    midi: theoryTonicMidi(semitone),
  };
};

export const LessonContainer = (props: LessonContainerProps) => {
  return (
    <LearnInputProvider detectionMode="polyphonic">
      <LessonContainerInner {...props} />
    </LearnInputProvider>
  );
};

const LessonContainerInner = ({
  modeSlug,
  rootKey,
  startAtSection,
}: LessonContainerProps) => {
  const [searchParams] = useSearchParams();
  const origin = useMemo(() => readLessonOrigin(searchParams), [searchParams]);
  const keyOption = useMemo(() => resolveKeyOption(rootKey), [rootKey]);

  const { start: startInput, stop: stopInput } = useLearnInputStable();

  // Classroom app-route bridge: inert unless this lesson was opened from a live
  // slide (MSP launch params present). Fires once when the lesson completes.
  const { reportCompletion } = useMspModuleCompletion();

  useEffect(() => {
    startInput();
    return () => stopInput();
  }, [startInput, stopInput]);

  const { data: modeDetail } = usePrismMode(modeSlug as any);
  const scaleSteps =
    getLocalModeSteps(modeSlug) ?? modeDetail?.steps ?? DEFAULT_INTERVALS;
  const scaleMidis = useMemo(
    () => theoryScaleMidis(keyOption.midi, scaleSteps),
    [keyOption.midi, scaleSteps],
  );

  return (
    // The lesson draws its own header (TheoryLessonLayout: Theory › mode ›
    // key, the step's name), so no "Lesson" bar over it.
    <div
      className="learn-root flex h-full w-full flex-col"
      style={{ backgroundColor: '#101012', color: 'var(--color-text)' }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <ActivityFlow
          mode={modeSlug}
          rootKey={keyOption.label}
          rootMidi={keyOption.midi}
          scaleMidis={scaleMidis}
          startAtSection={startAtSection}
          onComplete={reportCompletion}
          origin={origin}
        />
      </div>
    </div>
  );
};
