import { memo, useCallback } from 'react';
import { PPQ, type Measure, type ChordFormat } from '@/daw/midi/leadSheetUtils';
import type { LeadSheetSection } from '@/daw/store/uiSlice';
import { useStore } from '@/daw/store';
import { useChordNotation } from '@/lib/chordNotation';
import { ChordSymbol } from './ChordSymbol';
import { itemKey, type LeadSheetItem } from './leadSheetSelection';
import { SectionMarker } from './SectionMarker';

// ── Layout constants ─────────────────────────────────────────────────────

/** Width of a single measure in pixels */
export const MEASURE_WIDTH = 200;
/** Height of the staff (5 lines) */
export const STAFF_HEIGHT = 40;
/** Space above staff for chord symbols and section markers */
export const CHORD_AREA_HEIGHT = 58;
/** Total height per measure including chord area */
export const MEASURE_HEIGHT = CHORD_AREA_HEIGHT + STAFF_HEIGHT + 20;
/** Staff line spacing */
const LINE_SPACING = STAFF_HEIGHT / 4;

/** Drag state passed from parent when a chord is being dragged */
export interface ChordDragState {
  regionId: string;
  /** Current snapped x position within the measure (local coords) */
  currentX: number;
  /** Target beat index (0-3) for slash highlight */
  targetBeat: number;
}

interface LeadSheetMeasureProps {
  measure: Measure;
  measureIndex: number;
  x: number;
  /** Dynamic measure width — defaults to MEASURE_WIDTH (200px) */
  width?: number;
  chordFormat: ChordFormat;
  selectedChordId: string | null;
  section?: LeadSheetSection;
  repeatStart?: boolean;
  repeatEnd?: boolean;
  showAttributes?: boolean; // true for first measure (clef, key, time)
  showRepeats?: boolean;
  /** Drag state for the chord being dragged (if it's in this measure) */
  chordDrag?: ChordDragState | null;
  onSelectChord: (regionId: string) => void;
  onRenameChord: (regionId: string, newNoteName: string) => void;
  onClickEmptyBeat: (tick: number) => void;
  onChordDragStart?: (
    regionId: string,
    clientX: number,
    measureStartTick: number,
    measureWidth: number,
  ) => void;
  onMarkAsMelody?: (regionId: string) => void;
  onDeleteChord?: (regionId: string) => void;
  /** If set, this measure is a multi-bar rest displaying this many bars. */
  restBars?: number;
  /** If true, draw a fermata symbol above this measure. */
  hasFermata?: boolean;
  /** Keys of everything currently selected, across the whole sheet. */
  selectedKeys?: ReadonlySet<string>;
  /** A click on the measure, one of its beats, or a melody note. */
  onSelectItem?: (item: LeadSheetItem, event: React.MouseEvent) => void;
  /** Double-click on a beat: add a chord there, ready to be typed over. */
  onInsertChordAt?: (tick: number) => void;
  /** Beats in a bar — 4 in common time. */
  beatsPerMeasure?: number;
  /** Newly inserted chord that should open straight into its edit box. */
  autoEditRegionId?: string | null;
  /** First bar of its system: its barline target leans inward, not off the edge. */
  isSystemStart?: boolean;
  /** Last bar of the piece: it also owns the barline that closes the piece. */
  isLastMeasure?: boolean;
}

/** Half the width of a slash's click target, either side of the slash. */
const BEAT_HIT_HALF_WIDTH = 13;

/**
 * Renders a single measure: staff lines, bar lines, chord symbols,
 * beat slashes, and optional section markers / repeat signs.
 */
export const LeadSheetMeasure = memo(function LeadSheetMeasure({
  measure,
  measureIndex,
  x,
  width: w,
  chordFormat,
  selectedChordId,
  section,
  repeatStart,
  repeatEnd,
  showAttributes: _showAttributes,
  showRepeats,
  chordDrag,
  onSelectChord,
  onRenameChord,
  onClickEmptyBeat,
  onChordDragStart,
  onMarkAsMelody,
  onDeleteChord,
  restBars,
  hasFermata,
  selectedKeys,
  onSelectItem,
  onInsertChordAt,
  beatsPerMeasure = 4,
  autoEditRegionId,
  isSystemStart,
  isLastMeasure,
}: LeadSheetMeasureProps) {
  const width = w ?? MEASURE_WIDTH;
  // Jazz / Roman override the lead sheet's chord format; key comes from the store.
  const chordNotation = useChordNotation();
  const keyRootPc = useStore((s) => s.rootNote);
  const keyMode = useStore((s) => s.mode);
  const isMultiBarRest = restBars != null && restBars > 0;
  const staffTop = CHORD_AREA_HEIGHT;

  // Clicking the staff selects: the bar itself, or one beat when the click
  // lands on a slash. Adding a chord moved to a double-click (and ⌘K), so a
  // single click can mean "select" everywhere, including on an empty bar.
  const handleMeasureClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectItem?.({ kind: 'measure', measureIndex }, e);
    },
    [measureIndex, onSelectItem],
  );

  const handleBeatClick = useCallback(
    (beat: number) => (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectItem?.({ kind: 'beat', measureIndex, beat }, e);
    },
    [measureIndex, onSelectItem],
  );

  const handleBeatDoubleClick = useCallback(
    (beat: number) => (e: React.MouseEvent) => {
      e.stopPropagation();
      const tick = measure.startTick + beat * PPQ;
      if (onInsertChordAt) onInsertChordAt(tick);
      else onClickEmptyBeat(tick);
    },
    [measure.startTick, onInsertChordAt, onClickEmptyBeat],
  );

  const isMeasureSelected =
    selectedKeys?.has(itemKey({ kind: 'measure', measureIndex })) ?? false;
  const isBeatSelected = (beat: number) =>
    selectedKeys?.has(itemKey({ kind: 'beat', measureIndex, beat })) ?? false;
  const beatCellWidth = width / Math.max(1, beatsPerMeasure);

  // A barline is named by the measure it follows into — barline 2 is the one
  // between bars 1 and 2 — so this measure owns the barline on its left, and
  // the last one also owns the barline that closes the piece. Same naming and
  // same 14px target as the Score. The closing barline leans further inward
  // than the Score's does, because an SVG clips at its edge where the Score's
  // absolutely-positioned overlay can hang past it.
  const handleBarlineClick = useCallback(
    (barlineIndex: number) => (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectItem?.({ kind: 'barline', measureIndex: barlineIndex }, e);
    },
    [onSelectItem],
  );
  const isBarlineSelected = (barlineIndex: number) =>
    selectedKeys?.has(
      itemKey({ kind: 'barline', measureIndex: barlineIndex }),
    ) ?? false;

  const barlineTarget = (barlineIndex: number, atX: number, lean: number) => {
    const selected = isBarlineSelected(barlineIndex);
    return (
      <rect
        key={`barline-${barlineIndex}`}
        className="leadsheet-barline-target"
        data-barline-target={barlineIndex}
        data-selected={selected || undefined}
        x={atX - lean}
        y={staffTop}
        width={14}
        height={STAFF_HEIGHT}
        rx={2}
        fill={
          selected
            ? 'color-mix(in srgb, var(--color-accent, #8b5cf6) 35%, transparent)'
            : 'transparent'
        }
        stroke={selected ? 'var(--color-accent, #8b5cf6)' : 'transparent'}
        strokeWidth={1}
        onClick={handleBarlineClick(barlineIndex)}
        style={{ cursor: 'pointer' }}
      >
        <title>{`Barline before bar ${barlineIndex + 1}`}</title>
      </rect>
    );
  };

  return (
    <g transform={`translate(${x}, 0)`}>
      {/* Section marker above the chord area */}
      {section && (
        <SectionMarker label={section.label} x={2} y={CHORD_AREA_HEIGHT - 30} />
      )}

      {/* Chord symbols or repeat sign (skip for multi-bar rests) */}
      {isMultiBarRest ? null : showRepeats && measure.isRepeatOfPrevious ? (
        /* % repeat sign — two dots with a diagonal line */
        <g opacity={0.6}>
          <circle
            cx={width / 2 - 14}
            cy={CHORD_AREA_HEIGHT - 20}
            r={3}
            fill="currentColor"
          />
          <line
            x1={width / 2 - 10}
            y1={CHORD_AREA_HEIGHT - 4}
            x2={width / 2 + 10}
            y2={CHORD_AREA_HEIGHT - 24}
            stroke="currentColor"
            strokeWidth={2.5}
          />
          <circle
            cx={width / 2 + 14}
            cy={CHORD_AREA_HEIGHT - 8}
            r={3}
            fill="currentColor"
          />
        </g>
      ) : (
        <>
          {measure.chords.map((chord) => {
            const beatPos = chord.beatOffsetTicks / PPQ;
            const cx = (beatPos / beatsPerMeasure) * width + 4;
            const chordY = CHORD_AREA_HEIGHT - 8;
            const isBeingDragged = chordDrag?.regionId === chord.regionId;
            // Highlight from the sheet's selection so a whole range of chord
            // symbols reads as selected, not just the last one clicked.
            const chordSelected =
              selectedChordId === chord.regionId ||
              (selectedKeys?.has(
                itemKey({ kind: 'chord', regionId: chord.regionId }),
              ) ??
                false);
            return (
              <ChordSymbol
                key={chord.regionId}
                noteName={chord.noteName}
                degreeName={chord.name}
                degreeKey={chord.degreeKey}
                format={chordFormat}
                notation={chordNotation}
                keyRootPc={keyRootPc}
                keyMode={keyMode}
                x={cx}
                y={chordY}
                isSelected={chordSelected}
                isDragging={isBeingDragged}
                regionId={chord.regionId}
                onSelect={onSelectChord}
                onRename={onRenameChord}
                onDragStart={
                  onChordDragStart
                    ? (id, clientX) =>
                        onChordDragStart(id, clientX, measure.startTick, width)
                    : undefined
                }
                onMarkAsMelody={onMarkAsMelody}
                onDelete={onDeleteChord}
                autoEdit={autoEditRegionId === chord.regionId}
                onSelectItem={onSelectItem}
              />
            );
          })}
          {/* Tether line + ghost chord + beat dot while dragging */}
          {chordDrag && (
            <g style={{ pointerEvents: 'none' }}>
              {/* Beat indicator dot on the staff */}
              <circle
                cx={chordDrag.currentX}
                cy={CHORD_AREA_HEIGHT + STAFF_HEIGHT / 2}
                r={4}
                fill="var(--color-accent, #8b5cf6)"
                opacity={0.8}
              />
              {/* Tether line from chord area to beat dot */}
              <line
                x1={chordDrag.currentX}
                y1={CHORD_AREA_HEIGHT - 4}
                x2={chordDrag.currentX}
                y2={CHORD_AREA_HEIGHT + STAFF_HEIGHT / 2 - 4}
                stroke="var(--color-accent, #8b5cf6)"
                strokeWidth={1}
                strokeDasharray="3 2"
                opacity={0.7}
              />
            </g>
          )}
        </>
      )}

      {/* Selection wash, drawn under the staff so the lines stay readable */}
      {isMeasureSelected && (
        <rect
          data-selected-measure={measureIndex}
          x={0}
          y={staffTop - 4}
          width={width}
          height={STAFF_HEIGHT + 8}
          fill="var(--color-accent, #8b5cf6)"
          opacity={0.16}
          stroke="var(--color-accent, #8b5cf6)"
          strokeWidth={1}
          rx={2}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {Array.from({ length: beatsPerMeasure }, (_, beat) =>
        isBeatSelected(beat) ? (
          <rect
            key={`beat-sel-${beat}`}
            data-selected-beat={`${measureIndex}:${beat}`}
            x={beat * beatCellWidth}
            y={staffTop - 2}
            width={beatCellWidth}
            height={STAFF_HEIGHT + 4}
            fill="var(--color-accent, #8b5cf6)"
            opacity={0.24}
            rx={2}
            style={{ pointerEvents: 'none' }}
          />
        ) : null,
      )}

      {/* Staff lines */}
      {Array.from({ length: 5 }, (_, i) => (
        <line
          key={i}
          x1={0}
          y1={staffTop + i * LINE_SPACING}
          x2={width}
          y2={staffTop + i * LINE_SPACING}
          stroke="currentColor"
          strokeWidth={0.8}
          opacity={0.5}
        />
      ))}

      {/* Multi-bar rest notation */}
      {isMultiBarRest ? (
        <g>
          {/* Rest count number above */}
          <text
            x={width / 2}
            y={staffTop + LINE_SPACING * 0.8}
            fill="currentColor"
            fontSize={16}
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="serif"
          >
            {restBars}
          </text>
          {/* Thick horizontal block */}
          <rect
            x={width * 0.15}
            y={staffTop + LINE_SPACING * 1.5}
            width={width * 0.7}
            height={LINE_SPACING}
            fill="currentColor"
            opacity={0.7}
          />
          {/* Left serif */}
          <line
            x1={width * 0.15}
            y1={staffTop + LINE_SPACING}
            x2={width * 0.15}
            y2={staffTop + LINE_SPACING * 3}
            stroke="currentColor"
            strokeWidth={2}
            opacity={0.7}
          />
          {/* Right serif */}
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
        /* Beat slashes — one to a beat, the chart's own rhythm. */
        Array.from({ length: beatsPerMeasure }, (_, beat) => {
          const bx = (beat + 0.5) * beatCellWidth;
          const cy = staffTop + STAFF_HEIGHT / 2;
          const isTarget = chordDrag?.targetBeat === beat;
          return (
            <line
              key={`slash-${beat}`}
              x1={bx - 5}
              y1={cy + 6}
              x2={bx + 5}
              y2={cy - 6}
              stroke={
                isTarget ? 'var(--color-accent, #8b5cf6)' : 'currentColor'
              }
              strokeWidth={isTarget ? 3 : 2}
              opacity={isTarget ? 0.9 : 0.35}
            />
          );
        })
      )}

      {/* Click targets, above the marks so they take the click. The bar takes
          it everywhere except over a slash, where the beat does. */}
      {!isMultiBarRest && onSelectItem && (
        <>
          <rect
            x={0}
            y={staffTop - 4}
            width={width}
            height={STAFF_HEIGHT + 8}
            fill="transparent"
            onClick={handleMeasureClick}
            style={{ cursor: 'pointer' }}
          />
          {Array.from({ length: beatsPerMeasure }, (_, beat) => {
            const bx = (beat + 0.5) * beatCellWidth;
            const half = Math.min(BEAT_HIT_HALF_WIDTH, beatCellWidth / 2);
            return (
              <rect
                key={`beat-hit-${beat}`}
                data-beat-target={`${measureIndex}:${beat}`}
                x={bx - half}
                y={staffTop - 2}
                width={half * 2}
                height={STAFF_HEIGHT + 4}
                fill="transparent"
                onClick={handleBeatClick(beat)}
                onDoubleClick={handleBeatDoubleClick(beat)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </>
      )}

      {/* Barline targets, last so they sit above the bar and beat targets.
          One opening this bar, plus the closing barline on the final bar. */}
      {onSelectItem && (
        <>
          {barlineTarget(measureIndex, 0, isSystemStart ? 2 : 7)}
          {isLastMeasure && barlineTarget(measureIndex + 1, width, 12)}
        </>
      )}

      {/* Fermata symbol */}
      {hasFermata && (
        <g transform={`translate(${width / 2}, ${CHORD_AREA_HEIGHT - 8})`}>
          <path
            d="M -8 0 A 8 6 0 0 1 8 0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          />
          <circle cx={0} cy={-1} r={1.5} fill="currentColor" />
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
        opacity={0.6}
      />

      {/* Left bar line (only for first measure or repeat start) */}
      {(measureIndex === 0 || repeatStart) && (
        <line
          x1={0}
          y1={staffTop}
          x2={0}
          y2={staffTop + STAFF_HEIGHT}
          stroke="currentColor"
          strokeWidth={measureIndex === 0 ? 2 : 1}
          opacity={0.6}
        />
      )}

      {/* Repeat start sign */}
      {repeatStart && (
        <>
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
        </>
      )}

      {/* Repeat end sign */}
      {repeatEnd && (
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

      {/* Measure number */}
      <text
        x={2}
        y={staffTop - 2}
        fontSize={9}
        fill="currentColor"
        opacity={0.4}
      >
        {measureIndex + 1}
      </text>
    </g>
  );
});
