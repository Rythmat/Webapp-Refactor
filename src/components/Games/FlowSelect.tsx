/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import { useMemo, useState } from 'react';
import { PrismModeSlug } from '@/hooks/data';
import { usePrismMode } from '@/hooks/data/prism/usePrismMode';
import { usePrismModes } from '@/hooks/data/prism/usePrismModes';
import { getLocalModeSteps } from '@/lib/modeStepsFallback';
import '@/components/learn/learn.css';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { ActivityFlow } from './ActivityFlow';

type KeyOption = { label: string; midi: number };

const KEY_OPTIONS: KeyOption[] = [
  { label: 'C', midi: 60 },
  { label: 'C#', midi: 61 },
  { label: 'D', midi: 62 },
  { label: 'D#', midi: 63 },
  { label: 'E', midi: 64 },
  { label: 'F', midi: 65 },
  { label: 'F#', midi: 66 },
  { label: 'G', midi: 67 },
  { label: 'G#', midi: 68 },
  { label: 'A', midi: 69 },
  { label: 'A#', midi: 70 },
  { label: 'B', midi: 71 },
];

const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];
const prismModes: PrismModeSlug[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
  'harmonicminor',
  'locriannat6',
  'ionian#5',
  'dorian#4',
  'phrygiandominant',
  'lydian#2',
  'altereddiminished',
  'melodicminor',
  'dorian♭2',
  'lydianaugmented',
  'lydiandominant',
  'mixolydiannat6',
  'locriannat2',
  'altereddominant',
  'harmonicmajor',
  'dorian♭5',
  'altereddominantnat5',
  'melodicminor#4',
  'mixolydian♭2',
  'lydianaugmented#2',
  'locrian𝄫7',
  'doubleharmonicmajor',
  'lydian#2#6',
  'ultraphrygian',
  'doubleharmonicminor',
  'oriental',
  'ionian#2#5',
  'locrian𝄫3𝄫7',
];

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

export const FlowSelect = () => {
  const [selectedKey, setSelectedKey] = useState<KeyOption>(KEY_OPTIONS[0]);
  const { data: modesData } = usePrismModes();
  const [started, setStarted] = useState(false);
  const [label, setLabel] = useState(['', '']);

  const modeOptions: PrismModeSlug[] = prismModes;

  const [selectedMode, setSelectedMode] = useState<PrismModeSlug>('ionian');

  const { data: modeDetail } = usePrismMode(selectedMode);

  const stepsFromModesMap = useMemo(() => {
    const raw = modesData?.modes as Record<string, unknown> | undefined;
    if (!raw || !selectedMode) return undefined;
    const modeValue = raw[selectedMode];
    if (Array.isArray(modeValue)) {
      return modeValue as number[];
    }
    return undefined;
  }, [modesData, selectedMode]);

  const scaleSteps =
    getLocalModeSteps(selectedMode) ?? modeDetail?.steps ?? stepsFromModesMap ?? DEFAULT_INTERVALS;
  const scaleMidis = useMemo(
    () => buildScaleMidis(selectedKey.midi, scaleSteps),
    [selectedKey, scaleSteps],
  );

  const SelectionShell = () => (
    <div className="flex-1 flex items-center justify-center p-4">
      <div
        className="w-full max-w-3xl rounded-2xl p-4 glass-panel"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        <div className="flex flex-col gap-2">
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Choose your flow
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
            Pick a key center and scale, then start your practice sequence.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label
              className="text-xs uppercase"
              style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}
            >
              Key Center
            </label>
            <select
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              value={selectedKey.label}
              onChange={(e) => {
                const key = KEY_OPTIONS.find((k) => k.label === e.target.value);
                if (key) setSelectedKey(key);
              }}
            >
              {KEY_OPTIONS.map((key) => (
                <option key={key.label} value={key.label}>
                  {key.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label
              className="text-xs uppercase"
              style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}
            >
              Scale / Mode
            </label>
            <select
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as PrismModeSlug)}
            >
              {modeOptions.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div
          className="mt-4 flex items-center justify-between text-sm"
          style={{ color: 'var(--color-text-dim)' }}
        >
          <span>
            Ready for {selectedKey.label} {selectedMode}
          </span>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-150"
            style={{ background: 'var(--color-accent)', color: '#191919' }}
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );

  if (!started) {
    return (
      <div
        className="learn-root min-h-screen w-full flex flex-col"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      >
        <HeaderBar title="Arcade" />
        <SelectionShell />
      </div>
    );
  }

  return (
    <div
      className="learn-root min-h-screen w-full flex flex-col"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <HeaderBar title="Flow Select" />
      <div
        className="px-4 py-3 flex items-center justify-between glass-panel-sm"
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
            {selectedKey.label}
          </span>{' '}
          <span
            className="font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {selectedMode}
          </span>
          {':   '}
          <button
            type="button"
            onClick={() => setStarted(false)}
            className="rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-150"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            Change selection
          </button>
        </div>
      </div>
      <div className="p-3 sm:p-4 flex-1">
        <ActivityFlow
          scaleMidis={scaleMidis}
          onComplete={() => setStarted(false)}
          labelChange={(newLabel) => setLabel(newLabel)}
          rootKey={`${selectedKey.label}`}
          rootMidi={selectedKey.midi}
          mode={`${selectedMode}`}
        />
      </div>
    </div>
  );
};
