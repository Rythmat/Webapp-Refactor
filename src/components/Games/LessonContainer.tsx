import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useMspModuleCompletion } from '@/features/classroom/msp';
import { PrismModeSlug } from '@/hooks/data';
import { usePrismMode } from '@/hooks/data/prism/usePrismMode';
import {
  LearnInputProvider,
  useLearnInputStable,
} from '@/learn/context/LearnInputContext';
import { getLocalModeSteps } from '@/lib/modeStepsFallback';
import { keyLabelToSemitone, urlParamToKeyLabel } from '@/lib/musicKeyUrl';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { ActivityFlow } from './ActivityFlow';
import '@/components/learn/learn.css';

type LessonContainerProps = {
  modeSlug: PrismModeSlug;
  rootKey?: string;
  startAtActivityKey?: string;
};

type KeyOption = { label: string; midi: number };

const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];
const BASE_C4 = 60;

const normalizeKeyLabel = (input?: string) => {
  return urlParamToKeyLabel(input);
};

const resolveKeyOption = (input?: string): KeyOption => {
  const normalized = normalizeKeyLabel(input);
  const semitone = keyLabelToSemitone(normalized);
  return {
    label: normalized,
    midi: BASE_C4 + semitone,
  };
};

const normalizeSteps = (steps?: number[]) => {
  if (!steps || steps.length === 0) return DEFAULT_INTERVALS;
  const unique = new Set<number>();
  steps.forEach((s) => {
    if (typeof s === 'number' && Number.isFinite(s)) {
      unique.add(Math.round(s));
    }
  });
  if (!unique.has(0)) unique.add(0);
  if (!Array.from(unique).some((n) => n >= 12)) unique.add(12);
  return Array.from(unique).sort((a, b) => a - b);
};

const buildScaleMidis = (rootMidi: number, steps?: number[]) =>
  normalizeSteps(steps).map((interval) => rootMidi + interval);

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
  startAtActivityKey,
}: LessonContainerProps) => {
  const navigate = useNavigate();
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
    () => buildScaleMidis(keyOption.midi, scaleSteps),
    [keyOption.midi, scaleSteps],
  );

  return (
    <div
      className="learn-root flex min-h-screen w-full flex-col"
      style={{ backgroundColor: '#101012', color: 'var(--color-text)' }}
    >
      <HeaderBar title="Lesson" onBack={() => navigate(-1)} />
      <div className="flex-1 p-3 sm:p-4">
        <ActivityFlow
          mode={modeSlug}
          rootKey={keyOption.label}
          rootMidi={keyOption.midi}
          scaleMidis={scaleMidis}
          startAtActivityKey={startAtActivityKey}
          onComplete={reportCompletion}
        />
      </div>
    </div>
  );
};
