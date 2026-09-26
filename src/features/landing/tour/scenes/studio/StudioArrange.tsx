import { motion, useTransform, type MotionValue } from 'framer-motion';
import type { MidiNoteEvent } from '@prism/engine';
import { cn } from '@/components/utilities';
import {
  PLAYHEAD_COLOR,
  PLAYHEAD_HANDLE_H,
  PLAYHEAD_HANDLE_W,
} from '@/daw/utils/rulerLoop';
import type { TrackId } from './studioScript';
import {
  BAR,
  CLIP_TICKS,
  regionAt,
  TICKS_PER_MS,
  type ChordRegion,
  type StudioSong,
} from './studioSong';
import {
  arrangeX,
  BAR_NUMBER_X,
  CLIP,
  clipNoteAlpha,
  GRID,
  LOOP_STRIP,
  NEUTRAL_TRACK,
  REGION,
  STUDIO,
  type StudioLayout,
} from './studioTokens';

const BARS = 4;
const white = (alpha: number) => `rgba(255, 255, 255, ${alpha})`;
const mix = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/**
 * A clip's mini piano roll (`Timeline.tsx` `drawPianoRoll`): 3px note bars in
 * the pitch range ±2, each in its color. A color change sweeps left to right
 * (the key flood, and Create recoloring the drums by chord).
 */
const ClipNotes = ({
  notes,
  colors,
  width,
  height,
  barW,
  staticMode,
}: {
  notes: readonly MidiNoteEvent[];
  colors: readonly string[];
  width: number;
  height: number;
  barW: number;
  staticMode: boolean;
}) => {
  if (notes.length === 0) return null;
  const pitches = notes.map((n) => n.note);
  const lo = Math.min(...pitches) - 2;
  const hi = Math.max(...pitches) + 2;
  const room = height - CLIP.padTop - CLIP.padBottom - CLIP.noteH;
  return (
    <svg
      aria-hidden
      width={width}
      height={height}
      className="absolute inset-0 overflow-visible"
    >
      {notes.map((n, i) => {
        const x = (n.startTick * barW) / BAR;
        const delay = staticMode
          ? 0
          : (n.startTick / CLIP_TICKS) * CLIP.paintMs;
        return (
          <rect
            key={i}
            x={x}
            y={CLIP.padTop + ((hi - n.note) / (hi - lo)) * room}
            width={Math.max(2, (n.durationTicks * barW) / BAR - 1)}
            height={CLIP.noteH}
            rx={1}
            style={{
              fill: colors[i],
              opacity: clipNoteAlpha(n.velocity),
              transition: `fill 220ms linear ${delay}ms`,
            }}
          />
        );
      })}
    </svg>
  );
};

/**
 * The red playhead (through the loop strip, as the Timeline's) with its grab
 * triangle at the foot of the bar ruler.
 */
const Playhead = ({
  layout,
  position,
  bottom,
}: {
  layout: StudioLayout;
  position: MotionValue<number>;
  bottom: number;
}) => {
  const x = useTransform(position, (t) => arrangeX(layout, t) - 1);
  const top = layout.loopStrip.top;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 z-10 w-0.5"
      style={{ x, top, height: bottom - top, background: PLAYHEAD_COLOR }}
    >
      <svg
        width={PLAYHEAD_HANDLE_W}
        height={PLAYHEAD_HANDLE_H}
        className="absolute"
        style={{
          left: 1 - PLAYHEAD_HANDLE_W / 2,
          top: layout.chordRuler.top - top - PLAYHEAD_HANDLE_H,
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

/**
 * The arrangement (`Timeline.tsx`, drawn as DOM/SVG): grey loop strip and bar
 * numbers, the 20px chord ruler with Prism-colored regions (buttons that play
 * their chord), the shaded grid, white-glass clips with chord-colored notes
 * (the CHORDS clip paints in behind a write-head on Create) and the red
 * playhead, positioned per frame from the transport's MotionValue.
 */
export const StudioArrange = ({
  layout,
  compact,
  staticMode,
  song,
  keyColor,
  audible,
  position,
  activeRegion,
  paintKey,
  onRegion,
}: {
  layout: StudioLayout;
  compact: boolean;
  staticMode: boolean;
  song: StudioSong;
  keyColor: string | null;
  audible: Record<TrackId, boolean>;
  position: MotionValue<number>;
  activeRegion: number | null;
  /** Changes on every Create: replays the drop-in and the paint. */
  paintKey: string;
  onRegion: (region: ChordRegion, index: number) => void;
}) => {
  const { timelineX: x0, barW, rows } = layout;
  const loopW = BARS * barW;
  const bottom = layout.timeRuler
    ? layout.timeRuler.top + layout.timeRuler.h
    : layout.lanesBottom;
  const lanesTop = rows.chords.top;
  const gridW = layout.w - x0;
  const gridH = layout.lanesBottom - lanesTop;
  const regionColor = (tick: number, fallback: string) =>
    regionAt(song.regions, tick)?.color ?? fallback;
  const chordColors = song.chordNotes.map((n) =>
    regionColor(n.startTick, keyColor ?? NEUTRAL_TRACK),
  );
  const drumColors = song.drumNotes.map((n) =>
    keyColor ? regionColor(n.startTick, keyColor) : NEUTRAL_TRACK,
  );
  const clipBox = (track: TrackId) => ({
    left: x0,
    top: rows[track].top + 2,
    width: loopW,
    height: rows[track].h - 4,
  });
  const separators = [rows.chords, rows.drums, rows.master]
    .filter((r) => r !== null)
    .map((r) => r.top + r.h - lanesTop);

  return (
    <>
      {/* Bar ruler: loop strip + numbers */}
      <div
        aria-hidden
        className="absolute right-0"
        style={{
          left: x0,
          top: layout.loopStrip.top,
          height: layout.loopStrip.h + layout.numbers.h,
          background: white(0.03),
        }}
      >
        <svg
          width={loopW}
          height={layout.loopStrip.h}
          className="absolute left-0 top-0"
        >
          <rect
            width={loopW}
            height={layout.loopStrip.h}
            fill={LOOP_STRIP.fill}
          />
          <path
            d={`M0 0H${LOOP_STRIP.handleW}L0 ${layout.loopStrip.h}Z M${loopW} 0H${loopW - LOOP_STRIP.handleW}L${loopW} ${layout.loopStrip.h}Z`}
            fill={LOOP_STRIP.handle}
          />
        </svg>
        {Array.from({ length: BARS + 1 }, (_, bar) => (
          <span key={bar}>
            <span
              className={cn(
                'absolute leading-none',
                compact ? 'text-[12px]' : 'text-[10px]',
              )}
              style={{
                left: bar * barW + BAR_NUMBER_X,
                top: layout.loopStrip.h + (compact ? 4 : 3),
                color: white(GRID.numberAlpha),
              }}
            >
              {bar + 1}
            </span>
            {!compact &&
              bar < BARS &&
              [1, 2, 3].map((beat) => (
                <span
                  key={beat}
                  className="absolute text-[9px] leading-none"
                  style={{
                    left: bar * barW + (beat * barW) / 4 + 3,
                    top: layout.loopStrip.h + 5,
                    color: white(GRID.beatLabelAlpha),
                  }}
                >
                  {bar + 1}.{beat + 1}
                </span>
              ))}
          </span>
        ))}
      </div>

      {/* Chord ruler */}
      <div
        className="absolute right-0 border-y"
        style={{
          left: x0,
          top: layout.chordRuler.top,
          height: layout.chordRuler.h,
          borderColor: STUDIO.border,
        }}
      >
        {song.regions.map((r, i) => {
          const active = activeRegion === i;
          return (
            <motion.button
              key={`${paintKey}:${i}`}
              type="button"
              aria-label={`Play ${r.label}`}
              aria-pressed={active}
              onClick={() => onRegion(r, i)}
              initial={staticMode ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.28, ease: 'easeOut' }}
              className={cn(
                'absolute inset-y-0 flex items-center overflow-hidden whitespace-nowrap pl-1.5 transition-[background-color,box-shadow] duration-200 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                compact ? 'text-[14px] font-bold' : 'text-[11px] font-semibold',
              )}
              style={{
                left: Math.round((r.startTick * barW) / BAR),
                width: ((r.endTick - r.startTick) * barW) / BAR,
                background: mix(r.color, active ? REGION.active : REGION.fill),
                boxShadow: active
                  ? `inset 0 0 0 ${REGION.outline}px ${r.color}`
                  : `inset -1px 0 0 ${mix(r.color, 45)}`,
                color: active ? '#f8fafc' : mix(r.color, 85),
              }}
            >
              {r.label}
            </motion.button>
          );
        })}
      </div>

      {/* Lanes grid */}
      <svg
        aria-hidden
        width={gridW}
        height={gridH}
        className="absolute"
        style={{ left: x0, top: lanesTop }}
      >
        {[1, 3].map((bar) => (
          <rect
            key={bar}
            x={bar * barW}
            width={barW}
            height={gridH}
            fill={GRID.shade}
          />
        ))}
        {Array.from({ length: Math.ceil((gridW / barW) * 4) }, (_, b) =>
          b % 4 === 0 ? null : (
            <line
              key={b}
              x1={(b * barW) / 4 + 0.5}
              x2={(b * barW) / 4 + 0.5}
              y2={gridH}
              stroke={GRID.beat}
            />
          ),
        )}
        {Array.from({ length: BARS + 2 }, (_, bar) => (
          <line
            key={bar}
            x1={bar * barW + 0.5}
            x2={bar * barW + 0.5}
            y2={gridH}
            stroke={GRID.bar}
          />
        ))}
        {separators.map((y) => (
          <line
            key={y}
            x2={gridW}
            y1={y - 0.5}
            y2={y - 0.5}
            stroke={GRID.lane}
          />
        ))}
      </svg>

      {/* Clips */}
      <div
        aria-hidden
        className="absolute transition-opacity duration-200"
        style={{ ...clipBox('drums'), opacity: audible.drums ? 1 : 0.35 }}
      >
        <div
          className="absolute inset-0 border"
          style={{
            background: CLIP.fill,
            borderColor: CLIP.border,
            borderRadius: CLIP.radius,
          }}
        />
        <ClipNotes
          notes={song.drumNotes}
          colors={drumColors}
          width={loopW}
          height={rows.drums.h - 4}
          barW={barW}
          staticMode={staticMode}
        />
      </div>
      {song.chordNotes.length > 0 && (
        <div
          aria-hidden
          className="absolute transition-opacity duration-200"
          style={{ ...clipBox('chords'), opacity: audible.chords ? 1 : 0.35 }}
        >
          <motion.div
            key={paintKey}
            className="absolute inset-0 border"
            style={{
              background: CLIP.fill,
              borderColor: CLIP.border,
              borderRadius: CLIP.radius,
            }}
            initial={staticMode ? false : { clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: CLIP.paintMs / 1000, ease: 'linear' }}
          >
            <ClipNotes
              notes={song.chordNotes}
              colors={chordColors}
              width={loopW}
              height={rows.chords.h - 4}
              barW={barW}
              staticMode={staticMode}
            />
          </motion.div>
          {!staticMode && (
            <motion.span
              key={`head:${paintKey}`}
              className="absolute -inset-y-0.5 left-0 w-px"
              style={{ background: CLIP.writeHead }}
              initial={{ x: 0, opacity: 1 }}
              animate={{ x: loopW, opacity: 0 }}
              transition={{
                x: { duration: CLIP.paintMs / 1000, ease: 'linear' },
                opacity: { duration: 0.15, delay: CLIP.paintMs / 1000 },
              }}
            />
          )}
        </div>
      )}

      {/* Time ruler */}
      {layout.timeRuler && (
        <div
          aria-hidden
          className="absolute right-0 border-t"
          style={{
            left: x0,
            top: layout.timeRuler.top,
            height: layout.timeRuler.h,
            borderColor: STUDIO.border,
          }}
        >
          {Array.from({ length: BARS + 1 }, (_, bar) => (
            <span
              key={bar}
              className="absolute top-1 text-[9px] leading-none"
              style={{ left: bar * barW + 4, color: white(GRID.timeAlpha) }}
            >
              0:0{(bar * BAR) / (TICKS_PER_MS * 1000)}
            </span>
          ))}
        </div>
      )}

      <Playhead
        key={layout.w}
        layout={layout}
        position={position}
        bottom={bottom}
      />
    </>
  );
};
