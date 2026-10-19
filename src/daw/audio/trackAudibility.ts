import type { Track } from '@/daw/store/tracksSlice';

/**
 * Whether a track should be heard: not muted, and — once any track is soloed —
 * soloed itself. Mute and solo are per-user-local (see tracksSlice), so this is
 * evaluated against the local track list, for live playback and bounces alike.
 */
export function isTrackAudible(
  track: Pick<Track, 'mute' | 'solo'>,
  tracks: ReadonlyArray<Pick<Track, 'solo'>>,
): boolean {
  if (track.mute) return false;
  return track.solo || !tracks.some((t) => t.solo);
}

/**
 * The ids of every muted clip (milestone 2.12), MIDI and audio: they stay in
 * place but play nothing, live or in a bounce. Unlike a track's mute, a
 * clip's is part of the song, shared with collaborators.
 */
export function mutedClipIds(
  tracks: ReadonlyArray<Pick<Track, 'midiClips' | 'audioClips'>>,
): Set<string> {
  const ids = new Set<string>();
  for (const track of tracks) {
    for (const clip of track.midiClips) if (clip.muted) ids.add(clip.id);
    for (const clip of track.audioClips) if (clip.muted) ids.add(clip.id);
  }
  return ids;
}
