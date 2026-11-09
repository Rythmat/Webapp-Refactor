// ── The positions neck ─────────────────────────────────────────────────────
// A guitar's fretboard standing up, as the harmonics Geometry view draws
// the instrument (white line art, one key-colour accent), cropped to the
// fretboard: no headstock, no body, and wider than true scale so the notes
// can carry their names. The nut is at the top; the bass strings are on the
// left (on the right, mirrored, for a left-handed player).
//
// Every note of the scale sits on it faintly; the chosen position's notes
// are lit in the key colour with their names, its roots hollow. The
// positions are labelled along the treble side of the neck, each beside
// the frets it spans (in lanes where they overlap): hovering or focusing a
// label lights that position on the neck; choosing it makes it the page's.

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type {
  FretboardScaleNote,
  ModalPosition,
} from '@/curriculum/data/guitar/modes/modalPositions';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import { positionOfFret } from '@/lib/guitar/harmonics';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { DIAGRAM_INK, DIAGRAM_INK_DARK } from '../FretDiagram';

/** Nut (y = 0) to the last fret. */
const LENGTH = 340;
/** Half the neck's width at the nut and past the last fret. */
const HALF = { nut: 46, end: 56 };
/** The strings' inset from the neck's edges. */
const INSET = 0.16;
const STRING_NAMES: Readonly<Record<GuitarStringNumber, string>> = {
  1: 'e',
  2: 'B',
  3: 'G',
  4: 'D',
  5: 'A',
  6: 'E',
};
const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21] as const;
const NECK_FILL = '#121215';
const FRET = 'rgba(255,255,255,0.22)';
const LABEL = 'rgba(255,255,255,0.5)';
/** The position labels' lanes: the first's bracket, and lane to lane. */
const LANE = { first: HALF.end + 8, gap: 14 };

/**
 * A lane per position, so overlapping ones sit side by side: each takes the
 * first lane whose last position ends before it starts (low frets first).
 */
export function positionLanes(
  positions: readonly Pick<ModalPosition, 'firstFret' | 'lastFret'>[],
): number[] {
  const order = positions
    .map((p, i) => ({ ...p, i }))
    .sort((a, b) => a.firstFret - b.firstFret || a.i - b.i);
  const laneEnds: number[] = [];
  const lanes: number[] = new Array(positions.length).fill(0);
  for (const p of order) {
    let lane = laneEnds.findIndex((end) => end < p.firstFret);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = p.lastFret;
    lanes[p.i] = lane;
  }
  return lanes;
}

export interface PositionsNeckProps {
  /** Every note of the scale on the neck. */
  scaleNotes: readonly FretboardScaleNote[];
  /** The scale's seven positions. */
  positions: readonly ModalPosition[];
  /** Their labels along the neck: 'Position 3', 'Dorian'. */
  names: readonly string[];
  /** The page's position (its box); the neck lights it unless one is hovered. */
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Which notes are drawn hollow: the scale's tonic or the shape's root. */
  rootRing: 'tonic' | 'shape';
  lastFret: number;
  keyColor: string;
  mirrored: boolean;
  /** What the drawing shows, for assistive tech. */
  label: string;
}

export const PositionsNeck = memo(function PositionsNeck({
  scaleNotes,
  positions,
  names,
  selectedIndex,
  onSelect,
  rootRing,
  lastFret,
  keyColor,
  mirrored,
  label,
}: PositionsNeckProps) {
  const sx = mirrored ? -1 : 1;
  // Hovered or focused: lit on the neck until the pointer leaves.
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const position = positions[previewIndex ?? selectedIndex] ?? null;
  const lanes = useMemo(() => positionLanes(positions), [positions]);
  const laneCount = Math.max(1, ...lanes.map((l) => l + 1));
  // Softer than equal temperament, so the high frets keep room for a name.
  const fretY = useMemo(() => {
    const top = positionOfFret(lastFret + 0.6);
    return (f: number) =>
      LENGTH *
      (0.65 * (positionOfFret(f) / top) + 0.35 * (f / (lastFret + 0.6)));
  }, [lastFret]);
  const halfAt = (y: number) => HALF.nut + (HALF.end - HALF.nut) * (y / LENGTH);
  const stringX = (string: GuitarStringNumber, y: number) => {
    const half = halfAt(y) * (1 - INSET);
    return sx * (-half + ((6 - string) * 2 * half) / 5);
  };
  /** Where a fretted note sits: just behind its fret; open, over the nut. */
  const noteY = (fret: number) =>
    fret === 0 ? -9 : fretY(fret) - 0.45 * (fretY(fret) - fretY(fret - 1));
  const radiusAt = (fret: number) =>
    fret === 0
      ? 5
      : Math.max(4.4, Math.min(7, 0.46 * (fretY(fret) - fretY(fret - 1))));

  // A newly chosen position high up the neck scrolls into view (not on
  // arrival: the page opens at its top; not on hover).
  const bracketRef = useRef<SVGRectElement>(null);
  const shown = useRef(selectedIndex);
  useEffect(() => {
    if (shown.current === selectedIndex) return;
    shown.current = selectedIndex;
    const calm = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    bracketRef.current?.scrollIntoView?.({
      block: 'nearest',
      behavior: calm ? 'auto' : 'smooth',
    });
  }, [selectedIndex]);

  const end = LENGTH;
  const neck = `M ${-HALF.nut} 0 L ${HALF.nut} 0 L ${HALF.end} ${end} L ${-HALF.end} ${end} Z`;
  const lit = new Set(position?.notes.map((n) => `${n.string}:${n.fret}`));
  const labelX = sx * -(HALF.end + 9);
  // The fret numbers' side, then the neck, then the position lanes.
  const bass = 76;
  const treble = LANE.first + (laneCount - 1) * LANE.gap + 10;
  const viewX = mirrored ? -treble : -bass;

  return (
    <svg
      data-positions-neck
      viewBox={`${viewX} -34 ${bass + treble} ${LENGTH + 44}`}
      className="block h-auto max-h-[82vh] min-h-[34rem] w-full max-w-[34rem]"
      role="group"
      aria-label={label}
    >
      <path
        d={neck}
        fill={NECK_FILL}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={0.6}
      />
      {/* The nut. */}
      <line
        x1={-HALF.nut}
        x2={HALF.nut}
        y1={0}
        y2={0}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Inlays: hollow, between the frets, the 12th's a pair. */}
      <g aria-hidden fill="none" stroke="rgba(255,255,255,0.14)">
        {INLAYS.filter((f) => f <= lastFret).map((f) => (
          <circle key={f} cx={0} cy={noteY(f)} r={3} strokeWidth={0.8} />
        ))}
        {lastFret >= 12 &&
          [-1, 1].map((side) => (
            <circle
              key={side}
              cx={side * 17}
              cy={noteY(12)}
              r={3}
              strokeWidth={0.8}
            />
          ))}
      </g>
      {/* The chosen position's frets, bracketed. */}
      {position && (
        <rect
          ref={bracketRef}
          data-position-bracket={position.number}
          x={-halfAt(fretY(position.lastFret)) - 2}
          y={fretY(position.firstFret - 1) + 1}
          width={(halfAt(fretY(position.lastFret)) + 2) * 2}
          height={fretY(position.lastFret) - fretY(position.firstFret - 1) - 2}
          rx={5}
          fill={keyColor}
          fillOpacity={0.07}
          stroke={keyColor}
          strokeOpacity={0.45}
          strokeWidth={0.8}
        />
      )}
      <g aria-hidden>
        {Array.from({ length: lastFret }, (_, i) => {
          const y = fretY(i + 1);
          const half = halfAt(y);
          return (
            <line
              key={i}
              x1={-half}
              x2={half}
              y1={y}
              y2={y}
              stroke={FRET}
              strokeWidth={0.9}
            />
          );
        })}
        {([6, 5, 4, 3, 2, 1] as const).map((s) => (
          <line
            key={s}
            x1={stringX(s, 0)}
            x2={stringX(s, end)}
            y1={0}
            y2={end}
            stroke="rgba(255,255,255,0.3)"
            // The wound strings heavier, as on the reference.
            strokeWidth={0.35 + (s - 1) * 0.13}
          />
        ))}
      </g>

      {/* The scale everywhere, faint; the position lit over it. */}
      <g aria-hidden data-scale-notes>
        {scaleNotes
          .filter((n) => !lit.has(`${n.string}:${n.fret}`))
          .map((n) => (
            <circle
              key={`${n.string}:${n.fret}`}
              cx={stringX(n.string, noteY(n.fret))}
              cy={noteY(n.fret)}
              r={2.2}
              fill={DIAGRAM_INK}
              fillOpacity={n.degree === 1 ? 0.34 : 0.18}
            />
          ))}
      </g>
      {position && (
        <g data-position-notes={position.number}>
          {position.notes.map((n) => {
            const x = stringX(n.string, noteY(n.fret));
            const y = noteY(n.fret);
            const r = radiusAt(n.fret);
            const root = rootRing === 'tonic' ? n.isTonic : n.isShapeRoot;
            const name = formatAccidentalsForDisplay(n.name);
            return (
              <g
                key={`${n.string}:${n.fret}`}
                data-position-note={`${n.string}:${n.fret}`}
                data-root={root || undefined}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={root ? NECK_FILL : keyColor}
                  stroke={keyColor}
                  strokeWidth={root ? 1.3 : 0}
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.min(r * (name.length > 1 ? 1.05 : 1.3), 7.6)}
                  fontWeight={700}
                  fill={root ? DIAGRAM_INK : DIAGRAM_INK_DARK}
                >
                  {name}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* The positions, along the treble side: a bracket over each one's
          frets and its name. */}
      <g
        role="radiogroup"
        aria-label="Positions"
        data-position-labels
        onPointerLeave={() => setPreviewIndex(null)}
      >
        {positions.map((p, i) => {
          const x = sx * (LANE.first + lanes[i] * LANE.gap);
          const top = fretY(p.firstFret - 1) + 2;
          const bottom = fretY(p.lastFret) - 2;
          const mid = (top + bottom) / 2;
          const selected = i === selectedIndex;
          const lit = i === (previewIndex ?? selectedIndex);
          const ink = lit ? keyColor : 'rgba(255,255,255,0.45)';
          const textX = x + sx * 6;
          return (
            <g
              key={p.number}
              role="radio"
              aria-checked={selected}
              aria-label={names[i]}
              tabIndex={0}
              data-position-label={p.number}
              data-lit={lit || undefined}
              onPointerEnter={() => setPreviewIndex(i)}
              onFocus={() => setPreviewIndex(i)}
              onBlur={() => setPreviewIndex(null)}
              onClick={() => onSelect(i)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(i);
                }
              }}
              className="cursor-pointer outline-none [&:focus-visible>path]:stroke-white"
            >
              {/* The hit area: the lane beside the position's frets. */}
              <rect
                x={Math.min(x - sx * 2, x + sx * 12)}
                y={top}
                width={14}
                height={bottom - top}
                fill="transparent"
              />
              <path
                d={`M ${x - sx * 3} ${top} H ${x} V ${bottom} H ${x - sx * 3}`}
                fill="none"
                stroke={ink}
                strokeWidth={selected || lit ? 1.4 : 0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x={textX}
                y={mid}
                transform={`rotate(${sx * 90} ${textX} ${mid})`}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={6}
                fontWeight={selected ? 700 : 400}
                fill={lit ? keyColor : selected ? DIAGRAM_INK : LABEL}
              >
                {names[i]}
              </text>
            </g>
          );
        })}
      </g>

      {/* Labels, upright: the open strings over the nut, fret numbers on
          the side away from the strings' names. */}
      <g aria-hidden fontSize={5.5} fill={LABEL}>
        {([6, 5, 4, 3, 2, 1] as const).map((s) => (
          <text key={s} x={stringX(s, 0)} y={-22} textAnchor="middle">
            {STRING_NAMES[s]}
          </text>
        ))}
        {[...INLAYS, 12]
          .filter((f) => f <= lastFret)
          .map((f) => (
            <text
              key={f}
              x={labelX}
              y={noteY(f)}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {f}
            </text>
          ))}
      </g>
    </svg>
  );
});
