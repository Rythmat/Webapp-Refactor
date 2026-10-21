// ── A stand-in input for Make Your Song ────────────────────────────────────
// The game's pads and keyboard come from the play screens' input layer
// (`renderInput`). This is the simple one the dev page and the tests use
// meanwhile: the take's pads (the chord pads, or the melody pads), the
// computer keys as Music Literacy maps them (useLiteracyInput: A = C), a
// MIDI keyboard through the Learn input, and an on-screen piano in keyboard
// mode. It only calls the handlers: Make Your Song makes the sound.

import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { cn } from '@/components/utilities';
import type { LiteracyTonic } from '@/content/musicLiteracy/schemas';
import { chordPads, melodyPads } from '@/curriculum/engine/echo';
import { inkOn } from '@/curriculum/musicLiteracy/KeyRing';
import { typingOctaveLabel } from '@/curriculum/musicLiteracy/typingKeys';
import { useLiteracyInput } from '@/curriculum/musicLiteracy/useLiteracyInput';
import { LessonKeyboard } from '@/learn/components/LessonKeyboard';
import type { EchoInputHandlers } from './types';

export interface FallbackInputProps extends EchoInputHandlers {
  keyChoice: { tonic: LiteracyTonic; mode: 'major' | 'minor' };
  input: 'pads' | 'keyboard';
}

/** How hard a pad plays. */
const PAD_VELOCITY = 100;

export function FallbackInput({
  kind,
  noteOn,
  noteOff,
  keyChoice,
  input,
}: FallbackInputProps) {
  const key = keyChoice;
  const pads = useMemo(
    () =>
      kind === 'chords'
        ? chordPads(key).map((pad) => ({
            id: `${pad.degree}-${pad.octave}`,
            label: pad.label,
            octave: pad.octave,
            color: pad.color,
            midis: [...pad.chord.midis],
          }))
        : melodyPads(key).pads.map((pad) => ({
            id: String(pad.position),
            label: pad.label,
            octave: pad.octave,
            color: pad.color,
            midis: [pad.midi],
          })),
    [kind, key],
  );
  const lowest = Math.min(...pads.flatMap((p) => p.midis));
  const highest = Math.max(...pads.flatMap((p) => p.midis));
  const range = useMemo(
    () => ({
      low: lowest - (lowest % 12),
      high: highest - (highest % 12) + 12,
    }),
    [lowest, highest],
  );

  const handlers = useRef({ noteOn, noteOff });
  handlers.current = { noteOn, noteOff };
  const { onKeyPointerDown, typingOctave } = useLiteracyInput({
    onNoteOn: (note) => handlers.current.noteOn(note.midi, note.velocity),
    onNoteOff: (note) => handlers.current.noteOff(note.midi),
  });

  /** Pads held, by pointer. */
  const held = useRef(new Map<number, number[]>());
  const [down, setDown] = useState<ReadonlySet<string>>(new Set());
  const press = (id: string, midis: number[], event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    release(event.pointerId, id);
    held.current.set(event.pointerId, midis);
    midis.forEach((midi) => handlers.current.noteOn(midi, PAD_VELOCITY));
    setDown((s) => new Set(s).add(id));
  };
  const release = (pointerId: number, id: string) => {
    const midis = held.current.get(pointerId);
    if (!midis) return;
    held.current.delete(pointerId);
    midis.forEach((midi) => handlers.current.noteOff(midi));
    setDown((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  };

  return (
    <div
      data-echo-fallback-input={kind}
      className="flex w-full flex-col items-center gap-3"
    >
      <div
        role="group"
        aria-label={kind === 'chords' ? 'Chord pads' : 'Melody pads'}
        className={cn(
          'grid w-full max-w-[880px] gap-2',
          kind === 'chords' ? 'grid-cols-6' : 'grid-cols-10',
        )}
        style={
          kind === 'melody'
            ? { gridTemplateColumns: `repeat(${pads.length}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {pads.map((pad) => (
          <button
            key={pad.id}
            type="button"
            data-echo-pad={
              pad.octave < 0
                ? `${pad.label}-low`
                : pad.octave > 0
                  ? `${pad.label}-high`
                  : pad.label
            }
            aria-label={
              pad.octave < 0
                ? `${pad.label}, low`
                : pad.octave > 0
                  ? `${pad.label}, high`
                  : pad.label
            }
            aria-pressed={down.has(pad.id)}
            onPointerDown={(e) => press(pad.id, pad.midis, e)}
            onPointerUp={(e) => release(e.pointerId, pad.id)}
            onPointerCancel={(e) => release(e.pointerId, pad.id)}
            className={cn(
              'flex h-16 min-w-0 select-none items-center justify-center rounded-xl text-[15px] font-semibold transition-transform touch-none max-[700px]:h-12',
              down.has(pad.id) && 'scale-95 ring-2 ring-white',
            )}
            style={{ backgroundColor: pad.color, color: inkOn(pad.color) }}
          >
            <span className="flex flex-col items-center leading-5">
              {pad.octave > 0 && (
                <span aria-hidden className="text-xs leading-3">
                  ·
                </span>
              )}
              {pad.label}
              {pad.octave < 0 && (
                <span aria-hidden className="text-xs leading-3">
                  ·
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      {input === 'keyboard' && (
        <div className="w-full max-w-[880px]">
          <LessonKeyboard
            range={range}
            natural={{ aspect: 6, maxHeight: 120 }}
            enableClick={false}
            useContextNotes={false}
            showOctaveStart={false}
            minHeight={80}
            onKeyPointerDown={onKeyPointerDown}
          />
        </div>
      )}
      <p className="text-xs text-white/55">
        Or play the letter keys ({typingOctaveLabel(typingOctave)}) or a MIDI
        keyboard.
      </p>
    </div>
  );
}
