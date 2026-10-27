import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  angleOf,
  atAngle,
  shortestAngle,
  type NoteOrder,
} from './sigilGeometry';
import './sigil.css';

// ── A mode's star inside the key wheel (owner, 2026-10-26) ────────────────
// The mode page's figure: the scale's notes as nodes on a ring just inside
// the wheel's wedges, joined in scale order (faint) and in thirds (the
// star). The notes go round the ring in either order: fifths, each under
// its own wedge (the scale a run of neighbours, its tonic's place in the
// run its brightness), or chromatic, a semitone a step (the shape it has on
// the keyboard). Changing the order or the key glides every note the short
// way round to its new place, the lines following; under reduced motion
// they jump.

/** The ring, in the 100-unit box: close to the wheel's inner edge. */
const RING = 40;
const GLIDE_MS = 900;
const easeOutQuint = (t: number) => 1 - (1 - t) ** 5;

export function WheelStar({
  pcs,
  tonic,
  stars,
  marked,
  order,
  anchor = 0,
  accent,
  label,
}: {
  /** The scale above its tonic (0). */
  pcs: readonly number[];
  /** The key's pitch class. */
  tonic: number;
  /** The scale in thirds (thirdsStars of `pcs`). */
  stars: readonly (readonly number[])[];
  /** The notes dotted in the accent (above its tonic): the mode page's
   *  root and the root of the scale it's a mode of (C Lydian's C and G). */
  marked: readonly number[];
  order: NoteOrder;
  /** In chromatic order, the note kept where it sits in fifths (the
   *  chosen key), the rest a semitone a step round from it. */
  anchor?: number;
  accent: string;
  label: string;
}) {
  const targets = useMemo(
    () => pcs.map((pc) => angleOf((pc + tonic) % 12, order, anchor)),
    [pcs, tonic, order, anchor],
  );

  // Each degree's angle, gliding to its target.
  const [angles, setAngles] = useState<number[]>(targets);
  const current = useRef<number[]>(targets);
  useEffect(() => {
    const from = current.current;
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduce || from.length !== targets.length) {
      current.current = targets;
      setAngles(targets);
      return;
    }
    const turns = targets.map((to, i) => shortestAngle(from[i], to));
    if (turns.every((t) => t === 0)) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / GLIDE_MS);
      const e = easeOutQuint(t);
      const next = from.map((a, i) => a + turns[i] * e);
      current.current = next;
      setAngles(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targets]);

  const degreeOf = new Map(pcs.map((pc, i) => [pc, i]));
  const at = (degree: number) => atAngle(angles[degree] ?? 0, RING);
  const poly = (degrees: readonly number[]) =>
    degrees
      .map((d) =>
        at(d)
          .map((v) => v.toFixed(2))
          .join(','),
      )
      .join(' ');
  const markedPcs = new Set(marked.map((pc) => ((pc % 12) + 12) % 12));

  return (
    <svg
      viewBox="-50 -50 100 100"
      className="sigil size-full"
      role="img"
      aria-label={label}
      data-order={order}
      style={{ '--sigil-accent': accent } as CSSProperties}
    >
      <circle r={RING} className="sigil-faint" />
      <circle r={RING * 0.62} className="sigil-faint" />
      <polygon points={poly(pcs.map((_, i) => i))} className="sigil-faint" />
      {stars.map((star, i) => (
        <polygon
          key={i}
          points={poly(star.map((pc) => degreeOf.get(pc) ?? 0))}
          className="sigil-line"
        />
      ))}
      {pcs.map((pc, degree) => {
        const [x, y] = at(degree);
        const accented = markedPcs.has(pc);
        return (
          <g key={pc}>
            {degree === 0 && (
              <circle cx={x} cy={y} r={4.3} className="sigil-faint" />
            )}
            <circle
              cx={x}
              cy={y}
              r={2.4}
              data-degree={degree}
              data-angle={Math.round(
                (((angles[degree] ?? 0) % 360) + 360) % 360,
              )}
              className={`sigil-node${accented ? ' sigil-node--accent' : ''}`}
            />
          </g>
        );
      })}
    </svg>
  );
}
