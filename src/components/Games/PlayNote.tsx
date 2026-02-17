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
  // isHeld = false,
  inTime = true,
  holdProgress,
  // dimmed = false,
  highlighted = false,
}) => {
  const top = row * rowHeight + 4;
  const height = rowHeight - 8;
  const effectiveColor = color;

  const circleSize = Math.min(height * 1.2, rowHeight);
  const circleRadius = circleSize / 2;
  const circleLeft = `max(0px, min(calc(${startPercent}% - ${circleRadius}px), calc(100% - ${circleSize}px)))`;
  const circleTopPx = row * rowHeight + rowHeight / 2 - circleRadius;
  const circleFontSize = Math.max(10, Math.min(26, circleSize * 0.22));

  const circleBackground = effectiveColor;
  const circleTextColor = "rgba(255,255,255,0.95)";
  const circleBorder = "1px solid rgba(255,255,255,0.35)";
  const circleShadow = "0 2px 6px rgba(15,15,15,0.35)";

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
              const backgroundColor = effectiveColor;
              const segmentOpacity = segment.kind === 'played' ? 1 : 0.35;
              return (
                <div
                  key={index}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: backgroundColor,
                    opacity: segmentOpacity,
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
                background: effectiveColor,
              }}
            />
          ) : null}
        </div>
      </div>
      <div
        className="pointer-events-none absolute flex items-center justify-center font-semibold uppercase tracking-tight"
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
          fontSize: `${circleFontSize}px`,
        }}
      >
        {note.pitchName}
      </div>
    </>
  );
};
