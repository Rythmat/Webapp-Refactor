/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react';
import type {
  Song,
  SongSection,
  ChordBar,
  ChordHit,
} from '@/curriculum/types/songLibrary';
import { chordNameToMidi } from '@/curriculum/songLibrary/chordParser';
import { isNoChord } from '@/curriculum/songLibrary/hybridDegree';
import { useLearnInstrument } from '@/features/learn/useInstrumentStore';
import { useChartNotation } from './chartNotationPreference';
import {
  opensPage,
  sectionRowSizes,
  songSystemOffsets,
} from '@/curriculum/songLibrary/systems';
import {
  sectionBars,
  sectionMeters,
  type LocalKey,
  type Meter,
} from '@/curriculum/songLibrary/performance';
import { useUISound } from '@/hooks/useUISound';
import {
  useChordNotation,
  type ChordContext,
  type ChordNotation,
} from '@/lib/chordNotation';
import {
  ChordDiagramCard,
  chordRgbFor,
  normalizeMode,
  type ChordRgb,
} from './ChordDiagramCard';
import type {
  BarRef,
  ChartSelection,
  ClickMods,
} from '@/lib/chartEditor/selection';
import {
  chordAriaLabel,
  chordSymbol,
  formatChord,
  songKeyMap,
  type DisplayMode,
} from './chordLabel';

// On guitar a clicked chord opens its guitar box instead of the keyboard:
// loaded on demand, so the guitar code stays out of the piano page.
const loadGuitarChordCard = () => import('./guitar/GuitarChordCard');
const GuitarChordCard = lazy(loadGuitarChordCard);

/* ── Types ───────────────────────────────────────────────────────────── */

/** Address of one chord within a song, used by the back-office editor. */
export interface ChordChartLoc {
  sectionIdx: number;
  barIdx: number;
  chordIdx: number;
}

/**
 * Back-office editing hooks. When `editable` is provided the chart becomes a
 * direct-manipulation surface: click an empty beat to add a chord, drag a chord
 * to another beat, +/- above each bar, and inline section controls. Entirely
 * absent for students, so their chart is unchanged.
 */
export interface ChordChartEditable {
  onAddChordAtBeat: (sectionIdx: number, barIdx: number, beat: number) => void;
  onMoveChord: (loc: ChordChartLoc, toBeat: number) => void;
  onInsertBar: (sectionIdx: number, atIdx: number) => void;
  onRemoveBar: (sectionIdx: number, barIdx: number) => void;
  onRenameSection: (sectionIdx: number, label: string) => void;
  onSetRepeat: (sectionIdx: number, repeatCount: number) => void;
  onRemoveSection: (sectionIdx: number) => void;
  onMoveSection: (sectionIdx: number, dir: -1 | 1) => void;
  onAddSection: () => void;
  sectionCount: number;
}

interface ChordChartProps {
  song: Song;
  loopSection?: number | null;
  onToggleLoop?: (sectionIdx: number) => void;
  /**
   * Editor hook (back office only). When set, clicking a chord selects it
   * (calling this) instead of opening the read-only diagram popup, and the
   * chord at `selection` is highlighted. Unset in the student-facing chart, so
   * that path is unchanged.
   */
  onSelectChord?: (loc: ChordChartLoc) => void;
  selection?: ChordChartLoc | null;
  editable?: ChordChartEditable;
  /**
   * The editor's bar selection, addressed by section and bar so it can run
   * across a section boundary — a phrase does not stop being a phrase because
   * the chart was cut into blocks there.
   */
  barSelection?: ChartSelection;
  /** A click on a bar's staff, with the modifiers that were held. */
  onPickBar?: (ref: BarRef, mods: ClickMods) => void;
  /**
   * Break the chart into pages of this many systems, for a music stand and
   * for print. The chart marks where each page begins — `data-page-start` for
   * a reader that scrolls to it, `break-before: page` for the printer — and
   * counts systems across section boundaries, so a page is always the same
   * number of staves whatever the sections do. Unset: one continuous chart.
   */
  systemsPerPage?: number;
  /** Drawn above the first section, inside the chart's scroller. */
  leading?: ReactNode;
}

/* ── Staff layout constants (matching LeadSheetMeasure) ──────────────── */
/** Exported: the admin chart editor lays its measures out on the same grid. */
export const MEASURE_WIDTH = 240;
export const STAFF_HEIGHT = 40;
export const CHORD_AREA_HEIGHT = 45;
export const LINE_SPACING = STAFF_HEIGHT / 4;
export const TOTAL_HEIGHT = CHORD_AREA_HEIGHT + STAFF_HEIGHT + 16;
export const MEASURES_PER_ROW = 4;
/** Room a time signature takes at the head of the bar it opens. */
const METER_WIDTH = 22;
/** Room a start-repeat sign takes when it follows a time signature. */
const REPEAT_SIGN_WIDTH = 14;

/* ── Helpers ─────────────────────────────────────────────────────────── */

/* ── SVG Staff Measure ───────────────────────────────────────────────── */
/**
 * One measure of the lead sheet. Exported so the content back office renders
 * bars with the identical notation instead of an approximation of it.
 */
export const StaffMeasure: FC<{
  bar: ChordBar;
  barIndex: number;
  x: number;
  width: number;
  displayMode: DisplayMode;
  /** Chord notation for the labels; unset is hybrid (the `displayMode` label). */
  notation?: ChordNotation;
  /** The song's key, which jazz and Roman labels are written in. */
  chordContext?: ChordContext;
  isFirst: boolean;
  /**
   * Beats in this bar — the song's time-signature numerator. Chord `beat` and
   * `duration` are written in those units (a 6/8 chart holds a chord for
   * `duration: 6`), so the slashes and the beat grid have to count the same
   * way or a 3/4 bar is drawn as a 4/4 one.
   */
  beatsPerBar?: number;
  /** Set only on the chart's very first bar: the metre a chart opens with. */
  openingMeter?: Meter;
  /** This bar's segno/coda is drawn with the section marker, not in the bar. */
  signsInHeader?: boolean;
  hasRepeatStart?: boolean;
  hasRepeatEnd?: boolean;
  onChordClick?: (hit: ChordHit) => void;
  sectionIdx: number;
  onSelectChord?: (loc: ChordChartLoc) => void;
  selection?: ChordChartLoc | null;
  editable?: ChordChartEditable;
  /** Highlighted as part of the editor's bar selection. */
  barSelected?: boolean;
  /** Clicking the staff picks the bar; clicking above it picks a chord. */
  onPickBar?: (mods: { shift: boolean; toggle: boolean }) => void;
}> = ({
  bar,
  barIndex,
  x,
  width,
  displayMode,
  notation,
  chordContext,
  isFirst,
  beatsPerBar = 4,
  openingMeter,
  signsInHeader,
  hasRepeatStart,
  hasRepeatEnd,
  onChordClick,
  sectionIdx,
  onSelectChord,
  selection,
  editable,
  barSelected,
  onPickBar,
}) => {
  const staffTop = CHORD_AREA_HEIGHT;
  // A metre is engraved on the staff, stacked like a fraction, and the bars
  // it opens start after it — the same room a printed chart gives it.
  const meter = bar.timeSignature ?? openingMeter;
  // A start repeat comes after the metre, as in print: |  4/4  ‖:  ♪
  const repeatX = meter ? METER_WIDTH : 0;
  const inset = repeatX + (meter && hasRepeatStart ? REPEAT_SIGN_WIDTH : 0);
  const cellW = (width - inset) / beatsPerBar;

  const isMultiBarRest = bar.restBars != null && bar.restBars > 0;

  // Which beat (1–4) a pointer is over, from its client x within this bar.
  const drag = useRef<{
    chordIdx: number;
    startX: number;
    moved: boolean;
  } | null>(null);
  const beatFromEvent = (e: React.PointerEvent): number => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return 1;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return 1;
    const local = pt.matrixTransform(ctm.inverse()).x - x - inset;
    return Math.max(1, Math.min(beatsPerBar, Math.floor(local / cellW) + 1));
  };

  const occupied = new Set(bar.chords.map((h) => Math.floor(h.beat)));

  return (
    <g transform={`translate(${x}, 0)`}>
      {/* The editor's bar selection, washed behind the staff rather than
          outlined around it: an outline reads as a barline. */}
      {barSelected && (
        <rect
          x={0}
          y={staffTop - 6}
          width={width}
          height={STAFF_HEIGHT + 12}
          fill="#7ecfcf"
          opacity={0.12}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Measure number */}
      <text x={2} y={10} fill="currentColor" fontSize={10} opacity={0.35}>
        {barIndex + 1}
      </text>

      {/* Click-an-empty-beat-to-add targets (editor only).
          They cover the STAFF as well as the chord space above it, because
          the staff is where a beat visibly is — the slashes mark them — and
          a target only in the empty space above reads as no target at all. */}
      {editable &&
        !isMultiBarRest &&
        Array.from({ length: beatsPerBar }, (_, c) =>
          occupied.has(c + 1) ? null : (
            <rect
              key={`add-${c}`}
              x={inset + c * cellW}
              y={16}
              width={cellW}
              height={staffTop + STAFF_HEIGHT - 16}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() =>
                editable.onAddChordAtBeat(sectionIdx, barIndex, c + 1)
              }
            >
              <title>Add chord on beat {c + 1}</title>
            </rect>
          ),
        )}

      {/* Chord names above staff (skip for multi-bar rests) */}
      {!isMultiBarRest &&
        bar.chords.map((hit, i) => {
          const beatPos = hit.beat - 1;
          const cx = inset + (beatPos / beatsPerBar) * (width - inset) + 4;
          const symbol = notation
            ? chordSymbol(hit, notation, chordContext ?? {})
            : null;
          const label = symbol ?? formatChord(hit, displayMode);
          const loc = { sectionIdx, barIdx: barIndex, chordIdx: i };
          const isSelected =
            selection != null &&
            selection.sectionIdx === sectionIdx &&
            selection.barIdx === barIndex &&
            selection.chordIdx === i;
          const pointerProps = editable
            ? {
                onPointerDown: (e: React.PointerEvent) => {
                  (e.currentTarget as Element).setPointerCapture(e.pointerId);
                  drag.current = {
                    chordIdx: i,
                    startX: e.clientX,
                    moved: false,
                  };
                },
                onPointerMove: (e: React.PointerEvent) => {
                  if (
                    drag.current &&
                    Math.abs(e.clientX - drag.current.startX) > 3
                  )
                    drag.current.moved = true;
                },
                onPointerUp: (e: React.PointerEvent) => {
                  const d = drag.current;
                  drag.current = null;
                  if (d?.moved) {
                    const beat = beatFromEvent(e);
                    if (beat !== Math.floor(hit.beat))
                      editable.onMoveChord(loc, beat);
                    else onSelectChord?.(loc);
                  } else {
                    onSelectChord?.(loc);
                  }
                },
              }
            : {
                onClick: () =>
                  onSelectChord ? onSelectChord(loc) : onChordClick?.(hit),
              };
          return (
            <text
              key={`chord-${i}`}
              x={cx}
              y={staffTop - 4}
              fill={isSelected ? '#7ecfcf' : 'currentColor'}
              fontSize={14}
              fontWeight="bold"
              fontFamily="serif"
              opacity={isSelected ? 1 : 0.85}
              tabIndex={0}
              role="button"
              aria-label={chordAriaLabel(hit, symbol)}
              style={{ cursor: editable ? 'grab' : 'pointer' }}
              {...pointerProps}
            >
              {label}
            </text>
          );
        })}

      {/* Roadmap marks, in one lane right above this bar's own staff: the
          signs and cue at its start, the jumps at its end. They must read as
          attached to this staff, not to the system above. */}
      <BarMarks
        bar={bar}
        width={width}
        y={staffTop - 22}
        signsInHeader={signsInHeader}
      />

      {/* Fermata symbol above the bar */}
      {bar.fermata && (
        <g transform={`translate(${width / 2}, ${staffTop - 8})`}>
          {/* Arc */}
          <path
            d="M -8 0 A 8 6 0 0 1 8 0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          />
          {/* Dot */}
          <circle cx={0} cy={-1} r={1.5} fill="currentColor" />
        </g>
      )}

      {/* The metre, stacked on the staff as a chart engraves it: the
          numerator across the upper two spaces, the denominator the lower. */}
      {meter && (
        <g
          aria-label={`${meter[0]}/${meter[1]} time`}
          fill="currentColor"
          style={{ fontFamily: 'serif', fontWeight: 700 }}
          textAnchor="middle"
        >
          <text
            x={METER_WIDTH / 2}
            y={staffTop + LINE_SPACING * 1.72}
            fontSize={26}
          >
            {meter[0]}
          </text>
          <text
            x={METER_WIDTH / 2}
            y={staffTop + LINE_SPACING * 3.72}
            fontSize={26}
          >
            {meter[1]}
          </text>
        </g>
      )}

      {/* Staff lines (5) */}
      {Array.from({ length: 5 }, (_, i) => (
        <line
          key={i}
          x1={0}
          y1={staffTop + i * LINE_SPACING}
          x2={width}
          y2={staffTop + i * LINE_SPACING}
          stroke="currentColor"
          strokeWidth={0.8}
          opacity={0.4}
        />
      ))}

      {/* Multi-bar rest notation */}
      {isMultiBarRest ? (
        <g>
          {/* Number above */}
          <text
            x={width / 2}
            y={staffTop + LINE_SPACING * 0.8}
            fill="currentColor"
            fontSize={16}
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="serif"
          >
            {bar.restBars}
          </text>
          {/* Thick horizontal block spanning middle two staff lines */}
          <rect
            x={width * 0.15}
            y={staffTop + LINE_SPACING * 1.5}
            width={width * 0.7}
            height={LINE_SPACING}
            fill="currentColor"
            opacity={0.7}
          />
          {/* Left vertical serif */}
          <line
            x1={width * 0.15}
            y1={staffTop + LINE_SPACING}
            x2={width * 0.15}
            y2={staffTop + LINE_SPACING * 3}
            stroke="currentColor"
            strokeWidth={2}
            opacity={0.7}
          />
          {/* Right vertical serif */}
          <line
            x1={width * 0.85}
            y1={staffTop + LINE_SPACING}
            x2={width * 0.85}
            y2={staffTop + LINE_SPACING * 3}
            stroke="currentColor"
            strokeWidth={2}
            opacity={0.7}
          />
        </g>
      ) : (
        /* Beat slashes (4 per measure) — only for normal bars */
        Array.from({ length: beatsPerBar }, (_, beat) => {
          const bx = inset + (beat + 0.5) * cellW;
          const cy = staffTop + STAFF_HEIGHT / 2;
          return (
            <line
              key={`slash-${beat}`}
              x1={bx - 5}
              y1={cy + 6}
              x2={bx + 5}
              y2={cy - 6}
              stroke="currentColor"
              strokeWidth={2}
              opacity={0.3}
            />
          );
        })
      )}

      {/* Picking the bar, on its own rail under the staff. It used to be the
          staff itself, which took the beats with it: a click where a slash is
          is a click on a beat, and the editor answered by selecting the bar.
          The rail is thin, it is always in the same place, and it competes
          with nothing. */}
      {onPickBar && (
        <>
          <line
            x1={1}
            y1={staffTop + STAFF_HEIGHT + 7}
            x2={width - 1}
            y2={staffTop + STAFF_HEIGHT + 7}
            stroke={barSelected ? '#7ecfcf' : 'currentColor'}
            strokeWidth={barSelected ? 3 : 1}
            opacity={barSelected ? 0.9 : 0.18}
            style={{ pointerEvents: 'none' }}
          />
          <rect
            x={0}
            y={staffTop + STAFF_HEIGHT + 1}
            width={width}
            height={13}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onPickBar({
                shift: e.shiftKey,
                toggle: e.metaKey || e.ctrlKey,
              });
            }}
          >
            <title>
              Bar {barIndex + 1} — click to select, shift-click for a run
            </title>
          </rect>
        </>
      )}

      {/* Left bar line (first measure gets thicker). With a metre in front
          of the repeat it stays a plain opening line; the repeat's own thick
          line moves to after the metre. */}
      {(isFirst || hasRepeatStart) && (
        <line
          x1={0}
          y1={staffTop}
          x2={0}
          y2={staffTop + STAFF_HEIGHT}
          stroke="currentColor"
          strokeWidth={hasRepeatStart && !meter ? 2.5 : 2}
          opacity={hasRepeatStart && !meter ? 0.8 : 0.5}
        />
      )}

      {/* Repeat start sign |: */}
      {hasRepeatStart && (
        <g transform={`translate(${repeatX}, 0)`}>
          {meter != null && (
            <line
              x1={0}
              y1={staffTop}
              x2={0}
              y2={staffTop + STAFF_HEIGHT}
              stroke="currentColor"
              strokeWidth={2.5}
              opacity={0.8}
            />
          )}
          <line
            x1={3}
            y1={staffTop}
            x2={3}
            y2={staffTop + STAFF_HEIGHT}
            stroke="currentColor"
            strokeWidth={2}
          />
          <circle
            cx={10}
            cy={staffTop + LINE_SPACING * 1.5}
            r={2.5}
            fill="currentColor"
          />
          <circle
            cx={10}
            cy={staffTop + LINE_SPACING * 2.5}
            r={2.5}
            fill="currentColor"
          />
        </g>
      )}

      {/* Right bar line */}
      <line
        x1={width}
        y1={staffTop}
        x2={width}
        y2={staffTop + STAFF_HEIGHT}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.5}
      />

      {/* Repeat end sign */}
      {hasRepeatEnd && (
        <>
          <line
            x1={width - 3}
            y1={staffTop}
            x2={width - 3}
            y2={staffTop + STAFF_HEIGHT}
            stroke="currentColor"
            strokeWidth={2}
          />
          <circle
            cx={width - 10}
            cy={staffTop + LINE_SPACING * 1.5}
            r={2.5}
            fill="currentColor"
          />
          <circle
            cx={width - 10}
            cy={staffTop + LINE_SPACING * 2.5}
            r={2.5}
            fill="currentColor"
          />
        </>
      )}

      {/* Add / remove bar controls (editor only) */}
      {editable && (
        <g>
          <circle
            cx={width / 2 - 11}
            cy={9}
            r={7}
            fill="rgba(255,255,255,0.08)"
            stroke="currentColor"
            strokeOpacity={0.25}
            style={{ cursor: 'pointer' }}
            onClick={() => editable.onRemoveBar(sectionIdx, barIndex)}
          >
            <title>Remove this bar</title>
          </circle>
          <line
            x1={width / 2 - 14}
            y1={9}
            x2={width / 2 - 8}
            y2={9}
            stroke="currentColor"
            strokeWidth={1.5}
            opacity={0.7}
            pointerEvents="none"
          />
          <circle
            cx={width / 2 + 11}
            cy={9}
            r={7}
            fill="rgba(255,255,255,0.08)"
            stroke="currentColor"
            strokeOpacity={0.25}
            style={{ cursor: 'pointer' }}
            onClick={() => editable.onInsertBar(sectionIdx, barIndex + 1)}
          >
            <title>Insert a bar after this one</title>
          </circle>
          <line
            x1={width / 2 + 8}
            y1={9}
            x2={width / 2 + 14}
            y2={9}
            stroke="currentColor"
            strokeWidth={1.5}
            opacity={0.7}
            pointerEvents="none"
          />
          <line
            x1={width / 2 + 11}
            y1={6}
            x2={width / 2 + 11}
            y2={12}
            stroke="currentColor"
            strokeWidth={1.5}
            opacity={0.7}
            pointerEvents="none"
          />
        </g>
      )}
    </g>
  );
};

/* ── Roadmap band ────────────────────────────────────────────────────── */
/** Height of the band above a row that carries roadmap marks. */
const ROADMAP_BAND = 16;

/** Only the volta brackets need room above the row; the rest sit by the staff. */
const hasRoadmapMarks = (bar: ChordBar): boolean => !!bar.ending;

const sameEnding = (a?: number[], b?: number[]): boolean =>
  !!a && !!b && a.join() === b.join();

/** The coda sign: a circle crossed through, drawn so it needs no music font. */
const CodaSign: FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`} aria-label="Coda">
    <ellipse
      rx={4.5}
      ry={6}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    />
    <line
      x1={-8}
      y1={0}
      x2={8}
      y2={0}
      stroke="currentColor"
      strokeWidth={1.2}
    />
    <line
      x1={0}
      y1={-9}
      x2={0}
      y2={9}
      stroke="currentColor"
      strokeWidth={1.2}
    />
  </g>
);

/** The segno: an S struck through with a slash and two dots. */
const SegnoSign: FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`} aria-label="Segno">
    <text
      x={0}
      y={5}
      textAnchor="middle"
      fontFamily="serif"
      fontStyle="italic"
      fontSize={17}
      fill="currentColor"
    >
      S
    </text>
    <line
      x1={-6}
      y1={7}
      x2={6}
      y2={-8}
      stroke="currentColor"
      strokeWidth={1.2}
    />
    <circle cx={-6} cy={-2} r={1.4} fill="currentColor" />
    <circle cx={6} cy={1} r={1.4} fill="currentColor" />
  </g>
);

/**
 * A segno or coda in the HTML flow, for the lane above a section marker. The
 * two signs mark WHERE THE FORM RETURNS TO, which is a property of the section,
 * not of its first chord — so they are drawn with the marker rather than inside
 * bar 1, where they read as one more symbol in the staff.
 */
const SectionSign: FC<{ kind: 'segno' | 'coda' }> = ({ kind }) => (
  <svg
    width={20}
    height={20}
    viewBox="-10 -10 20 20"
    style={{ display: 'block', overflow: 'visible' }}
  >
    {kind === 'segno' ? <SegnoSign x={0} y={0} /> : <CodaSign x={0} y={0} />}
  </svg>
);

/**
 * A bar's roadmap marks, drawn in the lane immediately above its own staff:
 * segno, coda sign, key change and cue at the bar's start; "To Coda", Fine,
 * a repeat count and a jump at its end. Keeping them inside the measure is
 * what makes them read as belonging to THIS staff — sitting them in a band at
 * the top of the row put a D.S. closer to the system above it than to its own.
 */
const BarMarks: FC<{
  bar: ChordBar;
  width: number;
  y: number;
  /** The section marker above is carrying this bar's segno/coda instead. */
  signsInHeader?: boolean;
}> = ({ bar, width, y, signsInHeader }) => {
  let leftX = 6;
  const signs: React.ReactNode[] = [];
  if (bar.segno && !signsInHeader) {
    signs.push(<SegnoSign key="segno" x={leftX + 6} y={y - 5} />);
    leftX += 20;
  }
  if (bar.coda && !signsInHeader) {
    signs.push(<CodaSign key="coda" x={leftX + 6} y={y - 5} />);
    leftX += 20;
  }
  const words = [
    // No metre here: it is engraved on the staff, where a chart puts it.
    bar.keyChange ? `Key: ${bar.keyChange.replace(/ major$/, '')}` : null,
    bar.cue ?? null,
  ].filter(Boolean);
  const jumps = [
    bar.repeatEnd && (bar.repeatTimes ?? 2) > 2 ? `${bar.repeatTimes}×` : null,
    bar.fine ? 'Fine' : null,
    bar.jump ?? null,
  ].filter(Boolean);

  return (
    <g style={{ fontFamily: 'serif' }} fill="currentColor">
      {signs}
      {words.length > 0 && (
        <text
          x={leftX}
          y={y}
          fontSize={12}
          fontStyle="italic"
          fontWeight="bold"
        >
          {words.join('  ·  ')}
        </text>
      )}
      {bar.toCoda && (
        <g>
          <text
            x={width - 24}
            y={y}
            fontSize={12}
            fontStyle="italic"
            fontWeight="bold"
            textAnchor="end"
          >
            To Coda
          </text>
          <CodaSign x={width - 12} y={y - 5} />
        </g>
      )}
      {jumps.length > 0 && (
        <text
          x={width - 6}
          y={bar.toCoda ? y + 14 : y}
          fontSize={12}
          fontStyle="italic"
          fontWeight="bold"
          textAnchor="end"
        >
          {jumps.join('  ')}
        </text>
      )}
    </g>
  );
};

/** The volta brackets over a row's endings. */
const RoadmapBand: FC<{
  row: ChordBar[];
  /** The bar before the row, so an ending bracket carried over a line break
   *  isn't numbered twice. */
  prevBar?: ChordBar;
  band: number;
  barWidth: number;
}> = ({ row, prevBar, band, barWidth }) => (
  <g style={{ fontFamily: 'serif' }} fill="currentColor">
    {row.map((bar, bi) => {
      if (!bar.ending) return null;
      const x = bi * barWidth;
      const w = barWidth;
      const before = bi === 0 ? prevBar : row[bi - 1];
      const after = row[bi + 1];
      const opensEnding = !sameEnding(bar.ending, before?.ending);
      const closesEnding = !sameEnding(bar.ending, after?.ending);
      return (
        <g key={bi}>
          <g stroke="currentColor" strokeWidth={1.2} fill="none">
            <line
              x1={x + (opensEnding ? 1 : 0)}
              y1={band - 2}
              x2={x + w - (closesEnding ? 6 : 0)}
              y2={band - 2}
            />
            {opensEnding && (
              <line x1={x + 1} y1={band - 2} x2={x + 1} y2={band + 12} />
            )}
            {/* An ending that repeats is closed at the right; the last is open. */}
            {closesEnding && bar.repeatEnd && (
              <line
                x1={x + w - 6}
                y1={band - 2}
                x2={x + w - 6}
                y2={band + 12}
              />
            )}
          </g>
          {opensEnding && (
            // Clear of the bar number in the bar's top corner.
            <text
              x={x + 18}
              y={band + 10}
              fontSize={11}
              fontWeight="bold"
              stroke="none"
            >
              {bar.ending.join(', ')}.
            </text>
          )}
        </g>
      );
    })}
  </g>
);

/* ── Section Staff System ────────────────────────────────────────────── */
const SectionStaff: FC<{
  section: SongSection;
  sectionIdx: number;
  /** The metre each bar of this section is in, for the slashes and the beat
   *  grid. A mixed-metre chart draws each bar in its own. */
  barMeters: Meter[];
  displayMode: DisplayMode;
  notation: ChordNotation;
  /** The key each bar of this section is written in. */
  barKeys: LocalKey[];
  isLooping?: boolean;
  onChordClick?: (hit: ChordHit) => void;
  onToggleLoop?: (sectionIdx: number) => void;
  onSelectChord?: (loc: ChordChartLoc) => void;
  selection?: ChordChartLoc | null;
  editable?: ChordChartEditable;
  /** The chart's opening metre, passed only to the section that starts it. */
  openingMeter?: Meter;
  /** Which bars of this section the editor has selected. */
  selectedBars?: ReadonlySet<number>;
  onPickBar?: (
    barIdx: number,
    mods: { shift: boolean; toggle: boolean },
  ) => void;
  /** How many systems the sections above this one used. */
  systemOffset: number;
  systemsPerPage?: number;
}> = ({
  section,
  sectionIdx,
  barMeters,
  openingMeter,
  displayMode,
  notation,
  barKeys,
  isLooping,
  onChordClick,
  onToggleLoop,
  onSelectChord,
  selection,
  editable,
  selectedBars,
  onPickBar,
  systemOffset,
  systemsPerPage,
}) => {
  // The legacy repeatCount drawn as the repeat barlines it stands for.
  const bars = sectionBars(section);
  const perRow = section.measuresPerRow ?? MEASURES_PER_ROW;
  const rows: ChordBar[][] = [];
  const rowStarts: number[] = [];
  let at = 0;
  // sectionRowSizes, not systemRowSizes: the same call songSystemOffsets makes
  // to COUNT the systems has to be the one that LAYS THEM OUT, or a section
  // with its own measuresPerRow is numbered one way and drawn another. The
  // page marks are keyed on those numbers, so a page break then lands on a
  // system that is never drawn and the printer runs two pages into one.
  for (const size of sectionRowSizes(section)) {
    rowStarts.push(at);
    rows.push(bars.slice(at, at + size));
    at += size;
  }

  // A segno or coda on the section's first bar is drawn above the marker, where
  // it reads as "the form comes back HERE" rather than as a chord decoration.
  // A section with no marker of its own keeps its signs in the bar.
  const hasMarker = !!editable || !!section.label;
  const opensOnSegno = hasMarker && !!bars[0]?.segno;
  const opensOnCoda = hasMarker && !!bars[0]?.coda;
  const signsInHeader = opensOnSegno || opensOnCoda;

  // A page that opens on this section opens on its heading, not between the
  // heading and its first staff.
  const sectionOpensPage = opensPage(systemOffset, systemsPerPage);

  // On a page, the space between sections is space a staff could have used.
  // A chart of short sections spends nearly a third of its height on headings
  // and the air around them, and every pixel of it comes off the staves once
  // the page is scaled to fit. Reading down the page is tighter than reading
  // down a scroll, so the gaps close.
  const paged = !!systemsPerPage;
  const sectionGap = paged ? '0.4rem' : 'clamp(1rem, 2vw, 1.5rem)';
  const headerGap = paged ? '0.1rem' : 'clamp(0.3rem, 0.5vw, 0.4rem)';
  const rowGap = paged ? 2 : 4;

  return (
    <div
      data-chart-section={sectionIdx}
      {...(sectionOpensPage ? { 'data-page-start': systemOffset } : {})}
      style={{
        marginBottom: sectionGap,
        ...(sectionOpensPage ? { breakBefore: 'page' as const } : {}),
      }}
    >
      {signsInHeader && (
        <div
          className="flex items-center gap-2"
          style={{
            marginBottom: 'clamp(0.1rem, 0.2vw, 0.2rem)',
            color: 'var(--color-text, #e8e8f0)',
          }}
        >
          {opensOnSegno && <SectionSign kind="segno" />}
          {opensOnCoda && <SectionSign kind="coda" />}
        </div>
      )}
      {/* Section header — inline-editable controls in the editor */}
      {editable ? (
        <div
          className="flex flex-wrap items-center gap-1.5"
          style={{ marginBottom: headerGap }}
        >
          <input
            value={section.label}
            onChange={(e) =>
              editable.onRenameSection(sectionIdx, e.target.value)
            }
            placeholder="Section label"
            className="rounded border border-white/10 bg-transparent px-2 py-0.5 font-bold text-white/70 outline-none placeholder:text-white/25"
            style={{
              fontFamily: 'serif',
              fontSize: 'clamp(0.7rem, 1vw, 0.85rem)',
            }}
          />
          <div className="flex items-center gap-1 text-xs text-white/40">
            <button
              type="button"
              aria-label="Fewer repeats"
              className="rounded px-1 hover:bg-white/10"
              onClick={() =>
                editable.onSetRepeat(
                  sectionIdx,
                  Math.max(1, (section.repeatCount ?? 1) - 1),
                )
              }
            >
              <Minus size={12} />
            </button>
            <span className="inline-flex items-center gap-0.5">
              <Repeat size={10} />×{section.repeatCount ?? 1}
            </span>
            <button
              type="button"
              aria-label="More repeats"
              className="rounded px-1 hover:bg-white/10"
              onClick={() =>
                editable.onSetRepeat(sectionIdx, (section.repeatCount ?? 1) + 1)
              }
            >
              <Plus size={12} />
            </button>
          </div>
          <button
            type="button"
            aria-label="Move section up"
            disabled={sectionIdx === 0}
            className="rounded px-1 text-white/40 hover:bg-white/10 disabled:opacity-30"
            onClick={() => editable.onMoveSection(sectionIdx, -1)}
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            aria-label="Move section down"
            disabled={sectionIdx === editable.sectionCount - 1}
            className="rounded px-1 text-white/40 hover:bg-white/10 disabled:opacity-30"
            onClick={() => editable.onMoveSection(sectionIdx, 1)}
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            aria-label="Delete section"
            className="rounded px-1 text-red-400/70 hover:bg-white/10 hover:text-red-400"
            onClick={() => editable.onRemoveSection(sectionIdx)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : section.label ? (
        <div
          className="flex items-center gap-2"
          style={{ marginBottom: headerGap }}
        >
          <button
            onClick={() => onToggleLoop?.(sectionIdx)}
            className={`font-bold inline-block cursor-pointer transition-colors ${
              isLooping ? 'text-[#7ecfcf] border-[#7ecfcf]' : 'text-white/60'
            } hover:text-[#7ecfcf]`}
            style={{
              fontFamily: 'serif',
              fontSize: 'clamp(0.7rem, 1vw, 0.85rem)',
              padding: '2px 8px',
              border: '1px solid currentColor',
              borderRadius: 2,
              background: isLooping ? 'rgba(126,207,207,0.1)' : 'transparent',
            }}
            title={
              isLooping ? 'Click to stop looping' : 'Click to loop this section'
            }
          >
            {section.label}
          </button>
          {section.instrumental && (
            <span
              className="italic text-white/45"
              style={{
                fontFamily: 'serif',
                fontSize: 'clamp(0.55rem, 0.8vw, 0.7rem)',
              }}
            >
              {section.instrumental === 'first-time'
                ? 'Instrumental 1st time'
                : 'Instrumental'}
            </span>
          )}
          {isLooping && (
            <span
              className="flex items-center gap-1 text-[#7ecfcf]"
              style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.6rem)' }}
            >
              <Repeat size={10} /> Loop
            </span>
          )}
        </div>
      ) : null}

      {/* Staff rows — each row stretches full width */}
      {rows.map((row, ri) => {
        // Every system is the same page width, so every staff draws at the
        // same height: a five- or six-bar system narrows its bars to fit, and
        // a short row keeps full-size bars from the left.
        const viewW = perRow * MEASURE_WIDTH;
        const barW = row.length > perRow ? viewW / row.length : MEASURE_WIDTH;
        const globalBarOffset = rowStarts[ri];
        // Rows with roadmap marks get a band above the chords to hold them.
        const band = row.some(hasRoadmapMarks) ? ROADMAP_BAND : 0;
        const system = systemOffset + ri;
        // The section wrapper already carries the break for its own first row.
        const rowOpensPage = ri > 0 && opensPage(system, systemsPerPage);
        return (
          <div
            key={ri}
            data-chart-system={system}
            {...(rowOpensPage ? { 'data-page-start': system } : {})}
            style={{
              marginBottom: rowGap,
              ...(rowOpensPage ? { breakBefore: 'page' as const } : {}),
            }}
          >
            <svg
              width="100%"
              viewBox={`0 0 ${viewW} ${TOTAL_HEIGHT + band}`}
              preserveAspectRatio="xMinYMid meet"
              style={{ color: 'var(--color-text, #e8e8f0)', display: 'block' }}
            >
              {band > 0 && (
                <RoadmapBand
                  row={row}
                  prevBar={bars[globalBarOffset - 1]}
                  band={band}
                  barWidth={barW}
                />
              )}
              {row.map((bar, bi) => {
                const globalBi = globalBarOffset + bi;
                const key = barKeys[globalBi];
                return (
                  <g key={bi} transform={`translate(0, ${band})`}>
                    <StaffMeasure
                      bar={bar}
                      barIndex={globalBi}
                      beatsPerBar={barMeters[globalBi]?.[0] ?? 4}
                      barSelected={selectedBars?.has(globalBi)}
                      onPickBar={
                        onPickBar
                          ? (mods) => onPickBar(globalBi, mods)
                          : undefined
                      }
                      x={bi * barW}
                      width={barW}
                      displayMode={displayMode}
                      notation={notation}
                      chordContext={
                        key
                          ? {
                              keyRootPc: key.tonicPc,
                              mode: normalizeMode(key.mode),
                            }
                          : {}
                      }
                      isFirst={bi === 0 && ri === 0}
                      openingMeter={globalBi === 0 ? openingMeter : undefined}
                      signsInHeader={globalBi === 0 && signsInHeader}
                      hasRepeatStart={!!bar.repeatStart}
                      hasRepeatEnd={!!bar.repeatEnd}
                      onChordClick={onChordClick}
                      sectionIdx={sectionIdx}
                      onSelectChord={onSelectChord}
                      selection={selection}
                      editable={editable}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
};

/* ── Main Component ─────────────────────────────────────────────────── */
export const ChordChart: FC<ChordChartProps> = ({
  song,
  loopSection,
  onToggleLoop,
  onSelectChord,
  selection,
  editable,
  barSelection,
  onPickBar,
  systemsPerPage,
  leading,
}) => {
  // Letters or numbers, as the reader chose. The editor is pinned to the
  // chart's own labels so it always edits what is stored.
  const [chartNotation] = useChartNotation();
  const displayMode: DisplayMode =
    editable || onSelectChord
      ? 'chordName'
      : chartNotation === 'numbers'
        ? 'hybrid'
        : 'chordName';
  // The back-office editor works on the raw chord data, so it keeps the chart's
  // own labels whatever notation the user picked.
  const pickedNotation = useChordNotation();
  const notation: ChordNotation =
    editable || onSelectChord || displayMode === 'hybrid'
      ? 'hybrid'
      : pickedNotation;
  // A chart counts in its own metre: a 6/8 bar holds six, a 7/4 bar seven.
  // Drawing every bar with four slashes is what made the library's seventeen
  // non-4/4 songs read wrong. And a bar may change it mid-chart — Contusion
  // has two 5/4 bars in a 4/4 song — so this is per bar, not per song.
  const barMeters = useMemo(() => sectionMeters(song), [song]);

  // The selection arrives addressed by section and bar; each section wants
  // the bars that are its own, as a set it can ask about per bar.
  const selectedPerSection = useMemo(() => {
    const out = new Map<number, Set<number>>();
    if (barSelection?.kind !== 'bars') return out;
    for (const ref of barSelection.refs) {
      if (!out.has(ref.section)) out.set(ref.section, new Set());
      out.get(ref.section)!.add(ref.bar);
    }
    return out;
  }, [barSelection]);

  // Systems used by the sections above each one, so a page is the same number
  // of staves whether or not a section boundary falls inside it.
  const systemOffsets = useMemo(() => songSystemOffsets(song), [song]);

  // The key of every written bar, grouped by section: a key change moves the
  // chord symbols, degrees and colours to the new tonic from that bar on.
  const { sectionKeys, keyOfHit } = useMemo(() => songKeyMap(song), [song]);
  const contextFor = (hit: ChordHit): ChordContext => {
    const key = keyOfHit.get(hit);
    return key
      ? { keyRootPc: key.tonicPc, mode: normalizeMode(key.mode) }
      : { keyRootPc: song.keyRoot, mode: normalizeMode(song.mode) };
  };
  const [selectedChord, setSelectedChord] = useState<{
    hit: ChordHit;
    midi: number[];
    rgb: ChordRgb | null;
  } | null>(null);
  const { play } = useUISound();
  // The student's chart on guitar: a chord opens its guitar box. The editor
  // keeps its own popup.
  const guitarPopup =
    useLearnInstrument() === 'guitar' && !onSelectChord && !editable;
  useEffect(() => {
    if (guitarPopup) void loadGuitarChordCard();
  }, [guitarPopup]);

  // Map each unique chord name → its Studio key-color RGB tuple. Routed
  // through MIDI (via chordNameToMidi) so we don't have to translate the
  // song's degree strings (`'1 maj'`, `'♭7 maj'`) into Studio's format.
  const handleChordClick = (hit: ChordHit) => {
    play('click');
    const midi = chordNameToMidi(hit.chordName);
    // Guitar boxes cover chords the keyboard can't spell (F7(no 3)).
    if (guitarPopup ? isNoChord(hit.chordName) : midi.length === 0) return;
    const key = keyOfHit.get(hit);
    const rgb = key
      ? chordRgbFor(hit.chordName, 60 + key.tonicPc, key.mode)
      : chordRgbFor(hit.chordName, song.keyRoot, song.mode);
    setSelectedChord({ hit, midi, rgb });
  };

  // In jazz or Roman the popup titles the chord with that one symbol; hybrid
  // keeps the letter name over the degree.
  const selectedSymbol = selectedChord
    ? chordSymbol(selectedChord.hit, notation, contextFor(selectedChord.hit))
    : null;

  return (
    <div className="flex flex-col h-full min-w-0 max-w-full overflow-x-hidden">
      {/* ── Lead Sheet Staff ── */}
      <div
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {leading}
        {song.sections.map((section, si) => (
          <SectionStaff
            key={section.id + '_' + si}
            section={section}
            sectionIdx={si}
            barMeters={barMeters[si] ?? []}
            openingMeter={si === 0 ? song.timeSignature : undefined}
            selectedBars={selectedPerSection.get(si)}
            onPickBar={
              onPickBar
                ? (barIdx, mods) =>
                    onPickBar({ section: si, bar: barIdx }, mods)
                : undefined
            }
            systemOffset={systemOffsets[si]}
            systemsPerPage={systemsPerPage}
            displayMode={displayMode}
            notation={notation}
            barKeys={sectionKeys[si] ?? []}
            isLooping={loopSection === si}
            onChordClick={handleChordClick}
            onToggleLoop={onToggleLoop}
            onSelectChord={onSelectChord}
            selection={selection}
            editable={editable}
          />
        ))}

        {editable && (
          <button
            type="button"
            onClick={editable.onAddSection}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-2 text-sm text-white/50 transition-colors hover:border-white/30 hover:text-white"
          >
            <Plus size={16} /> Add section
          </button>
        )}
      </div>

      {/* ── Chord Diagram Popup (student view only; editor suppresses it) ── */}
      {!onSelectChord && selectedChord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedChord(null)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            {guitarPopup ? (
              <Suspense
                fallback={
                  <div className="h-72 w-full rounded-2xl bg-white/[0.04]" />
                }
              >
                <GuitarChordCard
                  song={song}
                  chordName={selectedChord.hit.chordName}
                  title={selectedSymbol ?? selectedChord.hit.chordName}
                  degree={
                    selectedSymbol === null
                      ? selectedChord.hit.degree
                      : undefined
                  }
                  keyColor={(() => {
                    const [r, g, b] = selectedChord.rgb ?? [126, 207, 207];
                    return `rgb(${r}, ${g}, ${b})`;
                  })()}
                />
              </Suspense>
            ) : (
              <ChordDiagramCard
                midi={selectedChord.midi}
                rgb={selectedChord.rgb}
                // The bar's own key, so a chord after a key change is spelled
                // and signed in the key it actually sounds in.
                keyTonicPc={
                  keyOfHit.get(selectedChord.hit)?.tonicPc ?? song.keyRoot % 12
                }
                mode={keyOfHit.get(selectedChord.hit)?.mode ?? song.mode}
                header={
                  <>
                    <h3
                      className="text-white font-bold text-xl"
                      style={{ fontFamily: 'serif' }}
                    >
                      {selectedSymbol ?? selectedChord.hit.chordName}
                    </h3>
                    {selectedSymbol === null && (
                      <p
                        className="text-white/40 text-sm"
                        style={{ fontFamily: 'serif' }}
                      >
                        {selectedChord.hit.degree}
                      </p>
                    )}
                  </>
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
