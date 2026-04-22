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
import GenrePianoRoll, {
  type NoteEvent,
  type PianoRollProps,
} from './GenrePianoRoll';

const STAVE_SPACER = 8; // px gap between RH and LH staves
const TARGET_LANE_HEIGHT = 18; // px — ideal lane height; compress to fit rather than reducing note range
const TIMELINE_HEIGHT = 40; // px header reserved by RH stave
const MIN_OCTAVE_SEMITONES = 12; // always show at least 1 full octave per stave

export interface DualStaffPianoRollProps extends PianoRollProps {
  handConfig: HandConfig;
  containerHeight?: number; // available px for piano roll area (keyboard excluded); drives scale-to-fit
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a MIDI split threshold from events that carry a `hand` tag. */
function computeSplitMidi(events: NoteEvent[]): number {
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

function splitEvents(
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
function computeStaveParams(
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
  // Compress lane height toward MIN_LANE_HEIGHT rather than reducing note range.
  const { rhParams, lhParams, laneHeight } = useMemo(() => {
    const overhead = STAVE_SPACER + TIMELINE_HEIGHT;
    const availableForStaves = containerHeight - overhead;

    const rh = computeStaveParams(rhEvents, 64, MIN_OCTAVE_SEMITONES);
    const lh = computeStaveParams(lhEvents, 48, MIN_OCTAVE_SEMITONES);
    const totalLanes = rh.laneCount + lh.laneCount;

    // Scale lane height to fit exactly within the available space.
    // Never exceed TARGET_LANE_HEIGHT; never go below 1px (overflow clips LH otherwise).
    // MIN_LANE_HEIGHT is a readability guide only — we never force it if it would overflow.
    const laneH = Math.max(
      1,
      Math.min(TARGET_LANE_HEIGHT, Math.floor(availableForStaves / totalLanes)),
    );

    return { rhParams: rh, lhParams: lh, laneHeight: laneH };
  }, [rhEvents, lhEvents, containerHeight]);

  const rhRowHeight = rhParams.laneCount * laneHeight;
  const lhRowHeight = lhParams.laneCount * laneHeight;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: STAVE_SPACER,
        height: containerHeight,
        overflow: 'hidden',
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
