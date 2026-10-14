/* eslint-disable react/jsx-sort-props */
/**
 * The line as real pitches, on the same horizontal scale as the roll, for its
 * whole length — where a walking line's choices get checked.
 */

import type { RealizedLine } from '@/curriculum/engine/bassLines/bassLine';
import { chordSymbol, midiName } from '@/curriculum/engine/bassLines/harmony';
import { colorFor, Playhead } from './BassRoll';

interface Props {
  realized: RealizedLine;
  flats: boolean;
  pxPerQuarter: number;
  playheadQ: number | null;
}

const ROW_H = 12;

export const RealizedView = ({
  realized,
  flats,
  pxPerQuarter,
  playheadQ,
}: Props) => {
  const { notes, spans, totalQuarters, barQuarters } = realized;
  if (!notes.length) {
    return (
      <p className="text-sm italic text-muted-foreground">
        No notes yet: draw some in the roll.
      </p>
    );
  }
  const lo = Math.min(...notes.map((n) => n.midi)) - 1;
  const hi = Math.max(...notes.map((n) => n.midi)) + 1;
  const width = totalQuarters * pxPerQuarter;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5">
      <div style={{ position: 'relative', width, height: 20 }}>
        {spans.map((s, i) => (
          <span
            key={i}
            className="whitespace-nowrap text-[13px] text-white/85"
            style={{ position: 'absolute', left: s.start * pxPerQuarter }}
          >
            {chordSymbol(s.chord, s.chord.flats ?? flats)}
          </span>
        ))}
      </div>
      <div
        style={{
          position: 'relative',
          width,
          height: (hi - lo + 1) * ROW_H,
          background: 'rgba(255,255,255,0.025)',
          borderRadius: 6,
          backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0 1px, transparent 1px ${barQuarters * pxPerQuarter}px)`,
        }}
      >
        {notes.map((n, i) => {
          const f = spans[n.span]?.chord.flats ?? flats;
          return (
            <div
              key={i}
              title={`${midiName(n.midi, f)} (${n.degree})`}
              style={{
                position: 'absolute',
                top: (hi - n.midi) * ROW_H,
                height: ROW_H - 2,
                left: n.q * pxPerQuarter,
                width: Math.max(3, n.dur * pxPerQuarter - 2),
                background: colorFor(n.degree),
                opacity: 0.35 + 0.65 * n.velocity,
                borderRadius: 3,
                color: '#0b0d12',
                fontSize: 9,
                fontWeight: 700,
                paddingLeft: 2,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                lineHeight: `${ROW_H - 2}px`,
              }}
            >
              {pxPerQuarter >= 20
                ? midiName(n.midi, f).replace(/-?\d+$/, '')
                : ''}
            </div>
          );
        })}
        {playheadQ !== null && <Playhead left={playheadQ * pxPerQuarter} />}
      </div>
    </div>
  );
};
