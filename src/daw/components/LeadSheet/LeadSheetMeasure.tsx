import { memo, useCallback } from 'react';
import { PPQ, type Measure, type ChordFormat } from '@/daw/midi/leadSheetUtils';
import type { LeadSheetSection } from '@/daw/store/uiSlice';
import { ChordSymbol } from './ChordSymbol';
import { SectionMarker } from './SectionMarker';

// ── Layout constants ─────────────────────────────────────────────────────

/** Width of a single measure in pixels */
export const MEASURE_WIDTH = 200;
/** Height of the staff (5 lines) */
export const STAFF_HEIGHT = 40;
/** Space above staff for chord symbols and section markers */
export const CHORD_AREA_HEIGHT = 50;
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
}

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
}: LeadSheetMeasureProps) {
  const width = w ?? MEASURE_WIDTH;
  const staffTop = CHORD_AREA_HEIGHT;

  const handleStaffClick = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const beat = Math.floor((localX / width) * 4);
      const tick = measure.startTick + beat * PPQ;
      onClickEmptyBeat(tick);
    },
    [measure.startTick, onClickEmptyBeat, width],
  );

  return (
    <g transform={`translate(${x}, 0)`}>
      {/* Section marker above the chord area */}
      {section && (
        <SectionMarker label={section.label} x={2} y={CHORD_AREA_HEIGHT - 30} />
      )}

      {/* Chord symbols or repeat sign */}
      {showRepeats && measure.isRepeatOfPrevious ? (
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
          {measure.chords.map((chord, i) => {
            const beatPos = chord.beatOffsetTicks / PPQ;
            const cx = (beatPos / 4) * width + 4;
            const isBeingDragged = chordDrag?.regionId === chord.regionId;
            return (
              <ChordSymbol
                key={`${chord.regionId}-${i}`}
                noteName={chord.noteName}
                degreeName={chord.name}
                format={chordFormat}
                x={cx}
                y={CHORD_AREA_HEIGHT - 8}
                isSelected={selectedChordId === chord.regionId}
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

      {/* Clickable staff area for adding chords */}
      <rect
        x={0}
        y={staffTop}
        width={width}
        height={STAFF_HEIGHT}
        fill="transparent"
        onClick={handleStaffClick}
        style={{ cursor: 'pointer' }}
      />

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

      {/* Beat slash marks (4 per measure) */}
      {Array.from({ length: 4 }, (_, beat) => {
        const bx = (beat + 0.5) * (width / 4);
        const cy = staffTop + STAFF_HEIGHT / 2;
        const isTarget = chordDrag?.targetBeat === beat;
        return (
          <line
            key={`slash-${beat}`}
            x1={bx - 5}
            y1={cy + 6}
            x2={bx + 5}
            y2={cy - 6}
            stroke={isTarget ? 'var(--color-accent, #8b5cf6)' : 'currentColor'}
            strokeWidth={isTarget ? 3 : 2}
            opacity={isTarget ? 0.9 : 0.35}
          />
        );
      })}

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
