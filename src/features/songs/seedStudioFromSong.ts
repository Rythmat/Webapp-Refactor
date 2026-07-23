import {
  chordRegionsToMidiClip,
  exportSongToChordRegions,
} from '@/curriculum/songLibrary/exportToStudio';
import type { Song } from '@/curriculum/types/songLibrary';
import { useStore } from '@/daw/store';

/**
 * Seed the DAW store from a song's chart: project metadata, key/mode/tempo,
 * chord regions, and a chords MIDI clip. `useStore.getState()` is a module
 * singleton, so this runs outside React — shared by `useSongActions.openInStudio`
 * and the `/studio/editor?song=<id>` boot param (`DawApp`).
 */
export const seedStudioFromSong = (song: Song): void => {
  const { regions, restMap, fermatas, rowSizes } = exportSongToChordRegions(
    song,
    { voicingMode: 'auto', bassLine: false },
  );
  const store = useStore.getState();
  store.setProjectName(song.title);
  store.setComposerName(song.artist);
  store.setRootNote(song.keyRoot % 12);
  store.setMode(song.mode === 'major' ? 'ionian' : song.mode);
  store.setBpm(song.tempo);
  store.setChordRegions(regions);
  if (rowSizes) store.setMeasureRowSizes(rowSizes);
  if (restMap && Object.keys(restMap).length > 0)
    store.setMeasureRestMap(restMap);
  if (fermatas && fermatas.length > 0) store.setMeasureFermatas(fermatas);
  const clip = chordRegionsToMidiClip(regions);
  if (clip) {
    const trackId = store.addTrack(
      'midi',
      'piano-sampler',
      `${song.title} — Chords`,
    );
    store.addMidiClip(trackId, clip);
    store.setLoopRange(0, clip.durationTicks ?? 7680);
  }
  store.setCurrentView('arrange');
};
