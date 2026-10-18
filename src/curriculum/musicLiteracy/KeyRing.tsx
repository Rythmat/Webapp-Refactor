import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/components/utilities';

// ── The big circle of fifths, to choose from ───────────────────────────────
// Part 2's choose steps draw the circle large: twelve slices in the key
// colors, C at the top and clockwise by fifths, each named on the slice
// itself. A slice that can be picked is a button (or a radio, for the key);
// the chosen one stands out of the ring, outlined in white. The middle holds
// whatever the step says there. The small circle the lesson's call panel
// shows (CircleOfFifthsSvg) stays as it is.

export interface RingSlice {
  /** Stable id: the tonic, or the chord's degree. */
  id: string;
  /** 0–11 clockwise from the top: C, G, D, A… */
  position: number;
  color: string;
  /** On the slice: "E♭", "4". */
  label: string;
  /** Under it, smaller: "maj7". */
  sub?: string;
  /** For assistive tech: "E♭ major". */
  ariaLabel: string;
  /** It can be picked. */
  enabled: boolean;
  selected?: boolean;
  /** Not in play here: drawn faint (a palette's other keys). */
  dim?: boolean;
}

export interface KeyRingProps {
  slices: readonly RingSlice[];
  size: number;
  onPick: (slice: RingSlice) => void;
  /** 'radio': one choice (the key); 'button': each tap does something. */
  role: 'radio' | 'button';
  ariaLabel: string;
  /** What the middle says. */
  center?: ReactNode;
}

const OUTER = 0.47;
const INNER = 0.27;
/** How far the chosen slice stands out, as a share of the size. */
const LIFT = 0.025;
const SLICE = (2 * Math.PI) / 12;
const START = -Math.PI / 2 - SLICE / 2;

function arc(size: number, r1: number, r2: number, a1: number, a2: number) {
  const c = size / 2;
  const p = (r: number, a: number) =>
    `${c + r * Math.cos(a)} ${c + r * Math.sin(a)}`;
  return [
    `M ${p(r2, a1)}`,
    `A ${r2} ${r2} 0 0 1 ${p(r2, a2)}`,
    `L ${p(r1, a2)}`,
    `A ${r1} ${r1} 0 0 0 ${p(r1, a1)}`,
    'Z',
  ].join(' ');
}

/** Dark letters on a light slice, white on a dark one. */
export function inkOn(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  if (!Number.isFinite(n)) return '#101012';
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255);
  return luminance > 0.28 ? '#101012' : '#ffffff';
}

export function KeyRing({
  slices,
  size,
  onPick,
  role,
  ariaLabel,
  center,
}: KeyRingProps) {
  const refs = useRef<(SVGGElement | null)[]>([]);
  const enabled = slices.filter((s) => s.enabled);
  const outer = OUTER * size;
  const inner = INNER * size;
  const mid = (outer + inner) / 2;
  const labelSize = Math.max(13, size * 0.058);
  const subSize = Math.max(10, size * 0.034);

  // Arrow keys walk the slices that can be picked, round the ring.
  const onKeyDown = (event: KeyboardEvent, slice: RingSlice) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPick(slice);
      return;
    }
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step || enabled.length === 0) return;
    event.preventDefault();
    const order = [...enabled].sort((a, b) => a.position - b.position);
    const at = order.findIndex((s) => s.id === slice.id);
    const next = order[(at + step + order.length) % order.length];
    refs.current[slices.indexOf(next)]?.focus();
    if (role === 'radio') onPick(next);
  };

  const focusable =
    enabled.find((s) => s.selected) ?? enabled[0] ?? (null as RingSlice | null);

  return (
    <div
      data-literacy-ring
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role={role === 'radio' ? 'radiogroup' : 'group'}
        aria-label={ariaLabel}
        className="select-none overflow-visible"
      >
        {slices.map((slice, i) => {
          const a1 = START + slice.position * SLICE;
          const a2 = a1 + SLICE;
          const middle = a1 + SLICE / 2;
          const lift = slice.selected ? LIFT * size : 0;
          const dx = Math.cos(middle) * lift;
          const dy = Math.sin(middle) * lift;
          const lx = size / 2 + mid * Math.cos(middle);
          const ly = size / 2 + mid * Math.sin(middle);
          const ink = inkOn(slice.color);
          const interactive = slice.enabled;
          return (
            <g
              key={slice.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-ring-slice={slice.id}
              data-selected={slice.selected || undefined}
              data-enabled={interactive || undefined}
              {...(interactive
                ? {
                    role,
                    'aria-label': slice.ariaLabel,
                    ...(role === 'radio'
                      ? { 'aria-checked': !!slice.selected }
                      : {}),
                    tabIndex: focusable?.id === slice.id ? 0 : -1,
                    onClick: () => onPick(slice),
                    onKeyDown: (event: KeyboardEvent) =>
                      onKeyDown(event, slice),
                  }
                : { 'aria-hidden': true })}
              className={cn(
                'outline-none transition-transform duration-200 ease-out',
                interactive &&
                  'group cursor-pointer [&:focus-visible_path]:stroke-white',
              )}
              style={{ transform: `translate(${dx}px, ${dy}px)` }}
            >
              <path
                d={arc(size, inner, outer, a1, a2)}
                fill={slice.color}
                stroke={slice.selected ? '#ffffff' : 'rgba(16,16,18,0.55)'}
                strokeWidth={slice.selected ? 3 : 1.5}
                opacity={slice.dim ? 0.22 : slice.selected ? 1 : 0.86}
                className={cn(
                  'transition-opacity duration-150',
                  interactive && !slice.selected && 'group-hover:opacity-100',
                )}
              />
              <text
                x={lx}
                y={slice.sub ? ly - subSize * 0.55 : ly}
                textAnchor="middle"
                dominantBaseline="central"
                fill={slice.dim ? 'rgba(255,255,255,0.45)' : ink}
                fontSize={labelSize}
                fontWeight={slice.selected ? 700 : 600}
                className="pointer-events-none"
              >
                {slice.label}
              </text>
              {slice.sub && (
                <text
                  x={lx}
                  y={ly + labelSize * 0.55}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={slice.dim ? 'rgba(255,255,255,0.4)' : ink}
                  fontSize={subSize}
                  fontWeight={500}
                  opacity={0.85}
                  className="pointer-events-none"
                >
                  {slice.sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {center && (
        <div
          data-literacy-ring-center
          className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-[#101012] text-center"
          style={{ width: inner * 1.84, height: inner * 1.84 }}
        >
          {center}
        </div>
      )}
    </div>
  );
}

/** A tonic's slice on the ring: C at 0, then clockwise by fifths. */
export const ringPosition = (pitchClass: number): number =>
  (((pitchClass * 7) % 12) + 12) % 12;
