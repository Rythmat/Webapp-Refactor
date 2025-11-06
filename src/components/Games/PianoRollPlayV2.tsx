import React from "react";

export type Midi = number;

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
  startBeat: number;
  label: string;
  subLabel?: string;
}

export interface PianoRollProps {
  events: NoteEvent[];
  lanes?: string[];
  bars: number;
  beatsPerBar?: number;
  subdivision?: number;
  pxPerBeat?: number;
  rowHeight?: number;
  showChordsTop?: boolean;
  chords?: ChordMarker[];
  showCountIn?: boolean;
  countInBars?: number;
  playheadBeat?: number;
  onNoteClick?: (note: NoteEvent) => void;
}

function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

const NOTE_ORDER = ["C","C#","Db","D","D#","Eb","E","F","F#","Gb","G","G#","Ab","A","A#","Bb","B"];
function laneSortKey(name: string): number {
  const m = name.match(/^([A-Ga-g]{1})([#b♭♯]?)(-?\d+)$/);
  if (!m) return 0;
  const [ , L, acc, octStr ] = m;
  const letter = L.toUpperCase();
  const accidental = (acc === "♭") ? "b" : (acc === "♯" ? "#" : acc);
  const base = NOTE_ORDER.indexOf(letter + accidental);
  const octave = parseInt(octStr, 10);
  return octave * 100 + (base >= 0 ? base : 0);
}

function buildLaneList(events: NoteEvent[], lanes?: string[]): string[] {
  if (lanes && lanes.length) return lanes;
  const names = unique(events.map(e => e.pitchName));
  return names.sort((a,b) => laneSortKey(b) - laneSortKey(a));
}

function beatToPx(beat: number, pxPerBeat: number, countInBeats: number): number {
  return (beat + countInBeats) * pxPerBeat;
}

function barBeatLabels(bars: number, beatsPerBar: number, showCountIn: boolean, countInBars: number) {
  const labels: { beat: number; label: string }[] = [];
  for (let barIndex = - (showCountIn ? countInBars : 0); barIndex < bars; barIndex++) {
    for (let beat = 1; beat <= beatsPerBar; beat++) {
      const absoluteBeat = barIndex * beatsPerBar + (beat - 1);
      const prefix = barIndex < 0 ? `${barIndex}.` : `${barIndex+1}.`;
      labels.push({ beat: absoluteBeat, label: `${prefix}${beat}` });
    }
  }
  return labels;
}

const PianoRollV2: React.FC<PianoRollProps> = ({
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
  const bodyBeats = bars * beatsPerBar;
  const totalBeats = bodyBeats + countInBeats;
  const totalWidth = Math.ceil(totalBeats * pxPerBeat);

  const laneIndex: Record<string, number> = {};
  laneList.forEach((name, i) => { laneIndex[name] = i; });

  const subEvery = 1 / Math.max(1, subdivision);
  const subLines: number[] = [];
  for (let b = -countInBeats; b <= bodyBeats; b += subEvery) subLines.push(Number(b.toFixed(6)));

  const beatLines: number[] = [];
  for (let b = -countInBeats; b <= bodyBeats; b += 1) beatLines.push(b);

  const barLines: number[] = [];
  for (let b = -countInBeats; b <= bodyBeats; b += beatsPerBar) barLines.push(b);

  const labels = barBeatLabels(bars, beatsPerBar, showCountIn, countInBars);

  return (
    <div className="w-full overflow-auto rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200">
      <div className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur px-2" style={{borderBottom: "1px solid rgba(120,120,120,0.25)"}}>
        <div className="relative w-full" style={{height: 40}}>
          {labels.map(({beat, label}) => (
            <div
              key={`lbl-${beat}`}
              className="absolute top-1 text-xs text-neutral-300 select-none"
              style={{ left: beatToPx(beat, pxPerBeat, countInBeats) + 4 }}
            >
              {label}
            </div>
          ))}
          {beatLines.map((b) => (
            <div key={`beat-${b}`} className="absolute top-0 h-full" style={{ left: beatToPx(b, pxPerBeat, countInBeats), width: 1, background: "rgba(160,160,160,0.25)" }} />
          ))}
          {barLines.map((b, i) => (
            <div key={`bar-${b}`} className="absolute top-0 h-full" style={{ left: beatToPx(b, pxPerBeat, countInBeats), width: 2, background: i === 0 ? "rgba(200,200,255,0.45)" : "rgba(200,200,200,0.35)" }} />
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

      <div className="relative" style={{ width: totalWidth }}>
        <div className="sticky left-0 z-20" style={{ width: 72 }}>
          {laneList.map((name, idx) => (
            <div key={name} className="flex items-center justify-end pr-2 text-sm text-neutral-300 select-none" style={{ height: rowHeight, borderBottom: "1px solid rgba(120,120,120,0.15)", background: idx%2? "rgba(255,255,255,0.01)":"rgba(255,255,255,0.03)" }}>
              {name}
            </div>
          ))}
        </div>

        <div className="absolute inset-0 z-0" style={{ left: 72 }}>
          {laneList.map((_, idx) => (
            <div key={`row-${idx}`} className="absolute left-0 right-0" style={{ top: idx*rowHeight, height: rowHeight, background: idx%2? "rgba(255,255,255,0.02)":"rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(120,120,120,0.15)" }} />
          ))}
          {subLines.map((b) => (
            <div key={`sub-${b}`} className="absolute top-0 bottom-0" style={{ left: 72 + beatToPx(b, pxPerBeat, countInBeats), width: 1, background: "rgba(200,200,200,0.08)" }} />
          ))}
          {beatLines.map((b) => (
            <div key={`B-${b}`} className="absolute top-0 bottom-0" style={{ left: 72 + beatToPx(b, pxPerBeat, countInBeats), width: 1, background: "rgba(200,200,200,0.16)" }} />
          ))}
          {barLines.map((b) => (
            <div key={`BAR-${b}`} className="absolute top-0 bottom-0" style={{ left: 72 + beatToPx(b, pxPerBeat, countInBeats), width: 2, background: "rgba(255,255,255,0.22)" }} />
          ))}
        </div>

        <div className="absolute inset-0 z-10" style={{ left: 72 }}>
          {events.map((e) => {
            const row = laneIndex[e.pitchName];
            if (row == null) return null;
            const left = beatToPx(e.startBeats, pxPerBeat, countInBeats);
            const width = Math.max(6, e.durationBeats * pxPerBeat);
            const top = row * rowHeight + 4;
            const height = rowHeight - 8;
            const color = e.color ?? "#b64f4f";
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
                <div className="absolute -left-3 -top-3 select-none">
                  <div className="rounded-full bg-neutral-900/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-200 ring-1 ring-neutral-700 shadow">
                    {e.pitchName}
                  </div>
                </div>
                <div className="absolute left-0 top-0 h-full w-4 rounded-l-2xl" style={{ background: "rgba(0,0,0,0.2)" }} />
                <div className="absolute right-1 top-1 h-[calc(100%-8px)] w-2 rounded-r-xl opacity-60" style={{ background: "rgba(255,255,255,0.15)" }} />
              </button>
            );
          })}
        </div>

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

export default PianoRollV2;