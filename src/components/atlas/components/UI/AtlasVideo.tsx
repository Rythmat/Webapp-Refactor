import { useEffect, useRef } from 'react';

// Minimal typing for the YouTube IFrame API globals we use.
type YTPlayer = {
  destroy?: () => void;
  getIframe?: () => HTMLIFrameElement;
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

/**
 * A 16:9 YouTube embed that uses the IFrame Player API so we can detect when the
 * viewer starts the video (`onPlay`). Mirrors the plain-iframe embed styling used
 * across the atlas panels.
 */
export function AtlasVideo({
  videoId,
  title,
  onPlay,
  className = '',
}: {
  videoId: string;
  title: string;
  onPlay?: () => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const titleRef = useRef(title);
  titleRef.current = title;

  useEffect(() => {
    let cancelled = false;
    // Fire onPlay only the first time this video starts — not on every
    // pause/resume — so it can't repeatedly re-trigger side effects.
    let firstPlayFired = false;
    ensureYouTubeApi().then(() => {
      const YT = (window as unknown as YTWindow).YT;
      if (cancelled || !containerRef.current || !YT) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            const iframe = playerRef.current?.getIframe?.();
            if (iframe) iframe.title = titleRef.current;
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
    };
  }, [videoId]);

  return (
    <div
      className={`relative aspect-video overflow-hidden [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:size-full ${className}`}
    >
      <div ref={containerRef} />
    </div>
  );
}
