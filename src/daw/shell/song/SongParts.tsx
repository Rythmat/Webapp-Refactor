import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/components/utilities';
import { CircleOfFifths } from '@/daw/components/Prism/CircleOfFifths';
import { useStore } from '@/daw/store';
import { X } from 'lucide-react';
import { Button } from '@/daw/ui/Button';
import { IconButton } from '@/daw/ui/IconButton';
import { PopoverClose } from '@/daw/ui/Popover';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';
import { createTapTempo } from './tapTempo';

// ── The song's key, metre and tempo controls (2.5, B4a) ────────────────────
//
// The Song popover's parts, split up when the song moved to the bottom rail
// (owner, 2026-10-16, after Soundtrap's): the circle of fifths with its mode
// list for the Key popover (the chord lane's key chip opens it too), the
// time signature menu (seven common ones and two boxes for a custom one,
// laid out as the floating frame's time signature menu), and the
// tempo as an inline field with Tap. 'transport-bpm' stays on the tempo, as
// lessons name it. The circle is the Prism panel's own, still in its old
// look until the harmony polish (data-ds="legacy").

/**
 * The time signatures the menu lists (owner, 2026-10-21): any other is a
 * custom one, typed into the two boxes under them.
 */
export const METRES: ReadonlyArray<readonly [number, number]> = [
  [2, 4],
  [3, 4],
  [4, 4],
  [5, 4],
  [6, 4],
  [7, 4],
  [12, 8],
];

/** The beat notes a custom time signature may have (the store's own). */
const BEAT_NOTES = [2, 4, 8, 16];

export const MIN_BPM = 40;
export const MAX_BPM = 300;

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

/**
 * The time signature menu, laid out as the floating frame's (owner,
 * 2026-10-21): a small 'Time signature' heading with a close button, one
 * 40 px row per common time signature (the current one lit), and two empty
 * boxes at the bottom for a custom one. Enter in either box sets it when
 * both hold a valid value: 1 to 32 beats, a beat note of 2, 4, 8 or 16.
 */
export function MetreChoices({ onPicked }: { onPicked?(): void }) {
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const setTimeSignature = useStore((s) => s.setTimeSignature);
  const [beats, setBeats] = useState('');
  const [note, setNote] = useState('');
  const pick = (n: number, d: number) => {
    setTimeSignature(n, d);
    onPicked?.();
  };
  const beatsN = Number(beats);
  const noteN = Number(note);
  const beatsOk = Number.isInteger(beatsN) && beatsN >= 1 && beatsN <= 32;
  const noteOk = BEAT_NOTES.includes(noteN);
  const setCustom = () => {
    if (beatsOk && noteOk) pick(beatsN, noteN);
  };
  const box = (bad: boolean) =>
    cn(
      'h-8 w-10 rounded-[var(--daw-radius-md)] border bg-transparent px-1 text-center text-daw-text placeholder:text-daw-text-3',
      bad ? 'border-daw-danger-text' : 'border-daw-edge',
      TYPE_CLASS.item,
      TRANSITION,
      FOCUS_RING,
    );
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-1 pl-4 pr-1 pt-1">
        <span className={cn(TYPE_CLASS.label, 'text-daw-text-2')}>
          Time signature
        </span>
        <PopoverClose asChild>
          <IconButton
            label="Close"
            icon={<X />}
            variant="bare"
            size="sm"
            noTooltip
          />
        </PopoverClose>
      </div>
      <div
        role="radiogroup"
        aria-label="Time signature"
        className="flex flex-col"
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
                'flex h-10 items-center px-4 text-left text-daw-text outline-none hover:bg-daw-menu-hover focus-visible:bg-daw-menu-hover',
                active && 'bg-daw-chip',
                TYPE_CLASS.item,
                TRANSITION,
              )}
            >
              {n}/{d}
            </button>
          );
        })}
      </div>
      <div
        role="group"
        aria-label="Custom time signature"
        className="flex items-center gap-1.5 border-t border-daw-edge px-4 py-2.5"
      >
        <input
          inputMode="numeric"
          aria-label="Custom: beats in a bar"
          aria-invalid={beats !== '' && !beatsOk ? true : undefined}
          value={beats}
          onChange={(e) => setBeats(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setCustom();
          }}
          maxLength={2}
          data-testid="metre-custom-beats"
          className={box(beats !== '' && !beatsOk)}
        />
        <span aria-hidden className={cn(TYPE_CLASS.item, 'text-daw-text-3')}>
          /
        </span>
        <input
          inputMode="numeric"
          aria-label="Custom: beat note"
          aria-invalid={note !== '' && !noteOk ? true : undefined}
          value={note}
          onChange={(e) => setNote(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setCustom();
          }}
          maxLength={2}
          data-testid="metre-custom-note"
          className={box(note !== '' && !noteOk)}
        />
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
