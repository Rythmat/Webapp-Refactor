import { useRef, type ReactNode } from 'react';
import { OUTLINE_PILL, WHITE_PILL } from '@/components/kit/pills';
import { cn } from '@/components/utilities';
import { useLabCanvas } from '../../lab/useLabCanvas';
import type { MeterPoint } from '../../mix/mixEngine';
import { dbToGain, gainToDb, nextMeter } from '../../mix/mixMath';
import type { Mix } from '../../mix/useMixEngine';

const METER_FLOOR = -60;
const METER_TOP = 3;
/** The analyser's window, and a fader's ramp settling. */
const SETTLE_SECONDS = 0.12;

/** The markings beside a meter. */
const TICKS = [0, -6, -12, -24, -48];

const position = (db: number) =>
  Math.max(0, Math.min(1, (db - METER_FLOOR) / (METER_TOP - METER_FLOOR)));

export const formatDb = (db: number) => {
  if (!Number.isFinite(db)) return '−∞';
  const rounded = Math.round(db * 10) / 10;
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(1)}`;
};

/** The marks beside a fader, on the same scale as its travel. */
const FADER_MARKS = [6, 0, -6, -12, -24, -48];

/**
 * A peak meter from the real signal at one point on the desk: green, then amber
 * near the top, then a red light once it's gone over. Its number is the highest
 * peak since anything changed, as a DAW's is, so it settles on the truth within a
 * pass of the loop. Moving this meter's own fader moves the number with it, since
 * that's only arithmetic; anything else that feeds it starts it again.
 */
export function useHeldPeak({
  mix,
  point,
  trackDb = 0,
  resetKey = '',
}: {
  mix: Mix;
  point: MeterPoint;
  /** What's turning this meter's signal up or down. */
  trackDb?: number;
  /** Changes when something else that feeds this meter does. */
  resetKey?: string;
}) {
  const level = useRef(0);
  const held = useRef(0);
  const over = useRef(false);
  const mixRef = useRef(mix);
  mixRef.current = mix;
  const pointRef = useRef(point);
  pointRef.current = point;

  /** Seconds to ignore what the analyser's still holding from before a change. */
  const settling = useRef(0);
  const lastTrack = useRef(trackDb);
  if (lastTrack.current !== trackDb) {
    held.current *= dbToGain(trackDb - lastTrack.current);
    over.current = false;
    settling.current = SETTLE_SECONDS;
    lastTrack.current = trackDb;
  }
  const lastReset = useRef(resetKey);
  if (lastReset.current !== resetKey) {
    held.current = 0;
    over.current = false;
    settling.current = SETTLE_SECONDS;
    lastReset.current = resetKey;
  }

  /** One frame's reading. */
  return (seconds: number) => {
    const playing = mixRef.current.playing;
    const peak = mixRef.current.peak(pointRef.current);
    level.current = nextMeter(level.current, peak, seconds);
    if (!playing) {
      held.current = 0;
      over.current = false;
    }
    settling.current = Math.max(0, settling.current - seconds);
    if (settling.current === 0) {
      if (peak > 1) over.current = true;
      held.current = Math.max(held.current, peak);
    }
    return {
      playing,
      levelDb: gainToDb(level.current),
      heldDb: gainToDb(held.current),
      held: held.current,
      over: over.current,
    };
  };
}

export function PeakMeter(props: {
  mix: Mix;
  point: MeterPoint;
  trackDb?: number;
  resetKey?: string;
}) {
  const read = useHeldPeak(props);
  const last = useRef(0);

  const { canvasRef } = useLabCanvas(
    ({ ctx, width, height: h, time }) => {
      const seconds = Math.max(0, time - last.current);
      last.current = time;
      const { playing, levelDb: db, heldDb, held, over } = read(seconds);
      const light = 8;
      const top = light + 3;
      const tall = h - top;
      const yAt = (db: number) => top + (1 - position(db)) * tall;
      const barWidth = width;

      ctx.fillStyle = 'rgb(255 255 255 / 0.07)';
      ctx.fillRect(0, top, barWidth, tall);
      if (db > METER_FLOOR) {
        const zones: readonly [number, number, string][] = [
          [METER_FLOOR, -12, '#34d399'],
          [-12, -3, '#6ee7b7'],
          [-3, 0, '#f59e0b'],
          [0, METER_TOP, '#ef4444'],
        ];
        for (const [low, high, color] of zones) {
          if (db <= low) continue;
          const from = yAt(Math.min(db, high));
          ctx.fillStyle = color;
          ctx.fillRect(0, from, barWidth, yAt(low) - from);
        }
      }
      if (heldDb > METER_FLOOR) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, Math.round(yAt(heldDb)), barWidth, 1);
      }
      ctx.fillStyle = '#101012';
      for (const tick of TICKS)
        ctx.fillRect(0, Math.round(yAt(tick)), barWidth, 1);

      ctx.fillStyle = over ? '#ef4444' : 'rgb(255 255 255 / 0.12)';
      ctx.fillRect(0, 0, barWidth, light);

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.dataset.meterDb = Number.isFinite(heldDb)
          ? heldDb.toFixed(2)
          : '-inf';
        canvas.dataset.over = String(over);
        const label =
          canvas.parentElement?.querySelector<HTMLElement>(
            '[data-meter-value]',
          );
        if (label) {
          label.textContent = playing && held > 1e-4 ? formatDb(heldDb) : '—';
        }
      }
    },
    { live: true },
  );

  return (
    <div className="flex h-full w-9 flex-col items-center gap-1">
      <canvas ref={canvasRef} className="w-2.5 flex-1 rounded-sm" aria-hidden />
      <span
        data-meter-value
        aria-hidden
        className="text-xs font-bold tabular-nums text-white/80"
      >
        —
      </span>
    </div>
  );
}

/** A fader beside its meter, with the marks a real one has. */
export function ChannelStrip({
  label,
  db,
  min = -48,
  max = 6,
  disabled,
  dim,
  point,
  resetKey,
  mix,
  accent,
  onChange,
}: {
  label: string;
  db: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  dim?: boolean;
  point: MeterPoint;
  resetKey?: string;
  mix: Mix;
  accent: string;
  onChange: (db: number) => void;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl px-1 py-2 transition-opacity sm:max-w-[8.5rem]',
        dim && 'opacity-45',
        !disabled && 'bg-white/[0.04]',
      )}
      data-channel={label}
    >
      <span
        className="truncate text-[0.8125rem] font-bold text-white"
        style={!disabled ? { color: accent } : undefined}
      >
        {label}
      </span>
      <div className="flex h-[clamp(9rem,26vh,14rem)] items-stretch">
        <div aria-hidden className="relative hidden w-5 sm:block">
          {FADER_MARKS.filter((mark) => mark >= min && mark <= max).map(
            (mark) => (
              <span
                key={mark}
                className="absolute right-0 -translate-y-1/2 text-[0.6875rem] tabular-nums text-white/45"
                style={{
                  // The cap's centre stops half a cap short of each end.
                  top: `calc(0.5rem + (100% - 1rem) * ${(max - mark) / (max - min)})`,
                }}
              >
                {mark > 0 ? `+${mark}` : mark < 0 ? `−${-mark}` : '0'}
              </span>
            ),
          )}
        </div>
        <input
          type="range"
          className="lesson-fader"
          aria-label={`${label} fader`}
          aria-valuetext={`${formatDb(db)} decibels`}
          min={min}
          max={max}
          step={0.5}
          value={db}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <PeakMeter mix={mix} point={point} trackDb={db} resetKey={resetKey} />
      </div>
      <span className="text-[0.875rem] font-bold tabular-nums text-white">
        {formatDb(db)}
        <span className="ml-0.5 text-[0.6875rem] font-normal text-white/55">
          dB
        </span>
      </span>
    </div>
  );
}

/** Something to switch on and off on the stage. */
export function Toggle({
  on,
  disabled,
  onChange,
  children,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        on ? WHITE_PILL : OUTLINE_PILL,
        'h-10 px-5 text-[0.875rem]',
      )}
    >
      {children}
    </button>
  );
}
