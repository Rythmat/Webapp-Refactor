import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { FixedDigits } from '@/components/common/FixedDigits';
import { cn } from '@/components/utilities';
import { useElementSize } from '@/hooks/useElementSize';
import {
  fretAt,
  formatCents,
  harmonicAt,
  midiToHz,
  nearestRatioStop,
  pitchOf,
  positionOfFret,
  RATIO_STOPS,
  ratioStopPosition,
  stoppedHz,
} from '@/lib/guitar/harmonics';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { partialInterval } from '@/lib/music/harmonicSeries';
import { openMidiOf, StringPicker, stringLetter } from './HarmonicsControls';
import { noteName } from './spelling';

// ── String ratios ──────────────────────────────────────────────────────────
// A fretless string and a finger on it. Pressed, the part from the finger to
// the bridge vibrates: 2/3 of the string sounds a 5th over the open string,
// 3/4 a 4th, 1/2 the octave. Touched lightly at the same place, the whole
// string rings in parts instead: a harmonic, if the place is a node. The
// two sounds side by side are the point: at a third of the string, pressing
// gives a 5th, touching a 5th an octave higher.

/** How far along the string the finger goes (past the 24th fret, 0.75). */
const MAX_X = 0.8;
const STEP = 0.0025;
/** Snap within this many px of a ratio or a node. */
const SNAP_PX = 9;
/** The nodes worth snapping to: partials 2–6. */
const SNAP_NODES = [2, 3, 4, 5, 6].flatMap((n) =>
  Array.from({ length: n - 1 }, (_, i) => (i + 1) / n),
);
const SNAPS = [
  ...new Set([...RATIO_STOPS.map(ratioStopPosition), ...SNAP_NODES]),
]
  .filter((x) => x <= MAX_X)
  .sort((a, b) => a - b);

const PAD = 24;
const HEIGHT = 156;
const STRING_Y = 70;

/** "higher by an octave": a harmonic over the pressed note at the same spot. */
function relation(multiple: number): string {
  if (multiple === 1) return 'the same pitch as pressing';
  if (multiple === 2) return 'an octave above the pressed note';
  return `${partialInterval(multiple).long.toLowerCase()} above the pressed note`;
}

export interface StringRatiosTabProps {
  string: GuitarStringNumber;
  onStringChange: (string: GuitarStringNumber) => void;
  keyColor: string;
  mirrored: boolean;
  onPress: (hz: number) => void;
  onTouch: (hz: number) => void;
}

export function StringRatiosTab({
  string,
  onStringChange,
  keyColor,
  mirrored,
  onPress,
  onTouch,
}: StringRatiosTabProps) {
  const [x, setX] = useState(1 / 3);
  const boxRef = useRef<HTMLDivElement>(null);
  const { width: boxWidth } = useElementSize(boxRef);
  const w = Math.max(280, boxWidth || 720);
  const len = w - PAD * 2;
  const X = (pos: number) => (mirrored ? w - PAD - pos * len : PAD + pos * len);
  const dragging = useRef(false);

  const openMidi = openMidiOf(string);
  const f0 = midiToHz(openMidi);
  const pressedHz = stoppedHz(f0, x);
  const pressed = pitchOf(pressedHz);
  const stop = nearestRatioStop(x, 0.0005);
  const harmonic = harmonicAt(x, 0.0005, 12);
  const touchedHz = harmonic ? f0 * harmonic.partial : null;
  const touched = touchedHz ? pitchOf(touchedHz) : null;
  const vibrating = 1 - x;

  const fromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * w;
    let pos = mirrored ? (w - PAD - px) / len : (px - PAD) / len;
    pos = Math.min(MAX_X, Math.max(0, pos));
    // Snap to a ratio or a node within a few px.
    for (const snap of SNAPS) {
      if (Math.abs(snap - pos) * len <= SNAP_PX) return snap;
    }
    return pos;
  };

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const towardBridge = mirrored ? 'ArrowLeft' : 'ArrowRight';
    const towardNut = mirrored ? 'ArrowRight' : 'ArrowLeft';
    let next: number | null = null;
    const jump = event.shiftKey || event.key.startsWith('Page');
    if (
      event.key === towardBridge ||
      event.key === 'ArrowUp' ||
      event.key === 'PageUp'
    ) {
      next = jump
        ? (SNAPS.find((s) => s > x + 1e-6) ?? MAX_X)
        : Math.min(MAX_X, x + STEP);
    } else if (
      event.key === towardNut ||
      event.key === 'ArrowDown' ||
      event.key === 'PageDown'
    ) {
      next = jump
        ? ([...SNAPS].reverse().find((s) => s < x - 1e-6) ?? 0)
        : Math.max(0, x - STEP);
    } else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = MAX_X;
    if (next === null) return;
    event.preventDefault();
    setX(next);
  };

  const fraction = stop
    ? `${stop.fraction[0]}/${stop.fraction[1]}`
    : `${(vibrating * 100).toFixed(1)}%`;

  // Ratio labels where they fit (a phone keeps only the ticks for some).
  const labelled = useMemo(() => {
    const out: number[] = [];
    let last = -Infinity;
    for (const s of RATIO_STOPS) {
      const pos = ratioStopPosition(s);
      if (Math.abs(pos - last) * len >= 30) {
        out.push(pos);
        last = pos;
      }
    }
    return new Set(out);
  }, [len]);

  const xf = X(x);
  const xb = X(1);
  const amp = 16;

  return (
    <div data-harmonics-tab="ratios" className="flex flex-col gap-4">
      <StringPicker value={string} onChange={onStringChange} />
      <div
        ref={boxRef}
        className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-1 py-2"
      >
        <svg
          width="100%"
          viewBox={`0 0 ${w} ${HEIGHT}`}
          className="block touch-none select-none"
          data-ratio-string
          onPointerDown={(event) => {
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setX(fromPointer(event));
          }}
          onPointerMove={(event) => {
            if (dragging.current) setX(fromPointer(event));
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
        >
          {/* Ratio stops above: where the vibrating part is a simple fraction. */}
          <g aria-hidden>
            {RATIO_STOPS.map((s) => {
              const pos = ratioStopPosition(s);
              if (pos > MAX_X) return null;
              const at = stop === s;
              return (
                <g key={s.name}>
                  <line
                    x1={X(pos)}
                    x2={X(pos)}
                    y1={22}
                    y2={30}
                    stroke={at ? keyColor : 'rgba(255,255,255,0.3)'}
                  />
                  {labelled.has(pos) && (
                    <text
                      x={X(pos)}
                      y={16}
                      textAnchor="middle"
                      fontSize={12}
                      fill={at ? '#fff' : 'rgba(255,255,255,0.5)'}
                    >
                      {s.fraction[0]}/{s.fraction[1]}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Nut and bridge. */}
          <g aria-hidden>
            <line
              x1={X(0)}
              x2={X(0)}
              y1={STRING_Y - 14}
              y2={STRING_Y + 14}
              stroke="#d8d6cc"
              strokeWidth={3}
            />
            <line
              x1={xb}
              x2={xb}
              y1={STRING_Y - 14}
              y2={STRING_Y + 14}
              stroke="rgba(255,255,255,0.45)"
              strokeWidth={4}
            />
            {/* The silent part, nut to finger. */}
            <line
              x1={X(0)}
              x2={xf}
              y1={STRING_Y}
              y2={STRING_Y}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1.2}
            />
            {/* The vibrating part: its swing, out and back (dashed). */}
            <path
              data-vibrating
              d={`M ${xf} ${STRING_Y} Q ${(xf + xb) / 2} ${STRING_Y - amp * 2} ${xb} ${STRING_Y}`}
              fill="none"
              stroke={keyColor}
              strokeWidth={1.6}
            />
            <path
              d={`M ${xf} ${STRING_Y} Q ${(xf + xb) / 2} ${STRING_Y + amp * 2} ${xb} ${STRING_Y}`}
              fill="none"
              stroke={keyColor}
              strokeWidth={1.2}
              strokeDasharray="3 3"
              opacity={0.7}
            />
            {/* The nodes (partials 2–6), where a touch rings. */}
            {SNAP_NODES.filter((p) => p <= MAX_X).map((p) => (
              <circle
                key={p}
                cx={X(p)}
                cy={STRING_Y}
                r={2.2}
                fill="rgba(255,255,255,0.55)"
              />
            ))}
            {/* The frets it would have, to scale, for reference. */}
            {Array.from({ length: 24 }, (_, i) => i + 1).map((f) => (
              <g key={f}>
                <line
                  x1={X(positionOfFret(f))}
                  x2={X(positionOfFret(f))}
                  y1={STRING_Y + 44}
                  y2={STRING_Y + 50}
                  stroke="rgba(255,255,255,0.18)"
                />
                {[5, 7, 12, 19, 24].includes(f) && (
                  <text
                    x={X(positionOfFret(f))}
                    y={STRING_Y + 64}
                    textAnchor="middle"
                    fontSize={11}
                    fill="rgba(255,255,255,0.4)"
                  >
                    {f}
                  </text>
                )}
              </g>
            ))}
            <text
              x={X(0)}
              y={STRING_Y + 64}
              textAnchor={mirrored ? 'end' : 'start'}
              fontSize={11}
              fill="rgba(255,255,255,0.4)"
            >
              fret
            </text>
          </g>

          {/* The finger. */}
          <g
            role="slider"
            tabIndex={0}
            aria-label="Finger on the string"
            aria-valuemin={0}
            aria-valuemax={MAX_X * 100}
            aria-valuenow={Math.round(x * 1000) / 10}
            aria-valuetext={`${fraction} of the string vibrates: ${noteName(pressed.nearestMidi, openMidi)}`}
            onKeyDown={onKeyDown}
            className="cursor-grab outline-none active:cursor-grabbing [&:focus-visible>circle]:stroke-white [&:focus-visible>circle]:[stroke-width:3]"
          >
            <circle
              cx={xf}
              cy={STRING_Y}
              r={11}
              fill="#e8e8f0"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1}
            />
          </g>
        </svg>
      </div>

      <p className="text-sm leading-5 text-white/55">
        Drag the finger along the string (or use the arrow keys; Shift jumps to
        the next ratio). <span className="text-[#e8e8f0]">{fraction}</span> of
        the {stringLetter(string)} string is vibrating
        {x > 0 ? ` (≈ fret ${fretAt(x).toFixed(1)})` : ''}.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <SoundCard
          name="Press"
          caption={
            x === 0
              ? 'The open string.'
              : 'Pressed down here, the part to the bridge sounds.'
          }
          note={noteName(pressed.nearestMidi, openMidi)}
          hz={pressedHz}
          cents={pressed.cents}
          interval={stop?.name}
          onPlay={() => onPress(pressedHz)}
          playLabel="Press"
        />
        <SoundCard
          name="Touch"
          caption={
            harmonic
              ? `Touched lightly here, the string rings partial ${harmonic.partial}: ${relation(harmonic.partial - harmonic.k)}.`
              : 'No harmonic here. Move to a node: ½, ⅓, ¼… of the string.'
          }
          note={touched ? noteName(touched.nearestMidi, openMidi) : null}
          hz={touchedHz}
          cents={touched?.cents ?? null}
          interval={harmonic ? `Partial ${harmonic.partial}` : undefined}
          onPlay={touchedHz ? () => onTouch(touchedHz) : undefined}
          playLabel="Touch"
          keyColor={keyColor}
        />
      </div>
    </div>
  );
}

function SoundCard({
  name,
  caption,
  note,
  hz,
  cents,
  interval,
  onPlay,
  playLabel,
  keyColor,
}: {
  name: string;
  caption: string;
  note: string | null;
  hz: number | null;
  cents: number | null;
  interval?: string;
  onPlay?: () => void;
  playLabel: string;
  keyColor?: string;
}) {
  return (
    <section
      data-sound-card={name.toLowerCase()}
      className="flex flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm leading-5 text-white/55">{name}</p>
          <p className="text-xl leading-7 text-[#e8e8f0]">
            {note ?? '—'}
            {interval && (
              <span className="ml-2 text-sm text-white/55">{interval}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onPlay}
          disabled={!onPlay}
          className={cn(
            'inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-white/60',
            onPlay
              ? 'bg-white text-[#101012] hover:opacity-90'
              : 'cursor-not-allowed border border-white/10 text-white/35',
          )}
          style={
            onPlay && keyColor
              ? { boxShadow: `0 0 0 2px ${keyColor}` }
              : undefined
          }
        >
          {playLabel}
        </button>
      </div>
      {hz != null && cents != null && (
        <p className="text-sm leading-5 text-[#e8e8f0]">
          <FixedDigits text={hz.toFixed(hz < 1000 ? 1 : 0)} /> Hz ·{' '}
          <FixedDigits text={`${formatCents(cents)} ¢`} />
        </p>
      )}
      <p className="text-xs leading-4 text-white/55">{caption}</p>
    </section>
  );
}
