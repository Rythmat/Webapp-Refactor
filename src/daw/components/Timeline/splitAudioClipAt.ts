import { useStore } from '@/daw/store';
import { shareClipAudio } from '@/daw/audio/AudioBufferStore';
import { splitAudioClip } from '@/daw/audio/audioClipCuts';

/**
 * Split the audio clip `clipId` on `trackId` at song tick `splitTick`: the
 * scissors tool and Split at Playhead. Non-destructive (see audioClipCuts.ts):
 * both halves play the clip's recording, the new right half shares the audio
 * already loaded for the clip, and nothing is evicted, so undo brings back a
 * clip that still plays and an uploaded take keeps its asset. One store write,
 * one undo step. Returns the right half's id, or null when nothing was split
 * (no such clip, the tick isn't inside it, or the track is locked).
 */
export function splitAudioClipAt(
  trackId: string,
  clipId: string,
  splitTick: number,
): string | null {
  const state = useStore.getState();
  const track = state.tracks.find((t) => t.id === trackId);
  const clip = track?.audioClips.find((c) => c.id === clipId);
  if (!track || !clip) return null;

  const rightId = `clip-split-${crypto.randomUUID().slice(0, 8)}`;
  const halves = splitAudioClip(clip, splitTick, state.bpm, rightId);
  if (!halves) return null;

  state.updateTrack(trackId, {
    audioClips: track.audioClips.flatMap((c) =>
      c.id === clip.id ? halves : c,
    ),
  });
  // A collaborator's track lock turns the write into a no-op, so the audio
  // store is touched only once the halves are in (nothing is left behind for
  // a clip that never landed). Both happen before React renders the halves.
  const landed = useStore
    .getState()
    .tracks.some(
      (t) => t.id === trackId && t.audioClips.some((c) => c.id === rightId),
    );
  if (!landed) return null;
  shareClipAudio(clip.id, rightId);
  return rightId;
}
