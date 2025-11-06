import React from "react";

// ===== Types =====
export type Midi = number; // 0..127

export interface NoteEvent {
  id: string;
  pitchName: string; // e.g., "A3", "C4" (shown at left and on pill)
  midi?: Midi;       // optional MIDI number if you have it
  startBeats: number; // start position in beats (bar 1 beat 1 == 0)
  durationBeats: number; // length in beats
  velocity?: number;  // 1..127 (not used for drawing but available)
  color?: string;     // optional CSS color override
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
  pxPerBeat?: number;           // horizontal zoom; default 120
  rowHeight?: number;           // vertical size per lane; default 36

  /** Optional header overlays */
  showChordsTop?: boolean;      // draw chord labels band
  chords?: ChordMarker[];       // when showChordsTop

  /** Count-in (negative bar area before bar 1) */
  showCountIn?: boolean;
  countInBars?: number;         // default 1 (i.e., bar "-1")

  /** Cursor / playhead */
  playheadBeat?: number;        // position in beats (absolute, relative to bar 1 beat 1 == 0)

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

function beatToPx(beat: number, pxPerBeat: number, countInBeats: number): number {
  return (beat + countInBeats) * pxPerBeat;
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
  pxPerBeat = 120,
  rowHeight = 36,
  showChordsTop = true,
  chords = [],
  showCountIn = true,
  countInBars = 1,
  playheadBeat,
  onNoteClick,
}) => {
  const laneList = buildLaneList(events, lanes);
  const countInBeats = showCountIn ? countInBars * beatsPerBar : 0;
  const totalBeats = bars * beatsPerBar + countInBeats;
  const totalWidth = Math.ceil(totalBeats * pxPerBeat);
  // const headerHeight = 40 + (showChordsTop ? 26 : 0);

  // Preindex lanes
  const laneIndex: Record<string, number> = {};
  laneList.forEach((name, i) => { laneIndex[name] = i; });

  // Sub grid (thin lines) and beat lines (stronger)
  const subEvery = 1 / subdivision; // beats per sub-line
  const subLines: number[] = [];
  for (let b = 0; b <= totalBeats; b += subEvery) subLines.push(b);

  const beatLines: number[] = [];
  for (let b = 0; b <= totalBeats; b += 1) beatLines.push(b);

  const barLines: number[] = [];
  for (let b = 0; b <= totalBeats; b += beatsPerBar) barLines.push(b);

  const labels = barBeatLabels(bars, beatsPerBar, showCountIn, countInBars);

  return (
    <div className="w-full overflow-auto rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200">
      {/* Header: beat markers & optional chord strip */}
      <div className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur px-2" style={{borderBottom: "1px solid rgba(120,120,120,0.25)"}}>
        {/* Top ruler */}
        <div className="relative w-full" style={{height: 40}}>
          {/* beat labels */}
          {labels.map(({beat, label}) => (
            <div
              key={`lbl-${beat}`}
              className="absolute top-1 text-xs text-neutral-300 select-none"
              style={{ left: beatToPx(beat, pxPerBeat, countInBeats) + 4 }}
            >
              {label}
            </div>
          ))}
          {/* vertical beat lines (stronger) */}
          {beatLines.map((b) => (
            <div key={`beat-${b}`} className="absolute top-0 h-full" style={{ left: beatToPx(b, pxPerBeat, 0), width: 1, background: "rgba(160,160,160,0.25)" }} />
          ))}
          {/* bar separators */}
          {barLines.map((b, i) => (
            <div key={`bar-${b}`} className="absolute top-0 h-full" style={{ left: beatToPx(b, pxPerBeat, 0), width: 2, background: i === 0 ? "rgba(200,200,255,0.45)" : "rgba(200,200,200,0.35)" }} />
          ))}
        </div>
        {showChordsTop && (
          <div className="relative h-6">
            {chords.map((c, idx) => (
              <div key={`ch-${idx}`} className="absolute -translate-x-1/2 text-xs text-neutral-200">
                <div
                  className="rounded-md bg-neutral-800 px-2 py-0.5 shadow"
                  style={{ left: beatToPx(c.startBeat, pxPerBeat, countInBeats) }}
                >
                  <span className="font-medium">{c.label}</span>
                  {c.subLabel && <span className="ml-1 opacity-70 italic">{c.subLabel}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="relative" style={{ width: totalWidth }}>
        {/* Lane labels column */}
        <div className="sticky left-0 z-20" style={{ width: 72 }}>
          {laneList.map((name, idx) => (
            <div key={name} className="flex items-center justify-end pr-2 text-sm text-neutral-300 select-none" style={{ height: rowHeight, borderBottom: "1px solid rgba(120,120,120,0.15)", background: idx%2? "rgba(255,255,255,0.01)":"rgba(255,255,255,0.03)" }}>
              {name}
            </div>
          ))}
        </div>

        {/* Grid underlay */}
        <div className="absolute inset-0 z-0" style={{ left: 72 }}>
          {/* row backgrounds */}
          {laneList.map((_, idx) => (
            <div key={`row-${idx}`} className="absolute left-0 right-0" style={{ top: idx*rowHeight, height: rowHeight, background: idx%2? "rgba(255,255,255,0.02)":"rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(120,120,120,0.15)" }} />
          ))}
          {/* sub grid lines */}
          {subLines.map((b) => (
            <div key={`sub-${b}`} className="absolute top-0 bottom-0" style={{ left: 72 + beatToPx(b, pxPerBeat, 0), width: 1, background: "rgba(200,200,200,0.08)" }} />
          ))}
          {/* beat lines (stronger) */}
          {beatLines.map((b) => (
            <div key={`B-${b}`} className="absolute top-0 bottom-0" style={{ left: 72 + beatToPx(b, pxPerBeat, 0), width: 1, background: "rgba(200,200,200,0.16)" }} />
          ))}
          {/* bar lines */}
          {barLines.map((b) => (
            <div key={`BAR-${b}`} className="absolute top-0 bottom-0" style={{ left: 72 + beatToPx(b, pxPerBeat, 0), width: 2, background: "rgba(255,255,255,0.22)" }} />
          ))}
        </div>

        {/* Notes layer */}
        <div className="absolute inset-0 z-10" style={{ left: 72 }}>
          {events.map((e) => {
            const row = laneIndex[e.pitchName];
            if (row == null) return null;
            const left = beatToPx(e.startBeats, pxPerBeat, countInBeats);
            const width = Math.max(6, e.durationBeats * pxPerBeat);
            const top = row * rowHeight + 4;
            const height = rowHeight - 8;
            const color = e.color ?? "#b64f4f"; // base red hue similar to screenshot
            return (
              <button
                key={e.id}
                title={`${e.pitchName} @ ${e.startBeats.toFixed(2)} beats`}
                onClick={() => onNoteClick?.(e)}
                className="absolute group"
                style={{ left, top, width, height }}
              >
                <div
                  className="h-full w-full rounded-2xl shadow-inner"
                  style={{
                    background: `linear-gradient(180deg, ${color}cc, ${color}aa)`,
                    border: `1px solid rgba(255,255,255,0.18)`,
                  }}
                />
                {/* pill label at head */}
                <div className="absolute -left-3 -top-3 select-none">
                  <div className="rounded-full bg-neutral-900/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-200 ring-1 ring-neutral-700 shadow">
                    {e.pitchName}
                  </div>
                </div>
                {/* rounded head cap */}
                <div className="absolute left-0 top-0 h-full w-4 rounded-l-2xl" style={{ background: "rgba(0,0,0,0.2)" }} />
                {/* tail gloss */}
                <div className="absolute right-1 top-1 h-[calc(100%-8px)] w-2 rounded-r-xl opacity-60" style={{ background: "rgba(255,255,255,0.15)" }} />
              </button>
            );
          })}
        </div>

        {/* Playhead */}
        {typeof playheadBeat === "number" && (
          <div className="absolute top-0 bottom-0 z-20" style={{ left: 72 + beatToPx(playheadBeat, pxPerBeat, countInBeats) }}>
            <div className="absolute -translate-x-1/2 top-10 h-3 w-3 rounded-full bg-cyan-400 shadow" />
            <div className="absolute left-0 top-0 h-full w-[2px] bg-cyan-400/70" />
          </div>
        )}
      </div>
    </div>
  );
};

export default PianoRoll;