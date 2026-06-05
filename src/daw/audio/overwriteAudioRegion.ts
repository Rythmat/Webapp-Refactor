// ── overwriteAudioRegion.ts ─────────────────────────────────────────────────
// Replace the audio on a track within a time range [fromTick, toTick) with
// silence-by-removal, so a freshly-recorded take "overwrites" whatever it rolls
// over in time. Clips fully inside the range are deleted; clips that straddle a
// boundary are sliced down to the non-overlapping remainder(s); clips that fully
// contain the range are split into a left and a right remainder.
//
// Mirrors the timeline scissors-split approach (Timeline.tsx): the underlying
// AudioBuffer is physically sliced via sliceBuffer and re-stored under fresh
// clip ids, because playback plays a clip's whole buffer (offsetSeconds is not
// honored by the scheduler).

import { useStore } from '@/daw/store';
import {
  getAudioBuffer,
  setAudioBuffer,
  removeAudioBuffer,
  sliceBuffer,
} from '@/daw/audio/AudioBufferStore';
import { ticksToSeconds } from '@/daw/audio/recordingLimit';

function tickToSample(
  tickOffset: number,
  bpm: number,
  sampleRate: number,
  maxSample: number,
): number {
  const seconds = ticksToSeconds(tickOffset, bpm);
  return Math.max(0, Math.min(maxSample, Math.round(seconds * sampleRate)));
}

/**
 * Trim/remove existing audio clips on `trackId` that overlap [fromTick, toTick).
 * `excludeClipId` is the newly-recorded clip itself, which must be left intact.
 */
export function overwriteAudioRegion(
  trackId: string,
  fromTick: number,
  toTick: number,
  ctx: AudioContext,
  bpm: number,
  excludeClipId?: string,
): void {
  if (toTick <= fromTick) return;

  const state = useStore.getState();
  const track = state.tracks.find((t) => t.id === trackId);
  if (!track) return;

  // Snapshot the clips up front; we mutate the store as we go.
  const overlapping = track.audioClips.filter((c) => {
    if (c.id === excludeClipId) return false;
    const clipEnd = c.startTick + c.duration;
    return c.startTick < toTick && clipEnd > fromTick;
  });

  for (const clip of overlapping) {
    const clipEnd = clip.startTick + clip.duration;
    const buffer = getAudioBuffer(clip.id);

    const hasLeft = clip.startTick < fromTick;
    const hasRight = clipEnd > toTick;

    // Fully covered → just remove it.
    if (!hasLeft && !hasRight) {
      state.removeAudioClip(trackId, clip.id);
      removeAudioBuffer(clip.id);
      continue;
    }

    // Without a decoded buffer we can't slice; remove rather than leave audio
    // that bleeds into the overwritten region.
    if (!buffer) {
      state.removeAudioClip(trackId, clip.id);
      removeAudioBuffer(clip.id);
      continue;
    }

    state.removeAudioClip(trackId, clip.id);

    if (hasLeft) {
      const leftTicks = fromTick - clip.startTick;
      const endSample = tickToSample(
        leftTicks,
        bpm,
        buffer.sampleRate,
        buffer.length,
      );
      const leftBuffer = sliceBuffer(ctx, buffer, 0, endSample);
      const leftId = `clip-trim-${crypto.randomUUID().slice(0, 8)}`;
      setAudioBuffer(leftId, leftBuffer);
      state.addAudioClip(trackId, {
        id: leftId,
        startTick: clip.startTick,
        duration: leftTicks,
        fadeInTicks: clip.fadeInTicks,
        fadeOutTicks: 0,
      });
    }

    if (hasRight) {
      const rightStartTicks = toTick - clip.startTick;
      const startSample = tickToSample(
        rightStartTicks,
        bpm,
        buffer.sampleRate,
        buffer.length,
      );
      const rightBuffer = sliceBuffer(ctx, buffer, startSample, buffer.length);
      const rightId = `clip-trim-${crypto.randomUUID().slice(0, 8)}`;
      setAudioBuffer(rightId, rightBuffer);
      state.addAudioClip(trackId, {
        id: rightId,
        startTick: toTick,
        duration: clipEnd - toTick,
        fadeInTicks: 0,
        fadeOutTicks: clip.fadeOutTicks,
      });
    }

    removeAudioBuffer(clip.id);
  }
}
