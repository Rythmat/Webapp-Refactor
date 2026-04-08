import React, { useEffect, useMemo, useState } from 'react';
import { PlayNote } from '@/components/Games/PlayNote';
import { midiToPitchName } from '@/curriculum/engine/genreGeneration/resolveStepContent';

export type Midi = number; // 0..127

export interface NoteEvent {
  id: string;
  pitchName: string;
  midi?: Midi;
  startTicks: number;
  durationTicks: number;
  velocity?: number;
  color?: string;
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
}

// ===== Helpers =====

const beatTicks = 480;

// Sort lane names in musical order (C8..C0). If format not recognized, keep as is.
const ACCIDENTAL_MAP: Record<string, string> = {
  '': '',
  '#': '#',
  b: 'b',
  '♯': '#',
  '♭': 'b',
};
const NOTE_OFFSETS: Record<string, number> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  'E#': 5,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

type PitchInfo = {
  octave: number;
  semitone: number;
  midi: number;
};

// Given a string of a note (i.e. A#4, B3, C4 etc), returns a PitchInfo object containing the octave number, the semitone(scale degree) number, and the midi number
const parsePitchName = (name: string): PitchInfo | null => {
  const m = name.match(/^([A-Ga-g])([#b♯♭]?)(-?\d+)$/);
  if (!m) return null;
  const [, rawLetter, rawAccidental, octStr] = m;
  const letter = rawLetter.toUpperCase();
  const accidental =
    ACCIDENTAL_MAP[rawAccidental as keyof typeof ACCIDENTAL_MAP] ??
    rawAccidental;
  const noteKey = `${letter}${accidental}`;
  const semitone = NOTE_OFFSETS[noteKey];
  if (semitone === undefined) return null;
  const octave = parseInt(octStr, 10);
  const midi = (octave + 1) * 12 + semitone;
  return { octave, semitone, midi };
};

// Extracts simply the midi value from parsePitchName
export const pitchNameToMidi = (name: string): number | null => {
  const info = parsePitchName(name);
  return info ? info.midi : null;
};

//Given a midi number, returns the string of the note name with the appropriate accidental and octave number
// Uses key-context-aware enharmonic spelling when keyRoot is provided
const midiToNoteName = (midi: number, keyRoot?: number): string => {
  return midiToPitchName(midi, keyRoot);
};

//Produces the list of lanes that span the entirety of the notes given in the event sequence
function buildLaneList(events: NoteEvent[], keyRoot?: number): string[] {
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

  const minMidi = Math.min(...midiValues);
  const maxMidi = Math.max(...midiValues);
  const minLaneMidi = Math.max(minMidi - 1, 0);
  const maxLaneMidi = Math.min(maxMidi + 1, 127);

  const laneNames: string[] = [];
  for (let midi = maxLaneMidi; midi >= minLaneMidi; midi--) {
    laneNames.push(eventNameByMidi.get(midi) ?? midiToNoteName(midi, keyRoot));
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

// ===== Row color helpers =====
const BLACK_KEY_SEMITONES = new Set([1, 3, 6, 8, 10]); // Db Eb Gb Ab Bb

function getRowBackground(
  midiNote: number | null,
  keyRoot?: number,
  keyColor?: string,
): string {
  if (midiNote === null) return 'rgba(255,255,255,0.03)';
  const semitone = midiNote % 12;
  const isKeyCenter = keyRoot !== undefined && semitone === keyRoot % 12;
  if (isKeyCenter && keyColor) return `${keyColor}0d`; // ~5% opacity tint
  if (isKeyCenter) return '#1f2d1f'; // fallback green if no keyColor
  if (BLACK_KEY_SEMITONES.has(semitone)) return '#1a1a1a';
  return '#2a2a2a';
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
}) => {
  const laneList = buildLaneList(events, keyRoot);
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
                        ? 'rgba(200,200,255,0.45)'
                        : 'rgba(200,200,200,0.35)',
                  }}
                >
                  <div
                    className="absolute left-0 top-0 h-[40px] w-full bg-current"
                    style={{
                      background:
                        i === 0
                          ? 'rgba(200,200,255,0.45)'
                          : 'rgba(200,200,200,0.35)',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative flex w-full">
          {/* Lane labels column */}
          <div className="sticky left-0 z-20" style={{ width: laneLabelWidth }}>
            {laneList.map((name, _idx) => {
              const laneMidi = pitchNameToMidi(name);
              const baseBackground = getRowBackground(laneMidi, keyRoot, keyColor);
              const isActiveLane =
                typeof laneMidi === 'number' && activeMidiSet.has(laneMidi);
              const background = isActiveLane
                ? 'linear-gradient(90deg, rgba(59,130,246,0.65), rgba(37,99,235,0.35))'
                : baseBackground;
              const color = isActiveLane ? '#f8fafc' : '#d4d4d8';
              return (
                <div
                  key={name}
                  className="flex select-none items-center justify-end pr-2 text-sm transition-colors"
                  style={{
                    height: effectiveRowHeight,
                    borderBottom: '1px solid rgba(120,120,120,0.15)',
                    background,
                    color,
                    fontWeight: isActiveLane ? 600 : 400,
                  }}
                >
                  {name}
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
                      background: getRowBackground(laneMidi, keyRoot, keyColor),
                      borderBottom: '1px solid rgba(120,120,120,0.15)',
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
                    background: 'rgba(200,200,200,0.08)',
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
                    background: 'rgba(200,200,200,0.16)',
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
                        ? 'rgba(200,200,255,0.45)'
                        : 'rgba(255,255,255,0.22)',
                  }}
                >
                  <div
                    className="absolute left-0 top-[-40px] h-[40px] w-full bg-current"
                    style={{
                      background:
                        i === 0
                          ? 'rgba(200,200,255,0.45)'
                          : 'rgba(255,255,255,0.22)',
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
                    note={e}
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
                  const noteName = midiToPitchName(note.midi, keyRoot);
                  const row = laneList.indexOf(noteName);
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
                          ? keyColor ?? '#4ecdc4'
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
