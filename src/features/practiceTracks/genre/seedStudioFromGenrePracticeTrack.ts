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

import { soundSettings, trackSound } from '@/daw/instruments/trackSound';
import { useStore } from '@/daw/store';
import type {
  GenrePracticeTrackResult,
  StudentPart,
} from './buildGenrePracticeTrack';

/**
 * The sound each part plays (soundString.ts).
 *
 * The backing matches the lesson the student just finished: the drums play on
 * the lesson's own drum machine, and the chords and bass on the electric
 * piano and bass guitar the lesson's come out of. Those are no longer Studio
 * track types (2026-10-22), so they open as Instruments tracks playing the
 * same instruments, in General MIDI (trackSound's soundSettings).
 *
 * The student's own part follows the instrument it is: a bass line plays on a
 * bass, and everything else on the Rhodes.
 */
const BACKING_SOUNDS = {
  drums: 'drum-machine',
  bass: 'bass-electric',
  chords: 'electric-piano',
} as const;

const STUDENT_SOUND: Record<StudentPart, string> = {
  melody: 'electric-piano',
  chords: 'electric-piano',
  bass: 'bass-electric',
};

/** A guitar lesson's student plays a steel-string acoustic, not the Rhodes. */
const GUITAR_STUDENT_SOUND = 'guitar-acoustic';

/**
 * A part's sound with the lesson's in it: the drums get the play-along's kit
 * (Hip Hop's 808 or house), a bass its voice (Pop Fretless, Funk and Hip Hop
 * Finger electric, Hip Hop's 808 or Upright).
 */
function lessonSound(sound: string, track: GenrePracticeTrackResult): string {
  if (sound === 'drum-machine') return `drum-machine:${track.drumKit}`;
  if (sound === 'bass-electric' && track.bassVoice) {
    return `bass-electric:${track.bassVoice}`;
  }
  return sound;
}

/** A new track playing `sound` (with the lesson's kit or bass voice). */
function addSoundTrack(
  sound: string,
  name: string,
  track: GenrePracticeTrackResult,
): string {
  const store = useStore.getState();
  const { settings, drumKit } = soundSettings(lessonSound(sound, track));
  const trackId = store.addTrack('midi', settings.instrument ?? 'none', name, {
    gmProgram: settings.gmProgram,
  });
  if (drumKit && drumKit !== 'natural') store.setDrumKit(trackId, drumKit);
  return trackId;
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
      'soundfont',
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

  for (const [part, sound] of Object.entries(BACKING_SOUNDS)) {
    const clip = track.clips[part as keyof typeof BACKING_SOUNDS];
    if (!clip) continue;
    const trackId = addSoundTrack(sound, clip.name ?? part, track);
    store.addMidiClip(trackId, clip);
  }

  addLayerTracks(track);

  // The student's part: an empty track, which is the whole invitation.
  const studentPart = track.studentParts[0];
  const onGuitar = !!track.guitar && studentPart !== 'bass';
  const studentTrackId = addSoundTrack(
    onGuitar ? GUITAR_STUDENT_SOUND : STUDENT_SOUND[studentPart],
    studentTrackName(track.studentParts, track.sectionName, !!track.guitar),
    track,
  );

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
const PART_NAMES: Record<keyof typeof BACKING_SOUNDS, string> = {
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
  for (const [part, sound] of Object.entries(BACKING_SOUNDS)) {
    const key = part as keyof typeof BACKING_SOUNDS;
    const clip = track.clips[key];
    const name = clip?.name ?? PART_NAMES[key];
    // The backing track by its name and its kind of instrument (the bass and
    // the chords are both Instruments tracks, so the name tells them apart).
    const { settings, drumKit } = soundSettings(lessonSound(sound, track));
    const target = useStore
      .getState()
      .tracks.find(
        (t) =>
          t.instrument === settings.instrument &&
          t.name === name &&
          !t.recordArmed,
      );
    if (!clip) {
      if (band && target)
        for (const old of target.midiClips)
          store.removeMidiClip(target.id, old.id);
      continue;
    }
    if (!target) {
      if (!band) continue;
      const trackId = addSoundTrack(sound, name, track);
      store.addMidiClip(trackId, clip);
      store.updateTrack(trackId, { recordArmed: false, monitoring: false });
      continue;
    }
    for (const old of target.midiClips) store.removeMidiClip(target.id, old.id);
    store.addMidiClip(target.id, clip);
    // The new style's kit, or its bass voice as the bass's program.
    if (drumKit) store.setDrumKit(target.id, drumKit);
    if (settings.gmProgram !== undefined) {
      store.updateTrack(target.id, { gmProgram: settings.gmProgram });
    }
  }
  // The band's own layers: the old style's go, the new style's come in.
  for (const t of useStore.getState().tracks)
    if (t.name.endsWith(BAND_MARK) && !t.recordArmed) store.removeTrack(t.id);
  addLayerTracks(track);
  store.setLoopRange(0, track.loopTicks);
}
