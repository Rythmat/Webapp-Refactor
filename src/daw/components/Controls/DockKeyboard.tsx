import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import {
  MAX_TYPING_OCTAVE,
  MIN_TYPING_OCTAVE,
  typingKeyFor,
} from '@/daw/commands/musicalTypingMap';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { hintText } from '@/daw/shell/help/hintSource';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { PianoKeyboard } from '@/daw/oracle-synth/components/keyboard/PianoKeyboard';

// ── The dock's piano, after Soundtrap's (owner, 2026-10-22) ────────────────
//
// A MIDI instrument's keyboard in the dock (the tracks + Add track makes):
// a row over it with ‹ Octave ›, then as many octaves as the dock's width
// leaves keys wide enough for (up to four), each key the computer keyboard
// plays carrying its letter while Typing keys is on (the bottom rail's
// switch), and every C its name. The octave is the
// computer keyboard's (musicalTypingStore), so the keys shown are the ones
// the letters play: ‹ and › move both, as Z and X do.

/** A white key is at least this wide (px), so its letter has room. */
const MIN_WHITE_KEY_PX = 34;
/** Octaves shown, as the dock's width allows. */
const MIN_OCTAVES = 1;
const MAX_OCTAVES = 4;

/** How many octaves fit `width` px (a C above them closes the last one). */
export function octavesThatFit(width: number): number {
  const fit = Math.floor((width / MIN_WHITE_KEY_PX - 1) / 7);
  return Math.min(MAX_OCTAVES, Math.max(MIN_OCTAVES, fit));
}

/**
 * The notes shown for typing octave `octave` (its C is MIDI (octave+1)·12):
 * from the octave under it when there is room for two or more, `octaves`
 * of them, to the C above, as Soundtrap ends on one.
 */
export function dockKeyboardRange(
  octave: number,
  octaves = 3,
): { startNote: number; endNote: number } {
  const below = octaves >= 2 ? 1 : 0;
  const startNote = Math.max(0, (octave + 1 - below) * 12);
  const endNote = Math.min(127, startNote + octaves * 12);
  return { startNote, endNote };
}

export function DockKeyboard({
  activeNotes,
  activeColor,
  onNoteOn,
  onNoteOff,
}: {
  activeNotes: Set<number>;
  activeColor?: string;
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
}) {
  const octave = useMusicalTypingStore((s) => s.octave);
  // The letters show only while Typing keys is on (owner, 2026-10-22).
  const typing = useMusicalTypingStore((s) => s.enabled);
  const shiftOctave = useMusicalTypingStore((s) => s.shiftOctave);
  const [width, setWidth] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const measure = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    observer.current = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.current.observe(el);
  }, []);
  const { startNote, endNote } = dockKeyboardRange(
    octave,
    width > 0 ? octavesThatFit(width) : 3,
  );

  return (
    <div data-testid="dock-keyboard" className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 px-3 py-2">
        <div
          role="group"
          aria-label="Octave"
          className="flex items-center gap-0.5"
        >
          <OctaveButton
            label="Show lower keys"
            disabled={octave <= MIN_TYPING_OCTAVE}
            onClick={() => shiftOctave(-1)}
          >
            <ChevronLeft aria-hidden />
          </OctaveButton>
          <span
            className={cn(TYPE_CLASS.label, 'px-1 text-daw-text-2')}
            data-testid="dock-keyboard-octave"
          >
            Octave
          </span>
          <OctaveButton
            label="Show higher keys"
            disabled={octave >= MAX_TYPING_OCTAVE}
            onClick={() => shiftOctave(1)}
          >
            <ChevronRight aria-hidden />
          </OctaveButton>
        </div>
      </div>
      <div ref={measure} className="min-h-0 flex-1 px-1 pb-1">
        <PianoKeyboard
          startNote={startNote}
          endNote={endNote}
          activeNotes={activeNotes}
          activeColor={activeColor}
          onNoteOn={onNoteOn}
          onNoteOff={onNoteOff}
          keyLabel={typing ? (note) => typingKeyFor(note, octave) : undefined}
          octaveLabels
        />
      </div>
    </div>
  );
}

function OctaveButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-hint={hintText(label, 'The computer keyboard’s letters move too')}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex size-7 items-center justify-center rounded-[var(--daw-radius-sm)] text-daw-text-2 hover:bg-daw-hover hover:text-daw-text disabled:opacity-40 [&_svg]:size-4',
        TRANSITION,
        FOCUS_RING,
      )}
    >
      {children}
    </button>
  );
}
