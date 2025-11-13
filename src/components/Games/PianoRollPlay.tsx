import React, { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
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

export interface ChordMarker {
  startTick: number; // absolute tick index where the chord starts
  label: string;     // e.g., "A minor 7", "C major 7"
  subLabel?: string; // e.g., "(2nd inversion)"
}

export interface NoteHoldMeta {
  isCompleted: boolean;
  isCurrentChord: boolean;
  holdProgress: number;
  isHeld?: boolean;
}

export interface PianoRollProps {
  events: NoteEvent[];

  /** Grid/time setup */
  bars: number; // number of musical bars to show (not including count-in)
  beatsPerBar?: number; // default 4
  subdivision?: number; // grid lines per beat (default 1 => quarter). Use 2 for 8ths, 4 for 16ths
  rowHeight?: number; // base lane height unit; lanes scale to fit a static box

  /** Optional header overlays */
  showChordsTop?: boolean; // draw chord labels band
  chords?: ChordMarker[]; // when showChordsTop

  /** Playback control */
  inTime?: boolean;
  playSpeed?: number; // beats per minute traversal speed
  isPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  highlightedNotes?: Array<{ midi: number; color?: string }>;
  noteHoldMeta?: Record<string, NoteHoldMeta>;
  performanceMeta?: Record<string, { startTick: number; endTick?: number }>;

  /** Callbacks */
  onNoteClick?: (note: NoteEvent) => void;
  onTickChange?: (tick: number) => void;
}

// ===== Helpers =====

const TICKS_PER_QUARTER = 480;

// Sort lane names in musical order (C8..C0). If format not recognized, keep as is.
const ACCIDENTAL_MAP: Record<string, string> = {
  "": "",
  "#": "#",
  "b": "b",
  "♯": "#",
  "♭": "b",
};

const NOTE_OFFSETS: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
  "B#": 0,
};

type PitchInfo = {
  octave: number;
  semitone: number;
  midi: number;
};

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

export const pitchNameToMidi = (name: string): number | null => {
  const info = parsePitchName(name);
  return info ? info.midi : null;
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

const midiToNoteName = (midi: number): string => {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = ((midi % 12) + 12) % 12;
  return `${MIDI_NOTE_NAMES[semitone]}${octave}`;
};


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

const clampTickPrecision = (value: number) => Number(value.toFixed(6));
const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

function ticksToPercent(ticks: number, countInTicks: number, totalTicks: number) {
  const denominator = totalTicks === 0 ? 1 : totalTicks;
  return ((ticks + countInTicks) / denominator) * 100;
}

function generateTickPositions(
  startTick: number,
  endTick: number,
  step: number,
): number[] {
  if (step <= 0) return [];
  const ticks: number[] = [];
  const totalRange = endTick - startTick;
  const stepCount = Math.ceil(totalRange / step);

  for (let i = 0; i <= stepCount; i++) {
    const tickValue = startTick + i * step;
    if (tickValue > endTick + step / 1000) break;
    ticks.push(clampTickPrecision(tickValue));
  }

  // Ensure the final beat exists for exact divisions
  if (!ticks.includes(endTick)) {
    ticks.push(clampTickPrecision(endTick));
  }

  return ticks;
}

function barBeatLabels(bars: number, beatsPerBar: number, showCountIn: boolean, countInBars: number) {
  const labels: { tick: number; label: string }[] = [];
  // const totalBars = (showCountIn ? countInBars : 0) + bars;
  for (let barIndex = - (showCountIn ? countInBars : 0); barIndex < bars; barIndex++) {
    for (let beat = 1; beat <= beatsPerBar; beat++) {
      const absoluteBeat = (barIndex >= 0 ? barIndex : barIndex) * beatsPerBar + (beat - 1);
      const prefix = barIndex < 0 ? `${barIndex}.` : `${barIndex+1}.`;
      labels.push({ tick: absoluteBeat * TICKS_PER_QUARTER, label: `${prefix}${beat}` });
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
  rowHeight = 36,
  showChordsTop = true,
  chords = [],
  inTime = false,
  playSpeed = 60,
  isPlaying,
  onPlayingChange,
  highlightedNotes = [],
  onNoteClick,
  noteHoldMeta,
  performanceMeta,
  onTickChange,
}) => {
  const laneList = buildLaneList(events);
  const baseLaneCountForHeight = 24;
  const totalLanePixelHeight = rowHeight * baseLaneCountForHeight;
  const effectiveRowHeight =
    laneList.length > 0
      ? totalLanePixelHeight / laneList.length
      : totalLanePixelHeight;
 const activeCountInBars = inTime ? 1 : 0;
  const ticksPerBar = beatsPerBar * TICKS_PER_QUARTER;
  const countInTicks = activeCountInBars * ticksPerBar;
  const totalTicks = bars * ticksPerBar + countInTicks;
  const laneLabelWidth = 72;
  const timelineStartTick = -countInTicks;
  const timelineEndTick = bars * ticksPerBar;
  const safeSubdivision = subdivision <= 0 ? 1 : subdivision;
  const tickPercent = (tick: number) => ticksToPercent(tick, countInTicks, totalTicks);
  const beatsPerSecond = Math.max(playSpeed, 0) / 60;
  const playheadTicksPerSecond = beatsPerSecond * TICKS_PER_QUARTER;

  const [playheadTick, setPlayheadTick] = useState(-countInTicks);
  const [internalPlaying, setInternalPlaying] = useState(false);
  const isControlled =
    typeof isPlaying === "boolean" && typeof onPlayingChange === "function";
  const playing = isControlled ? Boolean(isPlaying) : internalPlaying;
  const setPlaying = (next: boolean) => {
    if (!isControlled) {
      setInternalPlaying(next);
    }
    if (onPlayingChange) {
      onPlayingChange(next);
    }
  };

  const highlightedColorMap = useMemo(() => {
    if (!highlightedNotes || highlightedNotes.length === 0) {
      return null;
    }
    const map = new Map<number, string>();
    highlightedNotes.forEach((entry) => {
      if (typeof entry?.midi === "number") {
        map.set(entry.midi, entry.color ?? "#b64f4f");
      }
    });
    return map;
  }, [highlightedNotes]);

  useEffect(() => {
    setPlayheadTick(-countInTicks);
    onTickChange?.(-countInTicks);
  }, [countInTicks, onTickChange]);

  useEffect(() => {
    if (!inTime && playing) {
      setPlaying(false);
    }
  }, [inTime, playing]);

  useEffect(() => {
    if (!inTime || playheadTicksPerSecond <= 0 || !playing) {
      return;
    }

    let rafId: number;
    let lastTime: number | null = null;
    const minTick = -countInTicks;
    const maxTick = bars * ticksPerBar;

    const animate = (timestamp: number) => {
      if (lastTime === null) {
        lastTime = timestamp;
        rafId = requestAnimationFrame(animate);
        return;
      }

      const deltaSeconds = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      setPlayheadTick((prev) => {
        let next = prev + deltaSeconds * playheadTicksPerSecond;
        if (next > maxTick) {
          next = minTick;
        }
        onTickChange?.(next);
        return next;
      });

      rafId = requestAnimationFrame(animate);
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

  // Preindex lanes
  const laneIndex: Record<string, number> = {};
  laneList.forEach((name, i) => { laneIndex[name] = i; });

  // Sub grid (thin lines) and beat lines (stronger)
  const subStepTicks = TICKS_PER_QUARTER / safeSubdivision;
  const subLines = generateTickPositions(timelineStartTick, timelineEndTick, subStepTicks);
  const beatLines = generateTickPositions(timelineStartTick, timelineEndTick, TICKS_PER_QUARTER);
  const barLines = generateTickPositions(timelineStartTick, timelineEndTick, ticksPerBar);

  const labels = barBeatLabels(
    bars,
    beatsPerBar,
    inTime,
    activeCountInBars,
  );

  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200 text-sm"
      style={{ fontSize: '0.9rem' }}
    >
      {/* Header: beat markers & optional chord strip */}
      <div
        className="sticky top-0 z-30 bg-neutral-950/95 px-2 backdrop-blur"
        style={{ borderBottom: "1px solid rgba(120,120,120,0.25)", position: "relative" }}
      >
        {inTime && (
          <button
            aria-label={playing ? "Pause playback" : "Play sequence"}
            className="absolute left-2 top-2 flex items-center gap-1 rounded-md border border-neutral-700 px-3 py-1 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-800"
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        )}
        {/* Top ruler */}
        <div className="relative flex" style={{ height: 40 }}>
          <div
            className="shrink-0 border-r border-neutral-800/50"
            style={{ width: laneLabelWidth }}
          />
          <div className="relative flex-1" style={{ minWidth: 0 }}>
            {/* beat labels */}
            {labels.map(({ tick, label }) => {
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
        {showChordsTop && (
          <div className="relative flex h-6">
            <div
              className="shrink-0 border-r border-neutral-800/40"
              style={{ width: laneLabelWidth }}
            />
            <div className="relative flex-1" style={{ minWidth: 0 }}>
              {chords.map((c, idx) => (
                <div
                  key={`ch-${idx}`}
                  className="absolute -translate-x-1/2 text-xs text-neutral-200"
                  style={{
                    left: `${tickPercent(c.startTick)}%`,
                  }}
                >
                  <div className="rounded-md bg-neutral-800 px-2 py-0.5 shadow">
                    <span className="font-medium">{c.label}</span>
                    {c.subLabel && (
                      <span className="ml-1 italic opacity-70">
                        {c.subLabel}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="relative flex w-full">
        {/* Lane labels column */}
        <div className="sticky left-0 z-20" style={{ width: laneLabelWidth }}>
          {laneList.map((name, idx) => {
            const laneMidi = pitchNameToMidi(name);
            const highlightColor =
              laneMidi != null && highlightedColorMap
                ? highlightedColorMap.get(laneMidi)
                : undefined;
            const baseBackground =
              idx % 2
                ? "rgba(255,255,255,0.01)"
                : "rgba(255,255,255,0.03)";
            return (
              <div
                key={name}
                className="flex items-center justify-end pr-2 text-sm select-none transition-colors text-neutral-300"
                style={{
                  height: effectiveRowHeight,
                  borderBottom: "1px solid rgba(120,120,120,0.15)",
                  background: highlightColor ?? baseBackground,
                  color: highlightColor ? "white" : undefined,
                  boxShadow: highlightColor
                    ? `inset 0 0 0 1px rgba(255,255,255,0.15), 0 0 12px ${highlightColor}`
                    : undefined,
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

              let visStartTick = e.startTicks;
              let visEndTick = e.startTicks + e.durationTicks;

              if (inTime && performanceMeta) {
                const perf = performanceMeta[e.id];
                if (perf && typeof perf.startTick === "number") {
                  visStartTick = perf.startTick;
                  if (typeof perf.endTick === "number") {
                    visEndTick = perf.endTick;
                  } else {
                    visEndTick = playheadTick;
                  }
                }
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

              const baseColor = e.color ?? "#b64f4f"; // base red hue similar to screenshot
              const meta = noteHoldMeta?.[e.id];
              let color = baseColor;

              if (!inTime && meta && (meta.isCurrentChord || meta.isCompleted)) {
                color = "#22c55e";
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
                  onClick={onNoteClick}
                  isHeld={meta?.isHeld}
                  inTime={inTime}
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
              <div className="absolute left-0 top-0 h-full w-[2px] bg-neutral-500/80" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PianoRoll;
