import { Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/components/utilities';
import { CircleOfFifths } from '@/daw/components/Prism/CircleOfFifths';
import { useStore } from '@/daw/store';
import { Button } from '@/daw/ui/Button';
import { IconButton } from '@/daw/ui/IconButton';
import { Select } from '@/daw/ui/Select';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { createTapTempo } from './tapTempo';

// ── The Song popover (milestone 2.5) ───────────────────────────────────────
//
// Key, metre and tempo, opened from the Song chip: the circle of fifths with
// its mode list, the twelve common metres and a custom one, and the BPM
// with −/+ steppers and Tap tempo. 'transport-bpm' stays on the tempo, as
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

const MIN_BPM = 40;
const MAX_BPM = 300;

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

function Metre() {
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const setTimeSignature = useStore((s) => s.setTimeSignature);
  const [customNum, setCustomNum] = useState('');
  const [customDen, setCustomDen] = useState('4');
  const setCustom = () => {
    const n = parseInt(customNum, 10);
    if (n > 0 && n <= 32) setTimeSignature(n, parseInt(customDen, 10));
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
              onClick={() => setTimeSignature(n, d)}
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

function Tempo() {
  const bpm = useStore((s) => s.bpm);
  const setBpm = useStore((s) => s.setBpm);
  // Local text, so the student can clear the field and type a new tempo.
  const [text, setText] = useState(String(bpm));
  useEffect(() => setText(String(bpm)), [bpm]);
  const commit = useCallback(() => {
    const value = parseInt(text, 10);
    if (!Number.isNaN(value)) setBpm(value); // the store clamps 40–300
    setText(String(useStore.getState().bpm));
  }, [text, setBpm]);
  const tapper = useMemo(() => createTapTempo(), []);
  const [tapping, setTapping] = useState(false);

  return (
    <div data-tutorial-id="transport-bpm">
      <SectionLabel>Tempo</SectionLabel>
      <div className="flex items-center gap-1.5">
        <IconButton
          label="Slower"
          icon={<Minus />}
          variant="secondary"
          disabled={bpm <= MIN_BPM}
          onClick={() => setBpm(bpm - 1)}
        />
        <input
          id="bpm-input"
          type="number"
          min={MIN_BPM}
          max={MAX_BPM}
          inputMode="numeric"
          aria-label="Tempo in beats per minute"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
          className={cn(FIELD, 'w-16')}
        />
        <IconButton
          label="Faster"
          icon={<Plus />}
          variant="secondary"
          disabled={bpm >= MAX_BPM}
          onClick={() => setBpm(bpm + 1)}
        />
        <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>BPM</span>
        <Button
          size="md"
          className="ml-auto"
          aria-label="Tap tempo: tap in time, four taps or more"
          data-active={tapping || undefined}
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
    </div>
  );
}

export function SongPopover({ onDone }: { onDone(): void }) {
  return (
    <div className="flex gap-4">
      <div data-ds="legacy" className="shrink-0">
        <SectionLabel>Key</SectionLabel>
        <CircleOfFifths size={168} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Metre />
        <Tempo />
        <Button variant="primary" className="self-end" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
