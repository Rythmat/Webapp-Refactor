import { Info, Repeat } from 'lucide-react';
import { memo, useMemo } from 'react';
import type { MeasureBox, StaffLayout } from '@/components/notation/StaffView';
import { MUSIC_MAP_PASSES } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { getGuitarCenter } from '@/curriculum/data/guitar/centers';
import { notesFor } from '@/curriculum/data/guitar/theoryNotes';
import type {
  GuitarCenter,
  GuitarCenterId,
  GuitarMusicMap,
} from '@/curriculum/data/guitar/types';
import {
  analyzeMusicMap,
  romanNumeral,
  type FunctionGroup,
  type MapPattern,
  type MusicMapAnalysis,
} from '@/lib/guitar/theory';
import { ChordJobsBadge } from './ChordJobsBadge';
import { TheoryPopover, type PopoverNote } from './TheoryPopover';
import { patternChipText, patternNoteId } from './theoryUi';

// ── MusicMapOverlay ────────────────────────────────────────────────────────
// Drawn over a Music Map's TAB (LearnTabView's `overlay`): pattern chips —
// 2-5-1, Turnaround, 5 → 1 — bracketing the bars they span in both passes,
// each opening its note; and, when asked for, each bar's chord job (Home /
// Away / Tension) and Roman numeral above it. Positions come from the TAB's
// drawn layout, so everything travels with the TAB as it wraps and scrolls.
//
// Neutral, like the TAB's other theory chips: a fixed 20px pill in white/55
// on the panel's colour, centred on a 1px white/20 bracket — the key colour
// is for the notes being played.

/** One bar at 4/4, in lesson ticks. */
const BAR_TICKS = 1920;

// Geometry, in unscaled TAB px. A TAB measure box runs from one line above
// the top string to 50px below the bottom string, room the rhythm stems use
// down to about 42px (eighth-note beams); the next line's chord symbols start
// 16px below the box. Chips sit in lanes in that gap: the first clears the
// beams, and the second (only G's turnaround map needs one, and it has no
// beams) ends where the next line's chord symbols begin.
const CHIP_HEIGHT = 12;
const FIRST_LANE_TOP = -7;
const LANE_STEP = 13;
/** Chips stop short of the barline so neighbours in one lane don't touch. */
const CHIP_INSET = 4;
/** The job/numeral row sits beside the chord symbol, above the top string. */
const MARK_TOP = -22;
const MARK_INSET = 4;
/** The chips' pill: fixed 12px type, whatever the TAB's scale. */
const CHIP_CLASS =
  'inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full border border-white/15 px-2 text-xs leading-none text-white/55';
/** The brackets: a hairline, fainter than the chips. */
const BRACKET = 'rgba(255, 255, 255, 0.2)';
/** Behind a chip: the TAB panel's own colour, so the bracket stops at it. */
const CHIP_BACKGROUND = 'var(--ma-tab-gap, #151518)';
/** Short visible text for a bar's own note; the popover has the rest. */
const BAR_NOTE_TEXT = {
  'd3.triadBar': 'Triad',
  'd3.seven': 'Chord 7',
} as const;

export interface MapChipSegment {
  key: string;
  pattern: MapPattern;
  pass: number;
  lane: number;
  /** The TAB bars (1-based, counting on through both passes) the chip spans. */
  firstBar: number;
  lastBar: number;
  left: number;
  top: number;
  width: number;
  /** The first piece of a chip carries its label; a chip may break across lines. */
  labelled: boolean;
  /** The chip continues from the line above. */
  openStart: boolean;
  /** The chip continues on the next line, or past the last bar. */
  openEnd: boolean;
  /** The pattern runs on past the end: it lands on 1 when the map starts again. */
  clipped: boolean;
}

export interface MapBarMark {
  key: string;
  /** 0-based bar of the TAB's map bars (both passes). */
  bar: number;
  /** The chord's job; none in a mode's maps (jobs are a major-key idea). */
  group: FunctionGroup | null;
  roman: string;
  /**
   * First pass only: the note about this bar itself — a triad in a 7th-chord
   * map, or chord 7.
   */
  noteId: 'd3.triadBar' | 'd3.seven' | null;
  /** The bar's right edge; the marks end there. */
  right: number;
  top: number;
}

export interface MusicMapOverlayModel {
  chips: MapChipSegment[];
  bars: MapBarMark[];
  scale: number;
}

interface ModelInput {
  layout: StaffLayout;
  /** The map's key center: its Roman numerals and which bar notes apply. */
  center: GuitarCenter;
  map: GuitarMusicMap;
  analysis: MusicMapAnalysis;
  passes: number;
  countInOffset: number;
  ticksPerBar: number;
}

/** Lanes so chips over the same bars stack instead of overlapping. */
function assignLanes(spans: readonly { start: number; end: number }[]) {
  const order = spans
    .map((span, i) => ({ ...span, i }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const laneEnds: number[] = [];
  const lanes: number[] = [];
  for (const span of order) {
    let lane = laneEnds.findIndex((end) => end < span.start);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = span.end;
    lanes[span.i] = lane;
  }
  return lanes;
}

/** Where the chips and bar marks go, from the TAB's drawn layout. */
export function musicMapOverlayModel({
  layout,
  center,
  map,
  analysis,
  passes,
  countInOffset,
  ticksPerBar,
}: ModelInput): MusicMapOverlayModel {
  const n = map.bars.length;
  const total = n * passes;
  const { scale } = layout;
  // In time the TAB starts with an empty count-in bar: a map bar is the
  // measure that starts on its tick.
  const measureOf = (bar: number): MeasureBox | undefined =>
    layout.measures.find(
      (m) => m.startTick === countInOffset + bar * ticksPerBar,
    );

  // A change across the repeat on the last pass never happens — the step
  // ends there — so that pass leaves its wrapping pattern out.
  const spans = Array.from({ length: passes }, (_, pass) =>
    analysis.patterns.map((pattern) => {
      const start = pass * n + pattern.startBar;
      const end = start + pattern.length - 1;
      return {
        pattern,
        pass,
        start,
        end: Math.min(end, total - 1),
        clipped: end > total - 1,
      };
    }),
  )
    .flat()
    .filter((span) => !span.clipped);
  const lanes = assignLanes(spans);

  const chips: MapChipSegment[] = [];
  spans.forEach((span, s) => {
    // Split at line breaks: consecutive bars on one system share a piece.
    const pieces: MeasureBox[][] = [];
    for (let bar = span.start; bar <= span.end; bar++) {
      const box = measureOf(bar);
      if (!box) continue;
      const last = pieces[pieces.length - 1];
      if (last && last[last.length - 1].system === box.system) last.push(box);
      else pieces.push([box]);
    }
    pieces.forEach((boxes, p) => {
      const first = boxes[0];
      const final = boxes[boxes.length - 1];
      const openStart = p > 0;
      const openEnd = p < pieces.length - 1 || span.clipped;
      const left = first.x + (openStart ? 0 : CHIP_INSET * scale);
      const right = final.x + final.width - (openEnd ? 0 : CHIP_INSET * scale);
      chips.push({
        key: `${span.pass}|${span.pattern.id}|${span.pattern.startBar}|${p}`,
        pattern: span.pattern,
        pass: span.pass,
        lane: lanes[s],
        firstBar: span.start + 1,
        lastBar: span.end + 1,
        left,
        top:
          first.y +
          first.height +
          (FIRST_LANE_TOP + lanes[s] * LANE_STEP) * scale,
        width: Math.max(0, right - left),
        labelled: p === 0,
        openStart,
        openEnd,
        clipped: span.clipped,
      });
    });
  });

  const bars: MapBarMark[] = [];
  for (let bar = 0; bar < total; bar++) {
    const box = measureOf(bar);
    if (!box) continue;
    const mapBar = map.bars[bar % n];
    let noteId: MapBarMark['noteId'] = null;
    if (bar < n && analysis.triadBarsIn7thMap.includes(bar)) {
      noteId = 'd3.triadBar';
    } else if (bar < n && mapBar.degree === 7 && center.mode === 'ionian') {
      noteId = 'd3.seven';
    }
    bars.push({
      key: `bar|${bar}`,
      bar,
      group: analysis.functions[bar % n] ?? null,
      roman: romanNumeral(center, mapBar.degree, mapBar.quality),
      noteId,
      right: box.x + box.width - MARK_INSET * scale,
      top: box.y + MARK_TOP * scale,
    });
  }
  return { chips, bars, scale };
}

export interface MusicMapOverlayProps {
  /** From LearnTabView's `overlay(layout)`. */
  layout: StaffLayout | null;
  keyCenter: GuitarCenterId;
  map: GuitarMusicMap;
  /** Defaults to analyzeMusicMap(map, the center's mode). */
  analysis?: MusicMapAnalysis;
  /** How many times the step plays the map (its repeat sign): 2. */
  passes?: number;
  /** Ticks before map bar 1 on the TAB: 1920 in time (the count-in bar), 0 out of time. */
  countInOffset: number;
  ticksPerBar?: number;
  /** Unused: the overlay is neutral, the key colour kept for the notes. */
  keyColor?: string;
  /** Home / Away / Tension above every bar. */
  showChordJobs: boolean;
  /** Each bar's Roman numeral above it (teacher/classroom setting). */
  showRomanNumerals: boolean;
}

function ChipLabel({
  segment,
  notes,
}: {
  segment: MapChipSegment;
  notes: readonly PopoverNote[];
}) {
  const text = patternChipText(segment.pattern.id);
  const wraps = segment.pattern.wrapsRepeat;
  // A chip cut short by the end of the step can span one bar.
  const bars =
    segment.firstBar === segment.lastBar
      ? `bar ${segment.firstBar}`
      : `bars ${segment.firstBar}–${segment.lastBar}`;
  const label = `${text}, ${bars}${wraps ? ', across the repeat' : ''}`;
  // Centred on the bracket's rail, which runs through the middle of the band.
  const className = `absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${CHIP_CLASS}`;
  const style = { background: CHIP_BACKGROUND };
  const content = (
    <>
      {text}
      {wraps && <Repeat aria-hidden className="h-3 w-3" />}
    </>
  );
  if (notes.length === 0) {
    return (
      <span className={className} style={style}>
        <span aria-hidden className="inline-flex items-center gap-0.5">
          {content}
        </span>
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  return (
    <TheoryPopover
      notes={notes}
      triggerLabel={label}
      className={className}
      style={style}
    >
      {content}
    </TheoryPopover>
  );
}

export const MusicMapOverlay = memo(function MusicMapOverlay({
  layout,
  keyCenter,
  map,
  analysis: analysisProp,
  passes = MUSIC_MAP_PASSES,
  countInOffset,
  ticksPerBar = BAR_TICKS,
  showChordJobs,
  showRomanNumerals,
}: MusicMapOverlayProps) {
  const center = getGuitarCenter(keyCenter);
  const analysis = useMemo(
    () => analysisProp ?? analyzeMusicMap(map, center.mode),
    [analysisProp, map, center],
  );
  const noteById = useMemo(() => {
    const { popover } = notesFor('D3', {
      center,
      map,
      analysis,
      settings: { accidentals: 'unicode' },
    });
    return new Map(popover.map((note) => [note.id, note]));
  }, [center, map, analysis]);
  const model = useMemo(
    () =>
      layout
        ? musicMapOverlayModel({
            layout,
            center,
            map,
            analysis,
            passes,
            countInOffset,
            ticksPerBar,
          })
        : null,
    [layout, center, map, analysis, passes, countInOffset, ticksPerBar],
  );
  if (!model) return null;
  const { scale } = model;
  const showMarks = showChordJobs || showRomanNumerals;

  return (
    <div
      data-music-map-overlay
      className="pointer-events-none absolute inset-0"
    >
      {model.chips.map((segment) => {
        const note = noteById.get(patternNoteId(segment.pattern));
        return (
          <div
            key={segment.key}
            data-map-chip={segment.pattern.id}
            data-bars={`${segment.firstBar}-${segment.lastBar}`}
            data-lane={segment.lane}
            className="absolute"
            style={{
              left: segment.left,
              top: segment.top,
              width: segment.width,
              height: Math.max(CHIP_HEIGHT * scale, 12),
            }}
          >
            <div
              aria-hidden
              className="absolute inset-x-0 top-1/2"
              style={{
                borderTop: `1px ${segment.openEnd || segment.openStart ? 'dashed' : 'solid'} ${BRACKET}`,
              }}
            />
            {!segment.openStart && (
              <div
                aria-hidden
                className="absolute left-0 top-0 h-1/2 w-px"
                style={{ background: BRACKET }}
              />
            )}
            {!segment.openEnd && (
              <div
                aria-hidden
                className="absolute right-0 top-0 h-1/2 w-px"
                style={{ background: BRACKET }}
              />
            )}
            {segment.labelled && (
              <ChipLabel segment={segment} notes={note ? [note] : []} />
            )}
          </div>
        );
      })}
      {model.bars.map((mark) => {
        const barNote = mark.noteId ? noteById.get(mark.noteId) : undefined;
        if (!showMarks && !barNote) return null;
        return (
          <div
            key={mark.key}
            data-bar-mark={mark.bar}
            className="absolute flex -translate-x-full items-center gap-1"
            style={{ left: mark.right, top: mark.top }}
          >
            {barNote && mark.noteId && (
              <TheoryPopover
                notes={[barNote]}
                triggerLabel={`${barNote.title}, bar ${mark.bar + 1}`}
                className={CHIP_CLASS}
                style={{ background: CHIP_BACKGROUND }}
              >
                <Info aria-hidden className="h-3 w-3" />
                <span data-bar-note={mark.noteId}>
                  {BAR_NOTE_TEXT[mark.noteId]}
                </span>
              </TheoryPopover>
            )}
            {showRomanNumerals && (
              <span
                data-roman
                className="text-xs leading-none"
                style={{ color: 'var(--color-text, #e8e8f0)' }}
              >
                {mark.roman}
              </span>
            )}
            {showChordJobs && mark.group && (
              // The map's chip look, not the badge's 10px one: the classes
              // win the merge, and clearing its inline border and colour
              // lets them show.
              <ChordJobsBadge
                group={mark.group}
                className={`${CHIP_CLASS} py-0 font-normal`}
                style={{
                  border: undefined,
                  background: CHIP_BACKGROUND,
                  color: undefined,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});
