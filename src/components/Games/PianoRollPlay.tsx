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

export interface PianoRollProps {
  events: NoteEvent[];
  /**
   * Ordered list of visible lanes (rows). If omitted, this will be derived
   * from the events, sorted by typical piano order (high to low).
   */
  lanes?: string[];

  /** Grid/time setup */
  bars: number;                 // number of musical bars to show (not including count-in)
  beatsPerBar?: number;         // default 4
  subdivision?: number;         // grid lines per beat (default 1 => quarter). Use 2 for 8ths, 4 for 16ths
  rowHeight?: number;           // vertical size per lane; default 36

  /** Optional header overlays */
  showChordsTop?: boolean;      // draw chord labels band
  chords?: ChordMarker[];       // when showChordsTop

  /** Playback control */
  inTime?: boolean;
  playSpeed?: number; // beats per minute traversal speed
  isPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  highlightedNotes?: Array<{ midi: number; color?: string }>;

  /** Callbacks */
  onNoteClick?: (note: NoteEvent) => void;
}

// ===== Helpers =====
function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

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

// Sort lane names in musical order (C8..C0). If format not recognized, keep as is.
function laneSortKey(name: string): number {
  const info = parsePitchName(name);
  if (!info) return 0;
  return info.octave * 100 + info.semitone;
}

function buildLaneList(events: NoteEvent[], lanes?: string[]): string[] {
  if (lanes && lanes.length) return lanes;
  const names = unique(events.map(e => e.pitchName));
  // musical top-to-bottom: sort DESC by pitch value
  return names.sort((a,b) => laneSortKey(b) - laneSortKey(a));
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
  lanes,
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
}) => {
  const laneList = buildLaneList(events, lanes);
  const activeCountInBars = inTime ? 1 : 0;
  const ticksPerBar = beatsPerBar * TICKS_PER_QUARTER;
  const countInTicks = activeCountInBars * ticksPerBar;
  const overlapOffsetTicks =
    inTime && countInTicks > 0
      ? Math.max(countInTicks - ticksPerBar / 4, 0)
      : 0;
  const totalTicks = bars * ticksPerBar + countInTicks;
  const defaultLaneLabelWidth = 72;
  const timelineStartTick = -countInTicks;
  const timelineEndTick = bars * ticksPerBar;
  const safeSubdivision = subdivision <= 0 ? 1 : subdivision;
  const tickPercent = (tick: number) => ticksToPercent(tick, countInTicks, totalTicks);
  const countInStartPercent =
    inTime && countInTicks > 0 ? tickPercent(-countInTicks) : 0;
  const countInQuarterWidthPercent =
    inTime && countInTicks > 0
      ? Math.max(
          tickPercent(-countInTicks + ticksPerBar / 4) - countInStartPercent,
          0,
        )
      : 0;
  const showCountInOverlay =
    inTime && countInTicks > 0 && countInQuarterWidthPercent > 0.0001;
  const beatsPerSecond = Math.max(playSpeed, 0) / 60;
  const playheadTicksPerSecond = beatsPerSecond * TICKS_PER_QUARTER;

  const [playheadTick, setPlayheadTick] = useState(-countInTicks);
  const [internalPlaying, setInternalPlaying] = useState(false);
  const isControlled = typeof isPlaying === "boolean";
  const playing = isControlled ? Boolean(isPlaying) : internalPlaying;
  const setPlaying = (next: boolean) => {
    if (!isControlled) {
      setInternalPlaying(next);
    }
    onPlayingChange?.(next);
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
  }, [countInTicks]);

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
        return next;
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [inTime, playheadTicksPerSecond, countInTicks, bars, beatsPerBar, playing]);

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
    <div className="w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200">
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
            <span>{playing ? "Pause" : "Play"}</span>
          </button>
        )}
        {/* Top ruler */}
        <div className="relative flex" style={{ height: 40 }}>
          {!inTime && (
            <div
              className="shrink-0 border-r border-neutral-800/50"
              style={{ width: defaultLaneLabelWidth }}
            />
          )}
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
              />
            ))}
          </div>
        </div>
        {showChordsTop && (
          <div className="relative flex h-6">
            {!inTime && (
              <div
                className="shrink-0 border-r border-neutral-800/40"
                style={{ width: defaultLaneLabelWidth }}
              />
            )}
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
        {!inTime && (
          <div
            className="sticky left-0 z-20"
            style={{ width: defaultLaneLabelWidth }}
          >
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
                    height: rowHeight,
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
        )}

        {/* Grid underlay */}
        <div className="relative flex-1" style={{ minWidth: 0 }}>
          <div className="absolute inset-0 z-0">
            {/* row backgrounds */}
            {laneList.map((_, idx) => (
              <div key={`row-${idx}`} className="absolute left-0 right-0" style={{ top: idx*rowHeight, height: rowHeight, background: idx%2? "rgba(255,255,255,0.02)":"rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(120,120,120,0.15)" }} />
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
            {barLines.map((b) => (
              <div
                key={`BAR-${b}`}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${tickPercent(b)}%`,
                  width: 2,
                  background: "rgba(255,255,255,0.22)",
                }}
              />
            ))}
          </div>

          {showCountInOverlay && (
            <div
              className="pointer-events-none absolute z-5 flex flex-col"
              style={{
                top: 0,
                bottom: 0,
                left: `${countInStartPercent}%`,
                width: `${countInQuarterWidthPercent}%`,
                background:
                  "linear-gradient(90deg, rgba(5,5,5,0.75), rgba(5,5,5,0.2))",
                borderRight: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {laneList.map((name) => {
                const laneMidi = pitchNameToMidi(name);
                const highlightColor =
                  laneMidi != null && highlightedColorMap
                    ? highlightedColorMap.get(laneMidi)
                    : undefined;
                return (
                  <div
                    key={`overlay-${name}`}
                    className="flex items-center justify-end pr-2 text-xs font-semibold tracking-tight"
                    style={{
                      height: rowHeight,
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      color: highlightColor ? "white" : "rgba(229,229,229,0.85)",
                      textShadow: highlightColor
                        ? "0 0 6px rgba(0,0,0,0.8)"
                        : "0 0 4px rgba(0,0,0,0.5)",
                    }}
                  >
                    <span
                      style={{
                        background: highlightColor
                          ? `${highlightColor}cc`
                          : "rgba(0,0,0,0.35)",
                        borderRadius: 999,
                        padding: "2px 8px",
                      }}
                    >
                      {name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes layer */}
          <div className="absolute inset-0 z-10">
            {events.map((e) => {
              const row = laneIndex[e.pitchName];
              if (row == null) return null;

              const adjustedStartTick = e.startTicks - overlapOffsetTicks;
              const adjustedEndTick =
                e.startTicks + e.durationTicks - overlapOffsetTicks;
              const startPercent = clampPercent(
                tickPercent(adjustedStartTick),
              );
              const rawEndPercent = tickPercent(adjustedEndTick);
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

              const color = e.color ?? "#b64f4f"; // base red hue similar to screenshot

              return (
                <PlayNote
                  key={e.id}
                  note={e}
                  startPercent={startPercent}
                  widthPercent={widthPercent}
                  row={row}
                  rowHeight={rowHeight}
                  color={color}
                  onClick={onNoteClick}
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
