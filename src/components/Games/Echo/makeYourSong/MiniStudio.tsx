// ── The mini-Studio's tracks ───────────────────────────────────────────────
// The song's tracks laid out as the Studio lays them out: a row each, its
// name on the left, its clips on a timeline of the song's eight bars. The
// student's Chords and Melody on top (each a button: the track a Record
// records), the band's tracks under them. A playhead follows what's heard.
// Stage B's neutral look: dark rows, white/10 for the picked one, color
// only for meaning (the chords' own colors, the key's).

import { Music2, Piano } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/components/utilities';
import { inkOn } from '@/curriculum/musicLiteracy/KeyRing';
import type { SongTrack } from './songFlow';
import type { RowClip, StudioRow } from './songTracks';

export interface MiniStudioProps {
  rows: readonly StudioRow[];
  selected: SongTrack;
  onSelect: (track: SongTrack) => void;
  /** Tracks can be picked (nothing is recording). */
  selectable: boolean;
  bars: number;
  barTicks: number;
  phraseBars: number;
  repeats: number;
  /** The playhead runs. */
  playing: boolean;
  /** The song tick heard now. */
  heardTick: () => number | null;
  /** The phrase a take is recording into, lit. */
  recording: SongTrack | null;
  /** The band's chart, for the page: "1-6-1-6-…". */
  bandChart?: string;
}

/** The track names' column. */
const HEAD = 136;

export function MiniStudio({
  rows,
  selected,
  onSelect,
  selectable,
  bars,
  barTicks,
  phraseBars,
  repeats,
  playing,
  heardTick,
  recording,
  bandChart,
}: MiniStudioProps) {
  const length = bars * barTicks;
  const playhead = useRef<HTMLDivElement>(null);

  // The playhead, drawn every frame from the clock while anything plays.
  useEffect(() => {
    const line = playhead.current;
    if (!line) return;
    if (!playing) {
      line.style.opacity = '0';
      return;
    }
    let frame = 0;
    const draw = () => {
      const tick = heardTick();
      if (tick === null || tick < 0 || tick > length) {
        line.style.opacity = '0';
      } else {
        line.style.opacity = '1';
        line.style.left = `calc(${HEAD}px + (100% - ${HEAD}px) * ${tick / length})`;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [playing, heardTick, length]);

  const pct = (tick: number) => `${(tick / length) * 100}%`;
  const phrase = phraseBars * barTicks;

  return (
    <section
      aria-label="Your song's tracks"
      data-echo-mini-studio
      data-band-chart={bandChart}
      className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#151518]"
    >
      {/* The ruler: bar numbers, each phrase of the song shaded by turns. */}
      <div className="flex h-7 border-b border-white/[0.08]">
        <div
          className="flex shrink-0 items-center px-3 text-xs text-white/55"
          style={{ width: HEAD }}
        >
          {phraseBars} {phraseBars === 1 ? 'bar' : 'bars'} × {repeats}
        </div>
        <div className="relative flex-1" data-echo-ruler>
          {Array.from({ length: repeats }, (_, r) => (
            <div
              key={r}
              aria-hidden
              className={cn(
                'absolute inset-y-0',
                r % 2 ? 'bg-white/[0.03]' : 'bg-transparent',
              )}
              style={{ left: pct(r * phrase), width: pct(phrase) }}
            />
          ))}
          {Array.from({ length: bars }, (_, bar) => (
            <span
              key={bar}
              data-echo-bar={bar + 1}
              className="absolute top-1 pl-1.5 text-xs tabular-nums text-white/70"
              style={{ left: pct(bar * barTicks) }}
            >
              {bar + 1}
            </span>
          ))}
        </div>
      </div>

      <ul className="relative">
        {rows.map((row) => {
          const own = row.track !== null;
          const picked = own && row.track === selected;
          const head = (
            <>
              <span className="flex items-center gap-1.5 text-[13px] font-medium leading-[18px] text-[#e8e8f0]">
                {row.track === 'melody' ? (
                  <Music2 aria-hidden className="size-3.5" />
                ) : row.track === 'chords' ? (
                  <Piano aria-hidden className="size-3.5" />
                ) : null}
                {row.name}
              </span>
              <span
                className={cn(
                  'text-xs leading-4 text-white/55',
                  !own && '[@media(max-height:760px)]:hidden',
                )}
              >
                {own && row.clips.length === 0 ? 'No take yet' : row.role}
              </span>
            </>
          );
          return (
            <li
              key={row.id}
              data-echo-track={row.id}
              data-has-take={own ? row.clips.length > 0 : undefined}
              data-selected={picked || undefined}
              className={cn(
                'flex border-b border-white/[0.06] last:border-b-0',
                // Shorter on a short window (a laptop under the Arcade's
                // header), so a take's review fits below the tracks.
                own
                  ? 'h-[52px] [@media(max-height:760px)]:h-11'
                  : 'h-9 [@media(max-height:760px)]:h-7',
                picked && 'bg-white/10',
              )}
            >
              {own ? (
                <button
                  type="button"
                  aria-pressed={picked}
                  disabled={!selectable}
                  onClick={() => onSelect(row.track!)}
                  className={cn(
                    'relative flex shrink-0 flex-col justify-center gap-0.5 px-3 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60 disabled:cursor-default disabled:hover:bg-transparent',
                    picked &&
                      'before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-white',
                  )}
                  style={{ width: HEAD }}
                >
                  {head}
                </button>
              ) : (
                <div
                  className="flex shrink-0 flex-col justify-center px-3"
                  style={{ width: HEAD }}
                >
                  {head}
                </div>
              )}
              <div className="relative min-w-0 flex-1">
                {Array.from({ length: bars - 1 }, (_, bar) => (
                  <div
                    key={bar}
                    aria-hidden
                    className="absolute inset-y-0 w-px bg-white/[0.06]"
                    style={{ left: pct((bar + 1) * barTicks) }}
                  />
                ))}
                {recording === row.track && own && (
                  <div
                    aria-hidden
                    data-echo-recording
                    className="absolute inset-y-1 rounded-md border border-[#ef4444]/70 bg-[#ef4444]/10"
                    style={{ left: 0, width: pct(phrase) }}
                  />
                )}
                {row.clips.map((clip, i) => (
                  <Clip
                    key={i}
                    clip={clip}
                    color={row.color}
                    left={pct(clip.start)}
                    width={pct(clip.length)}
                    band={!own}
                  />
                ))}
                {own && row.clips.length === 0 && recording !== row.track && (
                  <span className="absolute inset-y-0 left-3 flex items-center text-xs text-white/45">
                    {row.track === 'chords'
                      ? 'Record your chords here'
                      : 'Record your melody here'}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div
        ref={playhead}
        aria-hidden
        data-echo-playhead
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-white opacity-0"
        style={{ left: HEAD }}
      />
    </section>
  );
}

/** One clip: the chords as labeled blocks, or the notes drawn small. */
function Clip({
  clip,
  color,
  left,
  width,
  band,
}: {
  clip: RowClip;
  color: string;
  left: string;
  width: string;
  band: boolean;
}) {
  const notes = clip.notes ?? [];
  const midis = notes.map((n) => n.midi);
  const low = Math.min(...midis);
  const high = Math.max(...midis);
  const span = Math.max(1, high - low + 1);
  return (
    <div
      data-echo-clip
      className="absolute inset-y-1 overflow-hidden rounded-md border border-white/[0.08]"
      style={{
        left,
        width,
        backgroundColor: band ? 'rgba(255,255,255,0.04)' : `${color}26`,
      }}
    >
      {clip.chords?.map((chord, i) => (
        <div
          key={i}
          data-echo-chord-block={chord.label}
          className="absolute inset-y-0.5 flex items-center overflow-hidden rounded-[5px] px-1.5 text-xs font-semibold"
          style={{
            left: `${(chord.tick / clip.length) * 100}%`,
            width: `calc(${(chord.duration / clip.length) * 100}% - 2px)`,
            backgroundColor: chord.color,
            color: inkOn(chord.color),
          }}
        >
          <span className="truncate">{chord.label}</span>
        </div>
      ))}
      {notes.length > 0 && (
        <svg
          aria-hidden
          className="absolute inset-0 size-full"
          viewBox={`0 0 ${clip.length} 100`}
          preserveAspectRatio="none"
        >
          {notes.map((n, i) => (
            <rect
              key={i}
              x={n.tick}
              width={Math.max(band ? 30 : 60, n.duration)}
              y={6 + ((high - n.midi) / span) * 82}
              height={Math.max(6, 82 / span)}
              rx={8}
              fill={band ? 'rgba(255,255,255,0.45)' : color}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
