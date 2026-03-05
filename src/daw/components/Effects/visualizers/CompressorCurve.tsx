// ── CompressorCurve ──────────────────────────────────────────────────────
// SVG transfer function curve for the compressor visualizer.
// Shows input dB (x) vs output dB (y) with soft-knee interpolation.

interface CompressorCurveProps {
  threshold: number; // dB (-60 to 0)
  ratio: number; // 1 to 20
  knee: number; // dB (0 to 40)
  width?: number;
  height?: number;
}

const DB_MIN = -60;
const DB_MAX = 0;
const PADDING = { top: 6, right: 6, bottom: 14, left: 20 };

function computeOutputDb(
  inputDb: number,
  threshold: number,
  ratio: number,
  knee: number,
): number {
  const halfKnee = knee / 2;
  if (inputDb <= threshold - halfKnee) {
    // Below knee — 1:1 pass-through
    return inputDb;
  } else if (inputDb >= threshold + halfKnee) {
    // Above knee — full compression
    return threshold + (inputDb - threshold) / ratio;
  } else {
    // In the knee region — quadratic interpolation
    const x = inputDb - threshold + halfKnee;
    return inputDb + ((1 / ratio - 1) * x * x) / (2 * knee);
  }
}

export function CompressorCurve({
  threshold,
  ratio,
  knee,
  width = 160,
  height = 80,
}: CompressorCurveProps) {
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  const dbToX = (db: number) =>
    PADDING.left + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * plotW;
  const dbToY = (db: number) =>
    PADDING.top + (1 - (db - DB_MIN) / (DB_MAX - DB_MIN)) * plotH;

  // Build the transfer curve path
  const steps = 80;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const inputDb = DB_MIN + (i / steps) * (DB_MAX - DB_MIN);
    const outputDb = computeOutputDb(inputDb, threshold, ratio, knee);
    const clampedOutput = Math.max(DB_MIN, Math.min(DB_MAX, outputDb));
    const cmd = i === 0 ? 'M' : 'L';
    points.push(
      `${cmd}${dbToX(inputDb).toFixed(1)} ${dbToY(clampedOutput).toFixed(1)}`,
    );
  }
  const curvePath = points.join(' ');

  // 1:1 unity line
  const unityPath = `M${dbToX(DB_MIN)} ${dbToY(DB_MIN)} L${dbToX(DB_MAX)} ${dbToY(DB_MAX)}`;

  // Threshold marker
  const threshX = dbToX(threshold);

  // Grid labels
  const gridDbs = [-48, -36, -24, -12, 0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
    >
      {/* Background */}
      <rect width={width} height={height} rx={6} fill="rgba(0, 0, 0, 0.3)" />

      {/* Grid lines */}
      {gridDbs.map((db) => (
        <line
          key={`h-${db}`}
          x1={PADDING.left}
          y1={dbToY(db)}
          x2={width - PADDING.right}
          y2={dbToY(db)}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={0.5}
          strokeDasharray="1 4"
        />
      ))}
      {gridDbs.map((db) => (
        <line
          key={`v-${db}`}
          x1={dbToX(db)}
          y1={PADDING.top}
          x2={dbToX(db)}
          y2={height - PADDING.bottom}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={0.5}
          strokeDasharray="1 4"
        />
      ))}

      {/* Unity line (1:1, dim dashed) */}
      <path
        d={unityPath}
        fill="none"
        stroke="rgba(255, 255, 255, 0.12)"
        strokeWidth={0.75}
        strokeDasharray="3 3"
      />

      {/* Threshold marker */}
      <line
        x1={threshX}
        y1={PADDING.top}
        x2={threshX}
        y2={height - PADDING.bottom}
        stroke="rgba(255, 180, 100, 0.25)"
        strokeWidth={0.75}
        strokeDasharray="2 2"
      />

      {/* Transfer curve */}
      <path
        d={curvePath}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Axis labels */}
      <text
        x={PADDING.left}
        y={height - 2}
        fill="rgba(255,255,255,0.25)"
        fontSize={7}
        fontFamily="system-ui"
      >
        {DB_MIN}
      </text>
      <text
        x={width - PADDING.right}
        y={height - 2}
        fill="rgba(255,255,255,0.25)"
        fontSize={7}
        fontFamily="system-ui"
        textAnchor="end"
      >
        0dB
      </text>
    </svg>
  );
}
