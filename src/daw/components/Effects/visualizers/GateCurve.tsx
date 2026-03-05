// ── GateCurve ────────────────────────────────────────────────────────────
// SVG gate transfer function: signal passes above threshold, attenuated
// by `range` dB below threshold.

interface GateCurveProps {
  threshold: number; // dB (-96 to 0)
  range: number; // dB (0 to 80, attenuation when closed)
  width?: number;
  height?: number;
}

const DB_MIN = -80;
const DB_MAX = 0;
const PADDING = { top: 6, right: 6, bottom: 14, left: 20 };

export function GateCurve({
  threshold,
  range,
  width = 140,
  height = 80,
}: GateCurveProps) {
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  const dbToX = (db: number) =>
    PADDING.left + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * plotW;
  const dbToY = (db: number) =>
    PADDING.top + (1 - (db - DB_MIN) / (DB_MAX - DB_MIN)) * plotH;

  // Gate transfer: below threshold → output = input - range (clamped to DB_MIN)
  // Above threshold → output = input (1:1)
  const steps = 80;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const inputDb = DB_MIN + (i / steps) * (DB_MAX - DB_MIN);
    let outputDb: number;
    if (inputDb >= threshold) {
      outputDb = inputDb; // pass-through
    } else {
      outputDb = Math.max(DB_MIN, inputDb - range); // attenuated
    }
    const cmd = i === 0 ? 'M' : 'L';
    points.push(
      `${cmd}${dbToX(inputDb).toFixed(1)} ${dbToY(outputDb).toFixed(1)}`,
    );
  }
  const curvePath = points.join(' ');

  // Unity line
  const unityPath = `M${dbToX(DB_MIN)} ${dbToY(DB_MIN)} L${dbToX(DB_MAX)} ${dbToY(DB_MAX)}`;

  // Threshold marker
  const threshX = dbToX(threshold);

  const gridDbs = [-60, -40, -20, 0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
    >
      <rect width={width} height={height} rx={6} fill="rgba(0, 0, 0, 0.3)" />

      {/* Grid */}
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

      {/* Unity line */}
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

      {/* Gate curve */}
      <path
        d={curvePath}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Labels */}
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
