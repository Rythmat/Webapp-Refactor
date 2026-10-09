import { noteNameLetter, MODE_DISPLAY } from '@prism/engine';
import { useStore } from '@/daw/store';
import {
  generatePracticeTrack,
  type PracticeLevel,
  type PracticeMode,
  type PracticeOpenTrack,
} from './generatePracticeTrack';

// ── A Theory Practice Track as a Studio project ────────────────────────────
//
// The editor's `?practiceMode=<mode>&practiceRoot=<root>&practiceOpen=<...>`
// link (openSession's 'practiceMode' intent) opens one in two steps:
//
// - prepare (preparePracticeModeTrack): build the track. Async, since its
//   Drums groove is a fetched `.mid` (Studio's own Grooves-browser import
//   pipeline), and it changes nothing: the project on screen stays until the
//   practice track is ready, and one that can't be built replaces nothing.
// - apply (applyPracticeModeTrack): write it into the store, synchronously,
//   after openSession has reset the project. No reset, no baseline and no
//   undo reset of its own: those are the opener's.

/** A built Theory Practice Track, ready to apply. */
export type PracticeModeTrack = Awaited<
  ReturnType<typeof generatePracticeTrack>
>;

/**
 * Build a Theory Practice Track (a diatonic mode or scale on a root, `root`
 * a 0-11 semitone from C). Changes nothing; rejects when its groove can't be
 * fetched, as generatePracticeTrack does.
 */
export function preparePracticeModeTrack(
  mode: PracticeMode,
  root: number,
  openTrack: PracticeOpenTrack,
  level: PracticeLevel,
): Promise<PracticeModeTrack> {
  return generatePracticeTrack(mode, root, openTrack, level);
}

/**
 * Write a built Practice Track into the (just reset) project: project name,
 * key/mode/tempo, chord regions, and Bass/Drums/Chords/Melody tracks. One of
 * Chords/Melody (whichever `openTrack` names) is added empty for the student
 * to fill in themselves. `useStore.getState()` is a module singleton, so this
 * runs outside React.
 *
 * Returns the open track's id. That track is selected, record-armed and
 * monitored, so a MIDI keyboard plays into it and Record captures the take.
 * The practice screen itself (setPracticeSession, the loop, the view) is the
 * opener's.
 */
export function applyPracticeModeTrack(
  result: PracticeModeTrack,
  opts: { openTrack: PracticeOpenTrack; level: PracticeLevel },
): string {
  const store = useStore.getState();

  const rootLabel = noteNameLetter(60 + result.rootNote);
  const modeLabel =
    result.scaleTitle ?? MODE_DISPLAY[result.mode] ?? result.mode;

  store.setProjectName(
    `${rootLabel} ${modeLabel} Practice Track — Level ${opts.level}`,
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
    opts.openTrack === 'melody' ? melodyTrackId : chordsTrackId;
  for (const track of useStore.getState().tracks) {
    const isOpen = track.id === openTrackId;
    store.updateTrack(track.id, { recordArmed: isOpen, monitoring: isOpen });
  }
  store.setSelectedTrackId(openTrackId);
  return openTrackId;
}
