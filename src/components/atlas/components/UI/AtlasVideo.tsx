import { Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { posterUrl } from '@/components/atlas/data/eventImage';

// Minimal typing for the YouTube IFrame API globals we use.
type YTPlayer = {
  destroy?: () => void;
  getIframe?: () => HTMLIFrameElement;
  playVideo?: () => void;
};
type YTGlobal = {
  Player: new (el: HTMLElement, opts: unknown) => YTPlayer;
};
type YTWindow = {
  YT?: YTGlobal;
  onYouTubeIframeAPIReady?: () => void;
};

const API_SRC = 'https://www.youtube.com/iframe_api';

// Load the YouTube IFrame API once; resolve when YT.Player is available.
function ensureYouTubeApi(): Promise<void> {
  const w = window as unknown as YTWindow;
  if (w.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const tag = document.createElement('script');
      tag.src = API_SRC;
      document.head.appendChild(tag);
    }
  });
}

/** The poster shown until play is pressed: 480×360, letterboxed to 4:3. */
export function youtubePoster(videoId: string): string {
  return posterUrl(videoId, 'stage');
}

// Warm the connection the player will need, once, when someone shows intent
// (hover or focus on play) rather than on every card that merely opens.
let preconnected = false;
function preconnectYouTube(): void {
  if (preconnected) return;
  preconnected = true;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = 'https://www.youtube.com';
  document.head.appendChild(link);
}

/**
 * A 16:9 YouTube video that costs nothing until someone presses play.
 *
 * It starts as the video's poster and a play button. Only the click loads the
 * IFrame Player API and builds the player, which then plays straight away —
 * opening a card with a video in it used to fetch the API, the embed page and
 * its scripts whether or not anyone watched. Past that click it is the same
 * IFrame API player as before, so `onPlay` still fires when the viewer starts
 * the video. Mirrors the plain-iframe embed styling used across the atlas
 * panels.
 */
export function AtlasVideo({
  videoId,
  title,
  onPlay,
  autoplay = false,
  className = '',
}: {
  videoId: string;
  title: string;
  onPlay?: () => void;
  /**
   * Start as the player, not the poster: for a place that drew its own
   * poster and its own play button (the timeline's event stage).
   */
  autoplay?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const titleRef = useRef(title);
  titleRef.current = title;
  const [activated, setActivated] = useState(autoplay);

  // A different video in the same slot starts as a poster again.
  const [shownId, setShownId] = useState(videoId);
  if (shownId !== videoId) {
    setShownId(videoId);
    setActivated(autoplay);
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!activated || !host) return;
    // The poster button that had focus is gone; keep focus in the video.
    if (!document.activeElement || document.activeElement === document.body) {
      host.focus({ preventScroll: true });
    }
    let cancelled = false;
    // Fire onPlay only the first time this video starts — not on every
    // pause/resume — so it can't repeatedly re-trigger side effects.
    let firstPlayFired = false;
    ensureYouTubeApi().then(() => {
      const YT = (window as unknown as YTWindow).YT;
      if (cancelled || !YT) return;
      // The API swaps the element it is given for its iframe, so give it one
      // React does not own.
      const target = document.createElement('div');
      host.appendChild(target);
      playerRef.current = new YT.Player(target, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          // The viewer already pressed play, on the poster.
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            const iframe = playerRef.current?.getIframe?.();
            if (iframe) iframe.title = titleRef.current;
            // Some browsers ignore autoplay in an embed; ask again directly.
            playerRef.current?.playVideo?.();
          },
          // 1 === YT.PlayerState.PLAYING
          onStateChange: (e: { data: number }) => {
            if (e.data === 1 && !firstPlayFired) {
              firstPlayFired = true;
              onPlayRef.current?.();
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* player already torn down */
      }
      playerRef.current = null;
      host.replaceChildren();
    };
  }, [activated, videoId]);

  return (
    <div className={`relative aspect-video overflow-hidden ${className}`}>
      <div
        ref={hostRef}
        className="absolute inset-0 focus:outline-none [&>iframe]:size-full"
        tabIndex={-1}
      />
      {!activated && (
        <button
          aria-label={`Play ${title}`}
          className="group/play absolute inset-0 size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-atlas-focus"
          type="button"
          onClick={(e) => {
            // Inside an event card, whose own click toggles the card.
            e.stopPropagation();
            setActivated(true);
          }}
          onFocus={preconnectYouTube}
          onPointerEnter={preconnectYouTube}
        >
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            height={360}
            loading="lazy"
            src={youtubePoster(videoId)}
            width={480}
          />
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition group-hover/play:scale-110 group-hover/play:bg-black/85 group-focus-visible/play:scale-110"
          >
            <Play aria-hidden className="ml-0.5 size-6 fill-current" />
          </span>
        </button>
      )}
    </div>
  );
}
