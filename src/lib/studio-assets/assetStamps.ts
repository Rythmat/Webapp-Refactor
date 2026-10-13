import { useStore, type Track } from '@/daw/store';
import { rewriteHistory, withoutHistory } from '@/daw/store/history';

// ── Asset ids on clips and samples ─────────────────────────────────────────
//
// Writing an uploaded asset's id onto the clip or sample it holds (or taking
// it off again) is the editor's own bookkeeping, not an edit: undo leaves it
// out. The undo history's copies of the clip get it too, so undoing or
// redoing the recording that made a take never brings the take back without
// its asset, and the first ⌘Z after a recording undoes the recording, not an
// invisible stamp (state-reload-22).

type AssetId = string | null | undefined;

/** `tracks` with clip `clipId` given `assetId` where `when` holds; the same
 *  array when nothing changes. */
function withClipAsset(
  tracks: Track[],
  clipId: string,
  assetId: string | null,
  when: (current: AssetId) => boolean,
): Track[] {
  let changed = false;
  const next = tracks.map((track) => {
    const index = track.audioClips.findIndex((c) => c.id === clipId);
    if (index === -1) return track;
    const clip = track.audioClips[index];
    if (clip.assetId === assetId || !when(clip.assetId)) return track;
    changed = true;
    const audioClips = [...track.audioClips];
    audioClips[index] = { ...clip, assetId };
    return { ...track, audioClips };
  });
  return changed ? next : tracks;
}

/** `tracks` with the sample `sampleId` given `assetId` where `when` holds. */
function withSampleAsset(
  tracks: Track[],
  sampleId: string,
  assetId: string | null,
  when: (current: AssetId) => boolean,
): Track[] {
  let changed = false;
  const next = tracks.map((track) => {
    const sample = track.samplerSample;
    if (sample?.sampleId !== sampleId) return track;
    if (sample.assetId === assetId || !when(sample.assetId)) return track;
    changed = true;
    return { ...track, samplerSample: { ...sample, assetId } };
  });
  return changed ? next : tracks;
}

/**
 * Sets an audio clip's asset id where `when` holds for the one it has now,
 * in the project and in its undo history. Returns whether the project's clip
 * changed.
 */
export function stampClipAsset(
  trackId: string,
  clipId: string,
  assetId: string | null,
  when: (current: AssetId) => boolean,
): boolean {
  const state = useStore.getState();
  const clip = state.tracks
    .find((t) => t.id === trackId)
    ?.audioClips.find((c) => c.id === clipId);
  const stamped = !!clip && clip.assetId !== assetId && when(clip.assetId);
  if (stamped) {
    withoutHistory(() =>
      useStore.getState().updateAudioClip(trackId, clipId, { assetId }),
    );
  }
  rewriteHistory('tracks', (tracks) =>
    withClipAsset(tracks, clipId, assetId, when),
  );
  return stamped;
}

/**
 * Sets a sampler sample's asset id where `when` holds for the one it has
 * now, in the project and in its undo history. Returns whether the project's
 * sample changed.
 */
export function stampSampleAsset(
  trackId: string,
  sampleId: string,
  assetId: string | null,
  when: (current: AssetId) => boolean,
): boolean {
  const current = useStore
    .getState()
    .tracks.find((t) => t.id === trackId)?.samplerSample;
  const stamped =
    current?.sampleId === sampleId &&
    current.assetId !== assetId &&
    when(current.assetId);
  if (stamped) {
    withoutHistory(() =>
      useStore.getState().setSamplerSample(trackId, { ...current, assetId }),
    );
  }
  rewriteHistory('tracks', (tracks) =>
    withSampleAsset(tracks, sampleId, assetId, when),
  );
  return stamped;
}
