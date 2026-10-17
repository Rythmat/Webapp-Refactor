/**
 * transportClock.ts — Where an in-time lesson is in its music.
 *
 * Every in-time Learn lesson runs on the one Tone.Transport: the count-in,
 * the guide, the backing track and the metronome are scheduled on it, and
 * the student's notes are stamped from it. This is the reading of it, lifted
 * out of GenreLessonContainerV2 so Music Literacy's player reads the same
 * clock instead of keeping a third one. Positions are 480-per-quarter ticks
 * from the transport's zero; a lesson takes off its own count-in.
 *
 * TWO READINGS
 * - `playbackTicks`: what the student is hearing now. The audio clock less
 *   the output device's latency and the calibrated delay (Settings → Audio
 *   timing), so a playhead drawn from it sits on the sound in their ears.
 * - `soundingTicks`: where a note played now lands in the music. It sounds
 *   from the audio clock's "now" and travels to the speakers beside
 *   everything scheduled, so it reaches the ear in the same place: a player
 *   with output latency presses early so that what they hear of themselves
 *   lands on the beat, and that is the playing to judge.
 *
 * Both are null before the transport has started (see playheadClock.ts for
 * why that must never read as tick 0).
 */

import * as Tone from 'tone';
import { useSettingsStore } from '@/features/settings/useSettingsStore';

/**
 * Browsers can report a stale device latency after an output switch; a real
 * one is well under half a second, so it's capped rather than allowed to park
 * the playhead before the run.
 */
export const MAX_DEVICE_LATENCY_SEC = 0.5;

/** Lead time given to every transport start, so the graph is ready. */
export const TRANSPORT_LEAD_SEC = 0.1;

/** A little past the start, so the first read is a real tick, not a null. */
export const PLAYHEAD_SETTLE_MS = 60;

/** What the output device reports, capped. */
export function deviceLatencySec(): number {
  const context = Tone.getContext().rawContext as AudioContext;
  return Math.min(
    MAX_DEVICE_LATENCY_SEC,
    Math.max(0, (context.outputLatency ?? 0) + (context.baseLatency ?? 0)),
  );
}

/** From a sound's audio-clock time to the student hearing it. */
export function heardLatencySec(): number {
  return (
    deviceLatencySec() + useSettingsStore.getState().outputLatencyMs / 1000
  );
}

export interface TransportClock {
  /**
   * Remember that the transport begins `leadSeconds` from now, for a start
   * made elsewhere (the backing track starts the transport itself).
   */
  noteStart(leadSeconds: number): number;
  /** Start the transport and remember when it will actually begin. */
  start(leadSeconds?: number): number;
  /** Stop the transport and forget when it started, so no stale read survives. */
  stop(): void;
  /** Wait until the transport has begun, plus a frame, before reading it. */
  wait(): Promise<void>;
  /** The transport's position at an audio-clock time, or null. */
  ticksAt(time: number): number | null;
  /** What the student is hearing now. */
  playbackTicks(): number | null;
  /**
   * Where a note played now lands; with `perfMs` (a key or pointer event's
   * timeStamp, in performance.now() ms), where one played then lands.
   */
  soundingTicks(perfMs?: number): number | null;
  /**
   * Where a sound heard at `perfMs` lands: an acoustic guitar through the
   * microphone, played against what the student hears.
   */
  heardTicksAt(perfMs: number): number | null;
}

/**
 * A clock over the shared transport. Each lesson screen keeps one, made
 * once (its methods never change identity: the piano roll's playhead loop
 * restarts whenever `playbackTicks` does).
 */
export function createTransportClock(): TransportClock {
  /**
   * Audio-clock second the transport is scheduled to begin, or null when it
   * is not running. Every start goes through start/noteStart, so this is set
   * before the playhead can ask about a time near the beginning.
   */
  let startedAt: number | null = null;

  const noteStart = (leadSeconds: number) => {
    startedAt = Tone.now() + leadSeconds;
    return startedAt;
  };

  // `leadSeconds` is the same for every path on purpose: practice, Play Now
  // with a backing track and Play Now with only a metronome used to start
  // with three different lead times, so the margin the playhead got
  // depended on which button was pressed.
  const start = (leadSeconds = TRANSPORT_LEAD_SEC) => {
    const at = noteStart(leadSeconds);
    Tone.getTransport().start(at);
    return at;
  };

  const stop = () => {
    Tone.getTransport().stop();
    startedAt = null;
  };

  const wait = async () => {
    const remaining = startedAt === null ? 0 : startedAt - Tone.now();
    const ms = Math.max(0, remaining * 1000) + PLAYHEAD_SETTLE_MS;
    await new Promise((resolve) => setTimeout(resolve, ms));
  };

  const ticksAt = (time: number): number | null => {
    const transport = Tone.getTransport();
    if (transport.state !== 'started') return null;
    // Before the transport begins there is no honest position for this
    // moment: 0 would be a lie the playhead cannot tell from a real tick 0.
    if (startedAt === null || time < startedAt) return null;
    let ticks: number;
    try {
      ticks = (transport.getTicksAtTime(time) / transport.PPQ) * 480;
    } catch {
      // Tone throws for a time outside its recorded history.
      return null;
    }
    return Number.isFinite(ticks) ? ticks : null;
  };

  const audioNow = () =>
    (Tone.getContext().rawContext as AudioContext).currentTime;

  const playbackTicks = () =>
    ticksAt(
      audioNow() -
        deviceLatencySec() -
        useSettingsStore.getState().outputLatencyMs / 1000,
    );

  const soundingTicks = (perfMs?: number) =>
    ticksAt(
      perfMs === undefined
        ? audioNow()
        : audioNow() - Math.max(0, performance.now() - perfMs) / 1000,
    );

  const heardTicksAt = (perfMs: number) =>
    ticksAt(
      audioNow() -
        (performance.now() - perfMs) / 1000 -
        deviceLatencySec() -
        useSettingsStore.getState().outputLatencyMs / 1000,
    );

  return {
    noteStart,
    start,
    stop,
    wait,
    ticksAt,
    playbackTicks,
    soundingTicks,
    heardTicksAt,
  };
}
