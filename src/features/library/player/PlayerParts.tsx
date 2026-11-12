import { X } from 'lucide-react';
import { type KeyboardEvent, type PointerEvent, useMemo, useRef } from 'react';
import {
  PiArrowCounterClockwiseBold,
  PiPauseFill,
  PiPlayFill,
  PiQueueFill,
  PiRepeatFill,
  PiRepeatOnceFill,
  PiSkipBackFill,
  PiSkipForwardFill,
  PiSpeakerHighFill,
  PiSpeakerXFill,
} from 'react-icons/pi';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';
import { studioHrefOf, type PlayItem } from '../libraryTypes';
import {
  currentItem,
  playerActions,
  playerActive,
  usePlayer,
} from './libraryPlayer';

// ── The player's parts, in the one bar at the page's foot ──────────────────
// Samply's player (owner, 2026-11-11, audited on samply.app): the cover and
// the names on the left; restart, back, play, next and repeat, the time and
// the waveform in the middle; the queue and the volume on the right. At the
// Recent activity bar's sizes (ActivityPlayBar), in rem.

const BAR_BUTTON = cn(
  'grid size-[1.818rem] shrink-0 place-items-center rounded-full text-white/60 hover:text-white disabled:pointer-events-none disabled:opacity-30',
  TRANSITION,
  FOCUS_RING,
);
const BAR_ICON = 'size-[0.909rem]';

/** "3:07". */
export function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** A project's cover: its generated tile, as Home and the Studio draw it. */
export function ProjectCover({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const src = useMemo(
    () =>
      `data:image/svg+xml;utf8,${encodeURIComponent(generateStudioTileSvg(seed))}`,
    [seed],
  );
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={cn('size-full object-cover', className)}
    />
  );
}

/** What's playing: its cover, its project over its name; it opens in the
 *  Studio. */
export function PlayerNowPlaying() {
  const item = usePlayer(currentItem);
  if (!item) return null;
  return (
    <Link
      to={studioHrefOf(item.source)}
      className="group flex min-w-0 items-center gap-[0.675rem] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      <span className="relative size-[2.475rem] shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-white/[0.08]">
        <ProjectCover seed={item.artSeed} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.675rem] uppercase tracking-[0.06em] text-white/50">
          {item.context}
        </span>
        <span className="block truncate text-[0.788rem] text-white group-hover:underline">
          {item.title}
        </span>
      </span>
    </Link>
  );
}

/**
 * Restart, back, play, next and repeat. With nothing in the player, Play
 * plays `fallback` (the Recent activity showing, when it is a project) and
 * the rest wait.
 */
export function PlayerTransport({ fallback }: { fallback?: PlayItem | null }) {
  const active = usePlayer(playerActive);
  const status = usePlayer((s) => s.status);
  const repeat = usePlayer((s) => s.repeat);
  const hasNext = usePlayer(
    (s) =>
      s.index + 1 < s.queue.length ||
      (s.repeat === 'all' && s.queue.length > 1),
  );
  const progress = usePlayer((s) => s.progress);
  const playing = status === 'playing';
  const busy = status === 'preparing';

  const onPlay = () => {
    if (active) playerActions.toggle();
    else if (fallback) playerActions.playItem(fallback);
  };
  const playLabel = busy
    ? 'Stop preparing'
    : playing
      ? 'Pause'
      : active
        ? 'Play'
        : `Play ${fallback?.title ?? ''}`.trim();

  return (
    <div className="flex shrink-0 items-center gap-[0.227rem]">
      <button
        type="button"
        aria-label="Play from the start"
        title="Play from the start"
        disabled={!active || busy}
        onClick={() => playerActions.restart()}
        className={cn(BAR_BUTTON, 'hidden sm:grid')}
      >
        <PiArrowCounterClockwiseBold aria-hidden className={BAR_ICON} />
      </button>
      <button
        type="button"
        aria-label="Previous"
        title="Previous"
        disabled={!active}
        onClick={() => playerActions.previous()}
        className={BAR_BUTTON}
      >
        <PiSkipBackFill aria-hidden className={BAR_ICON} />
      </button>
      <button
        type="button"
        aria-label={playLabel}
        title={playLabel}
        onClick={onPlay}
        disabled={!active && !fallback}
        className={cn(
          'relative grid size-[2.045rem] shrink-0 place-items-center rounded-full bg-white text-black hover:scale-[1.04] disabled:opacity-30',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        {busy ? (
          <PreparingRing fraction={progress} />
        ) : playing ? (
          <PiPauseFill aria-hidden className={BAR_ICON} />
        ) : (
          <PiPlayFill aria-hidden className={cn(BAR_ICON, 'translate-x-px')} />
        )}
      </button>
      <button
        type="button"
        aria-label="Next"
        title="Next"
        disabled={!active || !hasNext}
        onClick={() => playerActions.next()}
        className={BAR_BUTTON}
      >
        <PiSkipForwardFill aria-hidden className={BAR_ICON} />
      </button>
      <button
        type="button"
        aria-label={`Repeat: ${repeat === 'off' ? 'off' : repeat === 'all' ? 'all' : 'this one'}`}
        title="Repeat"
        aria-pressed={repeat !== 'off'}
        disabled={!active}
        onClick={() => playerActions.cycleRepeat()}
        className={cn(
          BAR_BUTTON,
          'hidden sm:grid',
          repeat !== 'off' && 'text-white',
        )}
      >
        {repeat === 'one' ? (
          <PiRepeatOnceFill aria-hidden className={BAR_ICON} />
        ) : (
          <PiRepeatFill aria-hidden className={BAR_ICON} />
        )}
      </button>
    </div>
  );
}

/** A render's progress, round the Play button's edge; spinning when the
 *  browser can't say how far it is. */
export function PreparingRing({
  fraction,
  className,
}: {
  fraction: number | null;
  className?: string;
}) {
  const r = 9;
  const length = 2 * Math.PI * r;
  const known = fraction !== null;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        'size-[1.25rem]',
        !known && 'animate-spin motion-reduce:animate-none',
        className,
      )}
    >
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="3"
      />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={
          length * (1 - (known ? Math.max(0.04, fraction) : 0.3))
        }
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

/** The waveform: what's played lit, a click or a drag to move, the arrow
 *  keys a few seconds at a time. While rendering, how far it is. */
export function PlayerScrubber({ className }: { className?: string }) {
  const peaks = usePlayer((s) => s.peaks);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const status = usePlayer((s) => s.status);
  const progress = usePlayer((s) => s.progress);
  const error = usePlayer((s) => s.error);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const bars = useMemo(() => thin(peaks ?? [], 160), [peaks]);
  const at = duration > 0 ? Math.min(1, position / duration) : 0;

  const seekTo = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || duration <= 0) return;
    const f = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    playerActions.seek(f * duration);
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) seekTo(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 15 : 5;
    if (e.key === 'ArrowRight') playerActions.seek(position + step);
    else if (e.key === 'ArrowLeft') playerActions.seek(position - step);
    else if (e.key === 'Home') playerActions.seek(0);
    else return;
    e.preventDefault();
  };

  let middle;
  if (status === 'preparing') {
    middle = (
      <span className="truncate text-[0.682rem] text-white/50">
        {progress === null
          ? 'Getting your project ready…'
          : `Making the audio… ${Math.round(progress * 100)}%`}
      </span>
    );
  } else if (status === 'error') {
    middle = (
      <span role="alert" className="truncate text-[0.682rem] text-white/60">
        {error}
      </span>
    );
  } else {
    middle = (
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${clock(position)} of ${clock(duration)}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          'relative flex h-[1.591rem] min-w-0 flex-1 cursor-pointer touch-none items-center gap-px rounded-sm',
          FOCUS_RING,
        )}
      >
        {bars.length ? (
          bars.map((peak, n) => (
            <span
              key={n}
              className={cn(
                'min-w-0 flex-1 rounded-full',
                (n + 0.5) / bars.length <= at ? 'bg-white' : 'bg-white/25',
              )}
              style={{ height: `${Math.max(8, peak * 100)}%` }}
            />
          ))
        ) : (
          <span className="h-px w-full bg-white/25" />
        )}
        {/* The playhead. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-[2px] rounded-full bg-white"
          style={{ left: `calc(${at * 100}% - 1px)` }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-center gap-[0.682rem]',
        className,
      )}
    >
      <span className="w-[2.2rem] shrink-0 text-right text-[0.682rem] tabular-nums text-white/50">
        {clock(position)}
      </span>
      <div className="flex min-w-0 flex-1 items-center">{middle}</div>
      <span className="w-[2.2rem] shrink-0 text-[0.682rem] tabular-nums text-white/50">
        {clock(duration)}
      </span>
    </div>
  );
}

/** `peaks` thinned to at most `count` bars, each its span's loudest. */
function thin(peaks: readonly number[], count: number): number[] {
  if (peaks.length <= count) return [...peaks];
  const out: number[] = [];
  const step = peaks.length / count;
  for (let n = 0; n < count; n++) {
    let max = 0;
    for (let i = Math.floor(n * step); i < Math.floor((n + 1) * step); i++) {
      max = Math.max(max, peaks[i] ?? 0);
    }
    out.push(max);
  }
  return out;
}

/** The queue, the volume, and a way to put the player away (the bar
 *  goes back to Recent activity). */
export function PlayerExtras() {
  const queueOpen = usePlayer((s) => s.queueOpen);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const silent = muted || volume === 0;
  return (
    <div className="flex shrink-0 items-center gap-[0.227rem]">
      <button
        type="button"
        aria-label={queueOpen ? 'Hide the queue' : 'Show the queue'}
        title="Queue"
        aria-pressed={queueOpen}
        onClick={() => playerActions.setQueueOpen(!queueOpen)}
        className={cn(BAR_BUTTON, queueOpen && 'text-white')}
      >
        <PiQueueFill aria-hidden className={BAR_ICON} />
      </button>
      <div className="group/volume hidden items-center md:flex">
        <button
          type="button"
          aria-label={silent ? 'Unmute' : 'Mute'}
          title={silent ? 'Unmute' : 'Mute'}
          onClick={() => playerActions.toggleMute()}
          className={BAR_BUTTON}
        >
          {silent ? (
            <PiSpeakerXFill aria-hidden className={BAR_ICON} />
          ) : (
            <PiSpeakerHighFill aria-hidden className={BAR_ICON} />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          aria-label="Volume"
          onChange={(e) => playerActions.setVolume(Number(e.target.value))}
          className="h-1 w-[4.5rem] cursor-pointer accent-white"
        />
      </div>
      <button
        type="button"
        aria-label="Close the player"
        title="Close the player"
        onClick={() => playerActions.stop()}
        className={BAR_BUTTON}
      >
        <X aria-hidden className={BAR_ICON} />
      </button>
    </div>
  );
}
