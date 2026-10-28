import {
  PROMPT_PILL,
  PROMPT_PILL_OFF,
  PROMPT_PILL_ON,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { GUITAR_STANDARD_TUNING } from '@/lib/guitar/fretboard';
import { midiToHz } from '@/lib/guitar/harmonics';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { noteName } from './spelling';

// ── The activity's pickers ─────────────────────────────────────────────────
// Which string (standard tuning, low E first, as a guitarist counts up from
// the floor) and which partials to show. Pills in the prompt box's look.

/** Low E to high E: the order the strings are picked in. */
export const STRINGS_LOW_TO_HIGH: readonly GuitarStringNumber[] = [
  6, 5, 4, 3, 2, 1,
];

export function openMidiOf(string: GuitarStringNumber): number {
  return GUITAR_STANDARD_TUNING[string];
}

/** "A" for string 5. */
export function stringLetter(string: GuitarStringNumber): string {
  const midi = openMidiOf(string);
  return noteName(midi, midi).replace(/\d+$/, '');
}

export function StringPicker({
  value,
  onChange,
}: {
  value: GuitarStringNumber;
  onChange: (string: GuitarStringNumber) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="String"
      data-string-picker
      className="flex flex-wrap items-center gap-1.5"
    >
      {STRINGS_LOW_TO_HIGH.map((s) => {
        const midi = openMidiOf(s);
        const on = s === value;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`String ${s}, ${noteName(midi, midi)}, ${midiToHz(midi).toFixed(1)} hertz`}
            data-string={s}
            onClick={() => onChange(s)}
            className={cn(PROMPT_PILL, on ? PROMPT_PILL_ON : PROMPT_PILL_OFF)}
          >
            <span className="text-white/45">{s}</span>
            {noteName(midi, midi)}
          </button>
        );
      })}
    </div>
  );
}

export function PartialChips({
  partials,
  value,
  onChange,
  label = 'Partials shown',
}: {
  partials: readonly number[];
  value: ReadonlySet<number>;
  onChange: (next: Set<number>) => void;
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      data-partial-chips
      className="flex flex-wrap items-center gap-1.5"
    >
      {partials.map((n) => {
        const on = value.has(n);
        return (
          <button
            key={n}
            type="button"
            aria-pressed={on}
            aria-label={`Partial ${n}`}
            data-partial-chip={n}
            onClick={() => {
              const next = new Set(value);
              if (on) next.delete(n);
              else next.add(n);
              // Never none: the last one stays.
              if (next.size) onChange(next);
            }}
            className={cn(
              PROMPT_PILL,
              'min-w-8 justify-center px-2.5',
              on ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
