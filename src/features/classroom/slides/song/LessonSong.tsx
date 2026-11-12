/**
 * The lesson's song, one player for the whole deck (owner, 2026-11-12: "keep
 * the same YouTube video playing seamlessly from the first slide to the
 * second").
 *
 * A slide's song used to belong to the slide: the portrait's Recording pill
 * made its own player, and leaving the slide unmounted it, so the music
 * stopped. Here Present and the room's screen hold ONE player above their
 * slides, and each slide CLAIMS the song:
 *
 *   - the portrait's pill claims it without a place: its ▶/❚❚ drive the player,
 *     which plays unseen (or shows in the pill's panel when that is open);
 *   - the song's slide claims it with a place, its left half, and asks it to
 *     play: the video moves there and keeps playing, or starts from the top
 *     when the slide is opened directly.
 *
 * The player's iframe is drawn in a fixed layer laid over the claimed place,
 * never moved between parents (moving an iframe in the DOM reloads it). When
 * no slide claims the song it pauses, after a short grace, so a slide that
 * leaves before the next one arrives (a fade) does not cut it.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useYouTubeIframePlayer } from '@/hooks/media/useYouTubeIframePlayer';

/** How long the song waits for the next slide's claim before it pauses. */
export const SONG_GRACE_MS = 600;

interface SongClaim {
  videoId: string;
  /** Where the video shows, or null: it plays unseen. */
  place: HTMLElement | null;
  /** Start it when this claim arrives and the song is not this one yet. */
  autoplay: boolean;
}

interface SongContext {
  claim: (key: string, claim: SongClaim | null) => void;
  toggle: (videoId: string) => void;
  command: (videoId: string, action: 'play' | 'pause', atSec?: number) => void;
  videoId: string | null;
  isPlaying: boolean;
  starting: boolean;
}

const LessonSongContext = createContext<SongContext | null>(null);

export const LessonSongProvider = ({ children }: { children: ReactNode }) => {
  const [claims, setClaims] = useState<ReadonlyMap<string, SongClaim>>(
    () => new Map(),
  );
  // The song the player holds (armed on first play or first autoplay claim).
  const [videoId, setVideoId] = useState<string | null>(null);
  // Play was asked for before the player was ready.
  const [wantPlay, setWantPlay] = useState(false);
  const player = useYouTubeIframePlayer({ videoId });
  const { isReady, isPlaying, play, pause, seekTo } = player;

  const claim = useCallback((key: string, next: SongClaim | null) => {
    setClaims((prev) => {
      const map = new Map(prev);
      if (next) map.set(key, next);
      else map.delete(key);
      return map;
    });
  }, []);

  const start = useCallback(
    (id: string) => {
      if (id !== videoId) {
        setVideoId(id);
        setWantPlay(true);
      } else if (isReady) play();
      else setWantPlay(true);
    },
    [videoId, isReady, play],
  );

  const toggle = useCallback(
    (id: string) => {
      if (id === videoId && isPlaying) pause();
      else start(id);
    },
    [videoId, isPlaying, pause, start],
  );

  const command = useCallback(
    (id: string, action: 'play' | 'pause', atSec?: number) => {
      if (action === 'pause') {
        if (id === videoId) pause();
        return;
      }
      if (atSec !== undefined && id === videoId && isReady) seekTo(atSec);
      start(id);
    },
    [videoId, isReady, pause, seekTo, start],
  );

  useEffect(() => {
    if (!wantPlay || !isReady) return;
    setWantPlay(false);
    play();
  }, [wantPlay, isReady, play]);

  // The claims on the song the player holds; a place to show it, if any.
  const mine = useMemo(
    () => [...claims.values()].filter((c) => c.videoId === videoId),
    [claims, videoId],
  );
  const place = [...mine].reverse().find((c) => c.place)?.place ?? null;

  // A slide that asks for the song, as it arrives, gets it playing: it plays
  // on if it already is, else it starts (or resumes where it was paused).
  const asked = useRef(new Set<string>());
  useEffect(() => {
    for (const [key, c] of claims) {
      if (!c.autoplay || asked.current.has(key)) continue;
      asked.current.add(key);
      if (!(c.videoId === videoId && isPlaying)) start(c.videoId);
    }
    for (const key of asked.current)
      if (!claims.has(key)) asked.current.delete(key);
  }, [claims, videoId, isPlaying, start]);

  // Nobody claims it: it pauses, once the next slide has had its chance.
  const unclaimed = videoId !== null && mine.length === 0;
  useEffect(() => {
    if (!unclaimed) return;
    const timer = window.setTimeout(() => {
      setWantPlay(false);
      pause();
    }, SONG_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [unclaimed, pause]);

  const value = useMemo<SongContext>(
    () => ({
      claim,
      toggle,
      command,
      videoId,
      isPlaying,
      starting: wantPlay,
    }),
    [claim, toggle, command, videoId, isPlaying, wantPlay],
  );

  return (
    <LessonSongContext.Provider value={value}>
      {children}
      <SongLayer place={place}>
        <div ref={player.containerRef} className="size-full" />
      </SongLayer>
    </LessonSongContext.Provider>
  );
};

/**
 * The player, laid over the claimed place frame by frame (the place moves
 * with the stage's scale and its slide's entrance), or kept out of sight.
 */
const SongLayer = ({
  place,
  children,
}: {
  place: HTMLElement | null;
  children: ReactNode;
}) => {
  const [style, setStyle] = useState<CSSProperties>(HIDDEN);
  const last = useRef('');
  useEffect(() => {
    if (!place) {
      last.current = '';
      setStyle(HIDDEN);
      return;
    }
    let frame = 0;
    const follow = () => {
      const r = place.getBoundingClientRect();
      // Its rounded corners, at the size it is drawn.
      const scale = place.offsetWidth > 0 ? r.width / place.offsetWidth : 1;
      const radius =
        (parseFloat(getComputedStyle(place).borderTopLeftRadius) || 0) * scale;
      const key = `${r.left},${r.top},${r.width},${r.height},${radius}`;
      if (key !== last.current) {
        last.current = key;
        setStyle({
          position: 'fixed',
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          borderRadius: radius,
          overflow: 'hidden',
          zIndex: 20,
          background: '#000',
        });
      }
      frame = window.requestAnimationFrame(follow);
    };
    follow();
    return () => window.cancelAnimationFrame(frame);
  }, [place]);
  return (
    <div data-lesson-song="" style={style} aria-hidden={!place || undefined}>
      {children}
    </div>
  );
};

/** Out of sight but alive, so the song plays on (as a collapsed pill's). */
const HIDDEN: CSSProperties = {
  position: 'fixed',
  left: 0,
  top: 0,
  width: 320,
  height: 180,
  opacity: 0,
  pointerEvents: 'none',
  zIndex: -1,
};

export interface LessonSongControls {
  isPlaying: boolean;
  /** Play was pressed and the player is still loading. */
  starting: boolean;
  toggle: () => void;
}

/**
 * Claim the lesson's song for as long as this component is mounted (a null
 * `videoId` claims nothing): null outside a `LessonSongProvider` (a student's
 * device, the editor), where the caller keeps its own player.
 */
export const useLessonSong = (
  videoId: string | null,
  place: HTMLElement | null,
  {
    autoplay = false,
    command,
  }: {
    autoplay?: boolean;
    command?: { action: 'play' | 'pause'; atSec?: number; cmdId: number };
  } = {},
): LessonSongControls | null => {
  const ctx = useContext(LessonSongContext);
  const key = useId();
  const claimSong = ctx?.claim;
  useEffect(() => {
    if (!claimSong || !videoId) return;
    claimSong(key, { videoId, place, autoplay });
    return () => claimSong(key, null);
  }, [claimSong, key, videoId, place, autoplay]);

  // The teacher's remote (play / pause from the session dashboard).
  const send = ctx?.command;
  const cmdId = command?.cmdId;
  useEffect(() => {
    if (!send || !videoId || !command || cmdId === undefined) return;
    send(videoId, command.action, command.atSec);
    // Only a new command acts, not a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send, cmdId]);

  if (!ctx || !videoId) return null;
  const mine = ctx.videoId === videoId;
  return {
    isPlaying: mine && ctx.isPlaying,
    starting: mine && ctx.starting && !ctx.isPlaying,
    toggle: () => ctx.toggle(videoId),
  };
};
