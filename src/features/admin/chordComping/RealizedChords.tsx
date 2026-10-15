/**
 * What the pattern plays over the preview's chords: every voiced note as a
 * small piano roll, so voice leading and the ceiling can be checked by eye.
 */

import type { FC } from 'react';
import { midiName } from '@/curriculum/engine/bassLines/harmony';
import type { BackingNote } from '@/curriculum/engine/genreGeneration/backingPatterns';
import { PPQ } from '@/curriculum/engine/meter';

const NOTE_H = 6;
const LABEL_W = 124;

interface Props {
  notes: BackingNote[];
  loopQ: number;
  barQ: number;
  pxPerQuarter: number;
  ceiling: number;
  flats: boolean;
  playheadQ: number | null;
}

export const RealizedChords: FC<Props> = ({
  notes,
  loopQ,
  barQ,
  pxPerQuarter,
  ceiling,
  flats,
  playheadQ,
}) => {
  if (!notes.length) return null;
  const lo = Math.min(...notes.map((n) => n.note)) - 1;
  const hi = Math.max(ceiling, ...notes.map((n) => n.note)) + 1;
  const height = (hi - lo + 1) * NOTE_H;
  const width = loopQ * pxPerQuarter;
  const y = (midi: number) => (hi - midi) * NOTE_H;

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
      <div className="flex" style={{ minWidth: LABEL_W + width }}>
        <div
          className="relative text-[10px] text-white/40"
          style={{ width: LABEL_W, flexShrink: 0, height }}
        >
          <span className="absolute" style={{ top: y(hi - 1) - 2 }}>
            {midiName(hi - 1, flats)}
          </span>
          <span className="absolute" style={{ top: y(lo + 1) - 6 }}>
            {midiName(lo + 1, flats)}
          </span>
        </div>
        <div
          className="relative"
          style={{
            width,
            height,
            backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0 1px, transparent 1px ${barQ * pxPerQuarter}px)`,
          }}
        >
          {/* the ceiling */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-rose-400/50"
            style={{ top: y(ceiling) }}
            title={`Ceiling ${midiName(ceiling, flats)}`}
          />
          {notes.map((n, i) => (
            <div
              key={i}
              className="absolute rounded-sm bg-[#60a5fa]"
              title={`${midiName(n.note, flats)} · velocity ${n.velocity}`}
              style={{
                left: (n.onset / PPQ) * pxPerQuarter,
                width: Math.max(3, (n.duration / PPQ) * pxPerQuarter - 1),
                top: y(n.note) + 0.5,
                height: NOTE_H - 1,
                opacity: 0.35 + (0.65 * n.velocity) / 127,
              }}
            />
          ))}
          {playheadQ !== null && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-rose-500"
              style={{ left: playheadQ * pxPerQuarter }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
