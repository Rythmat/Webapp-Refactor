import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type MutableRefObject,
} from 'react';
import { cn } from '@/components/utilities';
import { gainAtPosition, positionOfGain } from './faderTaper';
import { formatDb, gainToDb } from './format';
import type { MeterSource } from './Meter';
import { FOCUS_RING, TYPE_CLASS } from './styles';

// ── The volume pill: a track's fader and its meter in one (Suno, 2026-10-21) ─
//
// A 172 × 26 bar, white/4, a rectangle with 3 px corners (owner, 2026-10-22),
// with the track's level drawn inside it, the left channel over the right
// with a hairline between them, in the track's colour (a pale tint rising
// to the colour, its leading edge feathered, and a faint trail where it just
// was),
// and the fader's thumb, a short bar, over it. The meter reads on the
// fader's own scale (faderTaper.ts), so a signal at the fader's level fills
// the pill to the thumb.
//
// A drag anywhere on it moves the volume by as much as the pointer moves (a
// click alone changes nothing); a double-click puts it back; the arrow keys
// step it (Shift for fine steps), Home and End go to the ends. While the
// pointer is over it, or a drag or a key changes it, the level shows in a
// chip under the thumb ('+0.00dB'). The meter is painted straight onto its
// bars from the meter bus, never through React: their width is never in
// their React style, so a re-render (a hover) can't wipe a steady level the
// bus has no new reading for.
//
// A signal the track has but you don't hear (a muted or solo-silenced
// track's, or a live input it isn't monitoring: owner, 2026-10-23) is drawn
// too, in grey, under the coloured level: its `ghosts`.
//
// Stood on end (orientation 'vertical', the Mix view's strips, 2026-10-21)
// it is the same pill turned a quarter: 26 px across and `length` tall, the
// left channel beside the right, the level rising from the bottom and the
// thumb a short bar across it; a drag up raises the volume.

const THUMB_W = 4;
/** The meter's inset from the pill's edge. */
const INSET = 2;
/** The feathered leading edge of a meter bar, in px. */
const FEATHER_PX = 13;
/** How fast a bar falls back (fraction of the travel per second). */
const FALL_PER_S = 1.6;
/** How long the trail holds a peak before it falls. */
const TRAIL_HOLD_MS = 400;

export interface VolumePillProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'color'> {
  /** What it sets, in full ('Volume of Bass'). */
  label: string;
  /** The gain (1 = unity). */
  value: number;
  onChange(gain: number): void;
  /** A drag starts: the gesture the change belongs to. */
  onBegin?(): void;
  /** The drag ends. */
  onEnd?(): void;
  /** The gain a double-click puts back. */
  resetValue: number;
  /** The level to draw; two channels, left then right. */
  meter?: MeterSource | null;
  /** Signals it has but doesn't play, drawn grey under the meter. */
  ghosts?: readonly MeterSource[];
  /** The track's colour, for the meter. */
  color: string;
  /** Its length when horizontal. */
  width?: number;
  orientation?: 'horizontal' | 'vertical';
  /** Its length when vertical. */
  length?: number;
  /** The level's chip by the thumb while it moves; off where a readout shows it. */
  showChip?: boolean;
  /**
   * Where a horizontal pill's chip shows: under the thumb by default, over
   * it where nothing is below (Master, at the window's foot, 2026-10-22).
   */
  chipSide?: 'below' | 'above';
  /** Muted: the meter and thumb dim. */
  dimmed?: boolean;
  /** Someone else's for now: it shows the level and can't be moved. */
  disabled?: boolean;
}

/** The grey of a level that isn't heard: a pale grey rising to the quiet text grey. */
const GHOST_FROM = 'color-mix(in srgb, var(--daw-text-3) 45%, transparent)';
const GHOST_TO = 'var(--daw-text-3)';

const NO_GHOSTS: readonly MeterSource[] = [];

/**
 * Paints the loudest of `sources` onto a pair of bars and their trails, each
 * channel falling back at FALL_PER_S and its trail holding TRAIL_HOLD_MS.
 * `sources` must keep its identity while it means the same thing.
 */
function usePaintedLevel(
  sources: readonly MeterSource[],
  bars: MutableRefObject<(HTMLDivElement | null)[]>,
  trails: MutableRefObject<(HTMLDivElement | null)[]>,
  vertical: boolean,
) {
  useEffect(() => {
    const shown = [0, 0];
    const trail = [0, 0];
    const trailAt = [0, 0];
    // Each source's latest peak, per channel.
    const peaks = sources.map(() => [0, 0]);
    let last = 0;
    const size = vertical ? 'height' : 'width';
    const paint = () => {
      for (let ch = 0; ch < 2; ch++) {
        const bar = bars.current[ch];
        const tail = trails.current[ch];
        if (bar) bar.style[size] = `${shown[ch] * 100}%`;
        if (tail) tail.style[size] = `${trail[ch] * 100}%`;
      }
    };
    paint();
    const stops = sources.map((source, i) =>
      source.subscribe((levels) => {
        for (let ch = 0; ch < 2; ch++) {
          // A mono source fills both channels.
          peaks[i][ch] = levels.peak[ch] ?? levels.peak[0] ?? 0;
        }
        const now = performance.now();
        const dt = last ? (now - last) / 1000 : 0;
        last = now;
        for (let ch = 0; ch < 2; ch++) {
          let peak = 0;
          for (const p of peaks) peak = Math.max(peak, p[ch]);
          const at = positionOfGain(peak);
          shown[ch] =
            at >= shown[ch] ? at : Math.max(at, shown[ch] - FALL_PER_S * dt);
          if (at >= trail[ch]) {
            trail[ch] = at;
            trailAt[ch] = now;
          } else if (now - trailAt[ch] > TRAIL_HOLD_MS) {
            trail[ch] = Math.max(at, trail[ch] - FALL_PER_S * dt);
          }
        }
        paint();
      }),
    );
    return () => {
      for (const stop of stops) stop();
      shown.fill(0);
      trail.fill(0);
      paint();
    };
  }, [sources, bars, trails, vertical]);
}

/** The pill across its travel. */
const ACROSS = 26;

/** '+0.00dB', '−6.02dB', '−∞dB': the chip's words. */
export function pillDbText(gain: number): string {
  const db = gainToDb(gain);
  if (db === -Infinity) return formatDb(db, { unit: 'dB' }).replace(' ', '');
  const sign = db > 0.004 ? '+' : db < -0.004 ? '−' : '+';
  return `${sign}${Math.abs(db).toFixed(2)}dB`;
}

export function VolumePill({
  label,
  value,
  onChange,
  onBegin,
  onEnd,
  resetValue,
  meter = null,
  ghosts = NO_GHOSTS,
  color,
  width = 172,
  orientation = 'horizontal',
  length = 120,
  showChip = true,
  chipSide = 'below',
  dimmed = false,
  disabled = false,
  className,
  ...rest
}: VolumePillProps) {
  const vertical = orientation === 'vertical';
  const along = vertical ? length : width;
  const travel = along - INSET * 2;
  const position = positionOfGain(value);
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [keyed, setKeyed] = useState(false);
  const drag = useRef<{ at: number; position: number; id: number } | null>(
    null,
  );

  // ── The meter, painted from the bus ──
  const bars = useRef<(HTMLDivElement | null)[]>([]);
  const trails = useRef<(HTMLDivElement | null)[]>([]);
  const ghostBars = useRef<(HTMLDivElement | null)[]>([]);
  const ghostTrails = useRef<(HTMLDivElement | null)[]>([]);
  const heard = useMemo(() => (meter ? [meter] : NO_GHOSTS), [meter]);
  usePaintedLevel(heard, bars, trails, vertical);
  usePaintedLevel(ghosts, ghostBars, ghostTrails, vertical);

  // ── The fader ──
  const set = (p: number) => onChange(gainAtPosition(p));

  // Along the travel: right, or up.
  const pointerAt = (e: PointerEvent<HTMLDivElement>) =>
    vertical ? -e.clientY : e.clientX;
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { at: pointerAt(e), position, id: e.pointerId };
    setDragging(true);
    onBegin?.();
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    // Shift moves it a fifth as far, for the last fraction of a decibel.
    const scale = e.shiftKey ? 0.2 : 1;
    set(d.position + ((pointerAt(e) - d.at) / travel) * scale);
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    onEnd?.();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const step = e.shiftKey ? 0.002 : 0.01;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? position + step
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? position - step
          : e.key === 'PageUp'
            ? position + 0.1
            : e.key === 'PageDown'
              ? position - 0.1
              : e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? 1
                  : null;
    if (next === null) return;
    e.preventDefault();
    setKeyed(true);
    set(next);
  };

  const text = pillDbText(value);
  /** The thumb's near edge from the pill's start (left, or bottom). */
  const thumbAt = INSET + position * travel - THUMB_W / 2;
  const chip = showChip && !disabled && (hover || dragging || keyed);
  const toward = vertical ? 'to top' : 'to right';
  const fill = `linear-gradient(${toward}, color-mix(in srgb, ${color} 38%, var(--daw-text)), ${color})`;
  const feather = `linear-gradient(${toward}, black calc(100% - ${FEATHER_PX}px), transparent)`;

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Math.round(position * 1000) / 1000}
      aria-valuetext={text}
      aria-disabled={disabled || undefined}
      data-volume-pill
      className={cn(
        'relative shrink-0 touch-none select-none rounded-[var(--daw-radius-xs)] bg-daw-surface-2 outline-none',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : vertical
            ? 'cursor-ns-resize'
            : 'cursor-ew-resize',
        FOCUS_RING,
        className,
      )}
      style={
        vertical ? { width: ACROSS, height: length } : { width, height: ACROSS }
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onBlur={() => setKeyed(false)}
      onKeyDown={onKeyDown}
      onDoubleClick={disabled ? undefined : () => onChange(resetValue)}
      {...rest}
    >
      <div
        aria-hidden
        data-testid="volume-pill-meter"
        className={cn(
          'absolute flex overflow-hidden rounded-[1px]',
          vertical ? 'flex-row' : 'flex-col',
          dimmed && 'opacity-40',
        )}
        style={{ inset: INSET }}
      >
        {[0, 1].map((ch) => (
          <Fragment key={ch}>
            {ch === 1 ? (
              // The thin line between the left channel and the right.
              <div
                data-testid="volume-pill-divider"
                className={cn(
                  'shrink-0 bg-daw-hairline',
                  vertical ? 'w-px' : 'h-px',
                )}
              />
            ) : null}
            <div className="relative min-h-0 min-w-0 flex-1">
              {/* The grey level of what isn't heard, under the colour. */}
              <div
                ref={(el) => {
                  ghostTrails.current[ch] = el;
                }}
                className={cn(
                  'absolute',
                  vertical ? 'inset-x-0 bottom-0' : 'inset-y-0 left-0',
                )}
                style={{
                  backgroundImage: `linear-gradient(${toward}, color-mix(in srgb, ${GHOST_TO} 30%, transparent), transparent)`,
                }}
              />
              <div
                ref={(el) => {
                  ghostBars.current[ch] = el;
                }}
                data-ghost-channel={ch}
                className={cn(
                  'absolute',
                  vertical ? 'inset-x-0 bottom-0' : 'inset-y-0 left-0',
                )}
                style={{
                  backgroundImage: `linear-gradient(${toward}, ${GHOST_FROM}, ${GHOST_TO})`,
                  maskImage: feather,
                  WebkitMaskImage: feather,
                }}
              />
              <div
                ref={(el) => {
                  trails.current[ch] = el;
                }}
                className={cn(
                  'absolute',
                  vertical ? 'inset-x-0 bottom-0' : 'inset-y-0 left-0',
                )}
                style={{
                  backgroundImage: `linear-gradient(${toward}, color-mix(in srgb, ${color} 32%, transparent), transparent)`,
                }}
              />
              <div
                ref={(el) => {
                  bars.current[ch] = el;
                }}
                data-meter-channel={ch}
                className={cn(
                  'absolute',
                  vertical ? 'inset-x-0 bottom-0' : 'inset-y-0 left-0',
                )}
                style={{
                  backgroundImage: fill,
                  maskImage: feather,
                  WebkitMaskImage: feather,
                }}
              />
            </div>
          </Fragment>
        ))}
      </div>
      <div
        aria-hidden
        data-testid="volume-pill-thumb"
        className={cn(
          'pointer-events-none absolute rounded-[1px] bg-daw-text-2',
          vertical ? 'left-[7px] w-3' : 'top-[7px] h-3',
          dimmed && 'opacity-60',
        )}
        style={
          vertical
            ? { bottom: thumbAt, height: THUMB_W }
            : { left: thumbAt, width: THUMB_W }
        }
      />
      {chip ? (
        <span
          aria-hidden
          data-testid="volume-pill-value"
          className={cn(
            TYPE_CLASS.label,
            'pointer-events-none absolute z-[var(--daw-z-tooltip)] whitespace-nowrap rounded-[var(--daw-radius-sm)] bg-daw-menu px-1.5 tabular-nums text-daw-text-2',
            vertical
              ? 'left-full ml-1.5 translate-y-1/2'
              : chipSide === 'above'
                ? 'bottom-full mb-1.5 -translate-x-1/2'
                : 'top-full mt-1.5 -translate-x-1/2',
          )}
          style={
            vertical
              ? { bottom: thumbAt + THUMB_W / 2 }
              : { left: thumbAt + THUMB_W / 2 }
          }
        >
          {text}
        </span>
      ) : null}
    </div>
  );
}
