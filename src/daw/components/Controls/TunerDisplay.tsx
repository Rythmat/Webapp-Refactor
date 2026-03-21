/* eslint-disable tailwindcss/classnames-order */
/* eslint-disable tailwindcss/enforces-shorthand */
/* eslint-disable sonarjs/cognitive-complexity */
import { memo, type ReactNode, useCallback, useMemo } from 'react';
import { useTuner } from '@/daw/hooks/useTuner';
import { useStore } from '@/daw/store';

// ── Constants ────────────────────────────────────────────────────────────

const IN_TUNE_THRESHOLD = 5; // cents
const GREEN = '#22c55e';
const YELLOW = '#eab308';
const RED = '#ef4444';

// Phase 8: Standard tuning string references
const GUITAR_STRINGS = [
  { note: 'E', octave: 2, freq: 82.41 },
  { note: 'A', octave: 2, freq: 110.0 },
  { note: 'D', octave: 3, freq: 146.83 },
  { note: 'G', octave: 3, freq: 196.0 },
  { note: 'B', octave: 3, freq: 246.94 },
  { note: 'E', octave: 4, freq: 329.63 },
];

const BASS_STRINGS = [
  { note: 'B', octave: 0, freq: 30.87 },
  { note: 'E', octave: 1, freq: 41.2 },
  { note: 'A', octave: 1, freq: 55.0 },
  { note: 'D', octave: 2, freq: 73.42 },
  { note: 'G', octave: 2, freq: 98.0 },
];

// ── LED Bar (SVG) ────────────────────────────────────────────────────────

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

// ── String Indicator Row (Phase 8) ───────────────────────────────────────

function StringIndicator({
  strings,
  currentNote,
  currentOctave,
  hasNote,
}: {
  strings: typeof GUITAR_STRINGS;
  currentNote: string;
  currentOctave: number;
  hasNote: boolean;
}) {
  const closestIdx = useMemo(() => {
    if (!hasNote) return -1;
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < strings.length; i++) {
      const s = strings[i];
      const dist =
        Math.abs(s.octave - currentOctave) * 12 +
        Math.abs(noteToSemitone(s.note) - noteToSemitone(currentNote));
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return bestDist <= 3 ? best : -1;
  }, [hasNote, strings, currentNote, currentOctave]);

  return (
    <div className="flex justify-center gap-1.5">
      {strings.map((s, i) => {
        const isActive = i === closestIdx;
        return (
          <span
            key={`${s.note}${s.octave}`}
            className="text-[9px] font-mono font-semibold px-1 py-0.5 rounded"
            style={{
              color: isActive ? GREEN : 'var(--color-text-dim)',
              backgroundColor: isActive ? `${GREEN}15` : 'transparent',
            }}
          >
            {s.note}
            {s.octave}
          </span>
        );
      })}
    </div>
  );
}

function noteToSemitone(note: string): number {
  const map: Record<string, number> = {
    C: 0,
    'C#': 1,
    D: 2,
    'D#': 3,
    E: 4,
    F: 5,
    'F#': 6,
    G: 7,
    'G#': 8,
    A: 9,
    'A#': 10,
    B: 11,
  };
  return map[note] ?? 0;
}

// ── Main Component ───────────────────────────────────────────────────────

interface TunerDisplayProps {
  deviceId: string | null;
  instrumentType?: 'guitar' | 'bass';
  onActiveChange?: (active: boolean) => void;
  /** Optional AnalyserNode from the DAW audio graph. When provided, reuses the
   *  existing AudioContext instead of creating a separate one. */
  externalAnalyser?: AnalyserNode | null;
}

export const TunerDisplay = memo(function TunerDisplay({
  deviceId,
  instrumentType = 'guitar',
  onActiveChange,
  externalAnalyser,
}: TunerDisplayProps) {
  const { active, note, octave, cents, frequency, error, start, stop } =
    useTuner(deviceId, externalAnalyser);

  // Global tuning offset from chord detector via MusicIntelligenceBus
  const globalTuningCents = useStore((s) => s.globalTuningCents);

  const hasNote = active && note !== '';
  const inTune = hasNote && Math.abs(cents) < IN_TUNE_THRESHOLD;
  const color = !hasNote ? 'var(--color-surface-3)' : inTune ? GREEN : YELLOW;

  const strings = instrumentType === 'bass' ? BASS_STRINGS : GUITAR_STRINGS;

  // Phase 10: error state overrides normal status
  const statusText = error
    ? error
    : !active
      ? 'Off'
      : !hasNote
        ? 'Listening'
        : inTune
          ? 'Perfect'
          : cents < 0
            ? 'Low'
            : 'High';

  const statusColor = error
    ? RED
    : !active
      ? 'var(--color-text-dim)'
      : hasNote
        ? color
        : 'var(--color-text-dim)';

  // Phase 9: cents display text
  const centsText = !hasNote
    ? ''
    : cents === 0
      ? '0\u00A2'
      : cents > 0
        ? `+${cents}\u00A2`
        : `${cents}\u00A2`;

  const handleToggle = useCallback(() => {
    if (active) {
      stop();
      onActiveChange?.(false);
    } else {
      start();
      onActiveChange?.(true);
    }
  }, [active, start, stop, onActiveChange]);

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

      {/* Note display — Phase 7: shows octave */}
      <div className="flex flex-col items-center gap-0.5">
        <div
          className="font-bold leading-none tracking-tight"
          style={{
            color: hasNote ? color : 'var(--color-surface-3)',
            textShadow: hasNote
              ? `0 0 12px ${inTune ? GREEN : YELLOW}40`
              : 'none',
          }}
        >
          {hasNote ? (
            <>
              <span className="text-[18px]">{note}</span>
              <span className="text-[12px] opacity-70">{octave}</span>
            </>
          ) : (
            <span className="text-[18px]">&mdash;</span>
          )}
        </div>

        <span
          className="text-[10px] font-medium"
          style={{ color: statusColor }}
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

      {/* Phase 9: Cents offset + frequency readout */}
      <div className="flex items-center justify-center gap-2 pb-0.5">
        {hasNote && (
          <span
            className="text-[10px] font-mono font-semibold"
            style={{ color: inTune ? GREEN : YELLOW }}
          >
            {centsText}
          </span>
        )}
        <span
          className="text-[10px] font-mono"
          style={{ color: hasNote ? 'var(--color-text-dim)' : 'transparent' }}
        >
          {hasNote && frequency > 0 ? `${frequency} Hz` : '\u00A0'}
        </span>
      </div>

      {/* Global tuning reference from chord detector */}
      {active && Math.abs(globalTuningCents) >= 2 && (
        <div className="text-center">
          <span
            className="text-[9px] font-mono"
            style={{ color: 'var(--color-text-dim)' }}
          >
            A4 ≈ {Math.round(440 * Math.pow(2, globalTuningCents / 1200))} Hz (
            {globalTuningCents > 0 ? '+' : ''}
            {Math.round(globalTuningCents)}¢)
          </span>
        </div>
      )}

      {/* Phase 8: String reference indicators */}
      {active && (
        <StringIndicator
          strings={strings}
          currentNote={note}
          currentOctave={octave}
          hasNote={hasNote}
        />
      )}
    </div>
  );
});
