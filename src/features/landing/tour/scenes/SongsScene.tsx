import { motion, useMotionValueEvent } from 'framer-motion';
import { Gauge, Pause, Play, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import { creep } from '@/curriculum/data/songs/creep';
import { stand_by_me } from '@/curriculum/data/songs/stand_by_me';
import { sweet_home_alabama } from '@/curriculum/data/songs/sweet_home_alabama';
import type { Song } from '@/curriculum/types/songLibrary';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import {
  songDemoChart,
  songKeyColor,
  type SongChartHit,
  type SongChartSection,
} from '../../music';
import { DemoKeys } from '../DemoKeys';
import type { SceneProps } from './sceneTypes';

/**
 * Three real songs from the library (bundled files, no content fetch), each
 * with a different color story: Creep borrows two chords from outside G
 * major, Stand By Me never leaves A, Sweet Home Alabama's ♭VII takes G's
 * color.
 */
const SONGS: Song[] = [creep, stand_by_me, sweet_home_alabama];

/** Faint five-line staff behind each bar's beat slashes. */
const STAFF = {
  backgroundImage:
    'repeating-linear-gradient(to bottom, rgba(255,255,255,0.13) 0 1px, transparent 1px 5px)',
};

interface Chart {
  sections: SongChartSection[];
  /** Every bar in play order (its chords; empty = rest). */
  bars: SongChartHit[][];
  beatsPerBar: number;
  totalBeats: number;
  /** Chords by the beat they start on. */
  startsAt: Map<number, SongChartHit>;
  /** Start beat of the first bar of each distinct chord, in order. */
  firstOfEach: number[];
}

const buildChart = (song: Song): Chart => {
  const sections = songDemoChart(song);
  const bars = sections.flatMap((s) => s.bars);
  const beatsPerBar = song.timeSignature[0];
  const startsAt = new Map<number, SongChartHit>();
  const seen = new Set<string>();
  const firstOfEach: number[] = [];
  bars.forEach((hits, b) =>
    hits.forEach((h) => {
      const beat = b * beatsPerBar + Math.round(h.beat - 1);
      startsAt.set(beat, h);
      if (!seen.has(h.name)) {
        seen.add(h.name);
        firstOfEach.push(beat);
      }
    }),
  );
  return {
    sections,
    bars,
    beatsPerBar,
    totalBeats: bars.length * beatsPerBar,
    startsAt,
    firstOfEach,
  };
};

/** The chord sounding at a beat (null on a rest). */
const chordAt = (chart: Chart, pos: number): SongChartHit | null => {
  const hits = chart.bars[Math.floor(pos / chart.beatsPerBar)] ?? [];
  const beat = (pos % chart.beatsPerBar) + 1;
  let sounding: SongChartHit | null = null;
  for (const h of hits) if (h.beat <= beat) sounding = h;
  return sounding;
};

/**
 * Songs scene — a stylized Song page: the library rail, a song header, and
 * its chord chart where every chord carries its Prism color (in the key →
 * the key's color; borrowed → the color of the key it comes from). Press play
 * and the chart runs at the song's tempo, lighting each chord on the keys.
 */
export const SongsScene = ({
  stepIndex,
  mode,
  visible,
  compact,
  onUserAction,
  playNotes,
  stepProgress,
  audio,
}: SceneProps) => {
  const auto = mode === 'auto';
  const [userSong, setUserSong] = useState<number | null>(null);
  const [userPos, setUserPos] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [autoPos, setAutoPos] = useState<number | null>(null);

  const songIdx = auto ? 0 : (userSong ?? 0);
  const song = SONGS[songIdx];
  const chart = useMemo(() => buildChart(song), [song]);
  const keyColor = songKeyColor(song);

  // Auto script, from the step's progress: step 2 highlights each distinct
  // chord in turn; step 3 runs the playhead through the song (silent).
  useMotionValueEvent(stepProgress, 'change', (p) => {
    if (!auto) return;
    if (stepIndex === 1) {
      const k = Math.min(
        chart.firstOfEach.length - 1,
        Math.floor(p * (chart.firstOfEach.length + 0.5)),
      );
      setAutoPos(chart.firstOfEach[k]);
    } else if (stepIndex === 2) {
      setAutoPos(
        Math.min(chart.totalBeats - 1, Math.floor(p * chart.totalBeats)),
      );
    } else {
      setAutoPos(null);
    }
  });

  // A new auto run discards the visitor's song and stops playback.
  useEffect(() => {
    if (!auto) return;
    setUserSong(null);
    setUserPos(null);
    setPlaying(false);
  }, [auto]);
  useEffect(() => {
    if (!visible) setPlaying(false);
  }, [visible]);

  // Beat clock for the visitor's playback, at the song's real tempo. The
  // latest callbacks live in a ref so a re-render never restarts the clock.
  const latest = useRef({ audio, onUserAction });
  useEffect(() => {
    latest.current = { audio, onUserAction };
  });
  const startRef = useRef(0);
  useEffect(() => {
    if (!playing) return;
    const beatSec = 60 / song.tempo;
    let pos = startRef.current;
    const id = window.setInterval(() => {
      pos = (pos + 1) % chart.totalBeats;
      setUserPos(pos);
      const hit = chart.startsAt.get(pos);
      if (!hit) return;
      // Sound-gated: stays silent if the visitor muted mid-song.
      latest.current.audio.notes(hit.midis, hit.duration * beatSec * 0.95);
      // Keep the tour from resuming its autoplay mid-song.
      latest.current.onUserAction();
    }, beatSec * 1000);
    return () => window.clearInterval(id);
  }, [playing, song.tempo, chart]);

  const beatSec = 60 / song.tempo;
  const togglePlay = () => {
    onUserAction();
    if (playing) {
      setPlaying(false);
      audio.stopAll();
      return;
    }
    // From the chord the visitor picked, else the top.
    const start = userPos ?? 0;
    startRef.current = start;
    setUserPos(start);
    const first = chordAt(chart, start);
    if (first) playNotes(first.midis, first.duration * beatSec * 0.95);
    setPlaying(true);
  };

  const pickSong = (i: number) => {
    onUserAction();
    setPlaying(false);
    audio.stopAll();
    setUserSong(i);
    setUserPos(0);
  };

  const pickChord = (bar: number, hit: SongChartHit) => {
    onUserAction();
    const pos = bar * chart.beatsPerBar + Math.round(hit.beat - 1);
    startRef.current = pos;
    setUserPos(pos);
    if (playing) setPlaying(false);
    playNotes(hit.midis, 0.9);
  };

  const pressKey = (midi: number) => {
    onUserAction();
    playNotes([midi], 0.5);
  };

  const pos = auto ? (stepIndex >= 1 ? autoPos : null) : (userPos ?? 0);
  const active = pos === null ? null : chordAt(chart, pos);
  const activeBar = pos === null ? -1 : Math.floor(pos / chart.beatsPerBar);
  const showColors = !auto || stepIndex >= 1;
  const running = (auto && stepIndex === 2) || playing;
  const lit = useMemo(
    () => new Map(active ? active.midis.map((m) => [m, active.color]) : []),
    [active],
  );

  let barIndex = 0;

  return (
    <div
      className={cn(
        'grid h-full gap-3 p-4 text-white',
        compact ? 'grid-cols-1 grid-rows-[auto_1fr]' : 'grid-cols-[210px_1fr]',
      )}
    >
      {/* Library rail */}
      <div
        className={cn(
          'flex gap-2',
          compact
            ? 'flex-row'
            : 'flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] p-3',
        )}
      >
        {!compact && (
          <div className="mb-1 flex items-center gap-2 rounded-lg bg-black/30 px-2.5 py-2 text-xs text-white/35">
            <Search className="size-3.5" />
            Search 650+ songs
          </div>
        )}
        {SONGS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            data-tour-target={i === 0 ? 'songs' : undefined}
            aria-pressed={i === songIdx}
            onClick={() => pickSong(i)}
            className={cn(
              'flex min-w-0 items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors',
              compact && 'flex-1',
              i === songIdx ? 'bg-white/10' : 'hover:bg-white/[0.05]',
            )}
          >
            <img
              src={s.artistImageRef}
              alt=""
              draggable={false}
              className="size-9 shrink-0 rounded-md object-cover"
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold">{s.title}</span>
              <span className="flex items-center gap-1.5 truncate text-[11px] text-white/45">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: songKeyColor(s) }}
                />
                {displayAccidentals(s.key)}
              </span>
            </span>
          </button>
        ))}
        {!compact && (
          <span className="mt-auto px-1.5 text-[11px] text-white/35">
            650+ songs across 14 genres
          </span>
        )}
      </div>

      {/* Song page */}
      <div className="flex min-h-0 min-w-0 flex-col gap-3">
        <div className="flex items-center gap-3">
          <img
            src={song.artistImageRef}
            alt=""
            draggable={false}
            className="size-14 shrink-0 rounded-xl object-cover"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-lg font-semibold leading-tight">
              “{song.title}”
            </span>
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-white/50">
              <span>
                {song.artist}
                {song.year ? ` · ${song.year}` : ''}
              </span>
              <span className="flex items-center gap-1.5 text-white/85">
                <span
                  className="size-2 rounded-full"
                  style={{ background: keyColor }}
                />
                Key of {displayAccidentals(song.key)}
              </span>
              <span className="flex items-center gap-1">
                <Gauge className="size-3.5" />
                {song.tempo} BPM
              </span>
              <span>
                {song.timeSignature[0]}/{song.timeSignature[1]}
              </span>
            </span>
          </div>
          <button
            type="button"
            data-tour-target="play"
            onClick={togglePlay}
            aria-label={playing ? 'Stop' : 'Play'}
            className="ml-auto grid size-10 shrink-0 place-items-center rounded-full bg-white text-black transition-transform duration-300 hover:scale-105"
          >
            {playing ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="ml-0.5 size-4 fill-current" />
            )}
          </button>
        </div>

        {/* Chord chart */}
        <div
          data-tour-target="chart"
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
        >
          {chart.sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              <span className="w-fit rounded-sm border border-white/25 px-1.5 font-serif text-[11px] font-bold text-white/60">
                {section.label}
              </span>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(section.perRow, compact ? 4 : 5)}, minmax(0, 1fr))`,
                }}
              >
                {section.bars.map((hits) => {
                  const b = barIndex++;
                  const isActive = b === activeBar;
                  return (
                    <div
                      key={b}
                      className={cn(
                        'relative flex h-[76px] flex-col justify-end border-l border-white/25 px-2 pb-2 transition-colors duration-200',
                        isActive && 'bg-white/[0.06]',
                      )}
                    >
                      <div className="relative h-9">
                        {hits.map((h, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => pickChord(b, h)}
                            className="absolute bottom-0 flex flex-col items-start text-left"
                            style={{
                              left: `${((h.beat - 1) / chart.beatsPerBar) * 100}%`,
                            }}
                          >
                            <span
                              className="font-serif text-[15px] font-bold leading-none transition-colors duration-200"
                              style={{
                                color:
                                  isActive && active === h && showColors
                                    ? h.color
                                    : undefined,
                              }}
                            >
                              {displayAccidentals(h.name)}
                            </span>
                            <span className="mt-0.5 text-[10px] font-semibold text-white/40">
                              {displayAccidentals(h.degree)}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="relative mt-1 h-[21px]" style={STAFF}>
                        {Array.from(
                          { length: chart.beatsPerBar },
                          (_, beat) => (
                            <span
                              key={beat}
                              className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rotate-[30deg] bg-white/30"
                              style={{
                                left: `${((beat + 0.5) / chart.beatsPerBar) * 100}%`,
                              }}
                            />
                          ),
                        )}
                        {isActive && running && pos !== null && (
                          <span
                            className="absolute -inset-y-1 w-0.5 rounded-full bg-white shadow-[0_0_10px_white]"
                            style={{
                              left: `${(((pos % chart.beatsPerBar) + 0.5) / chart.beatsPerBar) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                      {/* Each chord's Prism color, across its beats */}
                      <div className="relative mt-1.5 h-1">
                        {hits.map((h, i) => (
                          <motion.span
                            key={i}
                            className="absolute inset-y-0 origin-left rounded-full"
                            style={{
                              left: `${((h.beat - 1) / chart.beatsPerBar) * 100}%`,
                              width: `calc(${(h.duration / chart.beatsPerBar) * 100}% - 6px)`,
                              background: h.color,
                            }}
                            initial={false}
                            animate={{ scaleX: showColors ? 1 : 0 }}
                            transition={{
                              duration: 0.4,
                              delay: showColors && auto ? b * 0.07 : 0,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Current chord + keys */}
        <div className={cn('flex gap-3', compact ? 'h-28' : 'h-[180px]')}>
          <div className="flex w-40 shrink-0 flex-col justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3">
            {active && showColors ? (
              <>
                <span className="flex items-baseline gap-2">
                  <span className="font-serif text-xl font-bold">
                    {displayAccidentals(active.name)}
                  </span>
                  <span className="text-[11px] font-semibold text-white/45">
                    {displayAccidentals(active.degree)}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-white/70">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: active.color }}
                  />
                  {active.inKey ? 'In the key' : 'Outside the key'}
                </span>
                <span className="text-[11px] leading-snug text-white/40">
                  {active.inKey
                    ? `Shares ${displayAccidentals(song.key)}’s color.`
                    : 'Borrowed — so it has its own color.'}
                </span>
              </>
            ) : (
              <span className="text-xs text-white/45">
                {pos !== null && !active ? 'Rest' : 'Press play to hear it.'}
              </span>
            )}
          </div>
          <div data-tour-target="keys" className="min-w-0 flex-1">
            <DemoKeys
              startMidi={48}
              octaves={2}
              lit={lit}
              onPress={pressKey}
              label="Songs keyboard"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
