/**
 * seedStudioFromGenrePracticeTrack.ts — Load a genre Practice Track into the
 * Studio: key, tempo, chord lane, the backing tracks, and one empty track for
 * the student, armed and monitored so a MIDI keyboard plays into it and Record
 * captures the take.
 *
 * Mirrors `seedStudioFromPracticeTrack` (its Theory counterpart) and
 * `seedStudioFromSong`. Synchronous, unlike the Theory one: the genre backing
 * arrives already generated in ticks, with no `.mid` file to fetch.
 */

import { useStore } from '@/daw/store';
import type { InstrumentType } from '@/daw/store/tracksSlice';
import type {
  GenrePracticeTrackResult,
  StudentPart,
} from './buildGenrePracticeTrack';

/**
 * The instrument each part plays.
 *
 * The backing matches the lesson the student just finished: `drum-machine` is
 * literally the same engine the lesson plays (DrumMachineEngine), and
 * `electric-piano` and `bass-electric` are the same FluidR3 EP1 and sampled
 * bass guitar the lesson's chords and bass come out of. So the Practice Track
 * sounds like the thing it grew out of rather than a General MIDI impression
 * of it.
 *
 * The student's own part follows the instrument it is: a bass line plays on a
 * bass, and everything else on the Rhodes.
 */
const BACKING_INSTRUMENTS = {
  drums: 'drum-machine',
  bass: 'bass-electric',
  chords: 'electric-piano',
} satisfies Record<string, InstrumentType>;

const STUDENT_INSTRUMENT: Record<StudentPart, InstrumentType> = {
  melody: 'electric-piano',
  chords: 'electric-piano',
  bass: 'bass-electric',
};

/**
 * The lesson's kit and bass sound on a new track: the drums get the
 * play-along's kit (Hip Hop's 808 or house), a bass track its bass (Pop
 * Fretless, Funk and Hip Hop Finger electric, Hip Hop's 808 or Upright).
 */
function applyLessonSound(
  trackId: string,
  instrument: InstrumentType,
  track: GenrePracticeTrackResult,
): void {
  const store = useStore.getState();
  if (instrument === 'drum-machine' && track.drumKit !== 'natural') {
    store.setDrumKit(trackId, track.drumKit);
  }
  if (instrument === 'bass-electric' && track.bassVoice) {
    store.updateTrack(trackId, { bassVoice: track.bassVoice });
  }
}

/** What the student's track is called, by what the section asked them to play. */
function studentTrackName(parts: StudentPart[], sectionName: string): string {
  if (parts.length > 1) return `${sectionName} — Rhodes`;
  const part = parts[0];
  return part === 'melody' ? 'Melody' : part === 'chords' ? 'Chords' : 'Bass';
}

/**
 * Seed the Studio from a built genre Practice Track. Resolves to the id of the
 * student's track — the one selected, armed and monitored.
 */
export function seedStudioFromGenrePracticeTrack(
  track: GenrePracticeTrackResult,
  genreLabel: string,
): string {
  const store = useStore.getState();

  store.setProjectName(
    `${genreLabel} L${track.level} — ${track.sectionName} Practice Track`,
  );
  store.setRootNote(track.keyRootPc);
  store.setMode(track.mode);
  store.setBpm(track.bpm);
  store.setChordRegions(track.chordRegions);

  for (const [part, instrument] of Object.entries(BACKING_INSTRUMENTS)) {
    const clip = track.clips[part as keyof typeof BACKING_INSTRUMENTS];
    if (!clip) continue;
    const trackId = store.addTrack('midi', instrument, clip.name ?? part);
    store.addMidiClip(trackId, clip);
    applyLessonSound(trackId, instrument, track);
  }

  // The student's part: an empty track, which is the whole invitation.
  const studentPart = track.studentParts[0];
  const studentTrackId = store.addTrack(
    'midi',
    STUDENT_INSTRUMENT[studentPart],
    studentTrackName(track.studentParts, track.sectionName),
  );
  applyLessonSound(studentTrackId, STUDENT_INSTRUMENT[studentPart], track);

  store.setLoopRange(0, track.loopTicks);
  store.setLoopEnabled(true);
  store.setCurrentView('arrange');

  for (const t of useStore.getState().tracks) {
    const isStudent = t.id === studentTrackId;
    store.updateTrack(t.id, {
      recordArmed: isStudent,
      monitoring: isStudent,
    });
  }
  store.setSelectedTrackId(studentTrackId);
  return studentTrackId;
}
