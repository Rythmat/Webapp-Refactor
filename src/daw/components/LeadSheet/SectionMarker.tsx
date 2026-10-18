import { memo } from 'react';

interface SectionMarkerProps {
  label: string;
  x: number;
  y: number;
  /** The real bar it marks, for the reload harness (data-measure). */
  measureIdx?: number;
}

/**
 * Renders a rehearsal mark (e.g., "A", "B", "Intro", "Bridge") above a measure.
 * Displayed as a boxed label in standard lead sheet convention. Since
 * milestone 2.13 it marks one of the song's sections, the same the
 * sections lane shows.
 */
export const SectionMarker = memo(function SectionMarker({
  label,
  x,
  y,
  measureIdx,
}: SectionMarkerProps) {
  const padding = 4;
  const fontSize = 14;
  const textWidth = label.length * 8.5 + padding * 2;
  const boxHeight = fontSize + padding * 2;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      data-testid="section-marker"
      data-measure={measureIdx}
    >
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
        fontFamily="'Glacial Indifference', system-ui, sans-serif"
        fill="currentColor"
      >
        {label}
      </text>
    </g>
  );
});
