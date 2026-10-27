import React, { useEffect, useMemo, useState } from 'react';
import { WRONG_NOTE_KEY_COLOR } from '@/components/Games/PianoRollPlay';
import { PlayNote } from '@/components/Games/PlayNote';
import { GuitarViewToggle } from '@/components/notation/GuitarViewToggle';
import { RollViewToggle } from '@/components/notation/RollViewToggle';
import type { StaffLayout } from '@/components/notation/StaffView';
import {
  midiToPitchName,
  pitchNameToMidi,
  spellMidi,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import type { LessonInstrument } from '@/curriculum/types/activity.v2';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import type { FretPosition } from '@/lib/guitar/types';
import { useGuitarView, useRollView } from '@/lib/notation';
import {
  PIANO_ROLL_LANE_COLORS,
  pianoRollLaneBackground,
} from '@/lib/pianoRollLanes';
import type { LessonChordSymbol } from '../notation/lessonChordSymbols';
import { LearnCascadeView } from './LearnCascadeView';
import { LearnNotationView } from './LearnNotationView';
import { LearnTabView } from './LearnTabView';
import { advancePlayhead, initialClockState } from './playheadClock';
import './rollBands.css';

export type Midi = number; // 0..127

export interface NoteEvent {
  id: string;
  pitchName: string;
  midi?: Midi;
  startTicks: number;
  durationTicks: number;
  velocity?: number;
  color?: string;
  hand?: 'lh' | 'rh'; // grand staff stave assignment (D section dual staff only)
  fretPosition?: FretPosition; // guitar only: where the note is played (TAB)
}

export interface NoteHoldMeta {
  isCompleted: boolean;
  isCurrentChord: boolean;
  holdProgress: number;
  isHeld?: boolean;
}

export interface PianoRollProps {
  events: NoteEvent[];
  bars: number;
  beatsPerBar?: number;
  /**
   * Ticks per felt beat (engine/meter.ts beatTicks): 480, or 720 for a dotted
   * quarter in 6/8 and 12/8. The playhead still runs at 480 per quarter.
   */
  beatTicks?: number;
  /** The meter, for the notation and TAB views' time signature. */
  timeSignature?: [number, number];
  subdivision?: number; // grid lines per beat (default 1 => quarter). Use 2 for 8ths, 4 for 16ths
  rowHeight?: number; // base lane height unit; lanes scale to fit a static box
  /** Playback control */
  inTime?: boolean;
  /**
   * The audible lead-in before the student's bar 1, in ticks. The roll draws a
   * single count-in bar whatever this is; the staff's count-off needs the real
   * length so it counts every beat the student hears. Defaults to one bar.
   */
  leadInTicks?: number;
  /**
   * A pickup into bar 1, in ticks: notes before tick 0, at the end of the
   * count-in bar (Music Literacy's words). Parked, the roll opens on it
   * rather than on bar 1; a double bar marks bar 1, the real downbeat, on
   * the roll and the staff, and the count-in bar's beats are numbered as
   * the pickup bar's ("1" … "4"). Left out, none.
   */
  pickupTicks?: number;
  /** Staves the notation view writes on; the roll itself is unaffected. */
  staves?: 'grand' | 'treble' | 'bass';
  /**
   * An extra control for the notation header, beside the view switch. Shown
   * only on the staff, so a roll-only lesson never carries staff controls.
   */
  notationToggle?: React.ReactNode;
  playSpeed?: number; // beats per minute traversal speed
  isPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  /** Ticks since in-time playback began, read from the audio clock, or null
   *  before it starts. When given, the playhead follows it every frame instead
   *  of advancing by frame time, so it stays on what the student hears. */
  playbackTicks?: () => number | null;
  activeMidis?: number[];
  noteHoldMeta?: Record<string, NoteHoldMeta>;
  performanceMeta?: Record<string, { startTick: number; endTick?: number }>;
  /** Callbacks */
  onTickChange?: (tick: number) => void;
  /** Genre v2 extensions — all optional */
  keyRoot?: number; // MIDI root note for key center row highlighting
  keyColor?: string; // hex color from KEY_OF_COLORS for key center tint
  /**
   * User performance layer. `correct` is the host's verdict; when absent a
   * note counts as correct if its pitch appears anywhere in the targets.
   */
  userNotes?: Array<{
    midi: number;
    onset: number;
    duration: number;
    correct?: boolean;
  }>;
  targetMidiSet?: Set<number>; // target pitches for correct/wrong detection
  showTimeline?: boolean; // whether to render the beat/bar timeline header (default true)
  /** Fixed MIDI range for lane display (chromatic mode only) — stave always shows at least
   *  this range, expanding outward if notes fall outside. */
  midiRangeMin?: number;
  midiRangeMax?: number;
  /** When true, renders one lane per unique pitch only (no gap-filling between notes).
   *  Ensures large note bubbles even when notes span a wide MIDI range. Used by DualStaffPianoRoll. */
  noteOnlyLanes?: boolean;
  /** Pitch class → spelled name for the lesson's key and mode (enharmonicEngine).
   *  Names lanes that have no event; without it they use keyRoot's KEY_NOTE_NAMES row. */
  noteSpelling?: Map<number, string>;
  /** Tint held-note lane labels by targetMidiSet — key color for a target
   *  pitch, gray for a wrong one — instead of the default blue, so the roll
   *  reads the same as the keyboard beneath it. */
  colorActiveLanesByTarget?: boolean;
  /**
   * Chord symbols for this activity, drawn above the staff in notation view.
   * The roll itself doesn't show them — there is no staff to sit above.
   */
  chordSymbols?: readonly LessonChordSymbol[];
  /**
   * Guitar reads from TAB (or treble-8vb notation) instead of the roll; the
   * lesson clock here runs the same either way. Default piano.
   */
  instrument?: LessonInstrument;
  /** Guitar TAB only: drawn over the TAB from its layout (practice tools). */
  tabOverlay?: (layout: StaffLayout | null) => React.ReactNode;
  /**
   * Guitar only: the TAB / Notation switch in a header strip over the music
   * (default). The guitar lesson layout moves that choice to its settings and
   * passes false: no switch, and neither face draws a header.
   */
  guitarViewToggle?: boolean;
  /**
   * Piano: the roll / notation / falling-notes switch in the roll's corner
   * (default). A lesson screen that shows the bigger switch in its nav row
   * (SavedRollViewSwitch) passes false.
   */
  showViewToggle?: boolean;
  /**
   * Guitar TAB, in time: the step is in its preview, so a TAB parked before
   * the music opens on bar 1 rather than on the empty count-in bar (a
   * phone's one-line TAB would show that bar alone). Off by default, and
   * between two passes of a practice loop.
   */
  tabOpensOnMusic?: boolean;
  /**
   * Stretches of the music marked for the student, in the events' ticks:
   * each a tint behind its bars and a label in the ruler over them (Music
   * Literacy's "Call" and shining "Response"). The roll only; the staff and
   * the falling notes leave them out.
   */
  bands?: readonly RollBand[];
}

/** A stretch of the roll marked with a word (PianoRollProps.bands). */
export interface RollBand {
  startTick: number;
  endTick: number;
  label: string;
  /** Its tint and its label's color. */
  color: string;
  /**
   * The student's to play: a brighter tint, and a band of light sweeps
   * across it and its label now and then (rollBands.css). Still, without
   * motion.
   */
  shine?: boolean;
}

// ===== Helpers =====

const cascadeMidiOf = (e: NoteEvent) =>
  e.midi ?? pitchNameToMidi(e.pitchName) ?? undefined;
// Just the note name: the keyboard right under it already shows the octave.
const cascadeLabelOf = (e: NoteEvent) =>
  formatAccidentalsForDisplay(e.pitchName.replace(/-?\d+$/, ''));

/** Tempo is quarter-note bpm, so the playhead runs at this many per beat of it. */
const QUARTER_TICKS = 480;

// Note names (A#4, B♭4, C♭5, E𝄫4 …) → MIDI via the enharmonic engine, so every
// spelling it emits maps back to the right key.
export { pitchNameToMidi };

//Given a midi number, returns the string of the note name with the appropriate accidental and octave number
// Uses the lesson's spelling map when given, else key-context-aware spelling from keyRoot
const midiToNoteName = (
  midi: number,
  keyRoot?: number,
  noteSpelling?: Map<number, string>,
): string =>
  noteSpelling ? spellMidi(midi, noteSpelling) : midiToPitchName(midi, keyRoot);

//Produces the list of lanes that span the entirety of the notes given in the event sequence.
// noteOnlyLanes=true: only one lane per unique pitch in events (no gap-filling). Used by
// DualStaffPianoRoll so wide-range content (octave-pop bass) stays readable with large bubbles.
function buildLaneList(
  events: NoteEvent[],
  keyRoot?: number,
  midiRangeMin?: number,
  midiRangeMax?: number,
  noteOnlyLanes?: boolean,
  noteSpelling?: Map<number, string>,
): string[] {
  // Build MIDI→name map from events so lanes match event pitchNames
  const eventNameByMidi = new Map<number, string>();
  const midiValues = events
    .map((event) => {
      if (typeof event.midi === 'number') {
        if (!eventNameByMidi.has(event.midi)) {
          eventNameByMidi.set(event.midi, event.pitchName);
        }
        return event.midi;
      }
      const midi = pitchNameToMidi(event.pitchName);
      if (midi !== null && !eventNameByMidi.has(midi)) {
        eventNameByMidi.set(midi, event.pitchName);
      }
      return midi ?? null;
    })
    .filter((value): value is number => typeof value === 'number');

  if (midiValues.length === 0) {
    // Nothing to draw yet (Music Literacy's create pass, before the
    // student's call is transcribed): the lanes it was given, if any.
    if (
      !noteOnlyLanes &&
      midiRangeMin !== undefined &&
      midiRangeMax !== undefined &&
      midiRangeMin <= midiRangeMax
    ) {
      const lanes: string[] = [];
      for (let midi = midiRangeMax; midi >= midiRangeMin; midi--) {
        lanes.push(midiToNoteName(midi, keyRoot, noteSpelling));
      }
      return lanes;
    }
    return ['C4'];
  }

  // Note-only mode: one lane per unique pitch, sorted high→low. No empty semitone rows.
  if (noteOnlyLanes) {
    const uniqueSorted = [...new Set(midiValues)].sort((a, b) => b - a);
    return uniqueSorted.map(
      (midi) =>
        eventNameByMidi.get(midi) ??
        midiToNoteName(midi, keyRoot, noteSpelling),
    );
  }

  // Chromatic mode: fill every semitone between min and max (original behaviour).
  const dataMin =
    midiValues.length > 0 ? Math.min(...midiValues) : (midiRangeMin ?? 60);
  const dataMax =
    midiValues.length > 0 ? Math.max(...midiValues) : (midiRangeMax ?? 60);
  const effectiveMin =
    midiRangeMin !== undefined ? Math.min(midiRangeMin, dataMin) : dataMin;
  const effectiveMax =
    midiRangeMax !== undefined ? Math.max(midiRangeMax, dataMax) : dataMax;

  const minLaneMidi = Math.max(effectiveMin - 1, 0);
  const maxLaneMidi = Math.min(effectiveMax + 1, 127);

  const laneNames: string[] = [];
  for (let midi = maxLaneMidi; midi >= minLaneMidi; midi--) {
    laneNames.push(
      eventNameByMidi.get(midi) ?? midiToNoteName(midi, keyRoot, noteSpelling),
    );
  }

  return laneNames;
}

//Ensure the percent is over 0 and less than 0, returning the bounary if not.
const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

//
function ticksToPercent(
  ticks: number,
  countInTicks: number,
  totalTicks: number,
) {
  const denominator = totalTicks === 0 ? 1 : totalTicks;
  return ((ticks + countInTicks) / denominator) * 100;
}

// Given starting and ending tick values with a step size, returns the list of step positions within that range
function generateTickPositions(
  startTick: number,
  endTick: number,
  stepSize: number,
): number[] {
  if (stepSize <= 0) {
    return [];
  }
  const ticks: number[] = [];
  const totalRange = endTick - startTick;
  const stepCount = Math.ceil(totalRange / stepSize);

  for (let i = 0; i <= stepCount; i++) {
    const tickValue = startTick + i * stepSize;
    if (tickValue > endTick + stepSize / 1000) {
      break;
    }
    ticks.push(tickValue);
  }
  // Ensure the final beat exists for exact divisions
  if (!ticks.includes(endTick)) {
    ticks.push(endTick);
  }
  return ticks;
}

/** The first of `stepSize`'s multiples at or after `tick`. */
const alignUp = (tick: number, stepSize: number) =>
  stepSize > 0 ? Math.ceil(tick / stepSize - 1e-9) * stepSize : tick;

function barBeatLabels(
  bars: number,
  beatsPerBar: number,
  showCountIn: boolean,
  beatTicks: number,
  /** The bar before bar 1 is a pickup bar: just its beats, "1" … "4". */
  pickupBar = false,
) {
  const labels: { tick: number; label: string }[] = [];
  for (let barIndex = -(showCountIn ? 1 : 0); barIndex < bars; barIndex++) {
    for (let beat = 1; beat <= beatsPerBar; beat++) {
      const absoluteBeat = barIndex * beatsPerBar + (beat - 1);
      const prefix =
        barIndex < 0 ? (pickupBar ? '' : `${barIndex}.`) : `${barIndex + 1}.`;
      labels.push({
        tick: absoluteBeat * beatTicks,
        label: `${prefix}${beat}`,
      });
    }
  }
  return labels;
}

/** Bar 1 after a pickup, the real downbeat: two lines, the second on it. */
const DoubleBar: React.FC<{ left: number }> = ({ left }) => (
  <div
    aria-hidden="true"
    data-roll-double-bar
    className="pointer-events-none absolute inset-y-0"
    style={{
      left: `${left}%`,
      width: 6,
      transform: 'translateX(-4px)',
      borderLeft: `2px solid ${PIANO_ROLL_LANE_COLORS.doubleBarLine}`,
      borderRight: `2px solid ${PIANO_ROLL_LANE_COLORS.doubleBarLine}`,
    }}
  />
);

// ===== Component =====
const GenrePianoRoll: React.FC<PianoRollProps> = ({
  events,
  bars,
  beatsPerBar = 4,
  beatTicks = QUARTER_TICKS,
  timeSignature,
  subdivision = 1,
  rowHeight = 36 * 24,
  inTime = false,
  leadInTicks,
  pickupTicks = 0,
  staves,
  notationToggle,
  playSpeed = 60,
  isPlaying,
  onPlayingChange,
  playbackTicks,
  activeMidis = [],
  noteHoldMeta,
  performanceMeta,
  onTickChange,
  keyRoot,
  keyColor,
  userNotes,
  targetMidiSet,
  showTimeline = true,
  midiRangeMin,
  midiRangeMax,
  noteOnlyLanes,
  noteSpelling,
  colorActiveLanesByTarget = false,
  chordSymbols,
  instrument = 'piano',
  tabOverlay,
  guitarViewToggle = true,
  showViewToggle = true,
  tabOpensOnMusic = false,
  bands,
}) => {
  const laneList = buildLaneList(
    events,
    keyRoot,
    midiRangeMin,
    midiRangeMax,
    noteOnlyLanes,
    noteSpelling,
  );
  const effectiveRowHeight =
    laneList.length > 0 ? rowHeight / laneList.length : rowHeight;
  const ticksPerBar = beatsPerBar * beatTicks;
  const countInTicks = inTime ? ticksPerBar : 0;
  const countOffTicks = inTime ? (leadInTicks ?? ticksPerBar) : 0;
  // A lead-in longer than the roll's own count-in bar means the caller has
  // shifted its notes to make room, so bar 1 sits that much later than tick 0
  // on this playhead — that is where the count has to run to.
  const musicStartTick = Math.max(0, countOffTicks - countInTicks);
  // A pickup sits at the end of the count-in bar; parked, the roll shows
  // only it ahead of bar 1.
  const pickup = Math.max(0, Math.min(pickupTicks, ticksPerBar));
  const leadTicks = inTime ? countInTicks : pickup;
  const totalTicks = bars * ticksPerBar + leadTicks;
  const laneLabelWidth = 72;
  const timelineStartTick = -leadTicks;
  const timelineEndTick = bars * ticksPerBar;
  const safeSubdivision = subdivision <= 0 ? 1 : subdivision;
  const beatsPerSecond = Math.max(playSpeed, 0) / 60;
  const playheadTicksPerSecond = beatsPerSecond * QUARTER_TICKS;

  const [playheadTick, setPlayheadTick] = useState(-countInTicks);
  const visibleBars = 1;
  const displayStartTick = inTime
    ? playheadTick - ticksPerBar * visibleBars
    : timelineStartTick;
  const displayEndTick = inTime
    ? playheadTick + ticksPerBar * visibleBars
    : timelineEndTick;
  const tickPercent = (tick: number) => {
    if (!inTime) {
      return ticksToPercent(tick, leadTicks, totalTicks);
    }
    const denominator = displayEndTick - displayStartTick || 1;
    return ((tick - displayStartTick) / denominator) * 100;
  };
  const isControlled =
    typeof isPlaying === 'boolean' && typeof onPlayingChange === 'function';
  const [internalPlaying, setInternalPlaying] = useState(false);
  const playing = isControlled ? isPlaying : internalPlaying;

  // Change the playing state
  const setPlaying = (next: boolean) => {
    console.log('setting playing to', next);
    const wasPlaying = playing;

    if (inTime && next && !wasPlaying) {
      setPlayheadTick(-countInTicks);
      onTickChange?.(-countInTicks);
    }

    if (onPlayingChange) {
      console.log('setting isPlaying to', next);
      onPlayingChange(next);
    } else {
      setInternalPlaying(next);
    }
  };

  // Animation of the playhead, rerenders with playhead progression
  useEffect(() => {
    if (!inTime || playheadTicksPerSecond <= 0 || !playing) {
      return;
    }

    let rafId: number;
    let lastTime: number | null = null;
    const maxTick = bars * ticksPerBar;
    // The transport takes a moment to start after a run begins; hold at the
    // count-in until its clock is seen to advance. If it never does — audio
    // failed to start, or the read is stuck — run on this clock rather than
    // freezing the lesson.
    let clockState = initialClockState();

    const animate = (timestamp: number) => {
      if (lastTime === null) {
        lastTime = timestamp;
        rafId = requestAnimationFrame(animate);
        return;
      }

      const deltaSeconds = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      let clockTicks: number | null | undefined;
      try {
        clockTicks = playbackTicks === undefined ? undefined : playbackTicks();
      } catch {
        clockTicks = null; // a failed read must never stop the playhead
      }

      let reachedEnd = false;
      setPlayheadTick((prev) => {
        const decision = advancePlayhead(clockState, {
          prev,
          deltaSeconds,
          clockTicks,
          countInTicks,
          ticksPerSecond: playheadTicksPerSecond,
        });
        clockState = decision.state;
        if (import.meta.env.DEV && decision.justGaveUp) {
          console.warn(
            `[GenrePianoRoll] transport clock ${clockTicks == null ? 'never reached the playhead' : `stuck at ${clockTicks.toFixed(0)} ticks`}; playhead is running on its own clock`,
          );
        }
        let next = decision.tick;
        if (next >= maxTick) {
          next = maxTick;
          reachedEnd = true;
          onTickChange?.(next);
          setPlaying(false);
          return next;
        }
        onTickChange?.(next);
        return next;
      });

      if (!reachedEnd && playing) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    inTime,
    playheadTicksPerSecond,
    countInTicks,
    bars,
    beatsPerBar,
    playing,
    onTickChange,
    playbackTicks,
    ticksPerBar,
  ]);

  const activeMidiSet = useMemo(() => new Set(activeMidis), [activeMidis]);

  // Notation view: the lesson clock above keeps running; only the drawing changes.
  const [view, setView] = useRollView('learn');
  const [guitarView, setGuitarView] = useGuitarView();
  const viewToggle = showViewToggle ? (
    <RollViewToggle view={view} onChange={setView} cascade />
  ) : null;
  const notationHeader = (
    <>
      {viewToggle}
      {notationToggle}
    </>
  );
  // Guitar has no roll: TAB, or the staff written an octave up with an 8
  // under the clef, as guitar music is. The staff's own clef choice
  // (`staves`, `notationToggle`) doesn't apply. Bass reads the same way on
  // the bass clef, an octave up by convention (no 8 under it).
  if (instrument === 'guitar' || instrument === 'bass') {
    const face = {
      events,
      bars,
      beatsPerBar,
      keyColor,
      inTime,
      playheadTick,
      countInTicks: countOffTicks,
      beatTicks,
      ...(timeSignature ? { timeSignature } : {}),
      musicStartTick,
      noteHoldMeta,
      performanceMeta,
      height: rowHeight + (showTimeline ? 40 : 0),
      chordSymbols,
      ...(guitarViewToggle
        ? {
            toggle: (
              <GuitarViewToggle view={guitarView} onChange={setGuitarView} />
            ),
          }
        : { toggle: null, showHeader: false }),
    };
    return guitarView === 'tab' ? (
      <LearnTabView
        {...face}
        overlay={tabOverlay}
        playing={playing}
        openOnMusic={tabOpensOnMusic}
      />
    ) : (
      <LearnNotationView
        {...face}
        keyRoot={keyRoot}
        staves={instrument === 'bass' ? 'bass' : 'treble'}
        writtenOctaveShift={1}
        {...(instrument === 'bass' ? {} : { clefAnnotation: '8vb' as const })}
      />
    );
  }
  if (view === 'cascade') {
    return (
      <LearnCascadeView
        events={events}
        midiOf={cascadeMidiOf}
        labelOf={cascadeLabelOf}
        beatsPerBar={beatsPerBar}
        beatTicks={beatTicks}
        inTime={inTime}
        playheadTick={playheadTick}
        countInTicks={countOffTicks}
        musicStartTick={musicStartTick}
        noteHoldMeta={noteHoldMeta}
        performanceMeta={performanceMeta}
        activeMidis={activeMidis}
        keyColor={keyColor}
        height={rowHeight + (showTimeline ? 40 : 0)}
        toggle={viewToggle}
      />
    );
  }
  if (view === 'notation') {
    return (
      <LearnNotationView
        events={events}
        bars={bars}
        beatsPerBar={beatsPerBar}
        keyRoot={keyRoot}
        keyColor={keyColor}
        inTime={inTime}
        playheadTick={playheadTick}
        countInTicks={countOffTicks}
        beatTicks={beatTicks}
        timeSignature={timeSignature}
        musicStartTick={musicStartTick}
        // Only a lesson with a pickup hands one on; the rest stay as they were.
        {...(pickup > 0 ? { pickupTicks: pickup } : {})}
        staves={staves}
        noteHoldMeta={noteHoldMeta}
        performanceMeta={performanceMeta}
        height={rowHeight + (showTimeline ? 40 : 0)}
        chordSymbols={chordSymbols}
        toggle={notationHeader}
      />
    );
  }

  // Preindex lanes
  const laneIndex: Record<string, number> = {};
  laneList.forEach((name, i) => {
    laneIndex[name] = i;
  });

  // Sub grid (thin lines) and beat lines (stronger). Parked, they fall on
  // the beats counted from bar 1, wherever a pickup opens the roll.
  const gridStart = (stepSize: number) =>
    inTime ? displayStartTick : alignUp(displayStartTick, stepSize);
  const subStepTicks = beatTicks / safeSubdivision;
  const subLines = generateTickPositions(
    gridStart(subStepTicks),
    displayEndTick,
    subStepTicks,
  );
  const beatLines = generateTickPositions(
    gridStart(beatTicks),
    displayEndTick,
    beatTicks,
  );
  const barLines = generateTickPositions(
    gridStart(ticksPerBar),
    displayEndTick,
    ticksPerBar,
  );

  const labels = barBeatLabels(
    bars,
    beatsPerBar,
    inTime || pickup > 0,
    beatTicks,
    pickup > 0,
  );
  const visibleLabels = inTime
    ? labels.filter(
        ({ tick }) => tick >= displayStartTick && tick <= displayEndTick,
      )
    : labels.filter(({ tick }) => tick >= timelineStartTick);
  // After a pickup, bar 1 is the real downbeat: a double bar, where it is.
  const downbeatAt = tickPercent(0);
  const doubleBar =
    pickup > 0 && downbeatAt >= 0 && downbeatAt <= 100 ? (
      <DoubleBar left={downbeatAt} />
    ) : null;
  // The bands, cut to what's in view: a label rides the visible part.
  const shownBands = (bands ?? []).flatMap((band) => {
    const left = clampPercent(tickPercent(band.startTick));
    const right = clampPercent(tickPercent(band.endTick));
    return right > left ? [{ ...band, left, width: right - left }] : [];
  });

  return (
    <div className="relative">
      <div
        className="w-full overflow-hidden rounded-xl text-sm"
        style={{
          fontSize: '0.9rem',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-dim)',
        }}
      >
        {/* Header: beat markers & optional chord strip */}
        {showTimeline && (
          <div
            className="sticky top-0 z-30 backdrop-blur"
            style={{
              background: 'rgba(25,25,25,0.95)',
              borderBottom: '1px solid rgba(120,120,120,0.25)',
              position: 'relative',
            }}
          >
            {/* Top ruler */}
            <div className="relative flex" style={{ height: 40 }}>
              <div
                className="flex shrink-0 items-center justify-center border-r border-neutral-800/50"
                style={{ width: laneLabelWidth }}
              >
                {viewToggle}
              </div>
              <div className="relative flex-1" style={{ minWidth: 0 }}>
                {/* beat labels */}
                {visibleLabels.map(({ tick, label }) => {
                  const isFinalTick = Math.abs(tick - timelineEndTick) < 0.0001;
                  return (
                    <div
                      key={`lbl-${tick}`}
                      className="absolute top-1 select-none text-xs text-neutral-300"
                      style={{
                        left: `${tickPercent(tick)}%`,
                        transform: isFinalTick
                          ? 'translateX(-100%)'
                          : 'translateX(6px)',
                      }}
                    >
                      {label}
                    </div>
                  );
                })}
                {/* vertical beat lines (stronger) */}
                {beatLines.map((b) => (
                  <div
                    key={`beat-${b}`}
                    className="absolute top-0 h-full"
                    style={{
                      left: `${tickPercent(b)}%`,
                      width: 1,
                      background: 'rgba(160,160,160,0.25)',
                    }}
                  />
                ))}
                {/* bar separators */}
                {barLines.map((b, i) => (
                  <div
                    key={`bar-${b}`}
                    className="absolute top-0 h-full"
                    style={{
                      left: `${tickPercent(b)}%`,
                      width: 2,
                      background:
                        i === 0
                          ? PIANO_ROLL_LANE_COLORS.firstBarLine
                          : 'rgba(200,200,200,0.35)',
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 h-[40px] w-full bg-current"
                      style={{
                        background:
                          i === 0
                            ? PIANO_ROLL_LANE_COLORS.firstBarLine
                            : 'rgba(200,200,200,0.35)',
                      }}
                    />
                  </div>
                ))}
                {doubleBar}
                {shownBands.map((band) => (
                  <div
                    key={`band-${band.startTick}`}
                    aria-hidden="true"
                    data-roll-band={band.label}
                    data-roll-band-shine={band.shine ? '' : undefined}
                    className={`pointer-events-none absolute bottom-[3px] flex h-4 items-center overflow-hidden rounded-[3px]${band.shine ? ' roll-band-shine' : ''}`}
                    style={
                      {
                        left: `${band.left}%`,
                        width: `${band.width}%`,
                        backgroundColor: `color-mix(in srgb, ${band.color} ${band.shine ? 38 : 24}%, rgb(25 25 25))`,
                        boxShadow: `inset 0 1px 0 color-mix(in srgb, ${band.color} ${band.shine ? 80 : 55}%, transparent)`,
                        '--band-shine': `color-mix(in srgb, ${band.color} 45%, white)`,
                      } as React.CSSProperties
                    }
                  >
                    <span
                      className="whitespace-nowrap px-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.12em]"
                      style={{
                        color: band.shine
                          ? 'white'
                          : `color-mix(in srgb, ${band.color} 55%, white)`,
                      }}
                    >
                      {band.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="relative flex w-full">
          {/* Lane labels column */}
          <div className="sticky left-0 z-20" style={{ width: laneLabelWidth }}>
            {laneList.map((name, _idx) => {
              const laneMidi = pitchNameToMidi(name);
              const baseBackground = pianoRollLaneBackground(
                laneMidi,
                keyRoot,
                keyColor,
              );
              const isActiveLane =
                typeof laneMidi === 'number' && activeMidiSet.has(laneMidi);
              const targetLaneColor =
                colorActiveLanesByTarget && typeof laneMidi === 'number'
                  ? targetMidiSet?.has(laneMidi)
                    ? (keyColor ?? '#4ecdc4')
                    : WRONG_NOTE_KEY_COLOR
                  : null;
              const background = isActiveLane
                ? targetLaneColor
                  ? `linear-gradient(90deg, ${targetLaneColor}a6, ${targetLaneColor}59)`
                  : 'linear-gradient(90deg, rgba(59,130,246,0.65), rgba(37,99,235,0.35))'
                : baseBackground;
              const color = isActiveLane
                ? '#f8fafc'
                : PIANO_ROLL_LANE_COLORS.label;
              return (
                <div
                  key={name}
                  className="flex select-none items-center justify-end pr-2 transition-colors"
                  style={{
                    height: effectiveRowHeight,
                    fontSize: Math.max(
                      8,
                      Math.min(13, effectiveRowHeight * 0.65),
                    ),
                    borderBottom: `1px solid ${PIANO_ROLL_LANE_COLORS.separator}`,
                    background,
                    color,
                    fontWeight: isActiveLane ? 600 : 400,
                  }}
                >
                  {formatAccidentalsForDisplay(name)}
                </div>
              );
            })}
          </div>

          {/* Grid underlay */}
          <div className="relative flex-1" style={{ minWidth: 0 }}>
            <div className="absolute inset-0 z-0">
              {/* row backgrounds — pitch-class colored */}
              {laneList.map((name, idx) => {
                const laneMidi = pitchNameToMidi(name);
                return (
                  <div
                    key={`row-${idx}`}
                    className="absolute inset-x-0"
                    style={{
                      top: idx * effectiveRowHeight,
                      height: effectiveRowHeight,
                      background: pianoRollLaneBackground(
                        laneMidi,
                        keyRoot,
                        keyColor,
                      ),
                      borderBottom: `1px solid ${PIANO_ROLL_LANE_COLORS.separator}`,
                    }}
                  />
                );
              })}
              {/* bands: a tint behind their bars */}
              {shownBands.map((band) => (
                <div
                  key={`band-${band.startTick}`}
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-y-0${band.shine ? ' roll-band-shine' : ''}`}
                  style={
                    {
                      left: `${band.left}%`,
                      width: `${band.width}%`,
                      backgroundColor: `color-mix(in srgb, ${band.color} ${band.shine ? 18 : 10}%, transparent)`,
                      '--band-shine': `color-mix(in srgb, ${band.color} 38%, transparent)`,
                    } as React.CSSProperties
                  }
                />
              ))}
              {/* sub grid lines */}
              {subLines.map((b) => (
                <div
                  key={`sub-${b}`}
                  className="absolute inset-y-0"
                  style={{
                    left: `${tickPercent(b)}%`,
                    width: 1,
                    background: PIANO_ROLL_LANE_COLORS.subLine,
                  }}
                />
              ))}
              {/* beat lines (stronger) */}
              {beatLines.map((b) => (
                <div
                  key={`B-${b}`}
                  className="absolute inset-y-0"
                  style={{
                    left: `${tickPercent(b)}%`,
                    width: 1,
                    background: PIANO_ROLL_LANE_COLORS.beatLine,
                  }}
                />
              ))}
              {/* bar lines */}
              {barLines.map((b, i) => (
                <div
                  key={`BAR-${b}`}
                  className="absolute inset-y-0"
                  style={{
                    left: `${tickPercent(b)}%`,
                    width: 2,
                    background:
                      i === 0
                        ? PIANO_ROLL_LANE_COLORS.firstBarLine
                        : PIANO_ROLL_LANE_COLORS.barLine,
                  }}
                >
                  <div
                    className="absolute left-0 top-[-40px] h-[40px] w-full bg-current"
                    style={{
                      background:
                        i === 0
                          ? PIANO_ROLL_LANE_COLORS.firstBarLine
                          : PIANO_ROLL_LANE_COLORS.barLine,
                    }}
                  />
                </div>
              ))}
              {doubleBar}
            </div>

            {/* Notes layer */}
            <div className="absolute inset-0 z-10">
              {events.map((e) => {
                const row = laneIndex[e.pitchName];
                if (row == null) return null;

                const scheduledStart = e.startTicks;
                const scheduledEnd = e.startTicks + e.durationTicks;
                let visStartTick = scheduledStart;
                let visEndTick = scheduledEnd;
                const perf = performanceMeta?.[e.id];
                // const noteMidi =
                //   typeof e.midi === "number"
                //     ? e.midi
                //     : pitchNameToMidi(e.pitchName);

                if (inTime) {
                  const perfStart =
                    perf && typeof perf.startTick === 'number'
                      ? perf.startTick
                      : null;
                  const perfEnd =
                    perf && typeof perf.endTick === 'number'
                      ? perf.endTick
                      : null;
                  if (perfStart != null) {
                    const clampedStart = Math.max(scheduledStart, perfStart);
                    const clampedEnd = Math.min(
                      scheduledEnd,
                      perfEnd != null ? perfEnd : playheadTick,
                    );
                    visStartTick = clampedStart;
                    visEndTick = Math.max(clampedStart, clampedEnd);
                  } else {
                    visStartTick = scheduledStart;
                    visEndTick = scheduledEnd;
                  }
                } else if (perf && typeof perf.startTick === 'number') {
                  visStartTick = perf.startTick;
                  visEndTick =
                    typeof perf.endTick === 'number'
                      ? perf.endTick
                      : playheadTick;
                }

                if (visEndTick < visStartTick) {
                  visEndTick = visStartTick;
                }

                const startPercent = clampPercent(tickPercent(visStartTick));
                const rawEndPercent = tickPercent(visEndTick);
                const endPercent = clampPercent(rawEndPercent);

                if (endPercent <= 0 || startPercent >= 100) {
                  return null;
                }

                let widthPercent = Math.max(endPercent - startPercent, 0);
                const minPercentWidth = 0.5;

                if (widthPercent < minPercentWidth) {
                  widthPercent = minPercentWidth;
                }

                if (startPercent + widthPercent > 100) {
                  widthPercent = Math.max(0, 100 - startPercent);
                }

                if (widthPercent <= 0) {
                  return null;
                }

                const baseColor = e.color ?? '#b64f4f';
                const meta = noteHoldMeta?.[e.id];
                const wasPlayed =
                  !!perf &&
                  typeof perf.startTick === 'number' &&
                  perf.startTick >= scheduledStart &&
                  perf.startTick <= scheduledEnd;
                const isInWindow =
                  inTime &&
                  playheadTick >= scheduledStart &&
                  playheadTick <= scheduledEnd;
                let color = baseColor;
                let holdProgress: number | undefined;
                const dimmed = inTime && !(wasPlayed || isInWindow);
                const isCompleted = meta?.isCompleted ?? false;

                if (
                  !inTime &&
                  meta &&
                  (meta.isCurrentChord || meta.isCompleted)
                ) {
                  color = baseColor;
                  holdProgress = meta.isCompleted
                    ? 1
                    : Math.max(0, Math.min(1, meta.holdProgress));
                }

                let segments:
                  | { from: number; to: number; kind: 'played' | 'inactive' }[]
                  | undefined;
                if (!inTime && meta) {
                  if (meta.isCompleted) {
                    segments = [{ from: 0, to: 1, kind: 'played' }];
                  } else if (meta.isCurrentChord) {
                    const progress = Math.max(
                      0,
                      Math.min(1, meta.holdProgress),
                    );
                    segments = [
                      { from: 0, to: progress, kind: 'played' },
                      { from: progress, to: 1, kind: 'inactive' },
                    ];
                  } else {
                    segments = [{ from: 0, to: 1, kind: 'inactive' }];
                  }
                }

                return (
                  <PlayNote
                    key={e.id}
                    color={color}
                    dimmed={dimmed}
                    highlighted={isCompleted}
                    holdProgress={holdProgress}
                    inTime={inTime}
                    isHeld={meta?.isHeld}
                    note={{
                      ...e,
                      pitchName: formatAccidentalsForDisplay(e.pitchName),
                    }}
                    row={row}
                    rowHeight={effectiveRowHeight}
                    segments={segments}
                    startPercent={startPercent}
                    widthPercent={widthPercent}
                  />
                );
              })}
            </div>

            {/* User note performance layer */}
            {userNotes && userNotes.length > 0 && (
              <div className="absolute inset-0 z-[15] pointer-events-none">
                {userNotes.map((note, i) => {
                  // Find which lane this note belongs to
                  // Match by pitch, not name: lanes carry each event's own spelling.
                  const row = laneList.findIndex(
                    (name) => pitchNameToMidi(name) === note.midi,
                  );
                  if (row === -1) return null;

                  const isCorrect =
                    note.correct ?? targetMidiSet?.has(note.midi) ?? false;
                  const startPct = tickPercent(note.onset);
                  const endPct = tickPercent(
                    note.onset + (note.duration > 0 ? note.duration : 120),
                  );
                  const widthPct = Math.max(0.5, endPct - startPct);

                  if (startPct >= 100 || endPct <= 0) return null;

                  // Proportional margin, matching PlayNote's 15%. A fixed 2px
                  // inset left the student's own notes visibly thinner than
                  // the targets they sit on once two-hand lanes compress.
                  const userMargin = Math.max(
                    1,
                    Math.floor(effectiveRowHeight * 0.15),
                  );

                  return (
                    <div
                      key={`user_${i}`}
                      style={{
                        position: 'absolute',
                        top: row * effectiveRowHeight + userMargin,
                        height: Math.max(
                          1,
                          effectiveRowHeight - userMargin * 2,
                        ),
                        left: `${Math.max(0, startPct)}%`,
                        width: `${widthPct}%`,
                        backgroundColor: isCorrect
                          ? (keyColor ?? '#4ecdc4')
                          : '#888888',
                        opacity: isCorrect ? 1.0 : 0.5,
                        boxShadow: isCorrect
                          ? `0 0 8px 3px ${keyColor ?? '#4ecdc4'}60`
                          : 'none',
                        borderRadius: '3px',
                        border: isCorrect
                          ? `1px solid ${keyColor ?? '#4ecdc4'}`
                          : '1px solid #666666',
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Playhead */}
            {inTime && (
              <div
                className="absolute inset-y-0 z-20"
                style={{
                  left: `${tickPercent(playheadTick)}%`,
                }}
              >
                <div className="absolute left-0 top-0 h-full w-[4px] bg-neutral-400/90" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenrePianoRoll;
