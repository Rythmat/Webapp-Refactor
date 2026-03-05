// ── AudioClipScheduler ──────────────────────────────────────────────────────
// Schedules AudioBufferSourceNodes for audio clip playback.
//
// Future clips use Tone.Transport.schedule() for stable audio-thread timing.
// Mid-clip playback uses direct source.start() for immediate offset playback.
// All audio operations are wrapped in try/catch to prevent crashes.

import * as Tone from 'tone';
import type { TrackEngine } from './TrackEngine';

export class AudioClipScheduler {
  private scheduledIds: number[] = [];
  private activeSources: AudioBufferSourceNode[] = [];

  /**
   * Schedule an audio clip to play, handling mid-clip playback.
   * Future clips are scheduled via Transport; mid-clip starts immediately.
   *
   * @param pedalInputNode  Optional native pedal chain input for Guitar/Bass tracks.
   *                        When provided, playback audio is routed through the pedal chain
   *                        for real-time amp/effect processing. Falls back to TrackEngine input.
   */
  scheduleClip(
    audioBuffer: AudioBuffer,
    startTick: number,
    durationTicks: number,
    trackEngine: TrackEngine,
    currentTick: number,
    bpm: number,
    pedalInputNode?: AudioNode,
    fadeInTicks = 0,
    fadeOutTicks = 0,
  ): void {
    const clipEndTick = startTick + durationTicks;

    // Clip entirely in the past — skip
    if (currentTick >= clipEndTick) return;

    const clipDurationSeconds = (durationTicks / 480) * (60 / bpm);
    const fadeInSeconds = (fadeInTicks / 480) * (60 / bpm);
    const fadeOutSeconds = (fadeOutTicks / 480) * (60 / bpm);

    if (currentTick >= startTick) {
      // Playhead is at or inside the clip — start immediately with offset
      const offsetTicks = currentTick - startTick;
      const offsetSeconds = (offsetTicks / 480) * (60 / bpm);
      // Clamp to buffer duration to prevent RangeError
      const safeOffset = Math.min(
        Math.max(0, offsetSeconds),
        Math.max(0, audioBuffer.duration - 0.001),
      );
      this.startSourceNow(
        audioBuffer,
        safeOffset,
        trackEngine,
        pedalInputNode,
        fadeInSeconds,
        fadeOutSeconds,
        offsetSeconds,
        clipDurationSeconds,
      );
    } else {
      // Clip is in the future — schedule via Transport
      const id = Tone.getTransport().schedule((time) => {
        this.startSource(
          audioBuffer,
          0,
          time,
          trackEngine,
          pedalInputNode,
          fadeInSeconds,
          fadeOutSeconds,
          clipDurationSeconds,
        );
      }, `${startTick}i`);
      this.scheduledIds.push(id);
    }
  }

  /** Stop all active sources and clear all scheduled events. */
  cancelAll(): void {
    const transport = Tone.getTransport();
    for (const id of this.scheduledIds) {
      transport.clear(id);
    }
    this.scheduledIds = [];

    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      try {
        source.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    this.activeSources = [];
  }

  /** Create and start an AudioBufferSourceNode at a scheduled Transport time. */
  private startSource(
    audioBuffer: AudioBuffer,
    offsetSeconds: number,
    time: number,
    trackEngine: TrackEngine,
    pedalInputNode?: AudioNode,
    fadeInSeconds = 0,
    fadeOutSeconds = 0,
    clipDurationSeconds = 0,
  ): void {
    try {
      // Extract true native AudioContext — Tone.js rawContext is a
      // standardized-audio-context wrapper; its nodes can't connect to
      // native nodes from getNativeInputNode(). Same pattern as GuitarFxAdapter.
      const rawCtx = Tone.getContext().rawContext;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (rawCtx as any)._nativeContext ?? (rawCtx as AudioContext);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

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

      const dest = pedalInputNode ?? trackEngine.getNativeInputNode();

      if (fadeInSeconds > 0 || fadeOutSeconds > 0) {
        const gainNode = ctx.createGain();
        sourceOut.connect(gainNode);
        gainNode.connect(dest);

        if (fadeInSeconds > 0) {
          gainNode.gain.setValueAtTime(0, time);
          gainNode.gain.linearRampToValueAtTime(1, time + fadeInSeconds);
        }
        if (fadeOutSeconds > 0 && clipDurationSeconds > 0) {
          const fadeOutStart = time + clipDurationSeconds - fadeOutSeconds;
          gainNode.gain.setValueAtTime(1, fadeOutStart);
          gainNode.gain.linearRampToValueAtTime(0, time + clipDurationSeconds);
        }
      } else {
        sourceOut.connect(dest);
      }

      source.start(time, offsetSeconds);
      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx >= 0) this.activeSources.splice(idx, 1);
      };
    } catch (err) {
      console.error('[AudioClipScheduler] startSource failed:', err);
    }
  }

  /** Start an AudioBufferSourceNode immediately (for mid-clip playback). */
  private startSourceNow(
    audioBuffer: AudioBuffer,
    offsetSeconds: number,
    trackEngine: TrackEngine,
    pedalInputNode?: AudioNode,
    fadeInSeconds = 0,
    fadeOutSeconds = 0,
    currentOffsetSeconds = 0,
    clipDurationSeconds = 0,
  ): void {
    try {
      // Extract true native AudioContext (same as startSource above)
      const rawCtx = Tone.getContext().rawContext;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (rawCtx as any)._nativeContext ?? (rawCtx as AudioContext);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

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

      const dest = pedalInputNode ?? trackEngine.getNativeInputNode();
      const now = ctx.currentTime;

      if (fadeInSeconds > 0 || fadeOutSeconds > 0) {
        const gainNode = ctx.createGain();
        sourceOut.connect(gainNode);
        gainNode.connect(dest);

        // Fade in: if we're still within the fade-in region
        if (fadeInSeconds > 0 && currentOffsetSeconds < fadeInSeconds) {
          const progress = currentOffsetSeconds / fadeInSeconds;
          gainNode.gain.setValueAtTime(progress, now);
          gainNode.gain.linearRampToValueAtTime(
            1,
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
            gainNode.gain.setValueAtTime(progress, now);
            gainNode.gain.linearRampToValueAtTime(0, now + remainingSeconds);
          } else {
            const fadeOutStart =
              now + (fadeOutStartOffset - currentOffsetSeconds);
            gainNode.gain.setValueAtTime(1, fadeOutStart);
            gainNode.gain.linearRampToValueAtTime(
              0,
              fadeOutStart + fadeOutSeconds,
            );
          }
        }
      } else {
        sourceOut.connect(dest);
      }

      source.start(now, offsetSeconds);
      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx >= 0) this.activeSources.splice(idx, 1);
      };
    } catch (err) {
      console.error('[AudioClipScheduler] startSourceNow failed:', err);
    }
  }
}
