import type { PointerEvent } from 'react';
import { cn } from '@/components/utilities';
import type { MelodyPad } from '@/curriculum/engine/echo';
import { inkOn } from '@/curriculum/musicLiteracy/KeyRing';
import { padKeyLabel } from './padKeys';
import './echoPads.css';

// ── The melody pads ────────────────────────────────────────────────────────
// Simon's pads, as a staircase: the level's scale degrees low to high, left
// to right, each a step taller than the last, so up the stairs is up in
// pitch. Each wears its note's color on the circle (engine/echo/pads.ts:
// the 1's is the key's own), dim until it sounds. A pad lights when Atlas
// plays it and while the student holds it, and says what it is: its scale
// degree, big ("1", "♭3"), with a dot under it for the octave below the 1
// and over it for the octave above, and its home-row key.

export interface EchoMelodyPadsProps {
  /** The level's pads, low to high (melodyPads(level, key).pads). */
  pads: readonly MelodyPad[];
  /** Pads lit by the music: Atlas's call as it sounds, a MIDI key held. */
  lit: ReadonlySet<number>;
  /** Pads the student is holding (pointer or key). */
  held: ReadonlySet<number>;
  /** A pointer down on a pad: it sounds until let go (useEchoInput). */
  onPadPointerDown: (index: number, event: PointerEvent) => void;
  /** Show each pad's home-row key (default on). */
  showKeys?: boolean;
  /** Dimmed and deaf, between turns (default off). */
  disabled?: boolean;
  className?: string;
}

/** The share of the row's height the lowest pad takes; the highest, all. */
const LOWEST_PAD = 0.62;

/** "5, an octave down" for assistive tech. */
const padName = (pad: MelodyPad) =>
  pad.octave < 0
    ? `${pad.label}, low`
    : pad.octave > 0
      ? `${pad.label}, high`
      : pad.label;

export function EchoMelodyPads({
  pads,
  lit,
  held,
  onPadPointerDown,
  showKeys = true,
  disabled = false,
  className,
}: EchoMelodyPadsProps) {
  const steps = Math.max(1, pads.length - 1);
  return (
    <div
      role="group"
      aria-label="Melody pads"
      data-echo-pads="melody"
      className={cn(
        'flex h-full min-h-0 w-full items-end justify-center gap-[clamp(6px,1vw,14px)]',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {pads.map((pad, i) => {
        const pressed = held.has(i);
        const on = pressed || lit.has(i);
        const key = padKeyLabel(i);
        return (
          <button
            key={pad.position}
            type="button"
            aria-label={padName(pad)}
            aria-pressed={pressed}
            data-echo-pad={i}
            data-midi={pad.midi}
            data-pad-key={key ?? undefined}
            data-lit={on || undefined}
            onPointerDown={(event) => onPadPointerDown(i, event)}
            onContextMenu={(event) => event.preventDefault()}
            className={cn(
              'echo-pad relative flex min-w-0 max-w-[132px] flex-1 touch-none select-none flex-col items-center rounded-[22px] border-2 outline-none focus-visible:ring-2 focus-visible:ring-white/70',
              on && 'echo-pad-on',
            )}
            style={{
              height: `${(LOWEST_PAD + ((1 - LOWEST_PAD) * i) / steps) * 100}%`,
              borderColor: pad.color,
              color: on ? inkOn(pad.color) : '#ffffff',
              backgroundColor: on
                ? pad.color
                : `color-mix(in oklab, ${pad.color} 26%, #101012)`,
              boxShadow: on
                ? `0 0 28px ${pad.color}, inset 0 0 0 ${pressed ? 3 : 0}px rgba(255,255,255,0.85)`
                : undefined,
            }}
          >
            <span
              aria-hidden
              className="flex min-h-0 flex-1 flex-col items-center justify-center leading-none"
              data-pad-label
            >
              <OctaveDot show={pad.octave > 0} />
              <span className="text-[clamp(22px,3vw,40px)] font-semibold tabular-nums">
                {pad.label}
              </span>
              <OctaveDot show={pad.octave < 0} />
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

function OctaveDot({ show }: { show: boolean }) {
  return (
    <span
      className="my-1 size-[7px] rounded-full"
      style={{ backgroundColor: show ? 'currentColor' : 'transparent' }}
    />
  );
}
