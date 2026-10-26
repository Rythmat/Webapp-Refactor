import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { at, points, R } from './sigilGeometry';
import { lissajousPath } from './sigilSpec';
import './sigil.css';

// ── The sigils: a tile's music as line geometry (owner, 2026-10-26) ───────
// On the circle of sigilGeometry: the twelve notes (C at the top, as the
// Studio's key wheel) for a scale, the steps of a bar for a groove, a
// Lissajous figure for an interval.

function Frame({
  accent,
  label,
  children,
}: {
  accent: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="-50 -50 100 100"
      className="sigil size-full"
      role="img"
      aria-label={label}
      style={{ '--sigil-accent': accent } as CSSProperties}
    >
      {/* The poster's nested circles. */}
      <circle r={R} className="sigil-faint" />
      <circle r={R * 0.62} className="sigil-faint" />
      {children}
    </svg>
  );
}

const Ticks = ({ n }: { n: number }) => (
  <>
    {Array.from({ length: n }, (_, i) => {
      const [x, y] = at(i, n);
      return <circle key={i} cx={x} cy={y} r={0.8} className="sigil-tick" />;
    })}
  </>
);

/**
 * A scale on the twelve-note circle: its notes as nodes (the tonic ringed),
 * the scale in order as a faint polygon, its notes in thirds (how its
 * chords stack) as the star, and the notes that set it apart from major in
 * the accent, named. `layers` are more stars, faint (a Parallel tile's seven
 * modes); `weights` grow a node with how many of them hold it.
 */
export function ScaleSigil({
  pcs,
  tonic,
  stars,
  altered = [],
  layers = [],
  weights,
  accent,
  label,
}: {
  pcs: readonly number[];
  tonic: number;
  stars: readonly (readonly number[])[];
  altered?: readonly { pc: number; label: string }[];
  layers?: readonly (readonly number[])[];
  weights?: Readonly<Record<number, number>>;
  accent: string;
  label: string;
}) {
  const alteredAt = new Map(altered.map((a) => [a.pc, a.label]));
  // Nodes light in scale order from the tonic.
  const order = [...pcs].sort(
    (a, b) => ((a - tonic + 12) % 12) - ((b - tonic + 12) % 12),
  );
  return (
    <Frame accent={accent} label={label}>
      <Ticks n={12} />
      {layers.map((layer, i) => (
        <polygon
          key={`layer-${i}`}
          points={points(layer, 12)}
          className="sigil-faint sigil-draw"
          pathLength={1}
        />
      ))}
      {!layers.length && (
        <polygon
          points={points(pcs, 12)}
          className="sigil-faint sigil-draw"
          pathLength={1}
        />
      )}
      {stars.map((star, i) => (
        <polygon
          key={`star-${i}`}
          points={points(star, 12)}
          className="sigil-line sigil-draw"
          pathLength={1}
        />
      ))}
      {order.map((pc, i) => {
        const [x, y] = at(pc, 12);
        // The accent on the notes that set the scale apart, or, with none
        // (major, a key, a tonic's modes), on the tonic.
        const accented = altered.length ? alteredAt.has(pc) : pc === tonic;
        const r = weights ? 1.2 + (weights[pc] ?? 0) * 0.32 : 2.3;
        return (
          <g key={pc}>
            {pc === tonic && (
              <circle cx={x} cy={y} r={r + 1.9} className="sigil-faint" />
            )}
            <circle
              cx={x}
              cy={y}
              r={r}
              className={`sigil-node sigil-pop${accented ? ' sigil-node--accent' : ''}`}
              style={{ '--i': i } as CSSProperties}
            />
          </g>
        );
      })}
      {altered.map(({ pc, label: name }) => {
        const [x, y] = at(pc, 12, R + 8.5);
        return (
          <text key={pc} x={x} y={y} className="sigil-label">
            {name}
          </text>
        );
      })}
    </Frame>
  );
}

/**
 * A groove as a rhythm necklace: the bar's steps round the circle, the hits
 * as nodes joined in a polygon, the downbeat ringed, the first hit in the
 * accent. On hover a playhead sweeps the bar and each hit flashes as it
 * passes.
 */
export function GrooveSigil({
  steps,
  hits,
  accent,
  label,
}: {
  steps: number;
  hits: readonly number[];
  accent: string;
  label: string;
}) {
  const [hx, hy] = at(0, steps, R * 1.06);
  return (
    <Frame accent={accent} label={label}>
      <Ticks n={steps} />
      {/* Spokes to the hits, faint, through the middle (the poster's). */}
      {hits.map((h) => {
        const [x, y] = at(h, steps);
        return (
          <line
            key={`spoke-${h}`}
            x2={x}
            y2={y}
            className="sigil-faint sigil-draw"
            pathLength={1}
          />
        );
      })}
      <polygon
        points={points(hits, steps)}
        className="sigil-line sigil-draw"
        pathLength={1}
      />
      <line x2={hx} y2={hy} className="sigil-playhead" />
      {/* The downbeat, whether it's hit or not (the one drop's isn't). */}
      {(() => {
        const [x, y] = at(0, steps);
        return <circle cx={x} cy={y} r={4.2} className="sigil-faint" />;
      })()}
      {hits.map((h, i) => {
        const [x, y] = at(h, steps);
        return (
          <circle
            key={h}
            cx={x}
            cy={y}
            r={2.3}
            className={`sigil-node sigil-hit${i === 0 ? ' sigil-node--accent' : ''}`}
            style={{ '--t': h / steps } as CSSProperties}
          />
        );
      })}
    </Frame>
  );
}

/** At rest, face-on: 2:3 is the logo, 1:2 the octave's ∞. */
const REST_PHASE = 0;

/**
 * An interval as the harmonograph chart draws it: the Lissajous figure of
 * its ratio inside the circle (2:3, the fifth, is the logo's own curve).
 * While `active` (the card hovered) the phase drifts, as a harmonograph's
 * pendulums swing out of step.
 */
export function IntervalSigil({
  ratio,
  accent,
  label,
  active,
}: {
  ratio: readonly [number, number];
  accent: string;
  label: string;
  active: boolean;
}) {
  const [phase, setPhase] = useState(REST_PHASE);
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setPhase((p) => p + dt * 0.9);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);
  const d = useMemo(
    () => lissajousPath(ratio, phase, R * 0.74),
    [ratio, phase],
  );
  return (
    <Frame accent={accent} label={label}>
      <path d={d} className="sigil-line" />
      <circle r={1.6} className="sigil-node sigil-node--accent" />
    </Frame>
  );
}
