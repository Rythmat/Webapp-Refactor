// ── DelayTaps ────────────────────────────────────────────────────────────
// SVG echo tap pattern visualization for the delay effect.
// Shows vertical bars for each echo with decaying amplitude.

interface DelayTapsProps {
  time: number; // seconds per tap
  feedback: number; // 0–0.95
  wet: number; // 0–1
  width?: number;
  height?: number;
  maxTaps?: number;
}

const PADDING = { top: 6, right: 6, bottom: 14, left: 6 };
const MIN_AMP = 0.05;

export function DelayTaps({
  time,
  feedback,
  wet,
  width = 160,
  height = 80,
  maxTaps = 6,
}: DelayTapsProps) {
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;
  const baseY = PADDING.top + plotH;

  // Compute taps
  const taps: { index: number; amp: number }[] = [];
  for (let i = 0; i <= maxTaps; i++) {
    const amp = i === 0 ? 1 : wet * Math.pow(feedback, i);
    if (i > 0 && amp < MIN_AMP) break;
    taps.push({ index: i, amp });
  }

  // Total time span for x-axis
  const totalTime = Math.max(time * 2, time * (taps.length + 0.5));
  const tToX = (t: number) => PADDING.left + (t / totalTime) * plotW;
  const barWidth = Math.max(3, Math.min(12, (plotW / (taps.length + 1)) * 0.6));

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
    >
      {/* Background */}
      <rect width={width} height={height} rx={6} fill="rgba(0, 0, 0, 0.3)" />

      {/* Horizontal grid */}
      {[0.25, 0.5, 0.75].map((a) => (
        <line
          key={a}
          x1={PADDING.left}
          y1={PADDING.top + (1 - a) * plotH}
          x2={width - PADDING.right}
          y2={PADDING.top + (1 - a) * plotH}
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={0.5}
        />
      ))}

      {/* Baseline */}
      <line
        x1={PADDING.left}
        y1={baseY}
        x2={width - PADDING.right}
        y2={baseY}
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth={0.5}
      />

      {/* Tap bars */}
      {taps.map(({ index, amp }) => {
        const x = tToX(index * time);
        const barH = amp * plotH;
        const opacity = index === 0 ? 0.5 : 0.2 + 0.6 * amp;
        return (
          <rect
            key={index}
            x={x - barWidth / 2}
            y={baseY - barH}
            width={barWidth}
            height={barH}
            rx={1.5}
            fill={
              index === 0 ? 'rgba(255, 255, 255, 0.3)' : 'var(--color-accent)'
            }
            opacity={opacity}
          />
        );
      })}

      {/* Decay envelope line connecting tap peaks */}
      {taps.length > 1 && (
        <path
          d={taps
            .map(({ index, amp }, i) => {
              const x = tToX(index * time).toFixed(1);
              const y = (baseY - amp * plotH).toFixed(1);
              return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
            })
            .join(' ')}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.4}
        />
      )}

      {/* Time labels */}
      <text
        x={PADDING.left + 2}
        y={height - 2}
        fill="rgba(255,255,255,0.25)"
        fontSize={7}
        fontFamily="system-ui"
      >
        dry
      </text>
      {taps.length > 1 && (
        <text
          x={tToX(time)}
          y={height - 2}
          fill="rgba(255,255,255,0.25)"
          fontSize={7}
          fontFamily="system-ui"
          textAnchor="middle"
        >
          {time < 1 ? `${Math.round(time * 1000)}ms` : `${time.toFixed(2)}s`}
        </text>
      )}
    </svg>
  );
}
