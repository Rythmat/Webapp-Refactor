/**
 * Small SVG donut for the teacher panel — responded / total as an animated
 * arc (stroke-dashoffset transition) with the responded count centered.
 * Numbers-only props; no response data ever flows through here.
 */
export interface ResponseRateRingProps {
  responded: number;
  total: number;
  className?: string;
}

const TEAL = '#7ecfcf';
const RADIUS = 15.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const ResponseRateRing = ({
  responded,
  total,
  className,
}: ResponseRateRingProps) => {
  const fraction = total > 0 ? Math.min(responded / total, 1) : 0;

  return (
    <svg
      viewBox="0 0 36 36"
      className={className ?? 'h-12 w-12'}
      role="img"
      aria-label={`${responded} of ${total} responded`}
    >
      <circle
        cx="18"
        cy="18"
        r={RADIUS}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="18"
        r={RADIUS}
        fill="none"
        stroke={TEAL}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
        transform="rotate(-90 18 18)"
        className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
      />
      <text
        x="18"
        y="18"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="10"
        className="fill-white tabular-nums"
      >
        {responded}
      </text>
    </svg>
  );
};
