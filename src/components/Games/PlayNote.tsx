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
  isHeld?: boolean;
  inTime?: boolean;
  holdProgress?: number;
  dimmed?: boolean;
  highlighted?: boolean;
};

export const PlayNote: React.FC<PlayNoteProps> = ({
  note,
  startPercent,
  widthPercent,
  row,
  rowHeight,
  color,
  segments,
  isHeld = false,
  inTime = true,
  holdProgress,
  dimmed = false,
  highlighted = false,
}) => {
  const top = row * rowHeight + 4;
  const height = rowHeight - 8;
  const effectiveColor = dimmed ? "rgba(160,160,160,0.45)" : color;

  const circleSize = Math.min(height * 1.2, rowHeight);
  const circleRadius = circleSize / 2;
  const circleLeft = `max(0px, min(calc(${startPercent}% - ${circleRadius}px), calc(100% - ${circleSize}px)))`;
  const circleTopPx = row * rowHeight + rowHeight / 2 - circleRadius;

  const circleBackground = inTime
    ? effectiveColor
    : isHeld
      ? "#22c55e"
      : "rgba(0,0,0,0.6)";
  const circleTextColor =
    inTime || isHeld ? "rgba(255,255,255,0.95)" : "rgba(220,220,220,0.9)";
  const circleBorder =
    inTime || isHeld
      ? "1px solid rgba(255,255,255,0.35)"
      : "1px solid rgba(255,255,255,0.18)";
  const circleShadow =
    inTime || isHeld
      ? "0 2px 6px rgba(34,197,94,0.55)"
      : "0 2px 4px rgba(15,15,15,0.35)";

  return (
    <>
      <div
        title={`${note.pitchName} @ ${(note.startTicks / TICKS_PER_QUARTER).toFixed(2)} beats`}
        className="absolute group"
        style={{
          left: `${startPercent}%`,
          width: `${widthPercent}%`,
          top,
          height,
        }}
      >
        <div
          className="h-full w-full overflow-hidden rounded-2xl shadow-inner border relative"
          style={{
            borderColor: highlighted ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
            borderWidth: highlighted ? "2px" : undefined,
            boxShadow: highlighted
              ? "0 0 0 1px rgba(255,255,255,0.2), 0 8px 18px rgba(255,255,255,0.16)"
              : undefined,
          }}
        >
          {segments && segments.length > 0 ? (
            segments.map((segment, index) => {
              if (segment.to <= segment.from) {
                return null;
              }
              const left = segment.from * 100;
                const width = (segment.to - segment.from) * 100;
              const baseSegmentColor =
                segment.kind === 'played'
                  ? effectiveColor
                  : 'rgba(255,255,255,0.08)';
              const backgroundColor = dimmed ? "rgba(160,160,160,0.3)" : baseSegmentColor;
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
                background: `linear-gradient(180deg, ${effectiveColor}cc, ${effectiveColor}aa)`,
              }}
            />
          )}
          {!inTime && typeof holdProgress === "number" ? (
            <div
              className="absolute left-0 top-0 h-[4px] rounded-t-2xl transition-[width]"
              style={{
                width: `${Math.max(0, Math.min(1, holdProgress)) * 100}%`,
                background: '#22c55e',
              }}
            />
          ) : null}
        </div>
        <div
          className="absolute left-0 top-0 h-full w-4 rounded-l-2xl"
          style={{ background: 'rgba(0,0,0,0.2)' }}
        />
        <div
          className="absolute right-1 top-1 h-[calc(100%-8px)] w-2 rounded-r-xl opacity-60"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        />
      </div>
      <div
      className="pointer-events-none absolute flex items-center justify-center text-[10px] font-semibold uppercase tracking-tight"
      style={{
        left: circleLeft,
        top: `${circleTopPx}px`,
        width: `${circleSize}px`,
        height: `${circleSize}px`,
        borderRadius: '9999px',
        background: circleBackground,
        color: circleTextColor,
        border: circleBorder,
        boxShadow: circleShadow,
      }}
    >
      {note.pitchName}
    </div>
    </>
  );
};
