// ── overwriteAudioRegion.ts ─────────────────────────────────────────────────
// Clear the audio on a track within a time range [fromTick, toTick), so a
// freshly-recorded take "overwrites" whatever it rolls over in time. Clips
// fully inside the range are removed; clips that straddle a boundary keep the
// part outside it; clips that fully contain the range keep a left and a right
// remainder.
//
// Non-destructive, like the timeline's split (see audioClipCuts.ts): a
// remainder is the old clip with a narrower window into the same recording,
// so it keeps the clip's assetId, gain, outer fades and decoded audio. Nothing
// is evicted, so undoing the take brings the old clip back still playing, and
// a remainder of an uploaded take survives a reload (its assetId is kept).

import { useStore } from '@/daw/store';
import { shareClipAudio } from '@/daw/audio/AudioBufferStore';
import { clearAudioRange } from '@/daw/audio/audioClipCuts';

/**
 * Trim/remove existing audio clips on `trackId` that overlap [fromTick, toTick).
 * `excludeClipId` is the newly-recorded clip itself, which must be left intact.
 * The audio context is no longer needed (nothing is sliced); the parameter
 * stays so the recording path's call keeps compiling.
 */
export function overwriteAudioRegion(
  trackId: string,
  fromTick: number,
  toTick: number,
  _ctx: AudioContext,
  bpm: number,
  excludeClipId?: string,
): void {
  if (toTick <= fromTick) return;

  const state = useStore.getState();
  const track = state.tracks.find((t) => t.id === trackId);
  if (!track) return;

  const cleared = clearAudioRange(
    track.audioClips,
    fromTick,
    toTick,
    bpm,
    () => `clip-trim-${crypto.randomUUID().slice(0, 8)}`,
    excludeClipId,
  );
  if (!cleared.changed) return;

  // One write for the whole overwrite, so it lands as a single undo step with
  // the take instead of a remove and an add per clip.
  state.updateTrack(trackId, { audioClips: cleared.clips });

  // A take inside a clip leaves a right remainder under a new id; it plays
  // (and, if never uploaded, uploads) the same recording as the clip. Shared
  // only once it landed: a collaborator's track lock turns the write into a
  // no-op, and nothing should be left behind for a clip that isn't there.
  const landed = new Set(
    useStore
      .getState()
      .tracks.find((t) => t.id === trackId)
      ?.audioClips.map((c) => c.id),
  );
  for (const { from, to } of cleared.shared) {
    if (landed.has(to)) shareClipAudio(from, to);
  }
}
