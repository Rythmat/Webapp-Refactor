import { motion, useTransform, type MotionValue } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { MidiNoteEvent } from '@prism/engine';
import {
  CLIP,
  GRID,
  laneX,
  NEUTRAL_TRACK,
  noteAlpha,
  REGION,
  SHELL,
  type ShellLayout,
} from './shellTokens';
import type { TrackId } from './studioScript';
import { BAR, regionAt, type ChordRegion } from './studioSong';

const BARS = 4;
const mix = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/** One part Prism wrote: its notes, shown on its track's lane. */
export interface LanePart {
  track: TrackId;
  name: string;
  notes: readonly MidiNoteEvent[];
  /** Changes when Prism writes it: replays the paint-in. */
  paintKey: string;
}

/**
 * A clip's notes (`clipChrome.ts`): thin bars in the pitch range ±2, each in
 * its chord's color (the Studio's prism color mode), painting in left to
 * right behind the write-head.
 */
const ClipNotes = ({
  notes,
  colors,
  width,
  top,
  height,
  barW,
  noteH,
}: {
  notes: readonly MidiNoteEvent[];
  colors: readonly string[];
  width: number;
  top: number;
  height: number;
  barW: number;
  noteH: number;
}) => {
  const pitches = notes.map((n) => n.note);
  const lo = Math.min(...pitches) - 2;
  const hi = Math.max(...pitches) + 2;
  const room = height - noteH;
  return (
    <svg
      aria-hidden
      width={width}
      height={height}
      className="absolute left-0 overflow-visible"
      style={{ top }}
    >
      {notes.map((n, i) => (
        <rect
          key={i}
          x={(n.startTick * barW) / BAR + 1}
          y={((hi - n.note) / (hi - lo)) * room}
          width={Math.max(2, (n.durationTicks * barW) / BAR - 2)}
          height={noteH}
          rx={1}
          style={{
            fill: colors[i],
            opacity: noteAlpha(n.velocity),
            transition: 'fill 220ms linear',
          }}
        />
      ))}
    </svg>
  );
};

/** The playhead: a 1px line under a round head, white while playing. */
const Playhead = ({
  layout,
  position,
  playing,
  bottom,
}: {
  layout: ShellLayout;
  position: MotionValue<number>;
  playing: boolean;
  bottom: number;
}) => {
  const x = useTransform(position, (t) => laneX(layout, t));
  const top = layout.ruler.top + layout.ruler.h - 10;
  const color = playing ? '#ffffff' : SHELL.text3;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 z-10 w-px"
      style={{ x, top, height: bottom - top, background: color }}
    >
      <span
        className="absolute left-[-4px] top-[-4px] size-[9px] rounded-full"
        style={{ background: color }}
      />
    </motion.div>
  );
};

/**
 * The timeline (`Timeline.tsx`, drawn as DOM/SVG): the sections row, the bar
 * ruler, the chord lane with Prism-colored regions, the lanes grid, a glass
 * clip per part Prism wrote (a header band in the track color, notes in their
 * chords' colors) and the playhead, moved per frame from the transport's
 * MotionValue. Display only. Coordinates are the stage card's.
 */
export const StudioTimeline = ({
  layout,
  compact,
  staticMode,
  regions,
  parts,
  trackColor,
  keyLabel,
  position,
  playing,
  activeRegion,
}: {
  layout: ShellLayout;
  compact: boolean;
  staticMode: boolean;
  regions: readonly ChordRegion[];
  parts: readonly LanePart[];
  trackColor: string;
  /** The key on each clip's band ("D"), or null before Prism sets one. */
  keyLabel: string | null;
  position: MotionValue<number>;
  playing: boolean;
  activeRegion: number | null;
}) => {
  const { trackW: x0, barW, rows, font } = layout;
  const loopW = BARS * barW;
  const lanesW = layout.card.w - x0;
  const lanesBottom = layout.footer?.top ?? layout.card.h;
  const gridTop = rows.chords.top;
  const gridH = lanesBottom - gridTop;
  const bandH = compact ? 20 : 16;
  const noteColor = (tick: number) =>
    regionAt(regions, tick)?.color ?? trackColor;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Lanes ground */}
      <div
        aria-hidden
        className="absolute"
        style={{
          left: x0,
          top: gridTop,
          width: lanesW,
          height: gridH,
          background: SHELL.bg,
        }}
      />

      {/* Sections */}
      <div
        aria-hidden
        className="absolute flex items-center"
        style={{
          left: x0,
          top: layout.sections.top,
          width: lanesW,
          height: layout.sections.h,
        }}
      >
        {regions.length > 0 && (
          <motion.span
            key={parts[0]?.paintKey}
            className="flex h-[calc(100%-6px)] items-center rounded border px-2 font-bold"
            style={{
              width: loopW - 2,
              marginLeft: 1,
              fontSize: font.label,
              background: SHELL.chip,
              borderColor: SHELL.outline,
              color: SHELL.text,
            }}
            initial={staticMode ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Chorus
          </motion.span>
        )}
        <span
          className="ml-2 flex items-center gap-1 whitespace-nowrap"
          style={{ fontSize: font.label, color: SHELL.text3 }}
        >
          <Plus className={compact ? 'size-3.5' : 'size-3'} />
          Section
        </span>
      </div>

      {/* Bar ruler */}
      <div
        aria-hidden
        className="absolute border-y"
        style={{
          left: x0,
          top: layout.ruler.top,
          width: lanesW,
          height: layout.ruler.h,
          borderColor: SHELL.hairline,
        }}
      >
        {Array.from({ length: BARS + 1 }, (_, bar) => (
          <span
            key={bar}
            className="absolute bottom-0 border-l pl-1 leading-none"
            style={{
              left: bar * barW,
              height: '55%',
              fontSize: font.micro,
              color: SHELL.text2,
              borderColor: SHELL.outline,
            }}
          >
            {bar + 1}
          </span>
        ))}
      </div>

      {/* Chord lane */}
      <div
        className="absolute border-b"
        style={{
          left: x0,
          top: layout.chordLane.top,
          width: lanesW,
          height: layout.chordLane.h,
          borderColor: SHELL.hairline,
        }}
      >
        {regions.map((r, i) => {
          const active = activeRegion === i;
          return (
            <motion.span
              key={`${parts[0]?.paintKey}:${i}`}
              className="absolute inset-y-0 flex items-center overflow-hidden whitespace-nowrap pl-1.5 transition-[background-color,box-shadow] duration-200"
              initial={staticMode ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.28, ease: 'easeOut' }}
              style={{
                left: (r.startTick * barW) / BAR,
                width: ((r.endTick - r.startTick) * barW) / BAR,
                fontSize: font.label,
                background: mix(r.color, active ? REGION.active : REGION.fill),
                boxShadow: active
                  ? `inset 0 0 0 ${REGION.outline}px ${r.color}`
                  : `inset -1px 0 0 ${mix(r.color, 45)}`,
                color: active ? '#f8fafc' : mix(r.color, 90),
              }}
            >
              {r.label}
            </motion.span>
          );
        })}
      </div>

      {/* Lanes grid */}
      <svg
        aria-hidden
        width={lanesW}
        height={gridH}
        className="absolute"
        style={{ left: x0, top: gridTop }}
      >
        {Array.from({ length: Math.ceil((lanesW / barW) * 4) }, (_, b) => (
          <line
            key={b}
            x1={(b * barW) / 4 + 0.5}
            x2={(b * barW) / 4 + 0.5}
            y2={gridH}
            stroke={b % 4 === 0 ? GRID.bar : GRID.beat}
          />
        ))}
        {(['chords', 'bass', 'drums'] as const).map((id) => (
          <line
            key={id}
            x2={lanesW}
            y1={rows[id].top + rows[id].h - gridTop - 0.5}
            y2={rows[id].top + rows[id].h - gridTop - 0.5}
            stroke={GRID.bar}
          />
        ))}
      </svg>

      {/* Clips */}
      {parts.map((part) => {
        const row = rows[part.track];
        const h = row.h - 4;
        return (
          <div
            key={part.track}
            aria-hidden
            className="absolute"
            style={{
              left: x0 + 1,
              top: row.top + 2,
              width: loopW - 2,
              height: h,
            }}
          >
            <motion.div
              key={part.paintKey}
              className="absolute inset-0 overflow-hidden border"
              style={{
                background: CLIP.fill,
                borderColor: CLIP.border,
                borderRadius: CLIP.radius,
              }}
              initial={staticMode ? false : { clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: CLIP.paintMs / 1000, ease: 'linear' }}
            >
              <span
                className="flex items-center gap-1 truncate px-1.5"
                style={{
                  height: bandH,
                  fontSize: font.micro,
                  color: SHELL.text,
                  background: mix(trackColor, CLIP.bandPct),
                }}
              >
                {part.name}
                {keyLabel && (
                  <b className="font-bold" style={{ color: SHELL.text2 }}>
                    · {keyLabel}
                  </b>
                )}
              </span>
              <ClipNotes
                notes={part.notes}
                colors={part.notes.map((n) =>
                  regions.length > 0 ? noteColor(n.startTick) : NEUTRAL_TRACK,
                )}
                width={loopW - 2}
                top={bandH + 4}
                height={h - bandH - 10}
                barW={barW}
                noteH={compact ? 4 : 3}
              />
            </motion.div>
            {!staticMode && (
              <motion.span
                key={`head:${part.paintKey}`}
                className="absolute -inset-y-0.5 left-0 w-px"
                style={{ background: CLIP.writeHead }}
                initial={{ x: 0, opacity: 1 }}
                animate={{ x: loopW - 2, opacity: 0 }}
                transition={{
                  x: { duration: CLIP.paintMs / 1000, ease: 'linear' },
                  opacity: { duration: 0.15, delay: CLIP.paintMs / 1000 },
                }}
              />
            )}
          </div>
        );
      })}

      {/* Footer: zoom */}
      {layout.footer && (
        <div
          aria-hidden
          className="absolute flex items-center justify-end gap-3 border-t px-3"
          style={{
            left: x0,
            top: layout.footer.top,
            width: lanesW,
            height: layout.footer.h,
            borderColor: SHELL.hairline,
            fontSize: font.label,
            color: SHELL.text3,
          }}
        >
          <span className="mr-auto h-1.5 w-40 rounded-full bg-white/[0.06]">
            <span className="block h-full w-3/4 rounded-full bg-white/[0.12]" />
          </span>
          <span>−</span>
          <span style={{ color: SHELL.text2 }}>100%</span>
          <span>+</span>
          <span>Fit</span>
          <span>Follow</span>
        </div>
      )}

      <Playhead
        key={layout.w}
        layout={layout}
        position={position}
        playing={playing}
        bottom={lanesBottom}
      />
    </div>
  );
};
