import { ChevronDown, Pause, Play, Youtube } from 'lucide-react';
import { useEffect, useId, useState, type FC, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useYouTubeIframePlayer } from '@/hooks/media/useYouTubeIframePlayer';

/**
 * The recording, one click away: a "Recording" pill that opens on the
 * YouTube player (the Set list's stand, `StandVideo`; a lesson slide's song).
 *
 * The iframe is not even created until it is asked for — at a gig nobody
 * wants every chart in the set quietly loading YouTube. Once armed it stays
 * mounted, hidden rather than unmounted, so collapsing the panel does not cut
 * off a recording someone is listening to. A new video starts shut and silent.
 *
 * `quickPlay` (a lesson slide, owner 2026-11-10) adds a play button to the
 * collapsed pill: the song starts, and pauses, without opening the video.
 * Its pill carries no word, only ▶ and ▾ (owner, 2026-11-10).
 *
 * `solo` (a list of them, an artist's songs on /songs, owner 2026-11-11):
 * one at a time; playing or opening one pauses the rest and shuts their
 * videos.
 *
 * `openIn` (the same list, owner 2026-11-11): the video opens in the page's
 * flow, in that element (under the pill's row) and at its width, instead of
 * floating under the pill.
 *
 * `videoWithPlay` (the same list, owner 2026-11-11): one button, no ▾ —
 * play opens the video as it starts, pause shuts it.
 *
 * `shared` (a lesson's song, owner 2026-11-12): the pill drives a player that
 * outlives it (Present's and the room's one song for the deck), so the song
 * plays on into the next slide. The opened panel is a place the shared
 * player is shown in (`dock`), not a player of its own.
 */

/** A player the pill drives instead of its own (`shared`). */
export interface SharedRecording {
  isPlaying: boolean;
  /** Play was pressed and the player is still loading. */
  starting: boolean;
  toggle: () => void;
  /** Where to show the video while the panel is open; null when shut. */
  dock: (place: HTMLElement | null) => void;
}

/** Said by a `solo` pill as it plays or opens, with its id. */
const SOLO_EVENT = 'recording-pill:solo';

export const RecordingPill: FC<{
  videoId: string;
  startSec?: number | undefined;
  /** A play / pause button on the pill itself. */
  quickPlay?: boolean;
  /** Which edge the opened video lines up with. */
  align?: 'left' | 'right';
  /** A line under the opened video. */
  note?: ReactNode;
  /** One of a list: it pauses and shuts when another `solo` pill plays or
   *  opens. */
  solo?: boolean;
  /** Where the video opens, in the page's flow and at its width (null while
   *  that element mounts); left out, it floats under the pill. */
  openIn?: HTMLElement | null;
  /** Only ▶ / ❚❚: playing opens the video, pausing shuts it (no ▾). */
  videoWithPlay?: boolean;
  /** Drive this player instead of one of the pill's own. */
  shared?: SharedRecording;
  className?: string;
}> = ({
  videoId,
  startSec,
  quickPlay = false,
  videoWithPlay = false,
  solo = false,
  openIn,
  align = 'right',
  note,
  shared,
  className,
}) => {
  const [open, setOpen] = useState(false);
  // Armed on first open (or play) and never disarmed: that is what keeps the
  // player alive across a collapse.
  const [armed, setArmed] = useState(false);
  // Play was pressed before the player had loaded: it plays once ready.
  const [wantPlay, setWantPlay] = useState(false);

  // Each video gets its own panel state — a new one starts shut and silent.
  useEffect(() => {
    setOpen(false);
    setArmed(false);
    setWantPlay(false);
  }, [videoId]);

  // Esc shuts the open video, and only that (a lesson's Esc would leave it).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  const own = useYouTubeIframePlayer({
    videoId: armed && !shared ? videoId : null,
    startSec,
  });
  const { containerRef, isReady, play, pause } = own;
  const isPlaying = shared ? shared.isPlaying : own.isPlaying;

  // A shared player shows in the opened panel, and nowhere while it is shut.
  const [panelPlace, setPanelPlace] = useState<HTMLDivElement | null>(null);
  const dock = shared?.dock;
  useEffect(() => {
    if (!dock) return;
    dock(open ? panelPlace : null);
  }, [dock, open, panelPlace]);

  useEffect(() => {
    if (!wantPlay || !isReady) return;
    setWantPlay(false);
    play();
  }, [wantPlay, isReady, play]);

  // One of a list at a time: asked to play, playing (here, or from the
  // video's own controls) or opening, it tells the rest to stop and shut.
  const soloId = useId();
  const active = isPlaying || open || wantPlay;
  useEffect(() => {
    if (!solo || !active) return;
    window.dispatchEvent(new CustomEvent(SOLO_EVENT, { detail: soloId }));
  }, [solo, active, soloId]);
  useEffect(() => {
    if (!solo) return undefined;
    const onSolo = (e: Event) => {
      if ((e as CustomEvent<string>).detail === soloId) return;
      setWantPlay(false);
      setOpen(false);
      pause();
    };
    window.addEventListener(SOLO_EVENT, onSolo);
    return () => window.removeEventListener(SOLO_EVENT, onSolo);
  }, [solo, soloId, pause]);

  const togglePlay = () => {
    if (shared) {
      shared.toggle();
      return;
    }
    if (isPlaying) {
      pause();
      if (videoWithPlay) setOpen(false);
      return;
    }
    setArmed(true);
    if (videoWithPlay) setOpen(true);
    if (isReady) play();
    else setWantPlay(true);
  };
  const starting = shared ? shared.starting : wantPlay && !isPlaying;

  const panel = (
    <div
      className={
        openIn === undefined
          ? `absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full z-20 mt-2 w-[min(28rem,80vw)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#161618]/80 shadow-[0_8px_28px_rgba(0,0,0,0.36)] backdrop-blur-xl`
          : 'w-full overflow-hidden rounded-xl bg-black'
      }
      style={{ display: open ? 'block' : 'none' }}
    >
      <div className="aspect-video w-full bg-black">
        {shared ? (
          <div ref={setPanelPlace} className="h-full w-full" />
        ) : (
          <div ref={containerRef} className="h-full w-full" />
        )}
      </div>
      {note && <p className="px-3 py-1.5 text-[11px] text-white/45">{note}</p>}
    </div>
  );

  return (
    <div className={`relative flex-shrink-0 ${className ?? ''}`}>
      <div
        className={`inline-flex items-center rounded-full border text-xs transition-colors ${
          isPlaying
            ? 'border-white/40 bg-white/10 text-white'
            : 'border-white/15 text-white/60 hover:border-white/30'
        }`}
      >
        {(quickPlay || videoWithPlay) && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={
              isPlaying ? 'Pause the recording' : 'Play the recording'
            }
            {...(videoWithPlay ? { 'aria-expanded': open } : {})}
            title={isPlaying ? 'Pause' : 'Play'}
            className={`inline-flex size-6 items-center justify-center rounded-full text-white/80 hover:text-white ${
              videoWithPlay ? (isPlaying ? '' : 'pl-px') : 'pl-1'
            }`}
          >
            {isPlaying ? (
              <Pause size={12} className="fill-current" />
            ) : (
              <Play
                size={12}
                className={`fill-current ${starting ? 'animate-pulse' : ''}`}
              />
            )}
          </button>
        )}
        {!videoWithPlay && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => {
              setArmed(true);
              setOpen((v) => !v);
            }}
            className={`inline-flex items-center gap-1.5 py-1 pr-2 ${quickPlay ? 'pl-0.5' : 'pl-2'}`}
            title={open ? 'Hide the recording' : 'Listen to the recording'}
            {...(quickPlay
              ? { 'aria-label': open ? 'Hide the video' : 'Show the video' }
              : {})}
          >
            {!quickPlay && <Youtube size={13} />}
            {!quickPlay && 'Recording'}
            {isPlaying && !open && !quickPlay && (
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-white"
                title="Playing"
              />
            )}
            <ChevronDown
              size={12}
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Rendered from the start so the player has something to replace, and
          only hidden when shut — never unmounted. */}
      {openIn === undefined ? panel : openIn && createPortal(panel, openIn)}
    </div>
  );
};
