import type { PitchInfo } from '@/daw/audio/pitch-correction/PitchCorrectionNode';

// ── Helpers ─────────────────────────────────────────────────────────────────

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

function hzToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

function midiToNoteName(midi: number): string {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

// ── PitchMeter ──────────────────────────────────────────────────────────────

interface PitchMeterProps {
  pitchInfo: PitchInfo;
  enabled: boolean;
}

export function PitchMeter({ pitchInfo, enabled }: PitchMeterProps) {
  const hasSignal = enabled && pitchInfo.detected > 0;

  const correctedMidi = hasSignal ? hzToMidi(pitchInfo.corrected) : 0;
  const detectedMidi = hasSignal ? hzToMidi(pitchInfo.detected) : 0;
  const noteName = hasSignal ? midiToNoteName(Math.round(correctedMidi)) : '--';
  // Cents deviation of the detected pitch from the nearest corrected note
  const centsOff = hasSignal
    ? Math.round((detectedMidi - Math.round(detectedMidi)) * 100)
    : 0;

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Note name display */}
      <div className="shrink-0 text-center" style={{ width: 52 }}>
        <div
          className="text-lg font-bold leading-tight"
          style={{
            color: hasSignal ? 'var(--color-accent)' : 'var(--color-text-dim)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {noteName}
        </div>
        <div
          className="text-[9px] leading-tight"
          style={{
            color: 'var(--color-text-dim)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {hasSignal ? `${pitchInfo.detected.toFixed(1)} Hz` : '-- Hz'}
        </div>
      </div>

      {/* Cents deviation meter */}
      <div className="min-w-0 flex-1">
        <svg
          width="100%"
          height={28}
          viewBox="0 0 200 28"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background track */}
          <rect
            x={10}
            y={11}
            width={180}
            height={6}
            rx={3}
            fill="rgba(255,255,255,0.04)"
          />

          {/* Scale marks */}
          <line
            x1={55}
            y1={8}
            x2={55}
            y2={20}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
          <line
            x1={100}
            y1={6}
            x2={100}
            y2={22}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
          />
          <line
            x1={145}
            y1={8}
            x2={145}
            y2={20}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />

          {/* Labels */}
          <text
            x={55}
            y={26}
            textAnchor="middle"
            fill="rgba(255,255,255,0.2)"
            fontSize={7}
          >
            -50
          </text>
          <text
            x={100}
            y={26}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={7}
          >
            0
          </text>
          <text
            x={145}
            y={26}
            textAnchor="middle"
            fill="rgba(255,255,255,0.2)"
            fontSize={7}
          >
            +50
          </text>

          {/* Indicator dot */}
          {hasSignal && (
            <circle
              cx={100 + Math.max(-90, Math.min(90, centsOff * 0.9))}
              cy={14}
              r={5}
              fill="var(--color-accent)"
              opacity={0.9}
            />
          )}
        </svg>
      </div>

      {/* Cents readout */}
      <div
        className="w-10 shrink-0 text-right text-[10px] font-semibold"
        style={{
          color: hasSignal
            ? Math.abs(centsOff) < 5
              ? '#22c55e'
              : Math.abs(centsOff) < 20
                ? '#f59e0b'
                : '#ef4444'
            : 'var(--color-text-dim)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {hasSignal ? `${centsOff > 0 ? '+' : ''}${centsOff}c` : '--'}
      </div>
    </div>
  );
}
