import { useMemo, useState, type ReactNode } from 'react';
import {
  PROMPT_PILL,
  PROMPT_PILL_OFF,
  PROMPT_PILL_ON,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import {
  harmonicNodes,
  positionOfFret,
  type HarmonicNode,
} from '@/lib/guitar/harmonics';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { StringPicker } from './HarmonicsControls';
import {
  bodyPath,
  BRIDGE,
  diameterLabel,
  fretTableInches,
  FUNDAMENTAL,
  HEAD,
  headFlower,
  KNOBS,
  NECK_END,
  NECK_HALF,
  partialCircles,
  pickguardPath,
  PICKUPS,
  TAILPIECE,
  tangentPoints,
  type Circle,
  type Part,
} from './harmonistGeometry';

// ── Geometry ───────────────────────────────────────────────────────────────
// The string's divisions drawn as circles down the neck of an instrument
// built from them (harmonistGeometry). Choose a partial: its circles draw
// themselves in, and where they touch are its nodes; press one to hear it.
// White line art and one accent (no rainbow): the chosen partial is the key
// colour, the others stay a faint column behind it.

/** One L = this many viewBox units. */
const U = 100;
const VIEW = { x: -62, y: -54, w: 124, h: 196 };
const PARTIALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const LINE = 'rgba(255,255,255,0.14)';
const FAINT = 'rgba(255,255,255,0.09)';
const SILHOUETTE_OPACITY = 0.09;

const DRAW_CSS = `
.harmonist-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: harmonist-draw 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; }
@keyframes harmonist-draw { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { .harmonist-draw { animation: none; stroke-dashoffset: 0; } }
`;

function C({
  c,
  stroke = LINE,
  width = 0.3,
  fill = 'none',
}: {
  c: Circle;
  stroke?: string;
  width?: number;
  fill?: string;
}) {
  return (
    <circle
      cx={c.cx * U}
      cy={c.cy * U}
      r={c.r * U}
      fill={fill}
      stroke={stroke}
      strokeWidth={width}
    />
  );
}

/** A rounded rectangle part of the body (pickup, bridge, tailpiece). */
function R({ p, rx }: { p: Part; rx: number }) {
  return (
    <rect
      x={(p.cx - p.hw) * U}
      y={(p.cy - p.hh) * U}
      width={p.hw * 2 * U}
      height={p.hh * 2 * U}
      rx={rx}
      fill="#121215"
      stroke="rgba(255,255,255,0.4)"
      strokeWidth={0.3}
    />
  );
}

export interface HarmonistViewProps {
  string: GuitarStringNumber;
  onStringChange: (string: GuitarStringNumber) => void;
  /** The partial whose circles are drawn in. */
  partial: number;
  onPartialChange: (partial: number) => void;
  /** The node the detail shows (of `partial`), if any. */
  selected: HarmonicNode | null;
  onNodePress: (node: HarmonicNode) => void;
  keyColor: string;
  mirrored: boolean;
  /** Under the drawing (narrow) or beside it (wide): the partial's card. */
  detail: ReactNode;
}

export function HarmonistView({
  string,
  onStringChange,
  partial,
  onPartialChange,
  selected,
  onNodePress,
  keyColor,
  mirrored,
  detail,
}: HarmonistViewProps) {
  const [allDivisions, setAllDivisions] = useState(true);
  const frets = useMemo(() => fretTableInches(), []);
  const nodes = useMemo(() => harmonicNodes(partial), [partial]);
  const points = tangentPoints(partial);
  const stagger = Math.min(70, 700 / partial);

  // The neck's outline, nut to the 24th fret.
  const neck = `M ${-NECK_HALF.nut * U} 0 L ${NECK_HALF.nut * U} 0 L ${NECK_HALF.end * U} ${NECK_END * U} L ${-NECK_HALF.end * U} ${NECK_END * U} Z`;
  const body = useMemo(() => bodyPath(U), []);
  const guard = useMemo(() => pickguardPath(U), []);
  // The headstock: up from the nut into a round top, inside the head circle.
  const head = `M ${-NECK_HALF.nut * U} 0 C ${-NECK_HALF.nut * U} -6, -8.5 -8, -8.5 -16 A 8.5 8.5 0 0 1 8.5 -16 C 8.5 -8, ${NECK_HALF.nut * U} -6, ${NECK_HALF.nut * U} 0 Z`;

  return (
    <div
      data-harmonics-tab="geometry"
      className="@container flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="radiogroup"
          aria-label="Partial"
          className="flex flex-wrap items-center gap-1.5"
        >
          {PARTIALS.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === partial}
              aria-label={`Partial ${n}: ${n} circle${n > 1 ? 's' : ''} of ${diameterLabel(n)}`}
              data-geometry-partial={n}
              onClick={() => onPartialChange(n)}
              className={cn(
                PROMPT_PILL,
                'min-w-8 justify-center px-2.5',
                n === partial ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={allDivisions}
          onClick={() => setAllDivisions(!allDivisions)}
          className={cn(
            PROMPT_PILL,
            allDivisions ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
          )}
        >
          All divisions
        </button>
      </div>

      {/* Side by side once the column has room; else the card under it. */}
      <div className="grid items-start gap-4 @[54rem]:grid-cols-[minmax(0,1fr)_minmax(17rem,23rem)]">
        <div className="flex min-w-0 flex-col items-center gap-3">
          <svg
            data-harmonist
            viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
            className="block h-auto max-h-[78vh] w-full max-w-[34rem]"
            role="group"
            aria-label={`A guitar drawn from its string's harmonic circles. Partial ${partial}: ${partial} circle${partial > 1 ? 's' : ''} of ${diameterLabel(partial)}, touching at its nodes.`}
          >
            <style>{DRAW_CSS}</style>

            {/* Mirrored for a left-handed player (horns, knobs and all); the
                labels stay upright. */}
            <g transform={mirrored ? 'scale(-1 1)' : undefined}>
              {/* The construction: the fundamental's circle (L) and the
                  headstock's (L/2). */}
              <g aria-hidden data-construction>
                <C c={FUNDAMENTAL} />
                <C c={HEAD} />
              </g>

              {/* The instrument: an SG-style body, its hardware, the
                  headstock and neck. */}
              <g aria-hidden data-silhouette>
                <path
                  data-body
                  d={body}
                  fill={`rgba(255,255,255,${SILHOUETTE_OPACITY})`}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={0.35}
                  strokeLinejoin="round"
                />
                <path
                  d={head}
                  fill={`rgba(255,255,255,${SILHOUETTE_OPACITY})`}
                />
                <path
                  data-pickguard
                  d={guard}
                  fill="rgba(255,255,255,0.16)"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={0.25}
                  strokeLinejoin="round"
                />
                {PICKUPS.map((p, i) => (
                  <R key={i} p={p} rx={0.6} />
                ))}
                <R p={BRIDGE} rx={0.4} />
                <R p={TAILPIECE} rx={0.6} />
                {/* The knobs: a ring round a cap. */}
                {KNOBS.map((c, i) => (
                  <g key={i}>
                    <C c={c} stroke="rgba(255,255,255,0.4)" fill="#121215" />
                    <C
                      c={{ ...c, r: c.r * 0.55 }}
                      stroke="rgba(255,255,255,0.3)"
                      width={0.25}
                    />
                  </g>
                ))}
                {headFlower().map((c, i) => (
                  <C key={i} c={c} stroke="rgba(255,255,255,0.3)" />
                ))}
                <path
                  d={neck}
                  fill="#121215"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={0.3}
                />
                {frets.map((_, i) => {
                  const y = positionOfFret(i + 1) * U;
                  const half =
                    (NECK_HALF.nut +
                      (NECK_HALF.end - NECK_HALF.nut) *
                        (positionOfFret(i + 1) / NECK_END)) *
                    U;
                  return (
                    <line
                      key={i}
                      x1={-half}
                      x2={half}
                      y1={y}
                      y2={y}
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth={0.25}
                    />
                  );
                })}
                {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((s) => (
                  <line
                    key={s}
                    x1={s * 1.1}
                    x2={s * 1.5}
                    y1={0}
                    y2={U}
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={0.15}
                  />
                ))}
              </g>

              {/* Every partial's circles, faint: the column of divisions. */}
              {allDivisions && (
                <g aria-hidden data-all-divisions>
                  {PARTIALS.filter((n) => n !== partial).map((n) =>
                    partialCircles(n).map((c, k) => (
                      <C key={`${n}-${k}`} c={c} stroke={FAINT} width={0.25} />
                    )),
                  )}
                </g>
              )}

              {/* The chosen partial's circles, drawn in one after another. */}
              <g key={partial} aria-hidden data-partial-circles={partial}>
                {partialCircles(partial).map((c, k) => (
                  <circle
                    key={k}
                    className="harmonist-draw"
                    pathLength={1}
                    cx={c.cx * U}
                    cy={c.cy * U}
                    r={c.r * U}
                    fill="none"
                    stroke={keyColor}
                    strokeWidth={0.55}
                    style={{ animationDelay: `${k * stagger}ms` }}
                  />
                ))}
              </g>

              {/* Where they touch: the nodes. Those in lowest terms ring
                  this partial; the others are a lower partial's. */}
              <g data-tangents>
                {points.map((p) => {
                  const node = nodes.find((n) => n.k === p.k);
                  if (!p.rings || !node) {
                    return (
                      <circle
                        key={p.k}
                        aria-hidden
                        cx={0}
                        cy={p.y * U}
                        r={0.9}
                        fill="rgba(255,255,255,0.4)"
                      />
                    );
                  }
                  const on =
                    selected?.partial === partial && selected.k === p.k;
                  return (
                    <g
                      key={p.k}
                      role="button"
                      tabIndex={0}
                      aria-label={`Node ${p.k}/${partial} of the string, fret ${node.fret.toFixed(1)}`}
                      aria-pressed={on}
                      data-tangent={`${partial}/${p.k}`}
                      onClick={() => onNodePress(node)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onNodePress(node);
                        }
                      }}
                      className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-white"
                    >
                      <circle
                        cx={0}
                        cy={p.y * U}
                        r={on ? 2.4 : 1.8}
                        fill={on ? keyColor : '#101012'}
                        stroke={keyColor}
                        strokeWidth={0.6}
                      />
                      <circle cx={0} cy={p.y * U} r={4} fill="transparent" />
                    </g>
                  );
                })}
              </g>
            </g>

            {/* Labels, upright and on the side clear of the body. */}
            <g aria-hidden fontSize={4} fill="rgba(255,255,255,0.5)">
              <text x={mirrored ? -50 : 50} y={14} textAnchor="middle">
                {diameterLabel(1)}
              </text>
              <text x={mirrored ? -27 : 27} y={-42} textAnchor="middle">
                {diameterLabel(2)}
              </text>
              <text
                x={0}
                y={VIEW.y + VIEW.h - 4}
                textAnchor="middle"
                fill="rgba(255,255,255,0.75)"
              >
                {partial === 1
                  ? `The fundamental: one circle of ${diameterLabel(1)}`
                  : `Partial ${partial}: ${partial} circles of ${diameterLabel(partial)}`}
              </text>
            </g>
          </svg>
          <details className="w-full max-w-[34rem] text-sm text-white/55">
            <summary className="cursor-pointer select-none py-1 outline-none focus-visible:text-white">
              Fret distances from the nut (25" scale)
            </summary>
            <ol className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0.5 sm:grid-cols-3">
              {frets.map((inches, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{i + 1}</span>
                  <span className="text-[#e8e8f0]">{inches.toFixed(3)}"</span>
                </li>
              ))}
            </ol>
          </details>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <StringPicker value={string} onChange={onStringChange} />
          {detail}
        </div>
      </div>
    </div>
  );
}
