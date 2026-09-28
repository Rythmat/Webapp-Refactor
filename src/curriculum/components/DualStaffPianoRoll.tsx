/**
 * DualStaffPianoRoll — Grand Staff layout for two-hand D section steps.
 *
 * Renders two GenrePianoRoll instances stacked vertically:
 *   RH (top) — with timeline header, drives onTickChange
 *   LH (bottom) — no timeline header, tick driven by RH
 *
 * Each stave uses chromatic lane mode (full semitone scale visible) and is
 * sized dynamically so every lane is at least MIN_LANE_HEIGHT pixels tall.
 * The visible range is always at least MIN_SEMITONES (1 octave), expanding
 * outward if actual notes go beyond that.
 */

import React, { useMemo } from 'react';
import type { HandConfig } from '@/curriculum/types/activity.v2';
import { useRollView } from '@/lib/notation';
import GenrePianoRoll, {
  type NoteEvent,
  type PianoRollProps,
} from './GenrePianoRoll';

const STAVE_SPACER = 8; // px gap between RH and LH staves
const TARGET_LANE_HEIGHT = 18; // px — ideal lane height; compress to fit rather than reducing note range
/**
 * Absolute floor, and deliberately low.
 *
 * A two-hand step is 30–40 chromatic lanes — 20-odd semitones per hand once
 * the bass reaches down for an octave pop. At 13px that is 430–570px of staves
 * before the timeline, which no realistic lesson viewport has: every one of
 * the 65 authored two-hand note sets overflowed and pushed the bottom of the
 * LH stave out of sight. Seeing every note of both hands matters more than row
 * thickness, so the floor sits below where real content lands (9–12px in a
 * 420–520px box) and only bites on a pathologically short window.
 *
 * Single-stave steps have far fewer lanes and still reach TARGET_LANE_HEIGHT.
 */
const MIN_LANE_HEIGHT = 8;
const TIMELINE_HEIGHT = 40; // px header reserved by RH stave
const MIN_OCTAVE_SEMITONES = 12; // always show at least 1 full octave per stave

/**
 * How tall each chromatic lane gets: fit when it can, scroll when it can't.
 *
 * Lane height tracks the space available, capped at TARGET_LANE_HEIGHT so a
 * tall window does not blow the rows up, and floored at MIN_LANE_HEIGHT
 * because below that the rows stop being readable — and a roll you cannot read
 * is worse than one you have to scroll a little.
 *
 * When the floor wins, the staves overflow their box on purpose and the roll
 * viewport scrolls. That is deliberately NOT the page scrolling: the keyboard
 * is pinned outside this box, so it stays visible at every window size. It
 * used to be the other way round — the box was inflated past the viewport to
 * reach 18px lanes, which pushed the keyboard off the bottom of the screen.
 */
export function laneHeightFor(
  containerHeight: number,
  totalLanes: number,
): number {
  if (totalLanes <= 0) return TARGET_LANE_HEIGHT;
  const availableForStaves = containerHeight - (STAVE_SPACER + TIMELINE_HEIGHT);
  return Math.min(
    TARGET_LANE_HEIGHT,
    Math.max(MIN_LANE_HEIGHT, Math.floor(availableForStaves / totalLanes)),
  );
}

export interface DualStaffPianoRollProps extends PianoRollProps {
  handConfig: HandConfig;
  containerHeight?: number; // available px for piano roll area (keyboard excluded); drives scale-to-fit
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a MIDI split threshold from events that carry a `hand` tag. */
export function computeSplitMidi(events: NoteEvent[]): number {
  const lhMidis = events
    .filter((e) => e.hand === 'lh' && e.midi !== undefined)
    .map((e) => e.midi as number);
  const rhMidis = events
    .filter((e) => e.hand === 'rh' && e.midi !== undefined)
    .map((e) => e.midi as number);

  if (lhMidis.length > 0 && rhMidis.length > 0) {
    const maxLh = Math.max(...lhMidis);
    const minRh = Math.min(...rhMidis);
    return Math.floor((maxLh + minRh) / 2);
  }

  return 60; // fallback: middle C
}

export function splitEvents(
  events: NoteEvent[],
  splitMidi: number,
): { rh: NoteEvent[]; lh: NoteEvent[] } {
  const rh: NoteEvent[] = [];
  const lh: NoteEvent[] = [];

  for (const e of events) {
    if (e.hand === 'rh') {
      rh.push(e);
    } else if (e.hand === 'lh') {
      lh.push(e);
    } else {
      if (e.midi !== undefined && e.midi >= splitMidi) {
        rh.push(e);
      } else {
        lh.push(e);
      }
    }
  }

  return { rh, lh };
}

function splitUserNotes(
  userNotes:
    | Array<{ midi: number; onset: number; duration: number }>
    | undefined,
  splitMidi: number,
): {
  rh: Array<{ midi: number; onset: number; duration: number }>;
  lh: Array<{ midi: number; onset: number; duration: number }>;
} {
  if (!userNotes) return { rh: [], lh: [] };
  return {
    rh: userNotes.filter((n) => n.midi >= splitMidi),
    lh: userNotes.filter((n) => n.midi < splitMidi),
  };
}

/**
 * Compute the display range for a stave.
 * - Expands outward symmetrically until the span is at least `minSemitones`.
 * - Returns midiRangeMin/Max and the lane count (rowHeight is computed externally
 *   once we know the effective lane height for both staves together).
 */
export function computeStaveParams(
  events: NoteEvent[],
  fallbackCenter: number,
  minSemitones: number,
): { midiRangeMin: number; midiRangeMax: number; laneCount: number } {
  const midis = events
    .map((e) => e.midi)
    .filter((m): m is number => m !== undefined);

  let dataMin: number;
  let dataMax: number;

  if (midis.length > 0) {
    dataMin = Math.min(...midis);
    dataMax = Math.max(...midis);
  } else {
    // No notes: centre on fallback with the requested window
    const half = Math.ceil(minSemitones / 2);
    dataMin = fallbackCenter - half;
    dataMax = fallbackCenter + half;
  }

  // Expand to the requested minimum span
  const span = dataMax - dataMin;
  if (span < minSemitones) {
    const extra = minSemitones - span;
    const addLow = Math.floor(extra / 2);
    const addHigh = Math.ceil(extra / 2);
    dataMin = Math.max(0, dataMin - addLow);
    dataMax = Math.min(127, dataMax + addHigh);
  }

  // Lane count = span + 3 (buildLaneList pads ±1 on each end)
  const laneCount = dataMax - dataMin + 3;

  return { midiRangeMin: dataMin, midiRangeMax: dataMax, laneCount };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DualStaffPianoRoll: React.FC<DualStaffPianoRollProps> = ({
  handConfig: _handConfig,
  containerHeight = 480,
  events,
  userNotes,
  onTickChange,
  rowHeight: _rowHeight, // ignored — computed per-stave below
  ...rest
}) => {
  const splitMidi = useMemo(() => computeSplitMidi(events), [events]);

  const { rh: rhEvents, lh: lhEvents } = useMemo(
    () => splitEvents(events, splitMidi),
    [events, splitMidi],
  );

  const { rh: rhUserNotes, lh: lhUserNotes } = useMemo(
    () => splitUserNotes(userNotes, splitMidi),
    [userNotes, splitMidi],
  );

  // Scale-to-fit: always show at least 1 octave per stave.
  const { rhParams, lhParams, laneHeight } = useMemo(() => {
    const rh = computeStaveParams(rhEvents, 64, MIN_OCTAVE_SEMITONES);
    const lh = computeStaveParams(lhEvents, 48, MIN_OCTAVE_SEMITONES);
    return {
      rhParams: rh,
      lhParams: lh,
      laneHeight: laneHeightFor(containerHeight, rh.laneCount + lh.laneCount),
    };
  }, [rhEvents, lhEvents, containerHeight]);

  const rhRowHeight = rhParams.laneCount * laneHeight;
  const lhRowHeight = lhParams.laneCount * laneHeight;

  // Notation is already a grand staff: one roll, hands tagged onto the staves.
  const [view] = useRollView('learn');
  if (view === 'notation') {
    return (
      <GenrePianoRoll
        {...rest}
        events={events}
        userNotes={userNotes}
        rowHeight={containerHeight - TIMELINE_HEIGHT}
        showTimeline={true}
        onTickChange={onTickChange}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: STAVE_SPACER,
        // minHeight, not height: fills the box when the staves fit, and grows
        // past it when the lane floor wins so the viewport above can scroll.
        minHeight: containerHeight,
      }}
    >
      {/* RH label + stave */}
      <div style={{ position: 'relative' }}>
        <StaveLabel label="RH" color={rest.keyColor} />
        <GenrePianoRoll
          {...rest}
          events={rhEvents}
          userNotes={rhUserNotes}
          rowHeight={rhRowHeight}
          midiRangeMin={rhParams.midiRangeMin}
          midiRangeMax={rhParams.midiRangeMax}
          showTimeline={true}
          onTickChange={onTickChange}
        />
      </div>

      {/* LH label + stave */}
      <div style={{ position: 'relative' }}>
        <StaveLabel label="LH" color={rest.keyColor} />
        <GenrePianoRoll
          {...rest}
          events={lhEvents}
          userNotes={lhUserNotes}
          rowHeight={lhRowHeight}
          midiRangeMin={lhParams.midiRangeMin}
          midiRangeMax={lhParams.midiRangeMax}
          showTimeline={false}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// StaveLabel — "RH" / "LH" badge overlaid on the lane-label column
// ---------------------------------------------------------------------------

const StaveLabel: React.FC<{ label: string; color?: string }> = ({
  label,
  color,
}) => (
  <div
    style={{
      position: 'absolute',
      top: 4,
      left: 4,
      zIndex: 40,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: color ?? 'rgba(200,200,200,0.7)',
      pointerEvents: 'none',
      userSelect: 'none',
    }}
  >
    {label}
  </div>
);

// Export the computed overhead so GenreLessonContainerV2 can account for it
export { TIMELINE_HEIGHT as DUAL_STAFF_TIMELINE_HEIGHT };

export default DualStaffPianoRoll;
