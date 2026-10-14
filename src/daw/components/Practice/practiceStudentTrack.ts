import type { AllSlices } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import type { PracticeSession } from '@/daw/store/uiSlice';

/**
 * The track the student plays and records on the practice screen: the one
 * its session names (the seed's student track), never just whichever track
 * the Studio has selected since (practice-tutorial-11). A session that names
 * none, or a track that has gone, falls back to the first record-armed MIDI
 * track, then to the selected one.
 */
export function practiceStudentTrack(
  state: AllSlices,
  session: PracticeSession,
): Track | null {
  const { tracks } = state;
  const own = session.studentTrackId
    ? tracks.find((t) => t.id === session.studentTrackId && t.type === 'midi')
    : undefined;
  return (
    own ??
    tracks.find((t) => t.recordArmed && t.type === 'midi') ??
    tracks.find((t) => t.id === state.selectedTrackId) ??
    null
  );
}
