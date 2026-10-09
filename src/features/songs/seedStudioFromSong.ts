import {
  chordRegionsToMidiClip,
  exportSongToChordRegions,
} from '@/curriculum/songLibrary/exportToStudio';
import type { Song } from '@/curriculum/types/songLibrary';
import { useStore } from '@/daw/store';

/**
 * Apply a song's chart to the project just reset: project metadata,
 * key/mode/tempo, chord regions, and a chords MIDI clip. `useStore.getState()`
 * is a module singleton, so this runs outside React. It is the apply step of
 * the editor's `?song=<id>[&transpose=<n>]` link (openSession's 'song'
 * intent; the Song page's Open in Studio navigates there), which keeps the
 * work it replaces first, resets the project, and hands this the chart
 * already transposed.
 *
 * Synchronous, and nothing but the song's writes (1.4 CONTRACTS): no reset,
 * no baseline and no undo reset, which are the opener's (openSession
 * switching, then baselining). The song must land on a new project, never on
 * top of the one before: whatever that left (a key lock, which silently kept
 * the song's key out; a loop, a chord record mode, a Score mark, a lesson)
 * would shape this one.
 */
export const applySong = (song: Song): void => {
  const { regions, restMap, fermatas, rowSizes, sectionMarks } =
    exportSongToChordRegions(song, { voicingMode: 'auto', bassLine: false });
  const store = useStore.getState();
  store.setProjectName(song.title);
  store.setComposerName(song.artist);
  store.setRootNote(song.keyRoot % 12);
  // The library writes 'major'/'minor' where the Studio names the mode itself.
  // 'minor' left unmapped is not one of the Studio's MODES, so the key line
  // reads "C minor", the track colour falls back, and every degree derived from
  // the mode is computed against a mode that does not exist.
  store.setMode(
    song.mode === 'major'
      ? 'ionian'
      : song.mode === 'minor'
        ? 'aeolian'
        : song.mode,
  );
  store.setBpm(song.tempo);
  // Without this the Studio opens every song in 4/4, so a 3/4 or 7/4 chart
  // gets four-beat bars drawn over correctly-placed ticks.
  const [beats, unit] = song.timeSignature ?? [4, 4];
  store.setTimeSignature(beats, unit);
  store.setChordRegions(regions);
  if (rowSizes) store.setMeasureRowSizes(rowSizes);
  // The Studio plays the roadmap out bar by bar, so it gets the performed
  // sections and no repeats of its own.
  store.setLeadSheetSections(sectionMarks);
  store.setLeadSheetRepeats([]);
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
