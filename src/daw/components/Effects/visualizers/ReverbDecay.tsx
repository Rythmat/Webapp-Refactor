// ── ReverbDecay ──────────────────────────────────────────────────────────
// SVG exponential decay envelope visualization for the reverb effect.
// Shows pre-delay gap, type-specific decay curve, and filter band markers.

import type { ReverbType } from '@/daw/audio/EffectChain';

interface ReverbDecayProps {
  decay: number; // seconds (0.1–10)
  wet: number; // 0–1
  type?: ReverbType; // reverb algorithm
  preDelay?: number; // 0–200 ms
  highPass?: number; // 20–2000 Hz
  lowPass?: number; // 1000–20000 Hz
  width?: number;
  height?: number;
}

const PADDING = { top: 14, right: 6, bottom: 14, left: 6 };

// Decay rate per type — matches IR generation in EffectChain.ts
function decayRate(type: ReverbType): number {
  switch (type) {
    case 'hall':
      return 2.5;
    case 'room':
      return 4;
    case 'chamber':
      return 3;
    case 'plate':
      return 3.5;
    case 'spring':
      return 4.5;
  }
}

// Type display labels
const TYPE_LABELS: Record<ReverbType, string> = {
  hall: 'HALL',
  room: 'ROOM',
  chamber: 'CHAMBER',
  plate: 'PLATE',
  spring: 'SPRING',
};

export function ReverbDecay({
  decay,
  wet,
  type = 'hall',
  preDelay = 0,
  highPass = 20,
  lowPass = 20000,
  width = 160,
  height = 80,
}: ReverbDecayProps) {
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  // Pre-delay in seconds
  const preDelaySec = preDelay / 1000;
  // Total visible time = pre-delay + decay
  const totalTime = preDelaySec + decay;

  const tToX = (t: number) => PADDING.left + (t / totalTime) * plotW;
  const ampToY = (a: number) => PADDING.top + (1 - a) * plotH;

  // Pre-delay boundary
  const preDelayX = tToX(preDelaySec);

  // Build decay curve with type-specific envelope
  const rate = decayRate(type);
  const steps = 60;
  const curvePoints: string[] = [];
  const fillPoints: string[] = [];

  // Pre-delay flat line at wet level
  if (preDelaySec > 0) {
    curvePoints.push(`M${PADDING.left.toFixed(1)} ${ampToY(0).toFixed(1)}`);
    curvePoints.push(`L${preDelayX.toFixed(1)} ${ampToY(0).toFixed(1)}`);
    fillPoints.push(`M${PADDING.left.toFixed(1)} ${ampToY(0).toFixed(1)}`);
    fillPoints.push(`L${preDelayX.toFixed(1)} ${ampToY(0).toFixed(1)}`);
  }

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * decay;
    let amp = wet * Math.exp((-rate * t) / decay);

    // Type-specific modulations (subtle visual hints)
    if (type === 'spring' && i > 0) {
      // Spring bounce effect
      amp *= 1 + 0.08 * Math.sin(t * 25);
    } else if (type === 'plate') {
      // Plate brightness shimmer
      amp *= 1 + 0.04 * Math.sin(t * 40);
    } else if (type === 'hall' && t < 0.05) {
      // Hall gradual onset
      amp *= Math.min(1, t / 0.03);
    }

    const x = tToX(preDelaySec + t).toFixed(1);
    const y = ampToY(Math.max(0, amp)).toFixed(1);
    const cmd = i === 0 && preDelaySec <= 0 ? 'M' : 'L';
    curvePoints.push(`${cmd}${x} ${y}`);
    fillPoints.push(`${cmd}${x} ${y}`);
  }

  // Close fill path along the bottom
  const fillPath =
    fillPoints.join(' ') +
    ` L${(PADDING.left + plotW).toFixed(1)} ${ampToY(0).toFixed(1)}` +
    ` L${PADDING.left.toFixed(1)} ${ampToY(0).toFixed(1)} Z`;

  const curvePath = curvePoints.join(' ');

  // Filter band markers — map Hz to a normalized 0–1 position
  // Use log scale since frequency perception is logarithmic
  const freqToNorm = (f: number) => Math.log2(f / 20) / Math.log2(20000 / 20); // 0 at 20Hz, 1 at 20kHz
  const hpNorm = freqToNorm(highPass);
  const lpNorm = freqToNorm(lowPass);
  const filterY = ampToY(0); // bottom of plot
  const filterH = plotH;

  // Time labels
  const midTime = totalTime / 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
    >
      <defs>
        <linearGradient id="reverb-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.2} />
          <stop
            offset="100%"
            stopColor="var(--color-accent)"
            stopOpacity={0.02}
          />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width={width} height={height} rx={6} fill="rgba(0, 0, 0, 0.3)" />

      {/* Filter band shading — dim areas outside HP/LP range */}
      {highPass > 20 && (
        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={Math.max(0, hpNorm * plotW)}
          height={filterH}
          fill="rgba(255, 100, 100, 0.06)"
        />
      )}
      {lowPass < 20000 && (
        <rect
          x={PADDING.left + lpNorm * plotW}
          y={PADDING.top}
          width={Math.max(0, (1 - lpNorm) * plotW)}
          height={filterH}
          fill="rgba(255, 100, 100, 0.06)"
        />
      )}

      {/* Filter cutoff lines */}
      {highPass > 20 && (
        <line
          x1={PADDING.left + hpNorm * plotW}
          y1={PADDING.top}
          x2={PADDING.left + hpNorm * plotW}
          y2={filterY}
          stroke="rgba(255, 140, 140, 0.3)"
          strokeWidth={0.5}
          strokeDasharray="2 2"
        />
      )}
      {lowPass < 20000 && (
        <line
          x1={PADDING.left + lpNorm * plotW}
          y1={PADDING.top}
          x2={PADDING.left + lpNorm * plotW}
          y2={filterY}
          stroke="rgba(255, 140, 140, 0.3)"
          strokeWidth={0.5}
          strokeDasharray="2 2"
        />
      )}

      {/* Horizontal grid lines */}
      {[0.25, 0.5, 0.75].map((a) => (
        <line
          key={a}
          x1={PADDING.left}
          y1={ampToY(a)}
          x2={width - PADDING.right}
          y2={ampToY(a)}
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={0.5}
        />
      ))}

      {/* Pre-delay marker */}
      {preDelaySec > 0 && (
        <line
          x1={preDelayX}
          y1={PADDING.top}
          x2={preDelayX}
          y2={filterY}
          stroke="rgba(126, 207, 207, 0.3)"
          strokeWidth={0.5}
          strokeDasharray="2 2"
        />
      )}

      {/* Fill under curve */}
      <path d={fillPath} fill="url(#reverb-fill)" />

      {/* Decay curve */}
      <path
        d={curvePath}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Type label — top left */}
      <text
        x={PADDING.left + 3}
        y={PADDING.top - 3}
        fill="rgba(126, 207, 207, 0.5)"
        fontSize={7}
        fontFamily="system-ui"
        fontWeight={600}
        letterSpacing={0.5}
      >
        {TYPE_LABELS[type]}
      </text>

      {/* Pre-delay label */}
      {preDelaySec > 0 && plotW > 100 && (
        <text
          x={PADDING.left + (preDelayX - PADDING.left) / 2}
          y={ampToY(0) - 3}
          fill="rgba(126, 207, 207, 0.35)"
          fontSize={6}
          fontFamily="system-ui"
          textAnchor="middle"
        >
          {Math.round(preDelay)}ms
        </text>
      )}

      {/* Time labels */}
      <text
        x={PADDING.left + 2}
        y={height - 2}
        fill="rgba(255,255,255,0.25)"
        fontSize={7}
        fontFamily="system-ui"
      >
        0s
      </text>
      <text
        x={tToX(midTime)}
        y={height - 2}
        fill="rgba(255,255,255,0.25)"
        fontSize={7}
        fontFamily="system-ui"
        textAnchor="middle"
      >
        {midTime.toFixed(1)}s
      </text>
      <text
        x={width - PADDING.right - 2}
        y={height - 2}
        fill="rgba(255,255,255,0.25)"
        fontSize={7}
        fontFamily="system-ui"
        textAnchor="end"
      >
        {totalTime.toFixed(1)}s
      </text>
    </svg>
  );
}
