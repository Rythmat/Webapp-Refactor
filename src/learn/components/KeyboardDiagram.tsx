import { useMemo } from 'react';
import { cn } from '@/components/utilities';
import { PianoKeyboard } from '@/daw/oracle-synth/components/keyboard/PianoKeyboard';
import {
  LESSON_KEY_RANGE,
  LESSON_KEYBOARD_HEIGHT,
  slideToTargets,
} from '@/learn/keyboard/lessonKeyboardRange';

/** Nothing to do: a diagram's keys aren't played. */
const noop = () => {};

/**
 * A picture of the lesson keyboard (owner, 2026-10-26): the Studio dock's
 * keys, the same 49 (C3–C7) at the same height as LessonKeyboard, `notes`
 * lit in `color`. For
 * the chord cards, the chord's dialog and the mode overview. It slides by
 * whole octaves only if the notes reach past those keys, and isn't played.
 */
export function KeyboardDiagram({
  notes,
  color,
  compact = false,
  className,
}: {
  notes: readonly number[];
  color: string;
  /** In a small box (a card): the keys shrink, no C names. */
  compact?: boolean;
  /** More classes (the lesson keyboard's height is its own). */
  className?: string;
}) {
  const range = useMemo(() => slideToTargets(LESSON_KEY_RANGE, notes), [notes]);
  const lit = useMemo(
    () => new Map(notes.map((midi) => [midi, color])),
    [notes, color],
  );
  const active = useMemo(() => new Set(notes), [notes]);

  return (
    <div
      data-keyboard-diagram
      className={cn(
        'relative w-full overflow-hidden rounded-b-md',
        LESSON_KEYBOARD_HEIGHT,
        className,
      )}
    >
      <PianoKeyboard
        startNote={range.low}
        endNote={range.high}
        activeNotes={active}
        litNotes={lit}
        octaveLabels={!compact}
        compact={compact}
        interactive={false}
        onNoteOn={noop}
        onNoteOff={noop}
      />
    </div>
  );
}
