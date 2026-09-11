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
