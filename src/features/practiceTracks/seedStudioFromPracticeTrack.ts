import { noteNameLetter, MODE_DISPLAY } from '@prism/engine';
import { useStore } from '@/daw/store';
import {
  generatePracticeTrack,
  type DiatonicMode,
  type PracticeOpenTrack,
} from './generatePracticeTrack';

/**
 * Seed the DAW store from a diatonic Theory mode + root: project metadata,
 * key/mode/tempo, chord regions, and Bass/Drums/Chords/Melody tracks — one
 * of Chords/Melody (whichever matches `openTrack`) is added empty for the
 * student to fill in themselves. `useStore.getState()` is a module
 * singleton, so this runs outside React — mirrors `seedStudioFromSong`,
 * shared by the Theory "Practice Track" entry points and the
 * `/studio/editor?practiceMode=<mode>&practiceRoot=<root>&practiceOpen=<...>`
 * boot param (`DawApp`).
 *
 * Async because `generatePracticeTrack` fetches + parses the fixed Drums
 * groove's `.mid` file (Studio's own Grooves-browser import pipeline) —
 * callers must `await` this before relying on the seeded tracks.
 */
export const seedStudioFromPracticeTrack = async (
  mode: DiatonicMode,
  root: number,
  openTrack: PracticeOpenTrack,
): Promise<void> => {
  const result = await generatePracticeTrack(mode, root, openTrack);
  const store = useStore.getState();

  const rootLabel = noteNameLetter(60 + result.rootNote);
  const modeLabel = MODE_DISPLAY[result.mode] ?? result.mode;

  store.setProjectName(`${rootLabel} ${modeLabel} Practice Track`);
  store.setRootNote(result.rootNote);
  store.setMode(result.mode);
  store.setBpm(result.bpm);
  store.setChordRegions(result.chordRegions);

  // 'soundfont' + GM program 33 (Electric Bass finger) — a real electric
  // bass guitar timbre, as opposed to 'oracle-synth' (its `BASS` preset is
  // a subtractive synth-bass patch, not a bass guitar) or 'bass-fx' (that
  // instrument is reserved for live audio-input bass tracks — addTrack sets
  // its `audioInputChannel` to a mono input channel, which doesn't apply
  // to a programmed/MIDI track like this one). `addTrack` has no way to set
  // `gmProgram` at creation time, so it's applied with a follow-up
  // `updateTrack` call, mirroring the existing preset-select flow in
  // KeyboardView.tsx and the jam-import path.
  const bassTrackId = store.addTrack('midi', 'soundfont', 'Bass');
  store.updateTrack(bassTrackId, { gmProgram: 33 });
  store.addMidiClip(bassTrackId, result.bassClip);

  const drumsTrackId = store.addTrack('midi', 'drum-machine', 'Drums');
  store.addMidiClip(drumsTrackId, result.beatClip);

  const chordsTrackId = store.addTrack(
    'midi',
    'piano-sampler',
    `Chords — ${rootLabel} ${modeLabel}`,
  );
  if (result.chordsClip) {
    store.addMidiClip(chordsTrackId, result.chordsClip);
  }

  const melodyTrackId = store.addTrack(
    'midi',
    'piano-sampler',
    `Melody — ${rootLabel} ${modeLabel}`,
  );
  if (result.melodyClip) {
    store.addMidiClip(melodyTrackId, result.melodyClip);
  }

  store.setLoopRange(0, result.bassClip.durationTicks ?? 7680);
  store.setCurrentView('arrange');
};
