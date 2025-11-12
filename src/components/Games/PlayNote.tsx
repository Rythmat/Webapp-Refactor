import React from 'react';
import type { NoteEvent } from './PianoRollPlay';

const TICKS_PER_QUARTER = 480;

type NoteSegment = {
  from: number;
  to: number;
  kind: 'played' | 'inactive';
};

type PlayNoteProps = {
  note: NoteEvent;
  startPercent: number;
  widthPercent: number;
  row: number;
  rowHeight: number;
  color: string;
  segments?: NoteSegment[];
  onClick?: (note: NoteEvent) => void;
};

export const PlayNote: React.FC<PlayNoteProps> = ({
  note,
  startPercent,
  widthPercent,
  row,
  rowHeight,
  color,
  segments,
  onClick,
}) => {
  const top = row * rowHeight + 4;
  const height = rowHeight - 8;

  const circleSize = Math.min(height * 1.2, rowHeight);
  const circleRadius = circleSize / 2;
  const circleLeft = `max(0px, min(calc(${startPercent}% - ${circleRadius}px), calc(100% - ${circleSize}px)))`;
  const circleTopPx = row * rowHeight + rowHeight / 2 - circleRadius;

  return (
    <>
      <button
        title={`${note.pitchName} @ ${(note.startTicks / TICKS_PER_QUARTER).toFixed(2)} beats`}
        onClick={() => onClick?.(note)}
        className="absolute group"
        style={{
          left: `${startPercent}%`,
          width: `${widthPercent}%`,
          top,
          height,
        }}
      >
        <div className="h-full w-full overflow-hidden rounded-2xl shadow-inner border border-white/20 relative">
          {segments && segments.length > 0 ? (
            segments.map((segment, index) => {
              if (segment.to <= segment.from) {
                return null;
              }
              const left = segment.from * 100;
              const width = (segment.to - segment.from) * 100;
              const backgroundColor =
                segment.kind === 'played'
                  ? color
                  : 'rgba(255,255,255,0.08)';
              return (
                <div
                  key={index}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: backgroundColor,
                  }}
                />
              );
            })
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(180deg, ${color}cc, ${color}aa)`,
              }}
            />
          )}
        </div>
        <div
          className="absolute left-0 top-0 h-full w-4 rounded-l-2xl"
          style={{ background: 'rgba(0,0,0,0.2)' }}
        />
        <div
          className="absolute right-1 top-1 h-[calc(100%-8px)] w-2 rounded-r-xl opacity-60"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        />
      </button>
      <div
        className="pointer-events-none absolute flex items-center justify-center text-[10px] font-semibold uppercase tracking-tight"
        style={{
          left: circleLeft,
          top: `${circleTopPx}px`,
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          borderRadius: '9999px',
          background: color,
          color: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 2px 4px rgba(15,15,15,0.35)',
        }}
      >
        {note.pitchName}
      </div>
    </>
  );
};
