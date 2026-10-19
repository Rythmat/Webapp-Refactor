// ── AudioClipScheduler ──────────────────────────────────────────────────────
// Schedules AudioBufferSourceNodes for audio clip playback.
//
// Future clips use Tone.Transport.schedule() for stable audio-thread timing.
// Mid-clip playback uses direct source.start() for immediate offset playback.
// All audio operations are wrapped in try/catch to prevent crashes.

import * as Tone from 'tone';
import type { AudioClip } from '@/daw/store/tracksSlice';
import type { TrackEngine } from './TrackEngine';

/** The clip fields playback reads. Callers pass the clip itself, so none of
 *  them can drop its trim offset, fades or gain (audio-core-03). */
export type ScheduledClip = Pick<AudioClip, 'startTick' | 'duration'> &
  Partial<
    Pick<AudioClip, 'fadeInTicks' | 'fadeOutTicks' | 'offsetSeconds' | 'gain'>
  >;

export interface ScheduleClipOptions {
  /** The decoded recording the clip plays a window of. */
  buffer: AudioBuffer;
  /** The clip, with startTick on the transport it is scheduled on (the bounce
   *  shifts it to its render window). */
  clip: ScheduledClip;
  trackEngine: TrackEngine;
  /** Where playback starts: the playhead on Play, the loop start on a lap. */
  fromTick: number;
  bpm: number;
  /** Native pedal chain input for Guitar/Bass/Vocal tracks: playback runs
   *  through the amp/effects in real time. Falls back to the TrackEngine
   *  input. */
  pedalInput?: AudioNode;
  /** The clip's id, so muting the clip silences it (setMutedClips). */
  clipId?: string;
  /**
   * The audio-clock time the transport is at `fromTick` (milestone 1.11):
   * the transport's start time on Play, the loop event's time on a lap, the
   * seek's time. A clip the playhead is inside starts then, with its offset,
   * on the beat with the MIDI and the click. Without it (the bounce) it
   * starts at the context's current time, as before.
   */
  at?: number;
}

/** How long a source fades out when it is stopped before its end, so a
 *  seek, a loop seam or Stop never clicks. */
export const SOURCE_STOP_FADE_S = 0.005;

/** A started source and the gain that fades it out when it is cut short. */
interface ActiveSource {
  source: AudioBufferSourceNode;
  fader: GainNode;
}

// Nothing writes a clip gain yet, so clamp what saved or collab data carries
// (to +12 dB) rather than let a stray value blast the track.
const MAX_CLIP_GAIN = 4;

/** The gain a clip plays at: its own, clamped, or unity when unset/invalid. */
export function clipGainOf(gain: number | undefined): number {
  if (gain === undefined || !Number.isFinite(gain)) return 1;
  return Math.min(MAX_CLIP_GAIN, Math.max(0, gain));
}

/** A clip's level shape over its length, in seconds. */
interface ClipEnvelope {
  gain: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  clipDurationSeconds: number;
}

export class AudioClipScheduler {
  private scheduledIds: number[] = [];
  /** Each clip's booked starts on the transport, so one clip can be
   *  rescheduled on its own when it is edited during playback. */
  private idsByClip = new Map<string, number[]>();
  private activeSources: ActiveSource[] = [];
  /**
   * Clips muted from the clip menu (milestone 2.12): a scheduled start of
   * one is skipped when it comes, so a mute or an unmute during playback
   * counts from then on. A clip's sources are kept by its id, so a mute also
   * stops what is sounding.
   */
  private mutedClips: ReadonlySet<string> = new Set();
  private sourcesByClip = new Map<string, Set<ActiveSource>>();
  /**
   * A start that came while its clip was muted: when it was due (audio-clock
   * time) and how to make it. An unmute before that time comes (the
   * transport books starts a look-ahead early) makes it then, on the beat.
   */
  private skippedStarts = new Map<
    string,
    { time: number; start: (time: number) => void }
  >();
  // One silent source per track input while its clips are scheduled (see
  // holdTrackInput).
  private holds = new Map<TrackEngine, ConstantSourceNode>();

  /**
   * Schedule an audio clip to play, handling mid-clip playback.
   * Future clips are scheduled via Transport; mid-clip starts immediately.
   */
  scheduleClip({
    buffer,
    clip,
    trackEngine,
    fromTick,
    bpm,
    pedalInput,
    clipId,
    at,
  }: ScheduleClipOptions): void {
    const startTick = clip.startTick;
    const clipEndTick = startTick + clip.duration;

    // Clip entirely in the past — skip
    if (fromTick >= clipEndTick) return;
    const muted = () => clipId !== undefined && this.mutedClips.has(clipId);

    if (!pedalInput) this.holdTrackInput(trackEngine);

    const secondsPerTick = 60 / bpm / 480;
    const envelope: ClipEnvelope = {
      gain: clipGainOf(clip.gain),
      fadeInSeconds: (clip.fadeInTicks ?? 0) * secondsPerTick,
      fadeOutSeconds: (clip.fadeOutTicks ?? 0) * secondsPerTick,
      clipDurationSeconds: clip.duration * secondsPerTick,
    };
    // Trim offset into the underlying asset, in seconds. Front-trimming a clip
    // advances this; the source must start reading the buffer from here.
    const clipOffsetSeconds = clip.offsetSeconds ?? 0;
    const maxBufferOffset = Math.max(0, buffer.duration - 0.001);

    if (fromTick >= startTick) {
      if (muted()) return;
      // Playhead is at or inside the clip — start immediately. The buffer read
      // position is the clip's trim offset plus how far the playhead already is
      // into the clip; the fade math still uses the in-clip position.
      const playheadSeconds = (fromTick - startTick) * secondsPerTick;
      const safeOffset = Math.min(
        Math.max(0, clipOffsetSeconds + playheadSeconds),
        maxBufferOffset,
      );
      // Stop at the clip's (trimmed) end rather than playing the whole buffer.
      const playDuration = Math.max(
        0,
        envelope.clipDurationSeconds - playheadSeconds,
      );
      this.startSourceNow(
        buffer,
        safeOffset,
        trackEngine,
        pedalInput,
        envelope,
        playheadSeconds,
        playDuration,
        clipId,
        at,
      );
    } else {
      // Clip is in the future — schedule via Transport
      const startOffset = Math.min(
        Math.max(0, clipOffsetSeconds),
        maxBufferOffset,
      );
      // Runs once per tick: the transports clips play on drop Tone's repeated
      // ticks (transportTicks.ts), which would start a clip twice, +6 dB.
      const start = (time: number) =>
        this.startSource(
          buffer,
          startOffset,
          time,
          trackEngine,
          pedalInput,
          envelope,
          envelope.clipDurationSeconds,
          clipId,
        );
      const id = Tone.getTransport().schedule((time) => {
        if (muted()) {
          if (clipId !== undefined) {
            this.skippedStarts.set(clipId, { time, start });
          }
          return;
        }
        start(time);
      }, `${startTick}i`);
      this.scheduledIds.push(id);
      if (clipId !== undefined) {
        const ids = this.idsByClip.get(clipId) ?? [];
        ids.push(id);
        this.idsByClip.set(clipId, ids);
      }
    }
  }

  /**
   * Stop all active sources and clear all scheduled events. With `time`
   * (milestone 1.11: the loop seam, a seek, Stop) the sources fade out over
   * a few milliseconds from then, so what is booked before it still plays and
   * nothing clicks; without it they stop at once, as before.
   */
  cancelAll(time?: number): void {
    const transport = Tone.getTransport();
    for (const id of this.scheduledIds) {
      transport.clear(id);
    }
    this.scheduledIds = [];
    this.idsByClip.clear();

    for (const active of this.activeSources) stopActive(active, time);
    this.activeSources = [];
    this.sourcesByClip.clear();
    this.skippedStarts.clear();

    for (const hold of this.holds.values()) {
      try {
        hold.stop();
        hold.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.holds.clear();
  }

  /**
   * Keep a track's input wired while its clips play. The input is a
   * standardized-audio-context node (Tone's context), which stays "passive",
   * its native outputs unwired, until an active node connects to it through
   * the wrapper. Clip sources are native, so on a track whose instrument does
   * nothing of the kind (a dropped library sample has none) every clip was
   * silent, live and in the bounce. A silent constant source connected
   * through the wrapper keeps it active, as SoundFontAdapter does.
   */
  /**
   * Stop one clip (milestone 1.11): its booked starts are cleared and what it
   * has sounding fades out from `time`. Used when the clip is edited, moved
   * or deleted during playback, before it is scheduled again.
   */
  cancelClip(clipId: string, time?: number): void {
    const transport = Tone.getTransport();
    for (const id of this.idsByClip.get(clipId) ?? []) {
      transport.clear(id);
      const at = this.scheduledIds.indexOf(id);
      if (at >= 0) this.scheduledIds.splice(at, 1);
    }
    this.idsByClip.delete(clipId);
    this.skippedStarts.delete(clipId);
    const sources = this.sourcesByClip.get(clipId);
    if (!sources) return;
    for (const active of sources) {
      stopActive(active, time);
      const at = this.activeSources.indexOf(active);
      if (at >= 0) this.activeSources.splice(at, 1);
    }
    this.sourcesByClip.delete(clipId);
  }

  private holdTrackInput(trackEngine: TrackEngine): void {
    if (this.holds.has(trackEngine)) return;
    try {
      const input = trackEngine.getInputNode();
      const hold = (input.context as BaseAudioContext).createConstantSource();
      hold.offset.value = 0;
      hold.connect(input);
      hold.start();
      this.holds.set(trackEngine, hold);
    } catch (err) {
      console.warn('[AudioClipScheduler] track input hold failed:', err);
    }
  }

  /**
   * The source → (upmix) → (gain) graph for one clip start, built on the
   * destination's own native context. Tone.js nodes are standardized-audio-
   * context wrappers that can't connect to native nodes (same pattern as
   * GuitarFxAdapter), and Tone's global context can't be trusted here: a
   * bounce's transport callbacks fire after Tone.Offline has already handed
   * the global context back to the live one.
   */
  private buildSource(
    audioBuffer: AudioBuffer,
    trackEngine: TrackEngine,
    pedalInputNode: AudioNode | undefined,
    envelope: ClipEnvelope,
  ): {
    ctx: BaseAudioContext;
    source: AudioBufferSourceNode;
    gainNode: GainNode | null;
    fader: GainNode;
  } {
    const target = pedalInputNode ?? trackEngine.getNativeInputNode();
    const ctx =
      (target.context as BaseAudioContext | undefined) ?? nativeToneContext();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    // Unity until the source is cut short, when it fades out (stopActive).
    // A gain of exactly 1 passes the samples unchanged.
    const fader = ctx.createGain();
    fader.connect(target);
    const dest: AudioNode = fader;

    // Upmix mono buffers to stereo so all downstream processing is stereo
    let sourceOut: AudioNode = source;
    if (audioBuffer.numberOfChannels === 1) {
      const upmix = ctx.createGain();
      upmix.channelCount = 2;
      upmix.channelCountMode = 'explicit';
      upmix.channelInterpretation = 'speakers';
      source.connect(upmix);
      sourceOut = upmix;
    }

    const { gain, fadeInSeconds, fadeOutSeconds } = envelope;
    if (gain === 1 && fadeInSeconds <= 0 && fadeOutSeconds <= 0) {
      sourceOut.connect(dest);
      return { ctx, source, gainNode: null, fader };
    }
    const gainNode = ctx.createGain();
    gainNode.gain.value = gain;
    sourceOut.connect(gainNode);
    gainNode.connect(dest);
    return { ctx, source, gainNode, fader };
  }

  /**
   * The clips that are muted now. What a clip just muted has sounding stops.
   * A clip just unmuted whose start was skipped but isn't due yet starts
   * when it is due; the rest of the clips just unmuted are returned, for
   * the caller to start where the transport is if it is inside them (a
   * start that already passed was skipped).
   */
  setMutedClips(clipIds: ReadonlySet<string>): string[] {
    const before = this.mutedClips;
    this.mutedClips = clipIds;
    for (const clipId of clipIds) {
      if (before.has(clipId)) continue;
      for (const { source } of this.sourcesByClip.get(clipId) ?? []) {
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
      }
    }
    const now = Tone.getContext().currentTime;
    const restart: string[] = [];
    for (const clipId of before) {
      if (clipIds.has(clipId)) continue;
      const skipped = this.skippedStarts.get(clipId);
      this.skippedStarts.delete(clipId);
      if (skipped && skipped.time > now) skipped.start(skipped.time);
      else restart.push(clipId);
    }
    return restart;
  }

  /** Track a started source until it ends, so cancelAll can stop it. */
  private track(active: ActiveSource, clipId?: string): void {
    this.activeSources.push(active);
    if (clipId !== undefined) {
      const sources = this.sourcesByClip.get(clipId) ?? new Set();
      sources.add(active);
      this.sourcesByClip.set(clipId, sources);
    }
    active.source.onended = () => {
      const idx = this.activeSources.indexOf(active);
      if (idx >= 0) this.activeSources.splice(idx, 1);
      if (clipId !== undefined) this.sourcesByClip.get(clipId)?.delete(active);
      try {
        active.fader.disconnect();
      } catch {
        /* already disconnected */
      }
    };
  }

  /** Create and start an AudioBufferSourceNode at a scheduled Transport time. */
  private startSource(
    audioBuffer: AudioBuffer,
    offsetSeconds: number,
    time: number,
    trackEngine: TrackEngine,
    pedalInputNode: AudioNode | undefined,
    envelope: ClipEnvelope,
    playDuration = 0,
    clipId?: string,
  ): void {
    try {
      const { source, gainNode, fader } = this.buildSource(
        audioBuffer,
        trackEngine,
        pedalInputNode,
        envelope,
      );

      if (gainNode) {
        const { gain, fadeInSeconds, fadeOutSeconds, clipDurationSeconds } =
          envelope;
        if (fadeInSeconds > 0) {
          gainNode.gain.setValueAtTime(0, time);
          gainNode.gain.linearRampToValueAtTime(gain, time + fadeInSeconds);
        }
        if (fadeOutSeconds > 0 && clipDurationSeconds > 0) {
          const fadeOutStart = time + clipDurationSeconds - fadeOutSeconds;
          gainNode.gain.setValueAtTime(gain, fadeOutStart);
          gainNode.gain.linearRampToValueAtTime(0, time + clipDurationSeconds);
        }
      }

      if (playDuration > 0) {
        source.start(time, offsetSeconds, playDuration);
      } else {
        source.start(time, offsetSeconds);
      }
      this.track({ source, fader }, clipId);
    } catch (err) {
      console.error('[AudioClipScheduler] startSource failed:', err);
    }
  }

  /**
   * Start an AudioBufferSourceNode part-way into its clip (the playhead is
   * inside it): at `at` when the caller knows when the transport is at the
   * playhead, else at once.
   */
  private startSourceNow(
    audioBuffer: AudioBuffer,
    offsetSeconds: number,
    trackEngine: TrackEngine,
    pedalInputNode: AudioNode | undefined,
    envelope: ClipEnvelope,
    currentOffsetSeconds = 0,
    playDuration = 0,
    clipId?: string,
    at?: number,
  ): void {
    try {
      const { ctx, source, gainNode, fader } = this.buildSource(
        audioBuffer,
        trackEngine,
        pedalInputNode,
        envelope,
      );
      const now = at ?? ctx.currentTime;

      if (gainNode) {
        const { gain, fadeInSeconds, fadeOutSeconds, clipDurationSeconds } =
          envelope;
        // Fade in: if we're still within the fade-in region
        if (fadeInSeconds > 0 && currentOffsetSeconds < fadeInSeconds) {
          const progress = currentOffsetSeconds / fadeInSeconds;
          gainNode.gain.setValueAtTime(gain * progress, now);
          gainNode.gain.linearRampToValueAtTime(
            gain,
            now + (fadeInSeconds - currentOffsetSeconds),
          );
        }

        // Fade out
        if (fadeOutSeconds > 0 && clipDurationSeconds > 0) {
          const remainingSeconds = clipDurationSeconds - currentOffsetSeconds;
          const fadeOutStartOffset = clipDurationSeconds - fadeOutSeconds;
          if (currentOffsetSeconds >= fadeOutStartOffset) {
            // Already in the fade-out region
            const progress =
              (clipDurationSeconds - currentOffsetSeconds) / fadeOutSeconds;
            gainNode.gain.setValueAtTime(gain * progress, now);
            gainNode.gain.linearRampToValueAtTime(0, now + remainingSeconds);
          } else {
            const fadeOutStart =
              now + (fadeOutStartOffset - currentOffsetSeconds);
            gainNode.gain.setValueAtTime(gain, fadeOutStart);
            gainNode.gain.linearRampToValueAtTime(
              0,
              fadeOutStart + fadeOutSeconds,
            );
          }
        }
      }

      if (playDuration > 0) {
        source.start(now, offsetSeconds, playDuration);
      } else {
        source.start(now, offsetSeconds);
      }
      this.track({ source, fader }, clipId);
    } catch (err) {
      console.error('[AudioClipScheduler] startSourceNow failed:', err);
    }
  }
}

/**
 * Stop a source: at once without `time`, else with a short fade from `time`
 * (never before the context's clock), and let it go once it has stopped.
 */
function stopActive({ source, fader }: ActiveSource, time?: number): void {
  try {
    if (time === undefined) {
      source.stop();
    } else {
      const from = Math.max(time, fader.context.currentTime);
      fader.gain.cancelScheduledValues(from);
      fader.gain.setValueAtTime(1, from);
      fader.gain.linearRampToValueAtTime(0, from + SOURCE_STOP_FADE_S);
      source.stop(from + SOURCE_STOP_FADE_S);
    }
  } catch {
    /* already stopped */
  }
  if (time === undefined) {
    try {
      source.disconnect();
    } catch {
      /* already disconnected */
    }
  }
}

/** Tone's current context, unwrapped to the native one (a fallback for a
 *  destination that doesn't expose its context). */
function nativeToneContext(): BaseAudioContext {
  const rawCtx = Tone.getContext().rawContext as unknown as {
    _nativeContext?: BaseAudioContext;
  };
  return rawCtx._nativeContext ?? (rawCtx as unknown as BaseAudioContext);
}
