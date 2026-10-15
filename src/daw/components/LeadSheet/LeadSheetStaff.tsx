import type { TypedChord } from '@/daw/harmony/chordInput';
import { memo, useRef } from 'react';
import { usePlayheadEffect } from '@/daw/engine/playheadClock';
import type { Measure, ChordFormat } from '@/daw/midi/leadSheetUtils';
import type { LeadSheetRepeat, LeadSheetSection } from '@/daw/store/uiSlice';
import type { LeadSheetItem } from './leadSheetSelection';
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

/**
 * How narrow a bar may get before the system stops squeezing and scrolls
 * instead. Four beats still need room for their slashes and a chord symbol.
 */
const MIN_MEASURE_WIDTH = 110;

interface LeadSheetStaffProps {
  /**
   * The system's measures, one per chart slot. Each measure's `index` is
   * its real bar, which every mark is stored by; a multi-bar rest stands for
   * measureRestMap[index] bars.
   */
  measures: Measure[];
  fullSystemCount?: number;
  chordFormat: ChordFormat;
  selectedChordId: string | null;
  sections: LeadSheetSection[];
  repeats: LeadSheetRepeat[];
  showRepeats?: boolean;
  /** Available container width — full systems stretch to fill this */
  availableWidth?: number;
  /**
   * The playhead is in this system: ticks per bar, to place it. The line is
   * painted from the playhead clock through a ref, so playback moves it
   * without rendering the sheet (undefined = not in this system).
   */
  playheadTicksPerMeasure?: number;
  /** Drag state for the chord being dragged */
  chordDrag?: ChordDragState | null;
  /** Measure index (global) that the drag tether should appear in */
  chordDragMeasureIdx?: number;
  onSelectChord: (regionId: string) => void;
  onRenameChord: (regionId: string, chord: TypedChord) => void;
  /** A chord edit closed without a chord (ChordSymbol's onCancelEdit). */
  onCancelChordEdit?: (regionId: string) => void;
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
  /** Keys of everything selected across the sheet. */
  selectedKeys?: ReadonlySet<string>;
  onSelectItem?: (item: LeadSheetItem, event: React.MouseEvent) => void;
  onInsertChordAt?: (tick: number) => void;
  beatsPerMeasure?: number;
  ticksPerBeat?: number;
  autoEditRegionId?: string | null;
  /** Bars in the whole piece, so the last one can own the closing barline. */
  measureCount?: number;
}

/**
 * Renders one system (row) of measures — typically 4 measures per line.
 * Full systems stretch to fill availableWidth; partial last systems keep natural size.
 */
export const LeadSheetStaff = memo(function LeadSheetStaff({
  measures,
  fullSystemCount,
  chordFormat,
  selectedChordId,
  sections,
  repeats,
  showRepeats,
  availableWidth,
  playheadTicksPerMeasure,
  chordDrag,
  chordDragMeasureIdx,
  onSelectChord,
  onRenameChord,
  onCancelChordEdit,
  onClickEmptyBeat,
  onChordDragStart,
  onMarkAsMelody,
  onDeleteChord,
  measureRestMap,
  measureFermatas,
  selectedKeys,
  onSelectItem,
  onInsertChordAt,
  beatsPerMeasure,
  ticksPerBeat,
  autoEditRegionId,
  measureCount,
}: LeadSheetStaffProps) {
  const defaultWidth = measures.length * MEASURE_WIDTH;
  // A five- or six-bar system (a second ending folded in) is full too, and
  // narrows its bars to the same page width; the staff height never changes.
  const isFull =
    measures.length >= (fullSystemCount ?? DEFAULT_FULL_SYSTEM_COUNT);

  // A full system fills the container — stretching when there is room, and
  // squeezing when there is not. It used to hold its natural width and let the
  // last bar fall off the edge, so opening the palette cost a bar off every
  // system; the default four bars per line must survive the narrower page.
  const svgWidth =
    isFull && availableWidth
      ? Math.max(availableWidth, measures.length * MIN_MEASURE_WIDTH)
      : defaultWidth;

  const measureWidth = svgWidth / measures.length;

  return (
    <svg
      width={svgWidth}
      height={MEASURE_HEIGHT}
      viewBox={`0 0 ${svgWidth} ${MEASURE_HEIGHT}`}
      className="leadsheet-staff"
      style={{ display: 'block', color: 'var(--daw-text)' }}
    >
      {measures.map((measure, i) => {
        // The real bar: after a multi-bar rest it is ahead of the slot.
        const globalIdx = measure.index;
        const span = Math.max(1, measureRestMap?.[globalIdx] ?? 1);
        const section = sections.find((s) => s.measureIdx === globalIdx);
        const isRepeatStart = repeats.some((r) => r.startMeasure === globalIdx);
        const isRepeatEnd = repeats.some(
          (r) => r.endMeasure >= globalIdx && r.endMeasure < globalIdx + span,
        );

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
            onCancelChordEdit={onCancelChordEdit}
            onClickEmptyBeat={onClickEmptyBeat}
            onChordDragStart={onChordDragStart}
            onMarkAsMelody={onMarkAsMelody}
            onDeleteChord={onDeleteChord}
            restBars={measureRestMap?.[globalIdx]}
            hasFermata={measureFermatas?.includes(globalIdx)}
            selectedKeys={selectedKeys}
            onSelectItem={onSelectItem}
            onInsertChordAt={onInsertChordAt}
            beatsPerMeasure={beatsPerMeasure}
            ticksPerBeat={ticksPerBeat}
            autoEditRegionId={autoEditRegionId}
            isSystemStart={i === 0}
            isLastMeasure={
              measureCount != null && globalIdx + span === measureCount
            }
          />
        );
      })}

      {/* Playhead line */}
      {playheadTicksPerMeasure != null && (
        <SystemPlayhead
          ticksPerMeasure={playheadTicksPerMeasure}
          slots={measures.map((m) => ({
            realIndex: m.index,
            bars: Math.max(1, measureRestMap?.[m.index] ?? 1),
          }))}
          measureWidth={measureWidth}
        />
      )}
    </svg>
  );
});

/**
 * Where song tick `tick` sits across a system's slots, in slot widths from
 * its left edge: through a multi-bar rest the line moves at its bars' pace.
 */
export function playheadSlotOffset(
  tick: number,
  ticksPerMeasure: number,
  slots: ReadonlyArray<{ realIndex: number; bars: number }>,
): number {
  const bar = tick / ticksPerMeasure;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (bar < s.realIndex + s.bars) {
      return i + Math.max(0, bar - s.realIndex) / s.bars;
    }
  }
  const last = slots[slots.length - 1];
  return last ? slots.length + (bar - last.realIndex - last.bars) : 0;
}

/** The playhead line across one system, moved through a ref. */
function SystemPlayhead({
  ticksPerMeasure,
  slots,
  measureWidth,
}: {
  ticksPerMeasure: number;
  slots: ReadonlyArray<{ realIndex: number; bars: number }>;
  measureWidth: number;
}) {
  const lineRef = useRef<SVGLineElement | null>(null);
  usePlayheadEffect((tick) => {
    const line = lineRef.current;
    if (!line) return;
    const x = String(
      playheadSlotOffset(tick, ticksPerMeasure, slots) * measureWidth,
    );
    if (line.getAttribute('x1') === x) return;
    line.setAttribute('x1', x);
    line.setAttribute('x2', x);
  });
  return (
    <line
      ref={lineRef}
      className="leadsheet-playhead"
      y1={CHORD_AREA_HEIGHT}
      y2={CHORD_AREA_HEIGHT + STAFF_HEIGHT}
      stroke="#ef4444"
      strokeWidth={2}
      style={{ pointerEvents: 'none' }}
    />
  );
}
