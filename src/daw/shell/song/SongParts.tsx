import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/components/utilities';
import { CircleOfFifths } from '@/daw/components/Prism/CircleOfFifths';
import { useStore } from '@/daw/store';
import { Button } from '@/daw/ui/Button';
import { Select } from '@/daw/ui/Select';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';
import { createTapTempo } from './tapTempo';

// ── The song's key, metre and tempo controls (2.5, B4a) ────────────────────
//
// The Song popover's parts, split up when the song moved to the bottom rail
// (owner, 2026-10-16, after Soundtrap's): the circle of fifths with its mode
// list for the Key popover (the chord lane's key chip opens it too), the
// twelve common metres and a custom one for the Metre popover, and the
// tempo as an inline field with Tap. 'transport-bpm' stays on the tempo, as
// lessons name it. The circle is the Prism panel's own, still in its old
// look until the harmony polish (data-ds="legacy").

const METRES: ReadonlyArray<readonly [number, number]> = [
  [2, 4],
  [3, 4],
  [4, 4],
  [5, 4],
  [6, 4],
  [7, 4],
  [3, 8],
  [5, 8],
  [6, 8],
  [7, 8],
  [9, 8],
  [12, 8],
];

const DENOMINATORS = ['2', '4', '8', '16'].map((value) => ({
  value,
  label: value,
}));

export const MIN_BPM = 40;
export const MAX_BPM = 300;

const FIELD = cn(
  'h-7 rounded-[var(--daw-radius-sm)] border border-daw-outline bg-transparent px-2 text-center tabular-nums text-daw-text',
  TYPE_CLASS.body,
  TRANSITION,
  FOCUS_RING,
);

function SectionLabel({ children }: { children: string }) {
  return (
    <div className={cn(TYPE_CLASS.micro, 'mb-1.5 text-daw-text-3')}>
      {children}
    </div>
  );
}

/** The Key popover's body: the circle and its modes, and Done. */
export function KeyCircle({ onDone }: { onDone(): void }) {
  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>Key</SectionLabel>
      <div data-ds="legacy" className="self-center">
        <CircleOfFifths size={200} />
      </div>
      <Button variant="primary" className="self-end" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

/** The Metre popover's body: the common metres and a custom one. */
export function MetreChoices({ onPicked }: { onPicked?(): void }) {
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const setTimeSignature = useStore((s) => s.setTimeSignature);
  const [customNum, setCustomNum] = useState('');
  const [customDen, setCustomDen] = useState('4');
  const pick = (n: number, d: number) => {
    setTimeSignature(n, d);
    onPicked?.();
  };
  const setCustom = () => {
    const n = parseInt(customNum, 10);
    if (n > 0 && n <= 32) pick(n, parseInt(customDen, 10));
  };
  return (
    <div>
      <SectionLabel>Metre</SectionLabel>
      <div
        className="grid grid-cols-6 gap-1"
        role="radiogroup"
        aria-label="Metre"
      >
        {METRES.map(([n, d]) => {
          const active = n === numerator && d === denominator;
          return (
            <button
              key={`${n}/${d}`}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(n, d)}
              className={cn(
                'h-7 rounded-[var(--daw-radius-sm)] tabular-nums',
                active
                  ? 'bg-daw-selected font-bold text-daw-text'
                  : 'text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
                TYPE_CLASS.label,
                TRANSITION,
                FOCUS_RING,
              )}
            >
              {n}/{d}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          max={32}
          inputMode="numeric"
          aria-label="Beats in a bar"
          value={customNum}
          placeholder={String(numerator)}
          onChange={(e) => setCustomNum(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setCustom();
          }}
          className={cn(FIELD, 'w-12')}
        />
        <span className={cn(TYPE_CLASS.body, 'text-daw-text-3')}>/</span>
        <Select
          label="Beat note"
          options={DENOMINATORS}
          value={customDen}
          onValueChange={setCustomDen}
          className="w-16"
        />
        <Button size="md" onClick={setCustom} disabled={!customNum.trim()}>
          Set
        </Button>
      </div>
    </div>
  );
}

/**
 * The tempo, inline in the bottom rail: type a BPM (Enter or leaving the
 * field sets it; the store clamps 40–300), ↑ ↓ step it, and Tap sets it from
 * four taps or more.
 */
export function TempoField() {
  const bpm = useStore((s) => s.bpm);
  const setBpm = useStore((s) => s.setBpm);
  // Local text, so the student can clear the field and type a new tempo.
  const [text, setText] = useState(String(bpm));
  useEffect(() => setText(String(bpm)), [bpm]);
  const commit = useCallback(() => {
    const value = parseInt(text, 10);
    if (!Number.isNaN(value)) setBpm(value);
    setText(String(useStore.getState().bpm));
  }, [text, setBpm]);
  const tapper = useMemo(() => createTapTempo(), []);
  const [tapping, setTapping] = useState(false);

  return (
    <div
      data-tutorial-id="transport-bpm"
      role="group"
      aria-label="Tempo"
      className="flex items-center gap-1"
    >
      <Tooltip content="Tempo in beats per minute" side="bottom">
        <label className="flex h-7 items-center gap-1 rounded-[var(--daw-radius-sm)] px-1 hover:bg-daw-hover">
          <input
            id="bpm-input"
            data-testid="tempo-input"
            type="number"
            min={MIN_BPM}
            max={MAX_BPM}
            inputMode="numeric"
            aria-label="Tempo in beats per minute"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commit();
                e.currentTarget.blur();
              }
            }}
            className={cn(
              TYPE_CLASS.body,
              'h-6 w-10 rounded-[var(--daw-radius-sm)] bg-transparent text-right font-bold tabular-nums text-daw-text outline-none [appearance:textfield] focus:bg-daw-surface-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
              FOCUS_RING,
            )}
          />
          <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>BPM</span>
        </label>
      </Tooltip>
      <Button
        size="sm"
        variant="ghost"
        aria-label="Tap tempo: tap in time, four taps or more"
        data-active={tapping || undefined}
        className={
          tapping ? 'bg-daw-selected text-daw-text' : 'text-daw-text-2'
        }
        onClick={() => {
          const next = tapper.tap(performance.now());
          setTapping(true);
          if (next !== null) setBpm(next);
        }}
        onBlur={() => {
          tapper.reset();
          setTapping(false);
        }}
      >
        Tap
      </Button>
    </div>
  );
}
