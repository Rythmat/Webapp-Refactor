import { memo } from 'react';
import type { Measure, ChordFormat } from '@/daw/midi/leadSheetUtils';
import type { LeadSheetRepeat, LeadSheetSection } from '@/daw/store/uiSlice';
import {
  LeadSheetMeasure,
  MEASURE_WIDTH,
  MEASURE_HEIGHT,
  CHORD_AREA_HEIGHT,
  STAFF_HEIGHT,
  type ChordDragState,
} from './LeadSheetMeasure';

/** Default number of measures in a full system (used to decide whether to stretch) */
const DEFAULT_FULL_SYSTEM_COUNT = 4;

interface LeadSheetStaffProps {
  measures: Measure[];
  startIndex: number;
  fullSystemCount?: number;
  chordFormat: ChordFormat;
  selectedChordId: string | null;
  sections: LeadSheetSection[];
  repeats: LeadSheetRepeat[];
  showRepeats?: boolean;
  /** Available container width — full systems stretch to fill this */
  availableWidth?: number;
  /** X position of the playhead line within this system (undefined = not in this system) */
  playheadX?: number;
  /** Drag state for the chord being dragged */
  chordDrag?: ChordDragState | null;
  /** Measure index (global) that the drag tether should appear in */
  chordDragMeasureIdx?: number;
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
  measureRestMap?: Record<number, number> | null;
  measureFermatas?: number[] | null;
}

/**
 * Renders one system (row) of measures — typically 4 measures per line.
 * Full systems stretch to fill availableWidth; partial last systems keep natural size.
 */
export const LeadSheetStaff = memo(function LeadSheetStaff({
  measures,
  startIndex,
  fullSystemCount,
  chordFormat,
  selectedChordId,
  sections,
  repeats,
  showRepeats,
  availableWidth,
  playheadX,
  chordDrag,
  chordDragMeasureIdx,
  onSelectChord,
  onRenameChord,
  onClickEmptyBeat,
  onChordDragStart,
  onMarkAsMelody,
  onDeleteChord,
  measureRestMap,
  measureFermatas,
}: LeadSheetStaffProps) {
  const defaultWidth = measures.length * MEASURE_WIDTH;
  const isFull = measures.length === (fullSystemCount ?? DEFAULT_FULL_SYSTEM_COUNT);

  // Stretch full systems to fill container; keep partial lines at natural size
  const svgWidth =
    isFull && availableWidth && availableWidth > defaultWidth
      ? availableWidth
      : defaultWidth;

  const measureWidth = svgWidth / measures.length;

  return (
    <svg
      width={svgWidth}
      height={MEASURE_HEIGHT}
      viewBox={`0 0 ${svgWidth} ${MEASURE_HEIGHT}`}
      className="leadsheet-staff"
      style={{ display: 'block', color: 'var(--color-text)' }}
    >
      {measures.map((measure, i) => {
        const globalIdx = startIndex + i;
        const section = sections.find((s) => s.measureIdx === globalIdx);
        const isRepeatStart = repeats.some((r) => r.startMeasure === globalIdx);
        const isRepeatEnd = repeats.some((r) => r.endMeasure === globalIdx);

        return (
          <LeadSheetMeasure
            key={globalIdx}
            measure={measure}
            measureIndex={globalIdx}
            x={i * measureWidth}
            width={measureWidth}
            chordFormat={chordFormat}
            selectedChordId={selectedChordId}
            section={section}
            repeatStart={isRepeatStart}
            repeatEnd={isRepeatEnd}
            showAttributes={globalIdx === 0}
            showRepeats={showRepeats}
            chordDrag={chordDragMeasureIdx === globalIdx ? chordDrag : null}
            onSelectChord={onSelectChord}
            onRenameChord={onRenameChord}
            onClickEmptyBeat={onClickEmptyBeat}
            onChordDragStart={onChordDragStart}
            onMarkAsMelody={onMarkAsMelody}
            onDeleteChord={onDeleteChord}
            restBars={measureRestMap?.[globalIdx]}
            hasFermata={measureFermatas?.includes(globalIdx)}
          />
        );
      })}

      {/* Playhead line */}
      {playheadX != null && (
        <line
          x1={playheadX}
          y1={CHORD_AREA_HEIGHT}
          x2={playheadX}
          y2={CHORD_AREA_HEIGHT + STAFF_HEIGHT}
          stroke="#ef4444"
          strokeWidth={2}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </svg>
  );
});
