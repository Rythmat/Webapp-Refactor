import { useCallback } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { useStore } from '@/daw/store';
import { abbreviateSequence, StrumMode, VelocityTilt } from '@prism/engine';
import { ChordSequenceDisplay } from './ChordSequenceDisplay';
import { RhythmSelector } from './RhythmSelector';

// ── Constants ────────────────────────────────────────────────────────────

const STRUM_OPTIONS: Record<number, string> = {
  [StrumMode.Synchronized]: 'Synchronized',
  [StrumMode.Down]: 'Down',
  [StrumMode.Up]: 'Up',
  [StrumMode.Human]: 'Human',
};

const TILT_OPTIONS: Record<number, string> = {
  [VelocityTilt.Balanced]: 'Balanced',
  [VelocityTilt.BassLeading]: 'Bass Leading',
  [VelocityTilt.HighsLeading]: 'Highs Leading',
  [VelocityTilt.Human]: 'Human',
};

// ── Inline helpers ───────────────────────────────────────────────────────

function SliderControl({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const handleChange = useCallback(
    (vals: number[]) => onChange(vals[0]),
    [onChange],
  );
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {label}
        </span>
        <span
          className="text-xs tabular-nums"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {value}
        </span>
      </div>
      <Slider.Root
        className="relative flex h-4 touch-none select-none items-center"
        value={[value]}
        min={0}
        max={max}
        step={1}
        onValueChange={handleChange}
      >
        <Slider.Track
          className="relative h-1.5 grow rounded-full"
          style={{ backgroundColor: 'var(--color-surface-2)' }}
        >
          <Slider.Range
            className="absolute h-full rounded-full"
            style={{ backgroundColor: 'var(--color-accent)' }}
          />
        </Slider.Track>
        <Slider.Thumb
          className="block size-3.5 cursor-pointer rounded-full shadow focus:outline-none"
          style={{ backgroundColor: 'var(--color-accent)' }}
        />
      </Slider.Root>
    </div>
  );
}

function EnumSelector({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: Record<number, string>;
  onChange: (v: number) => void;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      onChange(Number(e.target.value)),
    [onChange],
  );
  return (
    <div className="flex flex-col gap-1">
      <span
        className="mb-0.5 text-xs font-medium"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={handleChange}
        className="h-8 cursor-pointer rounded-md px-2 text-sm font-medium outline-none"
        style={{
          backgroundColor: 'var(--color-surface-2)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
      >
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── ChordSelection ──────────────────────────────────────────────────────
// Sequence display + chord options grid + undo/clear buttons

export function ChordSelection() {
  const stringSeq = useStore((s) => s.stringSeq);
  const availableFirstChords = useStore((s) => s.availableFirstChords);
  const availableNextChords = useStore((s) => s.availableNextChords);
  const addChord = useStore((s) => s.addChord);
  const undoChord = useStore((s) => s.undoChord);
  const clearSequence = useStore((s) => s.clearSequence);

  const chordOptions =
    stringSeq.length === 0 ? availableFirstChords : availableNextChords;

  const handleAddChord = useCallback(
    (name: string) => () => {
      addChord(name);
    },
    [addChord],
  );

  const handleUndo = useCallback(() => {
    undoChord();
  }, [undoChord]);

  const handleClear = useCallback(() => {
    clearSequence();
  }, [clearSequence]);

  return (
    <div className="flex flex-col gap-2">
      {/* Current Sequence */}
      <ChordSequenceDisplay />

      {/* Chord Options Grid */}
      <div
        className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto pr-0.5"
        style={{ scrollbarWidth: 'thin' }}
      >
        {chordOptions.map((name) => (
          <button
            key={name}
            onClick={handleAddChord(name)}
            className="h-7 cursor-pointer truncate rounded px-1.5 text-xs font-medium transition-colors hover:brightness-125"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {abbreviateSequence(name)}
          </button>
        ))}
        {chordOptions.length === 0 && stringSeq.length > 0 && (
          <div
            className="col-span-2 py-3 text-center text-xs italic"
            style={{ color: 'var(--color-text-dim)' }}
          >
            No more options available
          </div>
        )}
      </div>

      {/* Undo / Clear */}
      <div className="flex gap-2">
        <button
          onClick={handleUndo}
          disabled={stringSeq.length === 0}
          className="h-7 flex-1 cursor-pointer rounded text-[10px] font-medium transition-colors disabled:cursor-default disabled:opacity-40"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text-dim)',
            border: '1px solid var(--color-border)',
          }}
        >
          Undo
        </button>
        <button
          onClick={handleClear}
          disabled={stringSeq.length === 0}
          className="h-7 flex-1 cursor-pointer rounded text-[10px] font-medium transition-colors disabled:cursor-default disabled:opacity-40"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text-dim)',
            border: '1px solid var(--color-border)',
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ── RhythmExpression ────────────────────────────────────────────────────
// Rhythm pattern, swing, strum, velocity tilt controls

export function RhythmExpression() {
  const swing = useStore((s) => s.swing);
  const setSwing = useStore((s) => s.setSwing);
  const strumMode = useStore((s) => s.strumMode);
  const setStrumMode = useStore((s) => s.setStrumMode);
  const strumAmount = useStore((s) => s.strumAmount);
  const setStrumAmount = useStore((s) => s.setStrumAmount);
  const tiltMode = useStore((s) => s.tiltMode);
  const setTiltMode = useStore((s) => s.setTiltMode);
  const tiltAmount = useStore((s) => s.tiltAmount);
  const setTiltAmount = useStore((s) => s.setTiltAmount);

  return (
    <div className="flex flex-col gap-3">
      <span
        className="text-xs font-bold"
        style={{ color: 'var(--color-text)' }}
      >
        Rhythm &amp; Expression
      </span>

      <RhythmSelector />
      <SliderControl label="Swing" value={swing} max={60} onChange={setSwing} />
      <EnumSelector
        label="Strum Mode"
        value={strumMode}
        options={STRUM_OPTIONS}
        onChange={setStrumMode}
      />
      <SliderControl
        label="Strum Amount"
        value={strumAmount}
        max={60}
        onChange={setStrumAmount}
      />
      <EnumSelector
        label="Velocity Tilt"
        value={tiltMode}
        options={TILT_OPTIONS}
        onChange={setTiltMode}
      />
      <SliderControl
        label="Tilt Amount"
        value={tiltAmount}
        max={60}
        onChange={setTiltAmount}
      />
    </div>
  );
}

// ── Legacy export (kept for backward compat) ────────────────────────────

export function ChordBuilder() {
  return (
    <div className="flex flex-col gap-3">
      <ChordSelection />
      <div
        className="border-t pt-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <RhythmExpression />
      </div>
    </div>
  );
}
