import {
  useMotionValue,
  useMotionValueEvent,
  type MotionValue,
} from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TourAudio } from '../sceneTypes';
import {
  BAR,
  BEAT,
  CLIP_TICKS,
  TICKS_PER_MS,
  eventsInWindow,
  type TrackId,
  type TransportEvent,
} from './studioSong';

/** Audio is scheduled this far ahead of the playhead (100 ms). */
const LOOKAHEAD_TICKS = 100 * TICKS_PER_MS;
/** Clamp for one frame (a backgrounded or janky frame). */
const MAX_DT = 250;
/** Meter fall-off time constant, ms. */
const METER_DECAY_MS = 200;

export type MeterId = TrackId | 'master';

interface StudioTransportOptions {
  playing: boolean;
  /** False while the tour is offscreen or the page is hidden: no rAF, no sound. */
  visible: boolean;
  /** Loop the 4-bar clip (else clamp at its end and call `onEnd`). */
  loop: boolean;
  /** Step the displayed position beat by beat (reduced motion). */
  quantize: boolean;
  /** Start every Play from 1:1:1 (reduced motion's one pass). */
  rewindOnPlay: boolean;
  /** Changing it moves the playhead to `resetTick` (scope change, Stop). */
  resetKey: string | number;
  resetTick: number;
  events: readonly TransportEvent[];
  /** Mute/solo gate, read at scheduling time. */
  isAudible: (track: TrackId) => boolean;
  audio: TourAudio;
  /** Each time a looping pass wraps back to bar 1. */
  onWrap?: () => void;
  /** A non-looping pass reached the end of the clip. */
  onEnd?: () => void;
}

/**
 * The Micro Studio's own transport: one rAF (only while playing and visible)
 * advances a tick cursor at 120 BPM and schedules the clip's hits 100 ms
 * ahead through the sound-gated `TourAudio` with relative delays — never
 * `Tone.Transport`, which the DAW owns. The schedule cursor advances whether
 * or not Sound is on, so turning Sound on mid-play never bursts.
 *
 * Returns the playhead `position` (tick within the clip) and per-track meter
 * levels (0–1) as MotionValues, so playback never re-renders the scene.
 * Events, callbacks and `isAudible` are read through refs: a STYLE or M/S
 * change lands in the next scheduling window without restarting the loop.
 */
export const useStudioTransport = ({
  playing,
  visible,
  loop,
  quantize,
  rewindOnPlay,
  resetKey,
  resetTick,
  events,
  isAudible,
  audio,
  onWrap,
  onEnd,
}: StudioTransportOptions): {
  position: MotionValue<number>;
  meters: Record<MeterId, MotionValue<number>>;
} => {
  const position = useMotionValue(resetTick);
  const chords = useMotionValue(0);
  const drums = useMotionValue(0);
  const master = useMotionValue(0);
  const meters = useRef({ chords, drums, master }).current;

  const live = useRef({ events, isAudible, audio, onWrap, onEnd, loop });
  const quantizeRef = useRef(quantize);
  // Set at commit, before the reset below: a frame that sneaks in before the
  // passive cleanup cancels the loop must not play from the reset tick.
  const runRef = useRef(false);
  useLayoutEffect(() => {
    live.current = { events, isAudible, audio, onWrap, onEnd, loop };
    quantizeRef.current = quantize;
    runRef.current = playing && visible;
  });

  /** Absolute tick (loop × CLIP_TICKS + tick) and the scheduled-up-to tick. */
  const absRef = useRef(resetTick);
  const schedRef = useRef(resetTick);

  const show = (abs: number) => {
    const tick = live.current.loop
      ? abs % CLIP_TICKS
      : Math.min(abs, CLIP_TICKS);
    position.set(quantizeRef.current ? Math.floor(tick / BEAT) * BEAT : tick);
  };

  // Move the playhead (scope change, Stop). Declared before the play effects
  // so a reset and a Play in one commit start from the reset tick.
  useLayoutEffect(() => {
    absRef.current = resetTick;
    schedRef.current = resetTick;
    show(resetTick);
  }, [resetKey]);

  // A new Play: rewind if asked, or if a one-shot pass already ended.
  useLayoutEffect(() => {
    if (!playing) return;
    const ended = !live.current.loop && absRef.current >= CLIP_TICKS;
    if (rewindOnPlay || ended) {
      absRef.current = 0;
      schedRef.current = 0;
      show(0);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing || !visible) return;
    const levels: Record<TrackId, number> = { chords: 0, drums: 0 };
    // Resume where the playhead is; anything already scheduled was released.
    schedRef.current = absRef.current;

    const schedule = () => {
      const { events: evs, isAudible: audible, audio: out } = live.current;
      const abs = absRef.current;
      const to = abs + LOOKAHEAD_TICKS;
      const end = live.current.loop ? to : Math.min(to, CLIP_TICKS);
      for (const { event, abs: at } of eventsInWindow(
        evs,
        schedRef.current,
        end,
      )) {
        if (!audible(event.track)) continue;
        const delay = (at - abs) / (TICKS_PER_MS * 1000);
        if (event.track === 'chords')
          out.notes(event.midis, event.seconds, delay, event.velocity);
        else out.drum(event.drum, delay, event.velocity);
      }
      schedRef.current = Math.max(schedRef.current, end);
    };

    const meter = (from: number, to: number, dt: number) => {
      const fall = Math.exp(-dt / METER_DECAY_MS);
      levels.chords *= fall;
      levels.drums *= fall;
      const { events: evs, isAudible: audible } = live.current;
      for (const { event } of eventsInWindow(evs, from, to)) {
        if (!audible(event.track)) continue;
        const hit = Math.min(1, 0.35 + event.velocity);
        levels[event.track] = Math.max(levels[event.track], hit);
      }
      chords.set(levels.chords);
      drums.set(levels.drums);
      master.set(Math.max(levels.chords, levels.drums));
    };

    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      if (!runRef.current) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(Math.max(t - last, 0), MAX_DT);
      last = t;
      const from = absRef.current;
      let abs = from + dt * TICKS_PER_MS;
      const { loop: looping, onWrap: wrapped, onEnd: ended } = live.current;
      if (!looping && abs >= CLIP_TICKS) {
        absRef.current = CLIP_TICKS;
        meter(from, CLIP_TICKS, dt);
        show(CLIP_TICKS);
        cancelAnimationFrame(raf);
        ended?.();
        return;
      }
      absRef.current = abs;
      meter(from, abs, dt);
      schedule();
      show(abs);
      if (
        looping &&
        Math.floor(abs / CLIP_TICKS) > Math.floor(from / CLIP_TICKS)
      ) {
        // Keep the absolute cursor small; the window math is loop-relative.
        abs -= CLIP_TICKS;
        absRef.current = abs;
        schedRef.current -= CLIP_TICKS;
        wrapped?.();
      }
    };
    schedule();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      live.current.audio.stopAll();
      chords.set(0);
      drums.set(0);
      master.set(0);
    };
  }, [playing, visible]);

  return { position, meters };
};

/**
 * The bar (0–3) under the playhead as React state: re-renders at most once
 * per bar, for things that are cheaper as props (the active chord region,
 * NOW PLAYING, glowing notes).
 */
export const useBarIndex = (position: MotionValue<number>): number => {
  const barOf = (tick: number) =>
    Math.min(3, Math.max(0, Math.floor(tick / BAR)));
  const [bar, setBar] = useState(() => barOf(position.get()));
  useMotionValueEvent(position, 'change', (tick) => setBar(barOf(tick)));
  return bar;
};
