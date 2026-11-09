import { Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/components/utilities';
import { ECHO_TEMPO_STEP } from '@/curriculum/engine/echo';
import './echoGame.css';

// ── The game's running numbers ─────────────────────────────────────────────
// Always in view while Echo is played: the streak (good echoes in a row, a
// flame that pops as it grows and shakes when it goes out), the round pips
// (each echo so far, good or missed, and the one being played), and the
// speed meter (the tempo now, a needle climbing from the level's tempo to
// its top, a "+4" floating up as it rises).

/** The value it had the last render it changed: for "it just went up". */
function usePrevious<T>(value: T): T | undefined {
  const [state, setState] = useState<{ now: T; before?: T }>({ now: value });
  if (state.now !== value) setState({ now: value, before: state.now });
  return state.before;
}

export function StreakBadge({
  streak,
  keyColor,
}: {
  streak: number;
  keyColor: string;
}) {
  const before = usePrevious(streak);
  const grew = before !== undefined && streak > before;
  const lost = before !== undefined && before > 0 && streak === 0;
  return (
    <div
      data-echo-streak={streak}
      aria-label={`Streak: ${streak}`}
      className="flex items-center gap-2"
    >
      <span
        // A change remounts it, so it pops or shakes again.
        key={`${streak}-${lost}`}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-full px-3 text-lg font-semibold tabular-nums',
          grew && 'echo-pop',
          lost && 'echo-shake',
        )}
        style={{
          backgroundColor:
            streak > 0
              ? `color-mix(in oklab, ${keyColor} 22%, transparent)`
              : 'rgba(255,255,255,0.06)',
          color: streak > 0 ? '#ffffff' : 'rgba(255,255,255,0.55)',
        }}
      >
        <Flame
          aria-hidden
          className="size-4"
          style={{
            color: streak > 0 ? keyColor : 'currentColor',
            fill: streak > 0 ? keyColor : 'transparent',
          }}
        />
        {streak}
      </span>
      <span className="text-xs uppercase tracking-[0.14em] text-white/45">
        Streak
      </span>
    </div>
  );
}

export function RoundPips({
  results,
  total,
  keyColor,
  label,
}: {
  /** Each echo so far: good or missed. */
  results: readonly boolean[];
  total: number;
  keyColor: string;
  /** "Round 3 of 8". */
  label: string;
}) {
  const now = results.length;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm tabular-nums text-white/60">{label}</span>
      <ol aria-label={label} className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const done = i < now;
          const good = done && results[i];
          return (
            <li
              key={i}
              data-echo-pip={
                done ? (good ? 'pass' : 'miss') : i === now ? 'now' : 'todo'
              }
              aria-label={
                done
                  ? good
                    ? 'Good echo'
                    : 'Missed'
                  : i === now
                    ? 'Now'
                    : 'To come'
              }
              className="size-2.5 rounded-full"
              style={{
                backgroundColor: good
                  ? keyColor
                  : done
                    ? 'transparent'
                    : i === now
                      ? 'rgba(255,255,255,0.75)'
                      : 'rgba(255,255,255,0.15)',
                boxShadow:
                  done && !good
                    ? 'inset 0 0 0 1.5px rgba(255,255,255,0.4)'
                    : undefined,
              }}
            />
          );
        })}
      </ol>
    </div>
  );
}

/** The arc's sweep, in degrees from the left: a half circle. */
const SWEEP = 180;

/** How long "Faster!" shows after the tempo rises. */
const RISE_MS = 1400;

export function SpeedMeter({
  bpm,
  low,
  high,
  keyColor,
}: {
  bpm: number;
  /** The level's tempo: the needle's rest. */
  low: number;
  /** The most it climbs to. */
  high: number;
  keyColor: string;
}) {
  const share = high > low ? (bpm - low) / (high - low) : 0;
  const steps = Math.round((high - low) / ECHO_TEMPO_STEP);
  // A rise says so for a moment.
  const [rise, setRise] = useState<number | null>(null);
  const before = usePrevious(bpm);
  useEffect(() => {
    if (before === undefined || bpm <= before) return;
    setRise(bpm - before);
    const timer = setTimeout(() => setRise(null), RISE_MS);
    return () => clearTimeout(timer);
  }, [bpm, before]);
  // The needle's tip, on the arc: -90° (left) to 90° (right).
  const angle = -90 + share * SWEEP;
  const point = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: 32 + r * Math.cos(rad), y: 34 + r * Math.sin(rad) };
  };
  return (
    <div
      data-echo-speed={bpm}
      aria-label={`Speed: ${bpm} BPM`}
      className="relative flex items-center gap-2"
    >
      <svg width="64" height="40" viewBox="0 0 64 40" aria-hidden>
        {Array.from({ length: steps + 1 }, (_, i) => {
          const deg = -90 + (i / Math.max(1, steps)) * SWEEP;
          const a = point(deg, 22);
          const b = point(deg, 29);
          const on = i / Math.max(1, steps) <= share + 1e-6;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke={on ? keyColor : 'rgba(255,255,255,0.18)'}
            />
          );
        })}
        <line
          x1="32"
          y1="34"
          x2={point(angle, 18).x}
          y2={point(angle, 18).y}
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: 'all 500ms cubic-bezier(0.2, 0.9, 0.3, 1.4)' }}
        />
        <circle cx="32" cy="34" r="3.5" fill="#ffffff" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-semibold tabular-nums text-[#e8e8f0]">
          {bpm}
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-white/45">
          BPM
        </span>
      </span>
      {rise !== null && (
        <span
          key={`up-${bpm}`}
          aria-hidden
          data-echo-faster
          className="echo-float-up pointer-events-none absolute -top-4 left-6 whitespace-nowrap text-sm font-semibold"
          style={{ color: keyColor }}
        >
          Faster! +{rise}
        </span>
      )}
    </div>
  );
}
