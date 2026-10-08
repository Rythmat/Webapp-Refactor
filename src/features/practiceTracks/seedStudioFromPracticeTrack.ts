import { noteNameLetter, MODE_DISPLAY } from '@prism/engine';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { markDocumentBaseline } from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import { resetUndoHistory } from '@/daw/store/undoMiddleware';
import type {
  PracticeLevel,
  PracticeTrackResult,
} from './generatePracticeTrack';

/**
 * Open a Theory Practice Track (generatePracticeTrack: a diatonic mode or
 * scale on a root) as a new Studio project: project metadata, key/mode/tempo,
 * chord regions, and Bass/Drums/Chords/Melody tracks — one of Chords/Melody
 * (whichever matches the track's `openTrack`) is added empty for the student
 * to fill in themselves. `useStore.getState()` is a module singleton, so this
 * runs outside React — mirrors `seedStudioFromSong`, for the
 * `/studio/editor?practiceMode=<mode>&practiceRoot=<root>&practiceOpen=<...>`
 * boot param (`DawApp`).
 *
 * Synchronous: the caller generates the track first, since its Drums groove
 * is a fetched `.mid` (Studio's own Grooves-browser import pipeline). The
 * project on screen stays until the practice track is ready, and a groove
 * that fails to arrive replaces nothing. The track starts from a new project
 * (resetProjectState), never on top of the one before.
 *
 * Returns the open track's id. That track is selected, record-armed and
 * monitored, so a MIDI keyboard plays into it and Record captures the take.
 */
export const seedStudioFromPracticeTrack = (
  result: PracticeTrackResult,
  level: PracticeLevel = 1,
): string => {
  resetProjectState('practice');
  const store = useStore.getState();

  const rootLabel = noteNameLetter(60 + result.rootNote);
  const modeLabel =
    result.scaleTitle ?? MODE_DISPLAY[result.mode] ?? result.mode;

  store.setProjectName(
    `${rootLabel} ${modeLabel} Practice Track — Level ${level}`,
  );
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
  if (result.drumKit && result.drumKit !== 'natural') {
    store.setDrumKit(drumsTrackId, result.drumKit);
  }
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

  const openTrackId =
    result.openTrack === 'melody' ? melodyTrackId : chordsTrackId;
  for (const track of useStore.getState().tracks) {
    const isOpen = track.id === openTrackId;
    store.updateTrack(track.id, { recordArmed: isOpen, monitoring: isOpen });
  }
  store.setSelectedTrackId(openTrackId);
  // The practice track as it opened: nothing to undo, and no work to keep
  // until the student plays into it.
  resetUndoHistory();
  markDocumentBaseline();
  return openTrackId;
};
