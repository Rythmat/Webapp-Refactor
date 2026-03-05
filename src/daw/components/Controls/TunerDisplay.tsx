/* eslint-disable tailwindcss/classnames-order */
/* eslint-disable tailwindcss/enforces-shorthand */
/* eslint-disable sonarjs/cognitive-complexity */
import { memo, type ReactNode, useCallback } from 'react';
import { useTuner } from '@/daw/hooks/useTuner';

// ── Constants ────────────────────────────────────────────────────────────

const IN_TUNE_THRESHOLD = 5; // cents
const GREEN = '#22c55e';
const YELLOW = '#eab308';

// ── LED Bar (SVG) ────────────────────────────────────────────────────────
// Dense tick marks with varying heights + a movable colored needle.

function LedBar({
  cents,
  hasNote,
  color,
}: {
  cents: number;
  hasNote: boolean;
  color: string;
}) {
  const w = 196;
  const h = 36;
  const pad = 6;
  const barLeft = pad;
  const barRight = w - pad;
  const barW = barRight - barLeft;
  const cx = w / 2;
  const halfRange = barW / 2;

  const TICK_COUNT = 41;
  const midIdx = (TICK_COUNT - 1) / 2;
  const ticks: ReactNode[] = [];

  for (let i = 0; i < TICK_COUNT; i++) {
    const x = barLeft + (i / (TICK_COUNT - 1)) * barW;
    const distFromCenter = Math.abs(i - midIdx) / midIdx;
    const envelope =
      0.4 +
      0.6 *
        (Math.pow(distFromCenter, 0.8) * 0.5 +
          Math.pow(1 - distFromCenter, 2) * 0.5);
    const tickH = 6 + envelope * 14;
    const midY = h / 2;

    ticks.push(
      <line
        key={i}
        x1={x}
        y1={midY - tickH / 2}
        x2={x}
        y2={midY + tickH / 2}
        stroke="var(--color-surface-3)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />,
    );
  }

  const needleX = hasNote ? cx + (cents / 50) * halfRange : cx;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="block mx-auto"
    >
      {ticks}
      {hasNote && (
        <>
          <line
            x1={needleX}
            y1={3}
            x2={needleX}
            y2={h - 6}
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <polygon
            points={`${needleX},${h - 2} ${needleX - 3},${h - 6} ${needleX},${h - 4} ${needleX + 3},${h - 6}`}
            fill={color}
          />
        </>
      )}
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

interface TunerDisplayProps {
  deviceId: string | null;
}

export const TunerDisplay = memo(function TunerDisplay({
  deviceId,
}: TunerDisplayProps) {
  const { active, note, cents, frequency, start, stop } = useTuner(deviceId);

  const hasNote = active && note !== '';
  const inTune = hasNote && Math.abs(cents) < IN_TUNE_THRESHOLD;
  const color = !hasNote ? 'var(--color-surface-3)' : inTune ? GREEN : YELLOW;

  const statusText = !active
    ? 'Off'
    : !hasNote
      ? 'Listening'
      : inTune
        ? 'Perfect'
        : cents < 0
          ? 'Low'
          : 'High';

  const handleToggle = useCallback(() => {
    if (active) stop();
    else start();
  }, [active, start, stop]);

  return (
    <div
      className="flex flex-col select-none border-t pt-3 gap-1"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* Header: label + toggle */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Tuner
        </span>
        <button
          onClick={handleToggle}
          className="w-7 h-3.5 rounded-full flex items-center px-0.5 cursor-pointer shrink-0"
          style={{
            backgroundColor: active
              ? 'var(--color-accent)'
              : 'var(--color-surface-3)',
            border: 'none',
          }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full transition-transform"
            style={{
              backgroundColor: 'var(--color-text)',
              transform: active ? 'translateX(12px)' : 'translateX(0)',
            }}
          />
        </button>
      </div>

      {/* Note display */}
      <div className="flex flex-col items-center gap-0.5">
        <div
          className="text-[18px] font-bold leading-none tracking-tight"
          style={{
            color: hasNote ? color : 'var(--color-surface-3)',
            textShadow: hasNote
              ? `0 0 12px ${inTune ? GREEN : YELLOW}40`
              : 'none',
          }}
        >
          {hasNote ? note : '—'}
        </div>

        <span
          className="text-[10px] font-medium"
          style={{
            color: !active
              ? 'var(--color-text-dim)'
              : hasNote
                ? color
                : 'var(--color-text-dim)',
          }}
        >
          {statusText}
        </span>
      </div>

      {/* LED bar */}
      <LedBar
        cents={cents}
        hasNote={hasNote}
        color={hasNote ? (inTune ? GREEN : YELLOW) : 'var(--color-surface-3)'}
      />

      {/* Frequency readout */}
      <div className="text-center pb-0.5">
        <span
          className="text-[10px] font-mono"
          style={{ color: hasNote ? 'var(--color-text-dim)' : 'transparent' }}
        >
          {hasNote && frequency > 0 ? `${frequency} Hz` : '\u00A0'}
        </span>
      </div>
    </div>
  );
});
