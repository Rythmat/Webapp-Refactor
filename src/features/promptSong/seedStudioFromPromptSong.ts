import { useStore } from '@/daw/store';
import { applyGenrePracticeTrack } from '@/features/practiceTracks/genre/seedStudioFromGenrePracticeTrack';
import type { PromptSong } from './buildPromptSong';

/** The empty track left for the student's own idea over the band. */
export const IDEA_TRACK_NAME = 'Your idea';

/**
 * Apply a prompt's song to the project just reset: its name, key, mode,
 * tempo and chord lane, the Drums (the band's or a library groove), Bass
 * and Chords tracks (and any
 * layers of its own), looped, and an empty "Your idea" track on the piano,
 * selected, armed and monitored, so a keyboard plays into it at once and
 * nothing records until Record. It opens as a project, in the arrange view,
 * not on the Practice screen. Resolves to the idea track's id.
 *
 * Synchronous, and nothing but the song's writes (1.4 CONTRACTS): the
 * reset, the baseline and the undo reset are the opener's (openSession's
 * 'prompt' intent).
 */
export function applyPromptSong(song: PromptSong): string {
  const ideaTrackId = applyGenrePracticeTrack(
    song.track,
    song.genreLabel,
    song.projectName,
    {
      studentTrackName: IDEA_TRACK_NAME,
      studentSound: 'piano-sampler',
      markBandLayers: false,
    },
  );
  // A library groove's clip carries its name ("Funk 1"), which the seeding
  // gave its track too; the track is the Drums, as the band's would be.
  const groove = song.reading.groove;
  if (groove) {
    const store = useStore.getState();
    const drums = store.tracks.find(
      (t) => t.name === groove && t.instrument === 'drum-machine',
    );
    if (drums) store.updateTrack(drums.id, { name: 'Drums' });
  }
  // A 12-bar blues loops its twelve bars, not the engine's sixteen.
  if (song.loopTicks !== song.track.loopTicks) {
    useStore.getState().setLoopRange(0, song.loopTicks);
  }
  return ideaTrackId;
}
