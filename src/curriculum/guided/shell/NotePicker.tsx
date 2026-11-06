import { cn } from '@/components/utilities';
import { isBlackKey, pickerRange } from '../notePick';
import { RIGHT, WRONG } from './LessonShell';

// ── Choosing notes with the mouse ──────────────────────────────────────────
// An octave of keys running up from the tonic, so that the spacing can be counted
// off with the eye, or on guitar the twelve notes by name in the same order. Each
// note sounds as it's chosen. The tonic is already there to count from.

interface NotePickerProps {
  /** Keys on keyboard; names on an instrument without them. */
  face: 'keys' | 'names';
  tonicPc: number;
  nameOf: (pc: number) => string;
  picked: ReadonlySet<number>;
  /** Picked, and found not to belong. */
  wrong: ReadonlySet<number>;
  /** The result is showing, and they all belong. */
  settled: boolean;
  disabled: boolean;
  accent: string;
  onToggle: (pc: number) => void;
}

const pcOf = (midi: number) => ((midi % 12) + 12) % 12;

function colourOf(
  pc: number,
  { picked, wrong, settled, accent }: NotePickerProps,
): string | null {
  if (wrong.has(pc)) return WRONG;
  if (!picked.has(pc)) return null;
  return settled ? RIGHT : accent;
}

function Keys(props: NotePickerProps) {
  const { tonicPc, nameOf, picked, disabled, onToggle } = props;
  const range = pickerRange(tonicPc);
  const whites = range.filter((midi) => !isBlackKey(midi));
  const keyWidth = 100 / whites.length;

  const button = (midi: number, black: boolean, style: React.CSSProperties) => {
    const pc = pcOf(midi);
    const isTonic = pc === tonicPc;
    const on = picked.has(pc);
    const colour = colourOf(pc, props);
    return (
      <button
        key={midi}
        type="button"
        role="checkbox"
        aria-checked={on}
        aria-disabled={isTonic || disabled}
        aria-label={isTonic ? `${nameOf(pc)}, the tonic` : nameOf(pc)}
        data-pick-note={pc}
        data-picked={on || undefined}
        onClick={() => {
          if (!disabled) onToggle(pc);
        }}
        style={{ ...style, ...(colour ? { backgroundColor: colour } : {}) }}
        className={cn(
          'absolute flex items-end justify-center rounded-b-lg pb-2 font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70',
          black
            ? 'z-10 h-[62%] text-[0.6875rem] text-white'
            : 'inset-y-0 border border-[#101012] text-[0.8125rem] text-[#101012]',
          !colour && (black ? 'bg-[#26262b]' : 'bg-[#f4f4f6]'),
          !colour &&
            !disabled &&
            (black ? 'hover:bg-[#3a3a41]' : 'hover:bg-white/80'),
          colour && black && 'text-[#101012]',
          disabled && 'cursor-default',
        )}
      >
        {/* Named once it's chosen: finding them is the exercise. */}
        {on && nameOf(pc)}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label="The notes of an octave"
      data-note-picker="keys"
      className="relative h-44 w-full max-w-[34rem] select-none overflow-hidden rounded-xl sm:h-52"
    >
      {range.map((midi) => {
        const below = whites.filter((white) => white < midi).length;
        return isBlackKey(midi)
          ? button(midi, true, {
              left: `${below * keyWidth - keyWidth * 0.3}%`,
              width: `${keyWidth * 0.6}%`,
              top: 0,
            })
          : button(midi, false, {
              left: `${below * keyWidth}%`,
              width: `${keyWidth}%`,
            });
      })}
    </div>
  );
}

function Names(props: NotePickerProps) {
  const { tonicPc, nameOf, picked, disabled, onToggle } = props;
  return (
    <div
      role="group"
      aria-label="The twelve notes"
      data-note-picker="names"
      className="grid w-full max-w-[34rem] grid-cols-4 gap-2 sm:grid-cols-6"
    >
      {Array.from({ length: 12 }, (_, i) => (tonicPc + i) % 12).map((pc) => {
        const on = picked.has(pc);
        const colour = colourOf(pc, props);
        return (
          <button
            key={pc}
            type="button"
            role="checkbox"
            aria-checked={on}
            aria-disabled={pc === tonicPc || disabled}
            aria-label={
              pc === tonicPc ? `${nameOf(pc)}, the tonic` : nameOf(pc)
            }
            data-pick-note={pc}
            data-picked={on || undefined}
            onClick={() => {
              if (!disabled) onToggle(pc);
            }}
            style={colour ? { backgroundColor: colour } : undefined}
            className={cn(
              'h-12 rounded-xl border text-[0.9375rem] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70',
              colour
                ? 'border-transparent text-[#101012]'
                : 'border-white/20 text-white/90',
              !colour && !disabled && 'hover:bg-white/[0.06]',
              disabled && 'cursor-default',
            )}
          >
            {nameOf(pc)}
          </button>
        );
      })}
    </div>
  );
}

export function NotePicker(props: NotePickerProps) {
  return props.face === 'keys' ? <Keys {...props} /> : <Names {...props} />;
}
