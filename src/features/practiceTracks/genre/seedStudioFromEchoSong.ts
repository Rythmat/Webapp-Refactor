/**
 * seedStudioFromEchoSong.ts — Load a song made in Echo's Make Your Song
 * (echoSongStudio.ts) into the Studio as a new project, open on the Create
 * view so the student can keep working on it: the key, the tempo, the
 * song's chords on the chord lane, the student's Melody on the piano and
 * Chords on the Rhodes, then the band's own tracks on the sounds the band
 * played them on in the game.
 *
 * Mirrors applyGenrePracticeTrack (its Practice Track counterpart), with
 * the student's tracks full rather than one empty and armed, and no
 * practice screen. Synchronous, and nothing but the song's writes: the
 * reset, the baseline and the undo reset are the opener's (openSession's
 * 'echoSong' intent).
 */

import { getChordColorFromNotes } from '@prism/engine';
import { formatAccidentalsForDisplay } from '@/curriculum/utils/formatAccidentals';
import { trackSound } from '@/daw/instruments/trackSound';
import { useStore } from '@/daw/store';
import { nextChordId, type ChordRegion } from '@/daw/store/prismSlice';
import type { EchoStudioSong } from './echoSongStudio';

/** The song's chords as the Studio's chord lane holds them. */
export function echoChordRegions(song: EchoStudioSong): ChordRegion[] {
  // Any octave of the 1 colors the same; middle C's keeps it plain.
  const root = 60 + song.keyRootPc;
  return song.lane.map((chord) => ({
    id: nextChordId(),
    startTick: chord.startTick,
    endTick: chord.endTick,
    name: chord.label,
    noteName: formatAccidentalsForDisplay(chord.symbol),
    color: getChordColorFromNotes(chord.midis, root, song.mode),
    midis: chord.midis,
  }));
}

/** The student's tracks' instruments: the melody piano, the chords Rhodes. */
export const ECHO_MELODY_INSTRUMENT = 'piano-sampler';
export const ECHO_CHORDS_INSTRUMENT = 'electric-piano';

/**
 * Apply a song to the project just reset. Resolves to the Melody track's
 * id, the one selected.
 */
export function applyEchoSong(song: EchoStudioSong): string {
  const store = useStore.getState();
  store.setProjectName(song.name);
  store.setRootNote(song.keyRootPc);
  store.setMode(song.mode);
  store.setBpm(song.tempo);
  store.setTimeSignature(4, 4);
  store.setChordRegions(echoChordRegions(song), false, 'given');

  const melodyId = store.addTrack('midi', ECHO_MELODY_INSTRUMENT, 'Melody');
  store.addMidiClip(melodyId, song.melody);
  const chordsId = store.addTrack('midi', ECHO_CHORDS_INSTRUMENT, 'Chords');
  store.addMidiClip(chordsId, song.chords);

  // The band: each part on its sound (a kit, a bass voice, a layer's
  // instrument) at its level, as the Practice Track seeds a band's layers.
  for (const part of song.band) {
    const trackId = store.addTrack('midi', 'electric-piano', part.name);
    const { settings, drumKit } = trackSound(trackId, part.sound, song.tempo);
    store.updateTrack(trackId, { ...settings, volume: part.volume });
    if (drumKit) store.setDrumKit(trackId, drumKit);
    store.addMidiClip(trackId, part.clip);
  }

  store.setLoopRange(0, song.length);
  store.setLoopEnabled(true);
  for (const t of useStore.getState().tracks) {
    store.updateTrack(t.id, { recordArmed: false, monitoring: false });
  }
  store.setSelectedTrackId(melodyId);
  store.setCurrentView('arrange');
  return melodyId;
}
