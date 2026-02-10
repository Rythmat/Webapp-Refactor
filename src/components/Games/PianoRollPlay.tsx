import React, { useEffect, useMemo, useState } from "react";
import { PlayNote } from "./PlayNote";

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
  onStart?: () => Promise<void> | void;
  activeMidis?: number[];
  noteHoldMeta?: Record<string, NoteHoldMeta>;
  performanceMeta?: Record<string, { startTick: number; endTick?: number }>;
  startMessage? : string;
  /** Callbacks */
  onTickChange?: (tick: number) => void;
}

// ===== Helpers =====

const beatTicks = 480;

// Sort lane names in musical order (C8..C0). If format not recognized, keep as is.
const ACCIDENTAL_MAP: Record<string, string> = {
  "": "",
  "#": "#",
  "b": "b",
  "♯": "#",
  "♭": "b",
};
const NOTE_OFFSETS: Record<string, number> = {
  "C": 0,
  "B#": 0,
  "C#": 1,
  "Db": 1,
  "D": 2,
  "D#": 3,
  "Eb": 3,
  "E": 4,
  "Fb": 4,
  "E#": 5,
  "F": 5,
  "F#": 6,
  "Gb": 6,
  "G": 7,
  "G#": 8,
  "Ab": 8,
  "A": 9,
  "A#": 10,
  "Bb": 10,
  "B": 11,
  "Cb": 11,
};
const MIDI_NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

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

//Given a midi number, returns the string of the note name with the appropriate acciental and octave number
const midiToNoteName = (midi: number): string => {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = ((midi % 12) + 12) % 12;
  return `${MIDI_NOTE_NAMES[semitone]}${octave}`;
};

//Produces the list of lanes that span the entirety of the notes given in the event sequence
function buildLaneList(events: NoteEvent[]): string[] {
  const midiValues = events
    .map((event) => {
      if (typeof event.midi === "number") {
        return event.midi;
      }
      const midi = pitchNameToMidi(event.pitchName);
      return midi ?? null;
    })
    .filter((value): value is number => typeof value === "number");

  if (midiValues.length === 0) {
    return ["C4"];
  }

  const minMidi = Math.min(...midiValues);
  const maxMidi = Math.max(...midiValues);
  const minLaneMidi = Math.max(minMidi - 1, 0);
  const maxLaneMidi = Math.min(maxMidi + 1, 127);

  const laneNames: string[] = [];
  for (let midi = maxLaneMidi; midi >= minLaneMidi; midi--) {
    laneNames.push(midiToNoteName(midi));
  }

  return laneNames;
}

//Ensure the percent is over 0 and less than 0, returning the bounary if not.
const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

//
function ticksToPercent(ticks: number, countInTicks: number, totalTicks: number) {
  const denominator = totalTicks === 0 ? 1 : totalTicks;
  return ((ticks + countInTicks) / denominator) * 100;
}

// Given starting and ending tick values with a step size, returns the list of step positions within that range
function generateTickPositions(startTick: number,endTick: number,stepSize: number): number[] {
  if (stepSize <= 0) {
    return []
  };
  const ticks: number[] = [];
  const totalRange = endTick - startTick;
  const stepCount = Math.ceil(totalRange / stepSize);

  for (let i = 0; i <= stepCount; i++) {
    const tickValue = startTick + i * stepSize;
    if (tickValue > endTick + stepSize / 1000) {
      break
    };
    ticks.push(tickValue);
  }
  // Ensure the final beat exists for exact divisions
  if (!ticks.includes(endTick)) {
    ticks.push(endTick);
  }
  return ticks;
}

function barBeatLabels(bars: number, beatsPerBar: number, showCountIn: boolean) {
  const labels: { tick: number; label: string }[] = [];
  for (let barIndex = - (showCountIn ? 1 : 0); barIndex < bars; barIndex++) {
    for (let beat = 1; beat <= beatsPerBar; beat++) {
      const absoluteBeat = barIndex * beatsPerBar + (beat - 1);
      const prefix = barIndex < 0 ? `${barIndex}.` : `${barIndex+1}.`;
      labels.push({ tick: absoluteBeat * beatTicks, label: `${prefix}${beat}` });
    }
  }
  return labels;
}

// ===== Component =====
const PianoRoll: React.FC<PianoRollProps> = ({
  events,
  bars,
  beatsPerBar = 4,
  subdivision = 1,
  rowHeight = 36 * 24,
  inTime = false,
  playSpeed = 60,
  isPlaying,
  onPlayingChange,
  onStart,
  activeMidis = [],
  noteHoldMeta,
  performanceMeta,
  onTickChange,
  startMessage = "Press start to begin the in-time play-along and follow the moving playhead.",
}) => {
  const laneList = buildLaneList(events);
  const effectiveRowHeight =
    laneList.length > 0
      ? rowHeight / laneList.length
      : rowHeight;
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
    typeof isPlaying === "boolean" && typeof onPlayingChange === "function";
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
  laneList.forEach((name, i) => { laneIndex[name] = i; });

  // Sub grid (thin lines) and beat lines (stronger)
  const subStepTicks = beatTicks / safeSubdivision;
  const subLines = generateTickPositions(displayStartTick, displayEndTick, subStepTicks);
  const beatLines = generateTickPositions(displayStartTick, displayEndTick, beatTicks);
  const barLines = generateTickPositions(displayStartTick, displayEndTick, ticksPerBar);

  const labels = barBeatLabels(
    bars,
    beatsPerBar,
    inTime,
  );
  const visibleLabels = inTime
    ? labels.filter(
        ({ tick }) => tick >= displayStartTick && tick <= displayEndTick,
      )
    : labels;


  return (
    <div className="relative">
      <div
        className="w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200 text-sm"
        style={{ fontSize: "0.9rem" }}
      >
      {/* Header: beat markers & optional chord strip */}
      <div
        className="sticky top-0 z-30 bg-neutral-950/95 px-2 backdrop-blur"
        style={{ borderBottom: "1px solid rgba(120,120,120,0.25)", position: "relative" }}
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
              const isFinalTick =
                Math.abs(tick - timelineEndTick) < 0.0001;
              return (
                <div
                  key={`lbl-${tick}`}
                  className="absolute top-1 select-none text-xs text-neutral-300"
                  style={{
                    left: `${tickPercent(tick)}%`,
                    transform: isFinalTick
                      ? "translateX(-100%)"
                      : "translateX(6px)",
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
                  background: "rgba(160,160,160,0.25)",
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
                      ? "rgba(200,200,255,0.45)"
                      : "rgba(200,200,200,0.35)",
                }}
              >
                <div
                  className="absolute left-0 top-0 h-[40px] w-full bg-current"
                  style={{
                    background:
                      i === 0
                        ? "rgba(200,200,255,0.45)"
                        : "rgba(200,200,200,0.35)",
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
          {laneList.map((name, idx) => {
            const baseBackground =
              idx % 2
                ? "rgba(255,255,255,0.01)"
                : "rgba(255,255,255,0.03)";
            const laneMidi = pitchNameToMidi(name);
            const isActiveLane =
              typeof laneMidi === "number" && activeMidiSet.has(laneMidi);
            const background = isActiveLane
              ? "linear-gradient(90deg, rgba(59,130,246,0.65), rgba(37,99,235,0.35))"
              : baseBackground;
            const color = isActiveLane ? "#f8fafc" : "#d4d4d8";
            return (
              <div
                key={name}
                className="flex items-center justify-end pr-2 text-sm select-none transition-colors"
                style={{
                  height: effectiveRowHeight,
                  borderBottom: "1px solid rgba(120,120,120,0.15)",
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
            {/* row backgrounds */}
            {laneList.map((_, idx) => (
              <div
                key={`row-${idx}`}
                className="absolute left-0 right-0"
                style={{
                  top: idx * effectiveRowHeight,
                  height: effectiveRowHeight,
                  background:
                    idx % 2
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(255,255,255,0.05)",
                  borderBottom: "1px solid rgba(120,120,120,0.15)",
                }}
              />
            ))}
            {/* sub grid lines */}
            {subLines.map((b) => (
              <div
                key={`sub-${b}`}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${tickPercent(b)}%`,
                  width: 1,
                  background: "rgba(200,200,200,0.08)",
                }}
              />
            ))}
            {/* beat lines (stronger) */}
            {beatLines.map((b) => (
              <div
                key={`B-${b}`}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${tickPercent(b)}%`,
                  width: 1,
                  background: "rgba(200,200,200,0.16)",
                }}
              />
            ))}
            {/* bar lines */}
            {barLines.map((b, i) => (
              <div
                key={`BAR-${b}`}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${tickPercent(b)}%`,
                  width: 2,
                  background:
                    i === 0
                      ? "rgba(200,200,255,0.45)"
                      : "rgba(255,255,255,0.22)",
                }}
              >
                <div
                  className="absolute left-0 top-[-40px] h-[40px] w-full bg-current"
                  style={{
                    background:
                      i === 0
                        ? "rgba(200,200,255,0.45)"
                        : "rgba(255,255,255,0.22)",
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
                  perf && typeof perf.startTick === "number" ? perf.startTick : null;
                const perfEnd =
                  perf && typeof perf.endTick === "number" ? perf.endTick : null;
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
              } else if (perf && typeof perf.startTick === "number") {
                visStartTick = perf.startTick;
                visEndTick =
                  typeof perf.endTick === "number" ? perf.endTick : playheadTick;
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

              const baseColor = e.color ?? "#b64f4f";
              const meta = noteHoldMeta?.[e.id];
              const wasPlayed =
                !!perf &&
                typeof perf.startTick === "number" &&
                perf.startTick >= scheduledStart &&
                perf.startTick <= scheduledEnd;
              const isInWindow =
                inTime &&
                playheadTick >= scheduledStart &&
                playheadTick <= scheduledEnd;
              const isPlayedInWindow = wasPlayed && isInWindow;
              const isMissed =
                inTime && !wasPlayed && playheadTick >= scheduledEnd;
              let color = baseColor;
              let holdProgress: number | undefined;
              const dimmed = inTime && !isPlayedInWindow;
              const isCompleted = meta?.isCompleted ?? false;

              if (!inTime && meta && (meta.isCurrentChord || meta.isCompleted)) {
                color = "#22c55e";
                holdProgress = meta.isCompleted
                  ? 1
                  : Math.max(0, Math.min(1, meta.holdProgress));
              }
              if (isMissed) {
                color = "rgba(150,150,150,0.8)";
              }

              let segments:
                | { from: number; to: number; kind: "played" | "inactive" }[]
                | undefined;
              if (!inTime && meta) {
                if (meta.isCompleted) {
                  segments = [{ from: 0, to: 1, kind: "played" }];
                } else if (meta.isCurrentChord) {
                  const progress = Math.max(0, Math.min(1, meta.holdProgress));
                  segments = [
                    { from: 0, to: progress, kind: "played" },
                    { from: progress, to: 1, kind: "inactive" },
                  ];
                } else {
                  segments = [{ from: 0, to: 1, kind: "inactive" }];
                }
              }

              return (
                <PlayNote
                  key={e.id}
                  note={e}
                  startPercent={startPercent}
                  widthPercent={widthPercent}
                  row={row}
                  rowHeight={effectiveRowHeight}
                  color={color}
                  segments={segments}
                  isHeld={meta?.isHeld}
                  inTime={inTime}
                  holdProgress={holdProgress}
                  dimmed={dimmed}
                  highlighted={isCompleted}
                />
              );
            })}
          </div>

          {/* Playhead */}
          {inTime && (
            <div
              className="absolute top-0 bottom-0 z-20"
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
      {!playing && (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-neutral-950/80 px-4 backdrop-blur">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-700 bg-neutral-900 px-8 py-6 text-center text-neutral-50 shadow-2xl">
            <h3 className="text-2xl font-semibold">Ready to start?</h3>
            <p className="mt-2 text-sm text-neutral-300">
              {startMessage}
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={async () => {
                  await onStart?.();
                  setPlaying(true);
                }}
                className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PianoRoll;
