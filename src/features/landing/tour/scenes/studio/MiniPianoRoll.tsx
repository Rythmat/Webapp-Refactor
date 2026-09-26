import { motion, useTransform, type MotionValue } from 'framer-motion';
import { useRef, useState, type MouseEvent } from 'react';
import { midiNameInKey, type MidiNoteEvent } from '@prism/engine';
import { cn } from '@/components/utilities';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import {
  PLAYHEAD_COLOR,
  PLAYHEAD_HANDLE_H,
  PLAYHEAD_HANDLE_W,
} from '@/daw/utils/rulerLoop';
import {
  PIANO_ROLL_LANE_COLORS as LANE,
  pianoRollLabelFontSize,
  pianoRollLaneBackground,
} from '@/lib/pianoRollLanes';
import { rovingKeyDown, useRovingStop } from './studioHooks';
import { BAR, regionAt, rollRange, type ChordRegion } from './studioSong';
import {
  BAR_NUMBER_X,
  GRID,
  LOOP_STRIP,
  rollNoteAlpha,
  rollX,
  type StudioLayout,
} from './studioTokens';

const BARS = 4;
/** Loop strip height in the roll's ruler (the rest holds bar numbers). */
const STRIP_H = 6;

/** What the playhead is over: that bar's notes glow, their key rows tint. */
export interface RollGlow {
  bar: number;
  color: string;
}

/**
 * The dock's PIANO ROLL tab (`PianoRoll.tsx`, as DOM): a key column of
 * buttons that play their note, the app's lane shading
 * (`pianoRollLaneBackground`), 2px bar lines, the clip's notes in their
 * chord's color and the red playhead. The bar under the playhead glows.
 */
export const MiniPianoRoll = ({
  layout,
  compact,
  staticMode,
  notes,
  regions,
  keyPc,
  position,
  glow,
  onKey,
}: {
  layout: StudioLayout;
  compact: boolean;
  staticMode: boolean;
  notes: readonly MidiNoteEvent[];
  regions: readonly ChordRegion[];
  keyPc: number | null;
  position: MotionValue<number>;
  glow: RollGlow | null;
  onKey: (midi: number) => void;
}) => {
  const { keyW, ruler, rows, rowH: baseRowH, barW } = layout.roll;
  const { lo, hi } = rollRange(notes, rows);
  const count = hi - lo + 1;
  const rowH = (rows * baseRowH) / count;
  const pitches = Array.from({ length: count }, (_, i) => hi - i);
  const gridW = layout.w - keyW;
  const gridH = count * rowH;
  const [flash, setFlash] = useState<{ midi: number; n: number } | null>(null);

  const glowing = (n: MidiNoteEvent) =>
    glow !== null &&
    n.startTick >= glow.bar * BAR &&
    n.startTick < (glow.bar + 1) * BAR;
  const lit = new Set(notes.filter(glowing).map((n) => n.note));
  const laneBg = (midi: number) => {
    const bg = pianoRollLaneBackground(midi);
    return glow && lit.has(midi)
      ? `color-mix(in srgb, ${glow.color} 30%, ${bg})`
      : bg;
  };
  const roving = useRovingStop(pitches.includes(60) ? 60 : pitches[0], pitches);

  const press = (midi: number) => {
    setFlash((f) => ({ midi, n: (f?.n ?? 0) + 1 }));
    onKey(midi);
  };
  // A mouse plays on press; touch plays on click (pointerdown is no user
  // activation for touch, so it could not start audio), and so does a key.
  const pointerType = useRef('mouse');
  const onClickKey = (e: MouseEvent, midi: number) => {
    if (e.detail === 0 || pointerType.current !== 'mouse') press(midi);
  };

  return (
    <div className="relative size-full" style={{ background: LANE.blackKey }}>
      {/* Ruler: loop strip + bar numbers */}
      <div
        aria-hidden
        className="absolute right-0 border-b border-white/[0.08]"
        style={{ left: keyW, top: 0, height: ruler.h }}
      >
        <svg
          width={BARS * barW}
          height={STRIP_H}
          className="absolute left-0 top-0"
        >
          <rect width={BARS * barW} height={STRIP_H} fill={LOOP_STRIP.fill} />
          <path
            d={`M0 0H${STRIP_H}L0 ${STRIP_H}Z M${BARS * barW} 0H${BARS * barW - STRIP_H}L${BARS * barW} ${STRIP_H}Z`}
            fill={LOOP_STRIP.handle}
          />
        </svg>
        {Array.from({ length: BARS + 1 }, (_, bar) => (
          <span
            key={bar}
            className={cn(
              'absolute leading-none',
              compact ? 'text-[11px]' : 'text-[9px]',
            )}
            style={{
              left: bar * barW + BAR_NUMBER_X,
              top: STRIP_H + 2,
              color: `rgba(255, 255, 255, ${GRID.numberAlpha})`,
            }}
          >
            {bar + 1}
          </span>
        ))}
      </div>

      {/* Lanes, grid and notes */}
      <div
        className="absolute right-0 overflow-hidden"
        style={{ left: keyW, top: ruler.h, height: gridH }}
      >
        <svg
          aria-hidden
          width={gridW}
          height={gridH}
          className="absolute inset-0"
        >
          {pitches.map((midi, i) => (
            <rect
              key={midi}
              y={i * rowH}
              width={gridW}
              height={rowH}
              style={{ fill: laneBg(midi), transition: 'fill 200ms' }}
            />
          ))}
          {pitches.map((midi, i) => (
            <line
              key={midi}
              x2={gridW}
              y1={(i + 1) * rowH - 0.5}
              y2={(i + 1) * rowH - 0.5}
              stroke={LANE.separator}
            />
          ))}
          {Array.from({ length: Math.ceil(gridW / (barW / 4)) }, (_, b) => {
            const x = (b * barW) / 4;
            const bar = b % 4 === 0;
            return (
              <line
                key={b}
                x1={x + (bar ? 1 : 0.5)}
                x2={x + (bar ? 1 : 0.5)}
                y2={gridH}
                stroke={
                  b === 0
                    ? LANE.firstBarLine
                    : bar
                      ? LANE.barLine
                      : LANE.beatLine
                }
                strokeWidth={bar ? 2 : 1}
              />
            );
          })}
        </svg>
        {notes.map((n, i) => {
          const color = regionAt(regions, n.startTick)?.color ?? '#ffffff';
          const on = glowing(n);
          return (
            <span
              key={i}
              aria-hidden
              className="absolute rounded-[2px] transition-[opacity,box-shadow] duration-200"
              style={{
                left: rollX(layout, n.startTick) - keyW,
                top: (hi - n.note) * rowH + 1,
                width: Math.max(3, (n.durationTicks * barW) / BAR - 1),
                height: rowH - 2,
                background: color,
                opacity: on ? 1 : rollNoteAlpha(n.velocity) * (glow ? 0.75 : 1),
                boxShadow: on ? `0 0 10px ${color}` : undefined,
              }}
            />
          );
        })}
        {notes.length === 0 && (
          <span
            className={cn(
              'absolute inset-0 grid place-items-center text-white/45',
              compact ? 'text-[14px]' : 'text-[11px]',
            )}
          >
            No clip yet: press Create in PRISM
          </span>
        )}
      </div>

      {/* Key column */}
      <div
        role="group"
        aria-label="Piano roll keys"
        className="absolute left-0 border-r border-white/[0.08]"
        style={{ top: ruler.h, width: keyW, height: gridH }}
        onKeyDown={rovingKeyDown}
      >
        {pitches.map((midi, i) => {
          const name = displayAccidentals(midiNameInKey(midi, keyPc ?? 0));
          return (
            <button
              key={midi}
              type="button"
              data-roving
              tabIndex={midi === roving.stop ? 0 : -1}
              aria-label={`Play ${name}`}
              onPointerDown={(e) => {
                pointerType.current = e.pointerType;
                if (e.pointerType === 'mouse') press(midi);
              }}
              onClick={(e) => onClickKey(e, midi)}
              onFocus={() => roving.onFocus(midi)}
              className="absolute inset-x-0 flex items-center justify-end overflow-hidden pr-1 leading-none focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
              style={{
                top: i * rowH,
                height: rowH,
                background: laneBg(midi),
                color: LANE.label,
                fontSize: compact ? pianoRollLabelFontSize(rowH) : 8,
                boxShadow: `inset 0 -1px 0 ${LANE.separator}`,
              }}
            >
              {flash?.midi === midi && !staticMode && (
                <motion.span
                  key={flash.n}
                  aria-hidden
                  className="absolute inset-0 bg-white"
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                />
              )}
              <span className="relative">{name}</span>
            </button>
          );
        })}
      </div>

      <RollPlayhead
        key={layout.w}
        layout={layout}
        position={position}
        height={ruler.h + gridH}
      />
    </div>
  );
};

const RollPlayhead = ({
  layout,
  position,
  height,
}: {
  layout: StudioLayout;
  position: MotionValue<number>;
  height: number;
}) => {
  const x = useTransform(position, (t) => rollX(layout, t) - 1);
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-10 w-0.5"
      style={{ x, height, background: PLAYHEAD_COLOR }}
    >
      <svg
        width={PLAYHEAD_HANDLE_W}
        height={PLAYHEAD_HANDLE_H}
        className="absolute"
        style={{
          left: 1 - PLAYHEAD_HANDLE_W / 2,
          top: layout.roll.ruler.h - PLAYHEAD_HANDLE_H,
        }}
      >
        <path
          d={`M0 0H${PLAYHEAD_HANDLE_W}L${PLAYHEAD_HANDLE_W / 2} ${PLAYHEAD_HANDLE_H}Z`}
          fill={PLAYHEAD_COLOR}
        />
      </svg>
    </motion.div>
  );
};
