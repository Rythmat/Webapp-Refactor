// ── FxMeter ──────────────────────────────────────────────────────────────
// Vertical level meter bar matching the reference FX rack design.
// Wider bar with dark track, colored fill from bottom, segmented LED look.

interface FxMeterProps {
  level: number; // 0–100
  label: string;
  color?: string;
  height?: number;
}

const SEGMENT_H = 3;
const SEGMENT_GAP = 1;

export function FxMeter({ level, label, color = 'var(--color-accent)', height = 120 }: FxMeterProps) {
  const barWidth = 10;
  const totalWidth = 22;
  const labelH = 14;
  const barH = height - labelH;
  const fillH = (Math.min(100, Math.max(0, level)) / 100) * barH;

  // Build segmented rects from bottom up
  const segments: { y: number; h: number; lit: boolean }[] = [];
  let y = barH;
  while (y > 0) {
    const segH = Math.min(SEGMENT_H, y);
    y -= segH;
    const segBottom = y;
    const lit = barH - segBottom <= fillH;
    segments.push({ y: segBottom, h: segH, lit });
    y -= SEGMENT_GAP;
  }

  return (
    <div className="flex flex-col items-center" style={{ width: totalWidth }}>
      <svg width={barWidth} height={barH}>
        {/* Track (dark background) */}
        <rect x={0} y={0} width={barWidth} height={barH} rx={2} fill="rgba(0, 0, 0, 0.4)" />
        {/* Segmented fill */}
        {segments.map((seg, i) => (
          <rect
            key={i}
            x={0}
            y={seg.y}
            width={barWidth}
            height={seg.h}
            rx={1}
            fill={seg.lit ? color : 'transparent'}
            opacity={seg.lit ? 0.85 : 0}
          />
        ))}
      </svg>
      <span
        className="text-center mt-0.5"
        style={{ fontSize: 7, color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'system-ui', fontWeight: 600 }}
      >
        {label}
      </span>
    </div>
  );
}
