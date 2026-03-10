import { memo } from 'react';

interface SectionMarkerProps {
  label: string;
  x: number;
  y: number;
}

/**
 * Renders a rehearsal mark (e.g., "A", "B", "Intro", "Bridge") above a measure.
 * Displayed as a boxed label in standard lead sheet convention.
 */
export const SectionMarker = memo(function SectionMarker({
  label,
  x,
  y,
}: SectionMarkerProps) {
  const padding = 4;
  const fontSize = 14;
  const textWidth = label.length * 8.5 + padding * 2;
  const boxHeight = fontSize + padding * 2;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={0}
        y={-boxHeight}
        width={textWidth}
        height={boxHeight}
        rx={2}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <text
        x={padding}
        y={-padding}
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="serif"
        fill="currentColor"
      >
        {label}
      </text>
    </g>
  );
});
