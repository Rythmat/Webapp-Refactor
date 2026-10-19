/**
 * seedStudioFromGenrePracticeTrack.ts — Load a genre Practice Track into the
 * Studio as a new project: key, tempo, chord lane, the backing tracks, and one
 * empty track for the student, armed and monitored so a MIDI keyboard plays
 * into it and Record captures the take.
 *
 * Mirrors `applyPracticeModeTrack` (its Theory counterpart) and `applySong`.
 * The genre backing arrives already generated in ticks, with no `.mid` file
 * to fetch.
 */

import { trackSound } from '@/daw/instruments/trackSound';
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
 * A guitar lesson's student plays the sampled steel-string acoustic
 * (GUITAR_ACOUSTIC_CONFIG), not the Rhodes; a bass part stays on the bass.
 */
const GUITAR_STUDENT_INSTRUMENT: InstrumentType = 'guitar-acoustic';

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

/**
 * A band layer's track name: the layer's, marked so the style switch can find
 * the band's own tracks again (`swapGenrePracticeBacking`).
 */
const BAND_MARK = ' (band)';
const layerTrackName = (name: string) => `${name}${BAND_MARK}`;

/** The style's band layers on tracks of their own, each on its sound and level. */
function addLayerTracks(track: GenrePracticeTrackResult): void {
  const store = useStore.getState();
  for (const layer of track.layerClips) {
    const trackId = store.addTrack(
      'midi',
      'electric-piano',
      layerTrackName(layer.name),
    );
    const { settings, drumKit } = trackSound(trackId, layer.sound, track.bpm);
    store.updateTrack(trackId, { ...settings, volume: layer.volume });
    if (drumKit) store.setDrumKit(trackId, drumKit);
    store.addMidiClip(trackId, { ...layer.clip, name: layer.name });
  }
}

/** What the student's track is called, by what the section asked them to play. */
function studentTrackName(
  parts: StudentPart[],
  sectionName: string,
  guitar: boolean,
): string {
  if (parts.length > 1)
    return `${sectionName} — ${guitar ? 'Guitar' : 'Rhodes'}`;
  const part = parts[0];
  return part === 'melody' ? 'Melody' : part === 'chords' ? 'Chords' : 'Bass';
}

/**
 * Apply a built genre Practice Track to the project just reset. Resolves to
 * the id of the student's track — the one selected, armed and monitored.
 *
 * Synchronous, and nothing but the practice track's writes (1.4 CONTRACTS):
 * no reset, no baseline and no undo reset, which are the opener's
 * (openSession's 'practiceGenre' intent: switching, then baselining). The
 * track must land on a new project, never on top of the one before.
 */
export function applyGenrePracticeTrack(
  track: GenrePracticeTrackResult,
  genreLabel: string,
  /** The project's name, when not the lesson's ("Funk L2 — Melody …"). */
  projectName?: string,
): string {
  const store = useStore.getState();

  store.setProjectName(
    projectName ??
      `${genreLabel} L${track.level} — ${track.sectionName} Practice Track`,
  );
  store.setRootNote(track.keyRootPc);
  store.setMode(track.mode);
  store.setBpm(track.bpm);
  // The lesson's meter (D-085); a 4/4 track resets one left in 3/4.
  store.setTimeSignature(...(track.timeSignature ?? [4, 4]));
  store.setChordRegions(track.chordRegions, false, 'given');

  for (const [part, instrument] of Object.entries(BACKING_INSTRUMENTS)) {
    const clip = track.clips[part as keyof typeof BACKING_INSTRUMENTS];
    if (!clip) continue;
    const trackId = store.addTrack('midi', instrument, clip.name ?? part);
    store.addMidiClip(trackId, clip);
    applyLessonSound(trackId, instrument, track);
  }

  addLayerTracks(track);

  // The student's part: an empty track, which is the whole invitation.
  const studentPart = track.studentParts[0];
  const onGuitar = !!track.guitar && studentPart !== 'bass';
  const studentInstrument = onGuitar
    ? GUITAR_STUDENT_INSTRUMENT
    : STUDENT_INSTRUMENT[studentPart];
  const studentTrackId = store.addTrack(
    'midi',
    studentInstrument,
    studentTrackName(track.studentParts, track.sectionName, !!track.guitar),
  );
  applyLessonSound(studentTrackId, studentInstrument, track);

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

/** The backing tracks' names, as `buildGenrePracticeTrack` names its clips. */
const PART_NAMES: Record<keyof typeof BACKING_INSTRUMENTS, string> = {
  drums: 'Drums',
  bass: 'Bass',
  chords: 'Chords',
};

/**
 * The groove toggle (D-088): the backing of an open Practice Track swapped for
 * a rebuilt one — another style's drums, bass and comping, another
 * progression, and its meter — leaving the student's track and take alone.
 * The backing tracks are found by the names `applyGenrePracticeTrack` gave
 * them; one the student has since deleted stays deleted.
 *
 * On a band's track (`band: true`, Hear It with Your Band) one style can
 * cover a part the last left to the lesson, or the other way round (Funk
 * Band 1's Pocket comps on a keyboard of its own, its Deep Groove on the
 * lesson's chords): a part the new style doesn't play falls silent rather
 * than play the old progression on, and a part it plays with no track yet
 * gets one. `tempo` moves to the new track's tempo (a band's style plays at
 * its own).
 */
export function swapGenrePracticeBacking(
  track: GenrePracticeTrackResult,
  { tempo = false, band = false }: { tempo?: boolean; band?: boolean } = {},
): void {
  const store = useStore.getState();
  // A style in another key (Latin L1's Mariachi, G major) brings it along.
  store.setRootNote(track.keyRootPc);
  store.setMode(track.mode);
  if (tempo) store.setBpm(track.bpm);
  store.setTimeSignature(...(track.timeSignature ?? [4, 4]));
  store.setChordRegions(track.chordRegions);
  for (const [part, instrument] of Object.entries(BACKING_INSTRUMENTS)) {
    const key = part as keyof typeof BACKING_INSTRUMENTS;
    const clip = track.clips[key];
    const name = clip?.name ?? PART_NAMES[key];
    const target = useStore
      .getState()
      .tracks.find(
        (t) => t.instrument === instrument && t.name === name && !t.recordArmed,
      );
    if (!clip) {
      if (band && target)
        for (const old of target.midiClips)
          store.removeMidiClip(target.id, old.id);
      continue;
    }
    if (!target) {
      if (!band) continue;
      const trackId = store.addTrack('midi', instrument, name);
      store.addMidiClip(trackId, clip);
      applyLessonSound(trackId, instrument, track);
      store.updateTrack(trackId, { recordArmed: false, monitoring: false });
      continue;
    }
    for (const old of target.midiClips) store.removeMidiClip(target.id, old.id);
    store.addMidiClip(target.id, clip);
    if (instrument === 'drum-machine')
      store.setDrumKit(target.id, track.drumKit);
    if (instrument === 'bass-electric')
      store.updateTrack(target.id, { bassVoice: track.bassVoice });
  }
  // The band's own layers: the old style's go, the new style's come in.
  for (const t of useStore.getState().tracks)
    if (t.name.endsWith(BAND_MARK) && !t.recordArmed) store.removeTrack(t.id);
  addLayerTracks(track);
  store.setLoopRange(0, track.loopTicks);
}
