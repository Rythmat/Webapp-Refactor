/**
 * Reusable YouTube IFrame-API player hook, extracted from the inline logic in
 * `SongDetailPage.tsx` (script injection, player lifecycle, section-loop
 * polling). Attach `containerRef` to a div; the API replaces it with the
 * player iframe and `destroy()` restores it on unmount.
 *
 * Script injection is idempotent and chains any previously-registered
 * `onYouTubeIframeAPIReady` callback, so this hook coexists with other
 * consumers of the IFrame API (e.g. SongDetailPage) on the same page.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

/** Extract a YouTube video ID from a URL or URI. */
export const extractYouTubeId = (uri: string): string | null => {
  const match = uri.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
};

const IFRAME_API_SRC = 'https://www.youtube.com/iframe_api';

/**
 * Load the IFrame API script once (idempotent) and invoke `onReady` when
 * `window.YT.Player` is available — immediately if it already is.
 */
const ensureIframeApi = (onReady: () => void): void => {
  const w = window as any;
  if (w.YT?.Player) {
    onReady();
    return;
  }
  if (!document.querySelector(`script[src="${IFRAME_API_SRC}"]`)) {
    const tag = document.createElement('script');
    tag.src = IFRAME_API_SRC;
    document.head.appendChild(tag);
  }
  // Chain rather than overwrite so every pending consumer gets the callback.
  const prev = w.onYouTubeIframeAPIReady;
  w.onYouTubeIframeAPIReady = () => {
    prev?.();
    onReady();
  };
};

export interface UseYouTubeIframePlayerOptions {
  /** null/undefined renders nothing — the hook stays idle. */
  videoId: string | null | undefined;
  /** Initial playback position (seconds). Also the loop-back point. */
  startSec?: number;
  /** Section end (seconds). With `loop`, playback seeks back to `startSec`. */
  endSec?: number;
  /**
   * Loop playback. With `endSec` this is a section loop (200ms polling, like
   * SongDetailPage's chord-section loop); without it the whole video loops
   * natively via the API's `loop`/`playlist` params.
   */
  loop?: boolean;
}

export interface UseYouTubeIframePlayerResult {
  /** Attach to the div the player iframe should replace. */
  containerRef: RefObject<HTMLDivElement>;
  isReady: boolean;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
}

export const useYouTubeIframePlayer = ({
  videoId,
  startSec,
  endSec,
  loop = false,
}: UseYouTubeIframePlayerOptions): UseYouTubeIframePlayerResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Create the player once the API is ready; destroy on unmount / id change.
  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    let disposed = false;

    const createPlayer = () => {
      if (disposed || playerRef.current || !containerRef.current) return;
      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
          controls: 1,
          playsinline: 1,
          origin: window.location.origin,
          ...(startSec != null ? { start: Math.floor(startSec) } : {}),
          // Whole-video loop is native; section loops are handled by polling.
          ...(loop && endSec == null ? { loop: 1, playlist: videoId } : {}),
        },
        events: {
          onReady: () => {
            if (!disposed) setIsReady(true);
          },
          onStateChange: (e: any) => {
            if (!disposed) setIsPlaying(e.data === 1);
          },
        },
      });
    };

    ensureIframeApi(createPlayer);

    return () => {
      disposed = true;
      setIsReady(false);
      setIsPlaying(false);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* player already torn down */
      }
      playerRef.current = null;
    };
  }, [videoId, startSec, endSec, loop]);

  // Section-loop polling — only while playing with a section end defined.
  // Cheap setInterval is enough (mirrors SongDetailPage).
  useEffect(() => {
    if (!isPlaying || !loop || endSec == null) return;

    const loopStart = startSec ?? 0;
    const id = window.setInterval(() => {
      try {
        const t = playerRef.current?.getCurrentTime?.();
        if (typeof t !== 'number') return;
        if (t >= endSec) {
          playerRef.current?.seekTo?.(loopStart, true);
        }
      } catch {
        /* player not ready */
      }
    }, 200);

    return () => window.clearInterval(id);
  }, [isPlaying, loop, startSec, endSec]);

  const play = useCallback(() => {
    try {
      playerRef.current?.playVideo?.();
    } catch {
      /* player not ready */
    }
  }, []);

  const pause = useCallback(() => {
    try {
      playerRef.current?.pauseVideo?.();
    } catch {
      /* player not ready */
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    try {
      playerRef.current?.seekTo?.(seconds, true);
    } catch {
      /* player not ready */
    }
  }, []);

  return { containerRef, isReady, isPlaying, play, pause, seekTo };
};
