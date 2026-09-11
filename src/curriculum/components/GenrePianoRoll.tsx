import React, { useEffect, useMemo, useState } from 'react';
import { WRONG_NOTE_KEY_COLOR } from '@/components/Games/PianoRollPlay';
import { PlayNote } from '@/components/Games/PlayNote';
import {
  midiToPitchName,
  pitchNameToMidi,
  spellMidi,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import {
  PIANO_ROLL_LANE_COLORS,
  pianoRollLaneBackground,
} from '@/lib/pianoRollLanes';

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
  subdivision?: number; // grid lines per beat (default 1 => quarter). Use 2 for 8ths, 4 for 16ths
  rowHeight?: number; // base lane height unit; lanes scale to fit a static box
  /** Playback control */
  inTime?: boolean;
  playSpeed?: number; // beats per minute traversal speed
  isPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  activeMidis?: number[];
  noteHoldMeta?: Record<string, NoteHoldMeta>;
  performanceMeta?: Record<string, { startTick: number; endTick?: number }>;
  /** Callbacks */
  onTickChange?: (tick: number) => void;
  /** Genre v2 extensions — all optional */
  keyRoot?: number; // MIDI root note for key center row highlighting
  keyColor?: string; // hex color from KEY_OF_COLORS for key center tint
  userNotes?: Array<{ midi: number; onset: number; duration: number }>; // user performance layer
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
}

// ===== Helpers =====

const beatTicks = 480;

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

function barBeatLabels(
  bars: number,
  beatsPerBar: number,
  showCountIn: boolean,
) {
  const labels: { tick: number; label: string }[] = [];
  for (let barIndex = -(showCountIn ? 1 : 0); barIndex < bars; barIndex++) {
    for (let beat = 1; beat <= beatsPerBar; beat++) {
      const absoluteBeat = barIndex * beatsPerBar + (beat - 1);
      const prefix = barIndex < 0 ? `${barIndex}.` : `${barIndex + 1}.`;
      labels.push({
        tick: absoluteBeat * beatTicks,
        label: `${prefix}${beat}`,
      });
    }
  }
  return labels;
}

// ===== Component =====
const GenrePianoRoll: React.FC<PianoRollProps> = ({
  events,
  bars,
  beatsPerBar = 4,
  subdivision = 1,
  rowHeight = 36 * 24,
  inTime = false,
  playSpeed = 60,
  isPlaying,
  onPlayingChange,
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
  const totalTicks = bars * ticksPerBar + countInTicks;
  const laneLabelWidth = 72;
  const timelineStartTick = -countInTicks;
  const timelineEndTick = bars * ticksPerBar;
  const safeSubdivision = subdivision <= 0 ? 1 : subdivision;
  const beatsPerSecond = Math.max(playSpeed, 0) / 60;
  const playheadTicksPerSecond = beatsPerSecond * beatTicks;

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
      return ticksToPercent(tick, countInTicks, totalTicks);
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

    const animate = (timestamp: number) => {
      if (lastTime === null) {
        lastTime = timestamp;
        rafId = requestAnimationFrame(animate);
        return;
      }

      const deltaSeconds = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      let reachedEnd = false;
      setPlayheadTick((prev) => {
        let next = prev + deltaSeconds * playheadTicksPerSecond;
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
    ticksPerBar,
  ]);

  const activeMidiSet = useMemo(() => new Set(activeMidis), [activeMidis]);

  // Preindex lanes
  const laneIndex: Record<string, number> = {};
  laneList.forEach((name, i) => {
    laneIndex[name] = i;
  });

  // Sub grid (thin lines) and beat lines (stronger)
  const subStepTicks = beatTicks / safeSubdivision;
  const subLines = generateTickPositions(
    displayStartTick,
    displayEndTick,
    subStepTicks,
  );
  const beatLines = generateTickPositions(
    displayStartTick,
    displayEndTick,
    beatTicks,
  );
  const barLines = generateTickPositions(
    displayStartTick,
    displayEndTick,
    ticksPerBar,
  );

  const labels = barBeatLabels(bars, beatsPerBar, inTime);
  const visibleLabels = inTime
    ? labels.filter(
        ({ tick }) => tick >= displayStartTick && tick <= displayEndTick,
      )
    : labels;

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
                className="shrink-0 border-r border-neutral-800/50"
                style={{ width: laneLabelWidth }}
              />
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

                  const isCorrect = targetMidiSet?.has(note.midi) ?? false;
                  const startPct = tickPercent(note.onset);
                  const endPct = tickPercent(
                    note.onset + (note.duration > 0 ? note.duration : 120),
                  );
                  const widthPct = Math.max(0.5, endPct - startPct);

                  if (startPct >= 100 || endPct <= 0) return null;

                  return (
                    <div
                      key={`user_${i}`}
                      style={{
                        position: 'absolute',
                        top: row * effectiveRowHeight + 2,
                        height: effectiveRowHeight - 4,
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
