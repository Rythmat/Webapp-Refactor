import React, { useEffect, useState } from "react";
import { PlayNote } from "./PlayNote";

export type Midi = number; // 0..127

export interface NoteEvent {
  id: string;
  pitchName: string;
  midi?: Midi; 
  startBeats: number;
  durationBeats: number;
  velocity?: number;
  color?: string;
}

export interface ChordMarker {
  startBeat: number; // absolute beat index where the chord starts
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
  playheadSpeedBps?: number; // beats per second traversal speed

  /** Callbacks */
  onNoteClick?: (note: NoteEvent) => void;
}

// ===== Helpers =====
function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

// Sort lane names in musical order (C8..C0). If format not recognized, keep as is.
const NOTE_ORDER = ["C","C#","Db","D","D#","Eb","E","F","F#","Gb","G","G#","Ab","A","A#","Bb","B"]; // allow enharmonics
function laneSortKey(name: string): number {
  // Expect like "A3", "Bb2"
  const m = name.match(/^([A-Ga-g]{1})([#b♭♯]?)(-?\d+)$/);
  if (!m) return 0;
  const [ , L, acc, octStr ] = m;
  const letter = L.toUpperCase();
  const accidental = (acc === "♭") ? "b" : (acc === "♯" ? "#" : acc);
  const base = NOTE_ORDER.indexOf(letter + accidental);
  const octave = parseInt(octStr, 10);
  // Higher notes should sort nearer the top => larger key first, so we invert later
  return octave * 100 + (base >= 0 ? base : 0);
}

function buildLaneList(events: NoteEvent[], lanes?: string[]): string[] {
  if (lanes && lanes.length) return lanes;
  const names = unique(events.map(e => e.pitchName));
  // musical top-to-bottom: sort DESC by pitch value
  return names.sort((a,b) => laneSortKey(b) - laneSortKey(a));
}

const clampBeatPrecision = (value: number) => Number(value.toFixed(6));
const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

function beatToPercent(beat: number, countInBeats: number, totalBeats: number) {
  const denominator = totalBeats === 0 ? 1 : totalBeats;
  return ((beat + countInBeats) / denominator) * 100;
}

function generateBeatPositions(
  startBeat: number,
  endBeat: number,
  step: number,
): number[] {
  if (step <= 0) return [];
  const beats: number[] = [];
  const totalRange = endBeat - startBeat;
  const stepCount = Math.ceil(totalRange / step);

  for (let i = 0; i <= stepCount; i++) {
    const beatValue = startBeat + i * step;
    if (beatValue > endBeat + step / 1000) break;
    beats.push(clampBeatPrecision(beatValue));
  }

  // Ensure the final beat exists for exact divisions
  if (!beats.includes(endBeat)) {
    beats.push(clampBeatPrecision(endBeat));
  }

  return beats;
}

function barBeatLabels(bars: number, beatsPerBar: number, showCountIn: boolean, countInBars: number) {
  const labels: { beat: number; label: string }[] = [];
  // const totalBars = (showCountIn ? countInBars : 0) + bars;
  for (let barIndex = - (showCountIn ? countInBars : 0); barIndex < bars; barIndex++) {
    for (let beat = 1; beat <= beatsPerBar; beat++) {
      const absoluteBeat = (barIndex >= 0 ? barIndex : barIndex) * beatsPerBar + (beat - 1);
      const prefix = barIndex < 0 ? `${barIndex}.` : `${barIndex+1}.`;
      labels.push({ beat: absoluteBeat, label: `${prefix}${beat}` });
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
  playheadSpeedBps = 1,
  onNoteClick,
}) => {
  const laneList = buildLaneList(events, lanes);
  const activeCountInBars = inTime ? 1 : 0;
  const countInBeats = activeCountInBars * beatsPerBar;
  const totalBeats = bars * beatsPerBar + countInBeats;
  const laneLabelWidth = 72;
  const timelineStartBeat = -countInBeats;
  const timelineEndBeat = bars * beatsPerBar;
  const safeSubdivision = subdivision <= 0 ? 1 : subdivision;
  const beatPercent = (beat: number) => beatToPercent(beat, countInBeats, totalBeats);
  const playheadSpeed = Math.max(playheadSpeedBps, 0);

  const [playheadBeat, setPlayheadBeat] = useState(-countInBeats);
  const [isPlaying, setIsPlaying] = useState(inTime);

  useEffect(() => {
    setPlayheadBeat(-countInBeats);
  }, [countInBeats]);

  useEffect(() => {
    setIsPlaying(inTime);
  }, [inTime]);

  useEffect(() => {
    if (!inTime || playheadSpeed <= 0 || !isPlaying) {
      return;
    }

    let rafId: number;
    let lastTime: number | null = null;
    const minBeat = -countInBeats;
    const maxBeat = bars * beatsPerBar;

    const animate = (timestamp: number) => {
      if (lastTime === null) {
        lastTime = timestamp;
        rafId = requestAnimationFrame(animate);
        return;
      }

      const deltaSeconds = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      setPlayheadBeat((prev) => {
        let next = prev + deltaSeconds * playheadSpeed;
        if (next > maxBeat) {
          next = minBeat;
        }
        return next;
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [inTime, playheadSpeed, countInBeats, bars, beatsPerBar, isPlaying]);

  // Preindex lanes
  const laneIndex: Record<string, number> = {};
  laneList.forEach((name, i) => { laneIndex[name] = i; });

  // Sub grid (thin lines) and beat lines (stronger)
  const subEvery = 1 / safeSubdivision; // beats per sub-line
  const subLines = generateBeatPositions(timelineStartBeat, timelineEndBeat, subEvery);
  const beatLines = generateBeatPositions(timelineStartBeat, timelineEndBeat, 1);
  const barLines = generateBeatPositions(timelineStartBeat, timelineEndBeat, beatsPerBar);

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
            className="absolute right-2 top-2 rounded-md border border-neutral-700 px-3 py-1 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-800"
            onClick={() => setIsPlaying((prev) => !prev)}
          >
            {isPlaying ? "Pause" : "Play"}
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
            {labels.map(({ beat, label }) => {
              const isFinalBeat =
                Math.abs(beat - timelineEndBeat) < 0.0001;
              return (
                <div
                  key={`lbl-${beat}`}
                  className="absolute top-1 select-none text-xs text-neutral-300"
                  style={{
                    left: `${beatPercent(beat)}%`,
                    transform: isFinalBeat
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
                  left: `${beatPercent(b)}%`,
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
                  left: `${beatPercent(b)}%`,
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
                    left: `${beatPercent(c.startBeat)}%`,
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
          {laneList.map((name, idx) => (
            <div key={name} className="flex items-center justify-end pr-2 text-sm text-neutral-300 select-none" style={{ height: rowHeight, borderBottom: "1px solid rgba(120,120,120,0.15)", background: idx%2? "rgba(255,255,255,0.01)":"rgba(255,255,255,0.03)" }}>
              {name}
            </div>
          ))}
        </div>

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
                  left: `${beatPercent(b)}%`,
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
                  left: `${beatPercent(b)}%`,
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
                  left: `${beatPercent(b)}%`,
                  width: 2,
                  background: "rgba(255,255,255,0.22)",
                }}
              />
            ))}
          </div>

          {/* Notes layer */}
          <div className="absolute inset-0 z-10">
            {events.map((e) => {
              const row = laneIndex[e.pitchName];
              if (row == null) return null;

              const startPercent = clampPercent(beatPercent(e.startBeats));
              const rawEndPercent = beatPercent(e.startBeats + e.durationBeats);
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
                left: `${beatPercent(playheadBeat)}%`,
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
