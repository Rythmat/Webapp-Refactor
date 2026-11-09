import { useMemo, useRef, type KeyboardEvent } from 'react';
import {
  standingWavePath,
  useStandingWavePhase,
} from '@/components/harmonics/StandingWave';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  HARMONIC_NECK_FRETS,
  harmonicNodes,
  positionOfFret,
  type HarmonicNode,
} from '@/lib/guitar/harmonics';
import type { GuitarStringNumber } from '@/lib/guitar/types';

// ── Harmonic neck ──────────────────────────────────────────────────────────
// The whole string, nut to bridge, drawn to scale (the frets close up as
// they climb), with every place it rings a harmonic. Above the neck, the
// string's divisions as arcs, one set per partial (partial n: n arcs); under
// it, a row per partial holding its nodes, so the crowd of high partials
// near the nut never piles up. The chosen node's partial is the key colour,
// and its string swings in that many loops while it rings.
//
// Lesson rules: one accent, and states differ by shape too (the chosen node
// filled, its partial's other nodes ringed, the rest hairline rings). Mirrored
// for a left-handed player, the text staying upright.

export type NodeMark = 'selected' | 'related' | 'target' | 'passed';

export const nodeId = (node: { partial: number; k: number }) =>
  `${node.partial}/${node.k}`;

export interface HarmonicNeckProps {
  /** The string the nodes are on (1 = high E). */
  string: GuitarStringNumber;
  /** The partials with a row of nodes (and arcs). */
  partials: readonly number[];
  /** Marks by nodeId; unmarked nodes are plain. */
  marks?: ReadonlyMap<string, NodeMark>;
  /** The partial the string is sounding now, if any. */
  ringing?: number | null;
  keyColor: string;
  mirrored?: boolean;
  /** Draw the nodes past the 24th fret (over the body). */
  showBody?: boolean;
  /** What a node's ring says: its fret or its place on the string. */
  labels?: 'fret' | 'ratio';
  onNodePress?: (node: HarmonicNode) => void;
  /** Read aloud for a node ("Partial 3, over the 7th fret"). */
  describeNode?: (node: HarmonicNode) => string;
}

// Geometry, in viewBox units (one a px at the neck's narrowest).
export const NECK_MIN_WIDTH = 760;
const W = NECK_MIN_WIDTH;
const PAD_L = 34;
const PAD_R = 22;
const L = W - PAD_L - PAD_R; // the scale length
const ARC_TOP = 6;
const ARC_H = 70;
const NECK_TOP = ARC_TOP + ARC_H + 8;
const STRING_GAP = 9;
const NECK_H = STRING_GAP * 5;
const FRET_NUM_Y = NECK_TOP + NECK_H + 16;
const ROWS_TOP = FRET_NUM_Y + 12;
const ROW_H = 26;
const NODE_R = 10;

const WIRE = 'rgba(255,255,255,0.15)';
const STRING = 'rgba(255,255,255,0.28)';
const NUT = '#d8d6cc';
const INLAY = 'rgba(255,255,255,0.12)';
const QUIET = 'rgba(255,255,255,0.45)';
const FAINT_ARC = 'rgba(255,255,255,0.12)';
const RING_FILL = '#16161a';

const SINGLE_INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_INLAYS = [12, 24];
const FRET_NUMBERS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];

/** Strings top to bottom: high E (1) first, as the app's fretboards. */
const stringY = (s: number) => NECK_TOP + (s - 1) * STRING_GAP;

function ratioLabel(node: HarmonicNode): string {
  return `${node.k}/${node.partial}`;
}

function fretLabel(node: HarmonicNode): string {
  const r = Math.round(node.fret);
  return Math.abs(node.fret - r) < 0.1 ? String(r) : node.fret.toFixed(1);
}

export function HarmonicNeck({
  string,
  partials,
  marks,
  ringing = null,
  keyColor,
  mirrored = false,
  showBody = true,
  labels = 'fret',
  onNodePress,
  describeNode,
}: HarmonicNeckProps) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const phase = useStandingWavePhase(ringing != null && !reduceMotion, 0.09);
  const svgRef = useRef<SVGSVGElement>(null);

  // Along the string, mirrored for a left-handed player.
  const X = (x: number) => (mirrored ? W - PAD_R - x * L : PAD_L + x * L);
  const neckEnd = positionOfFret(HARMONIC_NECK_FRETS);

  const rows = useMemo(
    () =>
      partials.map((partial) => ({
        partial,
        nodes: harmonicNodes(partial).filter((node) => showBody || node.onNeck),
      })),
    [partials, showBody],
  );
  const order = rows.flatMap((row) => row.nodes);
  const height = ROWS_TOP + rows.length * ROW_H + 6;

  const focusNode = (index: number) => {
    const target = svgRef.current?.querySelector<SVGGElement>(
      `[data-node-index="${index}"]`,
    );
    target?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<SVGGElement>, index: number) => {
    const node = order[index];
    const row = rows.findIndex((r) => r.partial === node.partial);
    let next = -1;
    // Along the string, in screen terms: mirrored, right is toward the nut.
    const toward = (dir: 1 | -1) => {
      const same = order
        .map((n, i) => ({ n, i }))
        .filter(({ n }) => n.partial === node.partial)
        .sort((a, b) => a.n.x - b.n.x);
      const at = same.findIndex(({ i }) => i === index);
      return same[at + dir]?.i ?? -1;
    };
    const rowStep = (dir: 1 | -1) => {
      const other = rows[row + dir];
      if (!other?.nodes.length) return -1;
      let best = other.nodes[0];
      for (const n of other.nodes) {
        if (Math.abs(n.x - node.x) < Math.abs(best.x - node.x)) best = n;
      }
      return order.indexOf(best);
    };
    if (event.key === 'ArrowRight') next = toward(mirrored ? -1 : 1);
    else if (event.key === 'ArrowLeft') next = toward(mirrored ? 1 : -1);
    else if (event.key === 'ArrowDown') next = rowStep(1);
    else if (event.key === 'ArrowUp') next = rowStep(-1);
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onNodePress?.(node);
      return;
    } else return;
    event.preventDefault();
    if (next >= 0) {
      focusNode(next);
      onNodePress?.(order[next]);
    }
  };

  // The one node in the tab order: the chosen one, or the first.
  const tabStop = Math.max(
    0,
    order.findIndex((n) => marks?.get(nodeId(n)) === 'selected'),
  );

  const ringingY = stringY(string);
  const ringingPath =
    ringing != null
      ? standingWavePath({
          harmonic: ringing,
          x0: X(0),
          x1: X(1),
          midY: ringingY,
          amplitude: reduceMotion ? 0 : 4.5,
          phase,
          resolution: 360,
        })
      : null;

  return (
    <svg
      ref={svgRef}
      data-harmonic-neck
      data-mirrored={mirrored || undefined}
      viewBox={`0 0 ${W} ${height}`}
      className="block h-auto w-full select-none"
      style={{ minWidth: NECK_MIN_WIDTH }}
      role="group"
      aria-label="The string from nut to bridge, with its harmonic nodes"
    >
      {/* The string's divisions: partial n's n arcs, faint; the sounding or
          chosen partial's in the key colour. */}
      <g aria-hidden data-neck-arcs>
        {rows.map(({ partial }) => {
          const marked = order.some(
            (n) =>
              n.partial === partial &&
              (marks?.get(nodeId(n)) === 'selected' ||
                marks?.get(nodeId(n)) === 'target'),
          );
          const lit = marked || ringing === partial;
          return Array.from({ length: partial }, (_, k) => {
            const a = X(k / partial);
            const b = X((k + 1) / partial);
            const r = Math.abs(b - a) / 2;
            const rise = Math.min(ARC_H, r * 0.9);
            const base = NECK_TOP - 4;
            return (
              <path
                key={`${partial}-${k}`}
                data-arc={partial}
                d={`M ${a} ${base} A ${r} ${rise} 0 0 ${mirrored ? 0 : 1} ${b} ${base}`}
                fill="none"
                stroke={lit ? keyColor : FAINT_ARC}
                strokeWidth={lit ? 1.6 : 1}
              />
            );
          });
        })}
      </g>

      {/* The neck: board, inlays, wires, nut, and past the 24th the body. */}
      <g aria-hidden>
        <rect
          x={Math.min(X(0), X(neckEnd))}
          y={NECK_TOP - 4}
          width={neckEnd * L}
          height={NECK_H + 8}
          rx={2}
          fill="rgba(255,255,255,0.025)"
        />
        <rect
          x={Math.min(X(neckEnd), X(1))}
          y={NECK_TOP - 4}
          width={(1 - neckEnd) * L}
          height={NECK_H + 8}
          rx={2}
          fill="rgba(255,255,255,0.012)"
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="2 3"
        />
        {SINGLE_INLAYS.map((f) => (
          <circle
            key={f}
            cx={X((positionOfFret(f - 1) + positionOfFret(f)) / 2)}
            cy={NECK_TOP + NECK_H / 2}
            r={3}
            fill={INLAY}
          />
        ))}
        {DOUBLE_INLAYS.map((f) =>
          [1.5, 3.5].map((s) => (
            <circle
              key={`${f}-${s}`}
              cx={X((positionOfFret(f - 1) + positionOfFret(f)) / 2)}
              cy={NECK_TOP + s * STRING_GAP}
              r={3}
              fill={INLAY}
            />
          )),
        )}
        {Array.from({ length: HARMONIC_NECK_FRETS }, (_, i) => i + 1).map(
          (f) => (
            <line
              key={f}
              x1={X(positionOfFret(f))}
              x2={X(positionOfFret(f))}
              y1={NECK_TOP - 4}
              y2={NECK_TOP + NECK_H + 4}
              stroke={WIRE}
              strokeWidth={1.25}
            />
          ),
        )}
        <line
          x1={X(0)}
          x2={X(0)}
          y1={NECK_TOP - 5}
          y2={NECK_TOP + NECK_H + 5}
          stroke={NUT}
          strokeWidth={3}
        />
        <rect
          x={X(1) - 2.5}
          y={NECK_TOP - 6}
          width={5}
          height={NECK_H + 12}
          rx={1}
          fill="rgba(255,255,255,0.35)"
        />
        <text
          x={X((neckEnd + 1) / 2)}
          y={NECK_TOP + NECK_H + 16}
          textAnchor="middle"
          fontSize={10}
          fill="rgba(255,255,255,0.3)"
        >
          body
        </text>
        {([1, 2, 3, 4, 5, 6] as const).map((s) =>
          s === string && ringingPath ? null : (
            <line
              key={s}
              x1={X(0)}
              x2={X(1)}
              y1={stringY(s)}
              y2={stringY(s)}
              stroke={s === string ? 'rgba(255,255,255,0.75)' : STRING}
              strokeWidth={s === string ? 1.6 : 0.9}
            />
          ),
        )}
        {ringingPath && (
          <path
            data-ringing={ringing}
            d={ringingPath}
            fill="none"
            stroke={keyColor}
            strokeWidth={1.8}
          />
        )}
        {FRET_NUMBERS.map((f) => (
          <text
            key={f}
            x={X((positionOfFret(f - 1) + positionOfFret(f)) / 2)}
            y={FRET_NUM_Y}
            textAnchor="middle"
            fontSize={10}
            fill={QUIET}
          >
            {f}
          </text>
        ))}
        <text
          x={mirrored ? X(0) + 6 : X(0) - 6}
          y={NECK_TOP + NECK_H / 2 + 3.5}
          textAnchor={mirrored ? 'start' : 'end'}
          fontSize={10}
          fill={QUIET}
        >
          nut
        </text>
      </g>

      {/* A row of nodes per partial. */}
      {rows.map(({ partial, nodes }, row) => {
        const y = ROWS_TOP + row * ROW_H + ROW_H / 2;
        return (
          <g key={partial} data-partial-row={partial}>
            <text
              aria-hidden
              x={mirrored ? W - 4 : 4}
              y={y + 3.5}
              textAnchor={mirrored ? 'end' : 'start'}
              fontSize={11}
              fill={QUIET}
            >
              {partial}
            </text>
            <line
              aria-hidden
              x1={X(0)}
              x2={X(1)}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
            />
            {nodes.map((node) => {
              const id = nodeId(node);
              const mark = marks?.get(id);
              const index = order.indexOf(node);
              const filled =
                mark === 'selected' || mark === 'target' || mark === 'passed';
              const cx = X(node.x);
              return (
                <g
                  key={id}
                  role="button"
                  tabIndex={index === tabStop ? 0 : -1}
                  aria-label={describeNode?.(node) ?? `Partial ${partial}`}
                  aria-pressed={mark === 'selected'}
                  data-node={id}
                  data-node-index={index}
                  data-mark={mark}
                  data-on-neck={node.onNeck || undefined}
                  onClick={() => onNodePress?.(node)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-white"
                >
                  {/* A guide up to the string, for the chosen node. */}
                  {(mark === 'selected' || mark === 'target') && (
                    <line
                      aria-hidden
                      x1={cx}
                      x2={cx}
                      y1={stringY(string)}
                      y2={y - NODE_R}
                      stroke={keyColor}
                      strokeWidth={1}
                      strokeDasharray="2 3"
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={y}
                    r={NODE_R}
                    fill={filled ? keyColor : RING_FILL}
                    stroke={
                      filled || mark === 'related'
                        ? keyColor
                        : 'rgba(255,255,255,0.35)'
                    }
                    strokeWidth={mark === 'related' ? 1.8 : 1.2}
                    strokeDasharray={mark === 'target' ? '3 2' : undefined}
                  />
                  {/* A larger target to press than the ring. */}
                  <circle cx={cx} cy={y} r={NODE_R + 3} fill="transparent" />
                  <text
                    aria-hidden
                    x={cx}
                    y={y + 3.5}
                    textAnchor="middle"
                    fontSize={labels === 'ratio' || node.fret >= 10 ? 8 : 9}
                    fill={filled ? '#101012' : 'rgba(255,255,255,0.85)'}
                    pointerEvents="none"
                  >
                    {mark === 'passed'
                      ? '✓'
                      : labels === 'ratio'
                        ? ratioLabel(node)
                        : fretLabel(node)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
