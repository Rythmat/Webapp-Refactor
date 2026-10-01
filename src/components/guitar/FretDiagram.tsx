// ── FretDiagram ────────────────────────────────────────────────────────────
// The book's vertical box (The Guitar Atlas, p-15 to p-19): string 6 on the
// left, five fret rows with the fret number beside every row, X/O above the
// strings, rounded barres and the finger number inside each dot. The key
// colour tints the frame, header and barres only; dots stay neutral so a
// chord's colour never reads as a finger colour. Mirroring moves geometry,
// never text: every label is placed at a mirrored x, not flipped. Optional
// layers: hollow neck inlays up the neck, an octave hairline, dashed ghost
// outlines, a quality-tone inner ring and key-number chips.

import { Check } from 'lucide-react';
import { memo, type SVGAttributes } from 'react';
import { cn } from '@/components/utilities';
import type { GuitarBarre, GuitarStringNumber } from '@/lib/guitar/types';
import type {
  DiagramDotState,
  FretDiagramDot,
  FretDiagramProps,
} from './types';

// Geometry, in viewBox units.
const STRING_GAP = 16;
const FRET_GAP = 20;
/** Fret-number gutter. Both sides, so a mirrored box keeps its viewBox. */
const SIDE = 24;
/** The X/O row above the box. */
const TOP = 18;
const BOTTOM = 8;
const BOX_W = STRING_GAP * 5;
const WIDTH = SIDE * 2 + BOX_W;
const DOT_R = 6.5;
/** Fret numbers stand clear of a dot on the outer string. */
const LABEL_OFFSET = DOT_R + 3;
/** State rings sit this far out: just clear of a neighbouring string's dot. */
const RING_GAP = 2.25;
const OPEN_R = 3.5;
/**
 * An O marker that carries a label (a chord tone, a key number): near a dot's
 * size so the label stays legible in a small box, yet clear of the nut
 * (the O row's centre is TOP / 2; the nut's stroke starts 2.25 above TOP).
 */
const OPEN_LABEL_R = 6;
/** Slightly wider than a dot, so the barre's key colour frames its dots. */
const BARRE_HALF = DOT_R + 1;
const PX_PER_UNIT = { sm: 0.85, md: 1.25 } as const;

// Neutral paint for everything that is not the key colour.
export const DIAGRAM_INK = '#ecebf2';
export const DIAGRAM_INK_DARK = '#17171c';
const GRID = 'rgba(232,232,240,0.28)';
const FRET_LABEL = 'rgba(232,232,240,0.62)';
const CHECK_PATH = 'M-3 0.2 L-0.9 2.3 L3 -2';
/** Inlays are hollow and fainter than the grid's labels: never a dot. */
const INLAY = 'rgba(232,232,240,0.34)';
const INLAY_R = 3;
const INLAY_FRETS: ReadonlySet<number> = new Set([3, 5, 7, 9, 12, 15]);
/** Where a neck's inlays sit, in string gaps from the box's left edge. */
const INLAY_GAPS = { single: [2.5], double: [1.5, 3.5] } as const;

type PaintProps = Pick<
  SVGAttributes<SVGElement>,
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeWidth'
  | 'strokeOpacity'
  | 'strokeDasharray'
  | 'opacity'
>;

/**
 * A marker body centred on 0,0: a circle, or a diamond for the root. The root
 * is told apart by shape so it survives colour blindness and greyscale. A
 * chip (key numbers) is a rounded square, so a 1-7 never reads as a finger.
 */
export function MarkShape({
  root,
  chip,
  r,
  ...paint
}: PaintProps & { root?: boolean; chip?: boolean; r: number }) {
  if (!root && chip) {
    return (
      <rect
        x={-r}
        y={-r}
        width={r * 2}
        height={r * 2}
        rx={r * 0.4}
        {...paint}
      />
    );
  }
  if (!root) return <circle r={r} {...paint} />;
  // A diamond this size carries about the visual weight of the circle.
  const d = r * 1.15;
  return <polygon points={`0,${-d} ${d},0 0,${d} ${-d},0`} {...paint} />;
}

/** The ring or badge a dot state adds around a body of radius `r`. */
function StateMark({ state, r }: { state: DiagramDotState; r: number }) {
  if (state === 'next') {
    return (
      <circle
        r={r + RING_GAP}
        fill="none"
        stroke={DIAGRAM_INK}
        strokeWidth={1.5}
      />
    );
  }
  if (state === 'missing') {
    return (
      <circle
        r={r + RING_GAP}
        fill="none"
        stroke={DIAGRAM_INK}
        strokeWidth={1.5}
        strokeDasharray="2.2 1.8"
      />
    );
  }
  if (state === 'extra') {
    const at = r * 0.8;
    return (
      <g data-extra transform={`translate(${at} ${-at})`}>
        <circle
          r={3.2}
          fill={DIAGRAM_INK_DARK}
          stroke={DIAGRAM_INK}
          strokeWidth={1}
        />
        <path
          d="M-1.4 -1.4 L1.4 1.4 M1.4 -1.4 L-1.4 1.4"
          stroke={DIAGRAM_INK}
          strokeWidth={1}
          strokeLinecap="round"
        />
      </g>
    );
  }
  return null;
}

function Dot({ dot, x, y }: { dot: FretDiagramDot; x: number; y: number }) {
  const state = dot.state ?? 'idle';
  const done = state === 'done';
  return (
    <g
      data-dot
      data-string={dot.string}
      data-fret={dot.fret}
      data-state={state}
      data-root={dot.isRoot ? 'true' : undefined}
      transform={`translate(${x} ${y})`}
    >
      <MarkShape
        root={dot.isRoot}
        chip={dot.chip}
        r={DOT_R}
        fill={DIAGRAM_INK}
        fillOpacity={done ? 0.4 : 1}
      />
      {dot.ring && !done && (
        <g data-quality-ring>
          <MarkShape
            root={dot.isRoot}
            chip={dot.chip}
            r={DOT_R - 1.4}
            fill="none"
            stroke={DIAGRAM_INK_DARK}
            strokeWidth={0.8}
          />
        </g>
      )}
      {done ? (
        <path
          data-check
          d={CHECK_PATH}
          fill="none"
          stroke={DIAGRAM_INK_DARK}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        dot.label && (
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={dot.label.length > 1 ? 7 : 8.5}
            fontWeight={700}
            fill={DIAGRAM_INK_DARK}
          >
            {dot.label}
          </text>
        )
      )}
      <StateMark state={state} r={DOT_R} />
    </g>
  );
}

/** A barre takes the state its dots share (all done, all missing); else idle. */
function barreState(
  barre: GuitarBarre,
  dots: readonly FretDiagramDot[],
): DiagramDotState {
  const low = Math.min(barre.fromString, barre.toString);
  const high = Math.max(barre.fromString, barre.toString);
  const held = dots
    .filter((d) => d.fret === barre.fret && d.string >= low && d.string <= high)
    .map((d) => d.state ?? 'idle');
  return held.length > 0 && held.every((s) => s === held[0]) ? held[0] : 'idle';
}

/**
 * Dots are placed on a string and a fret row. A dot at fret 0 is not drawn in
 * the grid: it decorates that string's O marker (root diamond, state ring),
 * so an open root or an open string's missing tone still shows.
 */
export const FretDiagram = memo(function FretDiagram({
  startFret,
  rows = 5,
  muted,
  open,
  dots,
  barres = [],
  keyColor,
  caption,
  title,
  subtitle,
  size = 'md',
  state = 'idle',
  mirrored = false,
  ariaLabel,
  inlays = false,
  connectors = [],
  ghosts = [],
  headerExtra,
}: FretDiagramProps & {
  /** Printed under the title, e.g. the Hybrid Number System label '2 min7'. */
  subtitle?: string;
}) {
  const boxH = rows * FRET_GAP;
  const height = TOP + boxH + BOTTOM;
  const scale = PX_PER_UNIT[size];
  const emphasised = state === 'current' || state === 'heard';

  const xOf = (string: GuitarStringNumber) =>
    SIDE + (mirrored ? string - 1 : 6 - string) * STRING_GAP;
  const yOf = (fret: number) => TOP + (fret - startFret + 0.5) * FRET_GAP;
  const markerY = TOP / 2;
  /** A spot's centre: its fret row, or the O row for an open string. */
  const spotY = (fret: number) => (fret === 0 ? markerY : yOf(fret));
  /** String gaps from the box's left edge, mirrored for a left-hander. */
  const gapX = (gaps: number) =>
    SIDE + (mirrored ? BOX_W - gaps * STRING_GAP : gaps * STRING_GAP);
  const fretted = dots.filter((dot) => dot.fret > 0);
  // An inlay sits between two strings; a dot on either one would half cover
  // it (as a finger covers it on a real neck), so it is left out there.
  const inlayMarks =
    inlays && startFret > 1
      ? Array.from({ length: rows }, (_, i) => startFret + i)
          .filter((fret) => INLAY_FRETS.has(fret))
          .flatMap((fret) =>
            (fret === 12 ? INLAY_GAPS.double : INLAY_GAPS.single)
              .filter((gaps) => {
                const beside = [6 - Math.floor(gaps), 6 - Math.ceil(gaps)];
                return !fretted.some(
                  (dot) => dot.fret === fret && beside.includes(dot.string),
                );
              })
              .map((gaps) => ({ fret, gaps })),
          )
      : [];

  const openDot = (string: GuitarStringNumber) =>
    dots.find((dot) => dot.string === string && dot.fret === 0);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      data-diagram-state={state}
      className={cn(
        'inline-flex flex-col items-center',
        state === 'done' && 'opacity-50',
      )}
    >
      {(title || subtitle || headerExtra || state === 'done') && (
        <div className="flex flex-col items-center leading-tight">
          <div
            data-title
            className={cn(
              'flex items-center gap-1 font-semibold',
              size === 'sm' ? 'text-xs' : 'text-sm',
            )}
            style={{ color: keyColor }}
          >
            {title}
            {state === 'done' && (
              <Check aria-hidden className="h-3.5 w-3.5" data-done-check />
            )}
          </div>
          {subtitle && (
            <div
              className={size === 'sm' ? 'text-[10px]' : 'text-xs'}
              style={{ color: 'var(--color-text-dim, #9a9aab)' }}
            >
              {subtitle}
            </div>
          )}
          {headerExtra}
        </div>
      )}
      <svg
        aria-hidden
        viewBox={`0 0 ${WIDTH} ${height}`}
        width={WIDTH * scale}
        height={height * scale}
      >
        {state === 'heard' && (
          <rect
            data-glow
            className="motion-safe:animate-pulse"
            x={SIDE}
            y={TOP}
            width={BOX_W}
            height={boxH}
            rx={2}
            fill="none"
            stroke={keyColor}
            strokeWidth={6}
            strokeOpacity={0.35}
          />
        )}
        <rect
          data-frame
          x={SIDE}
          y={TOP}
          width={BOX_W}
          height={boxH}
          fill={emphasised ? keyColor : 'none'}
          fillOpacity={emphasised ? 0.1 : undefined}
          stroke={keyColor}
          strokeWidth={emphasised ? 2.25 : 1.25}
        />
        {[2, 3, 4, 5].map((string) => {
          const x = xOf(string as GuitarStringNumber);
          return (
            <line
              key={`s${string}`}
              x1={x}
              x2={x}
              y1={TOP}
              y2={TOP + boxH}
              stroke={GRID}
            />
          );
        })}
        {Array.from({ length: rows - 1 }, (_, i) => {
          const y = TOP + (i + 1) * FRET_GAP;
          return (
            <line
              key={`f${i}`}
              x1={SIDE}
              x2={SIDE + BOX_W}
              y1={y}
              y2={y}
              stroke={GRID}
            />
          );
        })}
        {startFret === 1 && (
          <line
            data-nut
            x1={SIDE}
            x2={SIDE + BOX_W}
            y1={TOP}
            y2={TOP}
            stroke={keyColor}
            strokeWidth={4.5}
            strokeLinecap="square"
          />
        )}
        {inlayMarks.map(({ fret, gaps }) => (
          <circle
            key={`i${fret}-${gaps}`}
            data-inlay={fret}
            cx={gapX(gaps)}
            cy={yOf(fret)}
            r={INLAY_R}
            fill="none"
            stroke={INLAY}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: rows }, (_, i) => (
          <text
            key={`n${i}`}
            data-fret-label={startFret + i}
            x={mirrored ? SIDE + BOX_W + LABEL_OFFSET : SIDE - LABEL_OFFSET}
            y={TOP + (i + 0.5) * FRET_GAP}
            textAnchor={mirrored ? 'start' : 'end'}
            dominantBaseline="central"
            fontSize={9}
            fill={FRET_LABEL}
          >
            {startFret + i}
          </text>
        ))}
        {ghosts
          .filter((ghost) => ghost.fret > 0)
          .map((ghost) => (
            <circle
              key={`g${ghost.string}-${ghost.fret}`}
              data-ghost
              data-string={ghost.string}
              data-fret={ghost.fret}
              cx={xOf(ghost.string)}
              cy={yOf(ghost.fret)}
              r={DOT_R - 0.5}
              fill="none"
              stroke={DIAGRAM_INK}
              strokeOpacity={0.5}
              strokeWidth={1}
              strokeDasharray="1.6 1.6"
            />
          ))}
        {connectors.map(({ from, to, label }) => {
          const x1 = xOf(from.string);
          const y1 = spotY(from.fret);
          const x2 = xOf(to.string);
          const y2 = spotY(to.fret);
          return (
            <g
              key={`c${from.string}-${from.fret}-${to.string}-${to.fret}`}
              data-connector={label}
            >
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={DIAGRAM_INK}
                strokeOpacity={0.6}
                strokeWidth={0.75}
              />
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={6.5}
                fill={FRET_LABEL}
                stroke={DIAGRAM_INK_DARK}
                strokeWidth={2.5}
                paintOrder="stroke"
              >
                {label}
              </text>
            </g>
          );
        })}
        {muted.map((string) => (
          <g
            key={`x${string}`}
            data-marker="muted"
            data-string={string}
            transform={`translate(${xOf(string)} ${markerY})`}
          >
            <path
              d={`M${-OPEN_R} ${-OPEN_R} L${OPEN_R} ${OPEN_R} M${OPEN_R} ${-OPEN_R} L${-OPEN_R} ${OPEN_R}`}
              stroke={DIAGRAM_INK}
              strokeWidth={1.25}
              strokeLinecap="round"
            />
          </g>
        ))}
        {open.map((string) => {
          const dot = openDot(string);
          const dotState = dot?.state ?? 'idle';
          // An O that carries a label (a chord tone, a note) grows to hold it.
          // A root's diamond reaches 1.15 r, so it grows a little less.
          const label = dot?.label;
          const r = label
            ? dot?.isRoot
              ? OPEN_LABEL_R - 0.5
              : OPEN_LABEL_R
            : OPEN_R;
          return (
            <g
              key={`o${string}`}
              data-marker="open"
              data-string={string}
              data-state={dotState}
              data-root={dot?.isRoot ? 'true' : undefined}
              transform={`translate(${xOf(string)} ${markerY})`}
              opacity={dotState === 'done' ? 0.4 : undefined}
            >
              <MarkShape
                root={dot?.isRoot}
                r={r}
                fill="none"
                stroke={DIAGRAM_INK}
                strokeWidth={1.25}
              />
              {dot?.ring && (
                <g data-quality-ring>
                  <MarkShape
                    root={dot.isRoot}
                    r={r - 1.4}
                    fill="none"
                    stroke={DIAGRAM_INK}
                    strokeWidth={0.6}
                  />
                </g>
              )}
              {label && (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={label.length > 1 ? 6.5 : 8}
                  fontWeight={700}
                  fill={DIAGRAM_INK}
                >
                  {label}
                </text>
              )}
              <StateMark state={dotState} r={r} />
            </g>
          );
        })}
        {barres.map((barre) => {
          const a = xOf(barre.fromString);
          const b = xOf(barre.toString);
          const barreDotState = barreState(barre, fretted);
          return (
            <rect
              key={`b${barre.fret}-${barre.fromString}`}
              data-barre
              data-string={`${barre.fromString}-${barre.toString}`}
              data-fret={barre.fret}
              data-state={barreDotState}
              x={Math.min(a, b) - BARRE_HALF}
              y={yOf(barre.fret) - BARRE_HALF}
              width={Math.abs(a - b) + BARRE_HALF * 2}
              height={BARRE_HALF * 2}
              rx={BARRE_HALF}
              fill={keyColor}
              // Fades with its dots once they're done.
              fillOpacity={barreDotState === 'done' ? 0.2 : 0.5}
              stroke={keyColor}
              strokeWidth={1.25}
            />
          );
        })}
        {fretted.map((dot) => (
          <Dot
            key={`d${dot.string}-${dot.fret}`}
            dot={dot}
            x={xOf(dot.string)}
            y={yOf(dot.fret)}
          />
        ))}
      </svg>
      {caption && (
        <div
          data-caption
          className={cn(
            'tabular-nums',
            size === 'sm' ? 'text-[10px]' : 'text-xs',
          )}
          style={{ color: 'var(--color-text-dim, #9a9aab)' }}
        >
          {caption}
        </div>
      )}
    </div>
  );
});
