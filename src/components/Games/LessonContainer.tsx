import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { PrismModeSlug } from '@/hooks/data';
import { usePrismMode } from '@/hooks/data/prism/usePrismMode';
import {
  LearnInputProvider,
  useLearnInputStable,
} from '@/learn/context/LearnInputContext';
import { urlParamToKeyLabel } from '@/lib/musicKeyUrl';
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
const KEY_SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  'C♯': 1,
  Db: 1,
  'D♭': 1,
  D: 2,
  'D#': 3,
  'D♯': 3,
  Eb: 3,
  'E♭': 3,
  E: 4,
  Fb: 4,
  'F♭': 4,
  'E#': 5,
  'E♯': 5,
  F: 5,
  'F#': 6,
  'F♯': 6,
  Gb: 6,
  'G♭': 6,
  G: 7,
  'G#': 8,
  'G♯': 8,
  Ab: 8,
  'A♭': 8,
  A: 9,
  'A#': 10,
  'A♯': 10,
  Bb: 10,
  'B♭': 10,
  B: 11,
  Cb: 11,
  'C♭': 11,
  'B#': 0,
  'B♯': 0,
};

const normalizeKeyLabel = (input?: string) => {
  return urlParamToKeyLabel(input);
};

const resolveKeyOption = (input?: string): KeyOption => {
  const normalized = normalizeKeyLabel(input);
  const semitone = KEY_SEMITONES[normalized] ?? 0;
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
  const [label, setLabel] = useState(['', '']);
  const keyOption = useMemo(() => resolveKeyOption(rootKey), [rootKey]);
  const modeTitle = modeSlug.charAt(0).toUpperCase() + modeSlug.slice(1);

  const { start: startInput, stop: stopInput } = useLearnInputStable();

  useEffect(() => {
    startInput();
    return () => stopInput();
  }, [startInput, stopInput]);

  const { data: modeDetail } = usePrismMode(modeSlug as any);
  const scaleSteps = modeDetail?.steps ?? DEFAULT_INTERVALS;
  const scaleMidis = useMemo(
    () => buildScaleMidis(keyOption.midi, scaleSteps),
    [keyOption.midi, scaleSteps],
  );

  return (
    <div
      className="learn-root flex min-h-screen w-full flex-col"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <HeaderBar title="Lesson" onBack={() => navigate(-1)} />
      <div
        className="glass-panel-sm flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <div className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
          {label[1]}
        </div>
        <div className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
          {label[0]}
        </div>
        <div className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
          Playing flow for{' '}
          <span
            className="font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {keyOption.label}
          </span>{' '}
          <span
            className="font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {modeTitle}
          </span>{' '}
        </div>
      </div>
      <div className="flex-1 p-3 sm:p-4">
        <ActivityFlow
          labelChange={(newLabel) => setLabel(newLabel)}
          mode={modeSlug}
          rootKey={keyOption.label}
          rootMidi={keyOption.midi}
          scaleMidis={scaleMidis}
          startAtActivityKey={startAtActivityKey}
        />
      </div>
    </div>
  );
};
