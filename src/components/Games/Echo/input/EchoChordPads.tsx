import type { PointerEvent } from 'react';
import { cn } from '@/components/utilities';
import type { ChordPad } from '@/curriculum/engine/echo';
import { inkOn } from '@/curriculum/musicLiteracy/KeyRing';
import { padKeyLabel } from './padKeys';
import './echoPads.css';

// ── The chord pads ─────────────────────────────────────────────────────────
// The mode's six chords, the 1 first, each a big pad in its root's color
// (engine/echo/pads.ts). One tap plays the whole chord, voiced; it sounds
// until let go. Named the hybrid way, the root's number big and the quality
// under it ("4" over "maj"). A pad lights when Atlas plays its chord and
// while the student holds it.

export interface EchoChordPadsProps {
  /** The key's six (chordPads(key)). */
  pads: readonly ChordPad[];
  /** Pads lit by the music: Atlas's chord as it sounds, a MIDI chord held. */
  lit: ReadonlySet<number>;
  /** Pads the student is holding (pointer or key). */
  held: ReadonlySet<number>;
  /** A pointer down on a pad: its chord sounds until let go (useEchoInput). */
  onPadPointerDown: (index: number, event: PointerEvent) => void;
  /** Show each pad's home-row key (default on). */
  showKeys?: boolean;
  /** Dimmed and deaf, between turns (default off). */
  disabled?: boolean;
  className?: string;
}

export function EchoChordPads({
  pads,
  lit,
  held,
  onPadPointerDown,
  showKeys = true,
  disabled = false,
  className,
}: EchoChordPadsProps) {
  return (
    <div
      role="group"
      aria-label="Chord pads"
      data-echo-pads="chords"
      className={cn(
        'grid h-full min-h-0 w-full grid-cols-6 items-stretch gap-[clamp(8px,1.2vw,16px)] max-[639px]:grid-cols-3',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {pads.map((pad, i) => {
        const pressed = held.has(i);
        const on = pressed || lit.has(i);
        const key = padKeyLabel(i);
        const [number, quality] = pad.label.split(' ');
        return (
          <button
            key={pad.degree}
            type="button"
            aria-label={pad.label}
            aria-pressed={pressed}
            data-echo-pad={i}
            data-chord={pad.label}
            data-midis={pad.chord.midis.join(',')}
            data-pad-key={key ?? undefined}
            data-lit={on || undefined}
            onPointerDown={(event) => onPadPointerDown(i, event)}
            onContextMenu={(event) => event.preventDefault()}
            className={cn(
              'echo-pad relative flex min-h-0 min-w-0 touch-none select-none flex-col items-center rounded-[26px] border-2 outline-none focus-visible:ring-2 focus-visible:ring-white/70',
              on && 'echo-pad-on',
            )}
            style={{
              borderColor: pad.color,
              color: on ? inkOn(pad.color) : '#ffffff',
              backgroundColor: on
                ? pad.color
                : `color-mix(in oklab, ${pad.color} 26%, #101012)`,
              boxShadow: on
                ? `0 0 30px ${pad.color}, inset 0 0 0 ${pressed ? 3 : 0}px rgba(255,255,255,0.85)`
                : undefined,
            }}
          >
            <span
              aria-hidden
              className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1"
            >
              <span
                aria-hidden
                className="text-[clamp(26px,3.4vw,46px)] font-semibold leading-none tabular-nums"
              >
                {number}
              </span>
              <span
                aria-hidden
                className="text-[clamp(13px,1.3vw,18px)] font-medium uppercase leading-none tracking-[0.12em] opacity-85"
              >
                {quality}
              </span>
            </span>
            {showKeys && key && (
              <kbd
                aria-hidden
                className="mb-2 shrink-0 rounded-md border border-current bg-black/15 px-1.5 font-sans text-[11px] leading-[18px] opacity-60"
              >
                {key}
              </kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}
