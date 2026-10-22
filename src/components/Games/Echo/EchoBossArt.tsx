import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ART_FADE_MS,
  BOSS_ART_SCALE,
  BOSS_CLIP,
  BOSS_CLIPS,
  BOSS_FACE,
  BOSS_VORTEX,
  ENDS_ON_FACE,
  STILL_MS,
  VIDEO_OVERRUN_MS,
  VIDEO_START_MS,
  type BossClip,
} from './bossArt';
import './echoGame.css';

// ── The boss on the circle ─────────────────────────────────────────────────
// The owner's animations of the Echo Boss (bossArt.ts), drawn over the
// circle in the call panel, in its place and at its size: the art's ring
// sits on the live ring. Its dark background is blended away (lighten:
// nothing of the art's #090b0f is lighter than the panel), so the boss
// sits on the panel, not in a box.
//
// The five videos are mounted, muted and inline, from the Chord Echo
// section on (preload="auto"), so the entrance plays at once; each plays
// when asked (useBossArt's play) and shows only once it is playing, over
// the one before. Every clip but the loss and the victory ends on the face,
// and the boss rests there: on the last frame, or on the face's still.
//
// NEVER STALLED BY A VIDEO
// A video that errors, is refused (autoplay), or isn't playing within
// VIDEO_START_MS gives way to its still, held for as long as the clip
// would have run; one that stops part way is over VIDEO_OVERRUN_MS past
// its length. Either way the game moves on. Under reduced motion there are
// no videos: each moment is its still, held a moment.

export interface BossArtPlay {
  /** Its playback rate (a reaction sped up to fit its gap). */
  rate?: number;
  /** The clip is over: played out, or its still held for its time. */
  onEnd?: () => void;
}

export interface BossArtState {
  /** The video in front, or none (the still shows). */
  front: BossClip | null;
  /** The still under the videos, or alone; null shows nothing. */
  still: string | null;
  /** The art is up, over a faded ring; down, the live ring shows. */
  up: boolean;
}

interface Playing {
  clip: BossClip;
  token: number;
  rate: number;
  onEnd?: () => void;
  started: boolean;
}

const HIDDEN: BossArtState = { front: null, still: null, up: false };

/** How long a clip runs at its rate, in ms. */
const runMs = (clip: BossClip, rate: number) =>
  (BOSS_CLIP[clip].seconds / rate) * 1000;

/** The art's state, its videos, and what plays it. */
export function useBossArt(reducedMotion: boolean) {
  const [state, setState] = useState<BossArtState>(HIDDEN);
  const videos = useRef<Partial<Record<BossClip, HTMLVideoElement | null>>>({});
  const now = useRef<Playing | null>(null);
  const tokens = useRef(0);
  const timers = useRef<number[]>([]);
  /** The clip in front played to its end (it holds its last frame). */
  const playedOut = useRef<BossClip | null>(null);
  /** Videos that failed to load: their stills stand in at once. */
  const broken = useRef(new Set<BossClip>());
  const reduced = useRef(reducedMotion);
  reduced.current = reducedMotion;

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);
  const later = useCallback((ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  }, []);
  const pause = useCallback((clip: BossClip) => {
    try {
      videos.current[clip]?.pause();
    } catch {
      // A video that can't pause is no matter: it's hidden.
    }
  }, []);

  const finish = useCallback(
    (token: number) => {
      const playing = now.current;
      if (!playing || playing.token !== token) return;
      now.current = null;
      clearTimers();
      playing.onEnd?.();
    },
    [clearTimers],
  );

  /** The clip's still, for as long as the clip would run; then on. */
  const standIn = useCallback(
    (token: number) => {
      const playing = now.current;
      if (!playing || playing.token !== token) return;
      const { clip, rate } = playing;
      pause(clip);
      clearTimers();
      playedOut.current = null;
      setState({ front: null, still: BOSS_CLIP[clip].still, up: true });
      const reaction = clip === 'frown' || clip === 'nod';
      later(reaction ? runMs(clip, rate) : STILL_MS[clip], () => {
        // A reaction's still gives way to the face it ends on.
        if (ENDS_ON_FACE.has(clip)) {
          setState((s) => ({ ...s, still: BOSS_FACE }));
        }
        finish(token);
      });
    },
    [clearTimers, finish, later, pause],
  );

  /** The clip is playing: it comes to the front. */
  const onPlaying = useCallback(
    (clip: BossClip) => {
      const playing = now.current;
      if (!playing || playing.clip !== clip || playing.started) return;
      playing.started = true;
      playedOut.current = null;
      clearTimers();
      setState((s) => ({
        front: clip,
        // Under every clip but the entrance, the face it starts from.
        still: clip === 'emerge' ? s.still : BOSS_FACE,
        up: true,
      }));
      const { token, rate } = playing;
      later(runMs(clip, rate) + VIDEO_OVERRUN_MS, () => {
        // Stuck part way: over all the same.
        if (now.current?.token !== token) return;
        pause(clip);
        if (ENDS_ON_FACE.has(clip)) {
          setState({ front: null, still: BOSS_FACE, up: true });
        }
        finish(token);
      });
    },
    [clearTimers, finish, later, pause],
  );

  const play = useCallback(
    (clip: BossClip, { rate = 1, onEnd }: BossArtPlay = {}) => {
      const before = now.current;
      if (before && before.clip !== clip) pause(before.clip);
      clearTimers();
      const token = ++tokens.current;
      now.current = { clip, token, rate, onEnd, started: false };
      const video = videos.current[clip];
      if (reduced.current || !video || broken.current.has(clip)) {
        standIn(token);
        return;
      }
      // The same clip still running: it starts over without a new event.
      const running =
        before?.clip === clip &&
        before.started &&
        playedOut.current !== clip &&
        !video.paused;
      try {
        video.currentTime = 0;
        video.playbackRate = rate;
        const started = video.play() as Promise<void> | undefined;
        // Refused (autoplay, a missing file): the still. A later pause of
        // ours rejects it too, but by then the token has moved on.
        started?.catch?.(() => standIn(token));
      } catch {
        standIn(token);
        return;
      }
      if (running) {
        onPlaying(clip);
        return;
      }
      later(VIDEO_START_MS, () => {
        if (now.current?.token === token && !now.current.started) {
          standIn(token);
        }
      });
    },
    [clearTimers, later, onPlaying, pause, standIn],
  );

  /** Rest on the face: whatever is playing stops (its end isn't called). */
  const rest = useCallback(() => {
    const before = now.current;
    now.current = null;
    tokens.current += 1;
    clearTimers();
    if (before) pause(before.clip);
    setState((s) => {
      const holding =
        s.front !== null &&
        playedOut.current === s.front &&
        ENDS_ON_FACE.has(s.front);
      return holding
        ? { ...s, still: BOSS_FACE, up: true }
        : { front: null, still: BOSS_FACE, up: true };
    });
  }, [clearTimers, pause]);

  /** Stop what's playing where it is (its end isn't called). */
  const stop = useCallback(() => {
    const before = now.current;
    now.current = null;
    tokens.current += 1;
    clearTimers();
    if (before) pause(before.clip);
  }, [clearTimers, pause]);

  /** Fade the art away to the live ring; then `onHidden`. */
  const hide = useCallback(
    (onHidden?: () => void) => {
      stop();
      setState((s) => ({ ...s, up: false }));
      if (!onHidden) return;
      // No fade under reduced motion: straight on.
      if (reduced.current) onHidden();
      else later(ART_FADE_MS, onHidden);
    },
    [later, stop],
  );

  const onEnded = useCallback(
    (clip: BossClip) => {
      const playing = now.current;
      if (!playing || playing.clip !== clip) return;
      playedOut.current = clip;
      if (clip === 'emerge') setState((s) => ({ ...s, still: BOSS_FACE }));
      finish(playing.token);
    },
    [finish],
  );

  const onError = useCallback(
    (clip: BossClip) => {
      broken.current.add(clip);
      const playing = now.current;
      if (playing?.clip === clip) standIn(playing.token);
    },
    [standIn],
  );

  // One ref callback a video, made once.
  const bind = useMemo(
    () =>
      Object.fromEntries(
        BOSS_CLIPS.map((clip) => [
          clip,
          (el: HTMLVideoElement | null) => {
            videos.current[clip] = el;
          },
        ]),
      ) as Record<BossClip, (el: HTMLVideoElement | null) => void>,
    [],
  );

  // Leaving the stage: nothing more to call.
  useEffect(
    () => () => {
      now.current = null;
      clearTimers();
    },
    [clearTimers],
  );

  const controls = useMemo(
    () => ({ play, rest, stop, hide }),
    [play, rest, stop, hide],
  );
  return {
    state,
    controls,
    bind,
    events: { onPlaying, onEnded, onError },
  };
}

export type BossArt = ReturnType<typeof useBossArt>;

/**
 * The art, over the circle (LiteracyCallPanel's `art`): the still and the
 * five videos stacked in a box the circle's size and a little more, so the
 * art's ring lies on the live one.
 */
export function EchoBossArt({
  art,
  reducedMotion,
}: {
  art: BossArt;
  reducedMotion: boolean;
}) {
  const { state, bind, events } = art;
  const size = `${BOSS_ART_SCALE * 100}%`;
  return (
    <div
      data-echo-boss-art={state.up ? 'up' : 'down'}
      data-echo-boss-front={state.front ?? undefined}
      data-echo-boss-still={
        state.front ? undefined : (state.still ?? undefined)
      }
      role={state.up ? 'img' : undefined}
      aria-label={state.up ? 'The Echo Boss' : undefined}
      aria-hidden={state.up ? undefined : true}
      className="echo-boss-art pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: size, height: size, opacity: state.up ? 1 : 0 }}
    >
      {state.still && (
        <img
          src={state.still}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full"
        />
      )}
      {!reducedMotion &&
        BOSS_CLIPS.map((clip) => (
          <video
            key={clip}
            ref={bind[clip]}
            data-echo-boss-clip={clip}
            src={BOSS_CLIP[clip].video}
            poster={clip === 'emerge' ? BOSS_VORTEX : BOSS_CLIP[clip].still}
            preload="auto"
            muted
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            onPlaying={() => events.onPlaying(clip)}
            onEnded={() => events.onEnded(clip)}
            onError={() => events.onError(clip)}
            className="echo-boss-video absolute inset-0 size-full object-contain"
            style={{ opacity: state.front === clip ? 1 : 0 }}
          />
        ))}
    </div>
  );
}
