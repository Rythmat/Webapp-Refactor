import { useEffect, useRef, useState } from 'react';

// ── Standing wave ──────────────────────────────────────────────────────────
// A string vibrating in one of its modes: partial n swings in n loops with
// n − 1 still points (nodes) between its two fixed ends. The Arcade's
// Harmonic Strings draws it on its own; the guitar Harmonics activity lays
// the same curve along its to-scale string (standingWavePath).

/**
 * The phase a vibrating string has reached, advancing each frame while
 * `animating` (0, the string at rest, otherwise).
 */
export function useStandingWavePhase(animating: boolean, step = 0.04): number {
  const animRef = useRef<number>();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!animating) {
      setPhase(0);
      return;
    }
    let p = 0;
    const animate = () => {
      p += step;
      setPhase(p);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animating, step]);

  return phase;
}

/**
 * The SVG path of partial `harmonic` between x0 and x1 (the fixed ends) on
 * the line y = midY: its loops `amplitude` high at the swing's peak.
 */
export function standingWavePath({
  harmonic,
  x0,
  x1,
  midY,
  amplitude,
  phase,
  resolution = 200,
}: {
  harmonic: number;
  x0: number;
  x1: number;
  midY: number;
  amplitude: number;
  phase: number;
  resolution?: number;
}): string {
  const points: string[] = [];
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution;
    const x = x0 + t * (x1 - x0);
    const y =
      midY + amplitude * Math.sin(harmonic * Math.PI * t) * Math.sin(phase * 3);
    points.push(`${x},${y}`);
  }
  return 'M ' + points.join(' L ');
}

export interface StandingWaveProps {
  harmonic: number;
  width: number;
  height: number;
  isAnimating: boolean;
  /** The colour of the sounding string and its nodes. */
  color: string;
  onNodeClick?: (nodePosition: number) => void;
  showNodes?: boolean;
}

/** A string between two bridges, sounding partial `harmonic`. */
export function StandingWave({
  harmonic,
  width,
  height,
  isAnimating,
  color,
  onNodeClick,
  showNodes = true,
}: StandingWaveProps) {
  const phase = useStandingWavePhase(isAnimating);

  const padding = 40;
  const stringWidth = width - padding * 2;
  const midY = height / 2;
  const amplitude = isAnimating ? 30 : 0;

  const pathD = standingWavePath({
    harmonic,
    x0: padding,
    x1: padding + stringWidth,
    midY,
    amplitude,
    phase,
  });

  // Node positions (where the string doesn't move)
  const nodes: number[] = [];
  for (let i = 0; i <= harmonic; i++) {
    nodes.push(padding + (i / harmonic) * stringWidth);
  }

  return (
    <svg width={width} height={height} className="block">
      {/* Bridge ends */}
      <rect
        x={padding - 4}
        y={midY - 15}
        width={8}
        height={30}
        rx={2}
        fill="#3f3f46"
      />
      <rect
        x={padding + stringWidth - 4}
        y={midY - 15}
        width={8}
        height={30}
        rx={2}
        fill="#3f3f46"
      />

      {/* Standing wave / string */}
      <path
        d={pathD}
        fill="none"
        stroke={isAnimating ? color : '#71717a'}
        strokeWidth={isAnimating ? 2.5 : 1.5}
        style={
          isAnimating ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined
        }
      />

      {/* Nodes */}
      {showNodes &&
        nodes.map((x, i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={midY}
              r={6}
              fill={isAnimating ? color : '#27272a'}
              stroke={isAnimating ? '#fff' : '#52525b'}
              strokeWidth={1.5}
              style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
              onClick={() => onNodeClick?.(i)}
            />
            {isAnimating && (
              <circle
                cx={x}
                cy={midY}
                r={10}
                fill="none"
                stroke={color}
                strokeWidth={0.5}
                opacity={0.4}
              />
            )}
          </g>
        ))}

      {/* Antinode labels */}
      {isAnimating &&
        harmonic <= 8 &&
        Array.from({ length: harmonic }, (_, i) => {
          const x = padding + ((i + 0.5) / harmonic) * stringWidth;
          return (
            <text
              key={i}
              x={x}
              y={midY + 50}
              textAnchor="middle"
              fill="#71717a"
              fontSize={10}
              fontFamily="'Glacial Indifference', system-ui, sans-serif"
            >
              {i + 1}
            </text>
          );
        })}
    </svg>
  );
}
