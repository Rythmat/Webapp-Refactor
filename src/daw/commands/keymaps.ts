import { TYPING_NOTE_CODES } from './musicalTypingMap';
import { defineCommand, defineScope } from './registry';

// ── Every shortcut in the editor (milestone 1.6) ───────────────────────────
//
// The scopes and their commands, declared once; registry.ts says how a key
// press picks one. The order here is the '?' sheet's. A component binds what
// each command does with useKeymap(scope, handlers).
//
// Rules every binding keeps (plan, integration rules):
// - ⌘+, ⌘− and ⌘0 are the browser's page zoom and are never bound: the
//   timeline zooms with ⌥= / ⌥− and Ctrl or ⌘ with the wheel.
// - Nothing is on an F key only, and Backspace does what Delete does, since
//   a Chromebook has neither F keys nor a Delete key.
// - ⌥ combos are matched by e.code (Option rewrites the letter on a Mac).
// - ⌘N, ⌘T, ⌘W and ⌘1–⌘8 are Chrome's and never bound; Alt+1–8 are the
//   Chromebook shelf's.

// ── Dialogs ──────────────────────────────────────────────────────────────

export const PRISM_SCOPE = defineScope({
  id: 'prism',
  label: 'Prism suggestions',
  level: 'dialog',
  passThrough: ['project.save', 'edit.undo', 'edit.redo'],
});

defineCommand({
  id: 'prism.previous',
  scope: 'prism',
  label: 'Previous suggestion',
  keys: ['ArrowLeft'],
});
defineCommand({
  id: 'prism.next',
  scope: 'prism',
  label: 'Next suggestion',
  keys: ['ArrowRight'],
});
defineCommand({
  id: 'prism.pick',
  scope: 'prism',
  label: 'Go to suggestion 1–9',
  keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  keysLabel: '1–9',
});
defineCommand({
  id: 'prism.preview',
  scope: 'prism',
  label: 'Play or stop the preview',
  keys: ['Space'],
});
defineCommand({
  id: 'prism.reroll',
  scope: 'prism',
  label: 'Re-roll',
  keys: ['KeyR'],
});
defineCommand({
  id: 'prism.commit',
  scope: 'prism',
  label: 'Use this suggestion',
  keys: ['Enter'],
});
defineCommand({
  id: 'prism.close',
  scope: 'prism',
  label: 'Close',
  keys: ['Escape'],
});

/** The modal piano roll: an editor with no transport of its own. */
export const NOTE_EDITOR_SCOPE = defineScope({
  id: 'noteEditor',
  label: 'Piano roll window',
  level: 'dialog',
  passThrough: [
    'project.save',
    'edit.undo',
    'edit.redo',
    'transport.playPause',
    'browser.selectAll',
    'browser.bookmark',
    'typing',
  ],
});

/** The pop-out synth and other full-window devices. Not modal. */
export const POP_OUT_SCOPE = defineScope({
  id: 'popOut',
  label: 'Pop-out window',
  level: 'dialog',
});

defineCommand({
  id: 'popOut.close',
  scope: 'popOut',
  label: 'Close the window',
  keys: ['Escape'],
});

// ── Musical typing ───────────────────────────────────────────────────────

export const TYPING_SCOPE = defineScope({
  id: 'typing',
  label: 'Computer keyboard (while it’s on)',
  level: 'typing',
});

defineCommand({
  id: 'typing.note',
  scope: 'typing',
  label: 'Play notes (W E T Y U O P are the black keys)',
  keys: TYPING_NOTE_CODES,
  keysLabel: 'A – ;',
});
defineCommand({
  id: 'typing.octaveDown',
  scope: 'typing',
  label: 'Octave down',
  keys: ['KeyZ'],
});
defineCommand({
  id: 'typing.octaveUp',
  scope: 'typing',
  label: 'Octave up',
  keys: ['KeyX'],
});
defineCommand({
  id: 'typing.softer',
  scope: 'typing',
  label: 'Softer',
  keys: ['KeyC'],
});
defineCommand({
  id: 'typing.louder',
  scope: 'typing',
  label: 'Louder',
  keys: ['KeyV'],
});
defineCommand({
  id: 'typing.off',
  scope: 'typing',
  label: 'Turn the computer keyboard off',
  keys: ['Backquote'],
});

// ── Focused regions ──────────────────────────────────────────────────────

export const PIANO_ROLL_SCOPE = defineScope({
  id: 'pianoRoll',
  label: 'Piano roll',
  level: 'region',
});

defineCommand({
  id: 'pianoRoll.select',
  scope: 'pianoRoll',
  label: 'Select tool',
  keys: ['KeyV'],
});
defineCommand({
  id: 'pianoRoll.draw',
  scope: 'pianoRoll',
  label: 'Draw tool',
  keys: ['KeyD'],
});
defineCommand({
  id: 'pianoRoll.erase',
  scope: 'pianoRoll',
  label: 'Erase tool',
  keys: ['KeyE'],
});
defineCommand({
  id: 'pianoRoll.delete',
  scope: 'pianoRoll',
  label: 'Delete the selected notes',
  keys: ['Delete', 'Backspace'],
});
defineCommand({
  id: 'pianoRoll.selectAll',
  scope: 'pianoRoll',
  label: 'Select every note',
  keys: ['Mod+KeyA'],
});

export const DRUMS_SCOPE = defineScope({
  id: 'drums',
  label: 'Drum grid',
  level: 'region',
});

defineCommand({
  id: 'drums.select',
  scope: 'drums',
  label: 'Select tool',
  keys: ['KeyV'],
});
defineCommand({
  id: 'drums.draw',
  scope: 'drums',
  label: 'Draw tool',
  keys: ['KeyD'],
});
defineCommand({
  id: 'drums.erase',
  scope: 'drums',
  label: 'Erase tool',
  keys: ['KeyE'],
});
defineCommand({
  id: 'drums.delete',
  scope: 'drums',
  label: 'Delete the selected hits',
  keys: ['Delete', 'Backspace'],
});

// ── Views ────────────────────────────────────────────────────────────────

export const PRACTICE_SCOPE = defineScope({
  id: 'practice',
  label: 'Practice',
  level: 'view',
  views: ['practice'],
  // The practice screen shows only its transport, so only that answers.
  passThrough: [
    'project.save',
    'transport.loop',
    'transport.stop',
    'help.shortcuts',
    'typing.on',
  ],
});

defineCommand({
  id: 'practice.playPause',
  scope: 'practice',
  label: 'Play / Pause',
  keys: ['Space'],
});
defineCommand({
  id: 'practice.record',
  scope: 'practice',
  label: 'Record / Stop recording',
  keys: ['KeyR'],
});

export const ARRANGE_SCOPE = defineScope({
  id: 'arrange',
  label: 'Create: timeline',
  level: 'view',
  views: ['arrange'],
});

defineCommand({
  id: 'clip.copy',
  scope: 'arrange',
  label: 'Copy the selected clip',
  keys: ['Mod+KeyC'],
});
defineCommand({
  id: 'clip.paste',
  scope: 'arrange',
  label: 'Paste at the playhead',
  keys: ['Mod+KeyV'],
});
defineCommand({
  id: 'clip.duplicate',
  scope: 'arrange',
  label: 'Duplicate the selected clip',
  keys: ['Mod+KeyD'],
});
defineCommand({
  id: 'clip.delete',
  scope: 'arrange',
  label: 'Delete the selected clip',
  keys: ['Delete', 'Backspace'],
});
defineCommand({
  id: 'clip.nudgeLeft',
  scope: 'arrange',
  label: 'Move the selected clip a beat earlier',
  keys: ['ArrowLeft'],
  repeat: true,
});
defineCommand({
  id: 'clip.nudgeRight',
  scope: 'arrange',
  label: 'Move the selected clip a beat later',
  keys: ['ArrowRight'],
  repeat: true,
});
defineCommand({
  id: 'clip.selectFirst',
  scope: 'arrange',
  label: 'Select the track’s first clip',
  keys: ['Mod+KeyA'],
});
defineCommand({
  id: 'clip.deselect',
  scope: 'arrange',
  label: 'Stop and deselect',
  keys: ['Escape'],
});
defineCommand({
  id: 'tool.cursor',
  scope: 'arrange',
  label: 'Pointer tool',
  keys: ['Digit1'],
});
defineCommand({
  id: 'tool.pencil',
  scope: 'arrange',
  label: 'Pencil tool',
  keys: ['Digit2'],
});
defineCommand({
  id: 'tool.scissors',
  scope: 'arrange',
  label: 'Scissors tool',
  keys: ['Digit3'],
});
defineCommand({
  id: 'tool.layout',
  scope: 'arrange',
  label: 'Layout tool',
  keys: ['Digit4'],
});
defineCommand({
  id: 'timeline.zoomIn',
  scope: 'arrange',
  label: 'Zoom in',
  keys: ['Alt+Equal'],
  repeat: true,
});
defineCommand({
  id: 'timeline.zoomOut',
  scope: 'arrange',
  label: 'Zoom out',
  keys: ['Alt+Minus'],
  repeat: true,
});
defineCommand({
  id: 'timeline.zoomToFit',
  scope: 'arrange',
  label: 'Zoom to fit the song',
  keys: ['Mod+Shift+KeyF'],
});

// The Score's editor, which is also the lead sheet's once it has a melody.
export const SCORE_SCOPE = defineScope({
  id: 'score',
  label: 'Score (and a lead sheet with a melody)',
  level: 'view',
  views: ['score', 'leadsheet'],
});

defineCommand({
  id: 'score.delete',
  scope: 'score',
  label: 'Delete what’s selected',
  keys: ['Delete', 'Backspace'],
});
defineCommand({
  id: 'score.up',
  scope: 'score',
  label: 'Selected notes up a step',
  keys: ['ArrowUp'],
  repeat: true,
});
defineCommand({
  id: 'score.down',
  scope: 'score',
  label: 'Selected notes down a step',
  keys: ['ArrowDown'],
  repeat: true,
});
defineCommand({
  id: 'score.octaveUp',
  scope: 'score',
  label: 'Selected notes up an octave',
  keys: ['Shift+ArrowUp'],
  repeat: true,
});
defineCommand({
  id: 'score.octaveDown',
  scope: 'score',
  label: 'Selected notes down an octave',
  keys: ['Shift+ArrowDown'],
  repeat: true,
});
defineCommand({
  id: 'score.noteInput',
  scope: 'score',
  label: 'Note input on / off: click a staff to add a note',
  keys: ['KeyN'],
});
defineCommand({
  id: 'score.noteName',
  scope: 'score',
  label: 'In note input, add that note (Shift adds it to the chord)',
  keys: [
    ...'ABCDEFG'.split('').map((letter) => `Key${letter}`),
    ...'ABCDEFG'.split('').map((letter) => `Shift+Key${letter}`),
  ],
  keysLabel: 'A–G',
});
defineCommand({
  id: 'score.duration',
  scope: 'score',
  label: 'Note length: 32nd, 16th, eighth, quarter, half, whole',
  keys: ['2', '3', '4', '5', '6', '7'],
  keysLabel: '2–7',
});
defineCommand({
  id: 'score.articulation',
  scope: 'score',
  label: 'Staccato, accent, marcato, tenuto, fermata',
  keys: ['.', '>', '-', '_', ';'],
  keysLabel: '. > - _ ;',
});
defineCommand({
  id: 'score.slur',
  scope: 'score',
  label: 'Slur',
  keys: ['KeyS'],
});
defineCommand({
  id: 'score.tie',
  scope: 'score',
  label: 'Tie',
  keys: ['KeyT'],
});
defineCommand({
  id: 'score.chord',
  scope: 'score',
  label: 'Write a chord symbol',
  keys: ['KeyK'],
});
defineCommand({
  id: 'score.nextBeat',
  scope: 'score',
  label: 'Next beat (writing chord symbols)',
  keys: ['Space'],
});
defineCommand({
  id: 'score.layerNotes',
  scope: 'score',
  label: 'Write notes',
  keys: ['Alt+KeyN'],
});
defineCommand({
  id: 'score.layerRests',
  scope: 'score',
  label: 'Write rests',
  keys: ['Alt+KeyR'],
});
defineCommand({
  id: 'score.layerSlashes',
  scope: 'score',
  label: 'Write slashes',
  keys: ['Alt+KeyH'],
});
defineCommand({
  id: 'score.systemBreak',
  scope: 'score',
  label: 'Start a new line at the barline',
  keys: ['Enter'],
});
defineCommand({
  id: 'score.rehearsalMark',
  scope: 'score',
  label: 'Rehearsal mark at the barline',
  keys: ['Mod+KeyM'],
});
defineCommand({
  id: 'score.copy',
  scope: 'score',
  label: 'Copy',
  keys: ['Mod+KeyC'],
});
defineCommand({
  id: 'score.paste',
  scope: 'score',
  label: 'Paste',
  keys: ['Mod+KeyV'],
});
defineCommand({
  id: 'score.escape',
  scope: 'score',
  label: 'Leave note input, or clear the selection',
  keys: ['Escape'],
});

export const LEAD_SHEET_SCOPE = defineScope({
  id: 'leadsheet',
  label: 'Lead sheet chart',
  level: 'view',
  views: ['leadsheet'],
});

defineCommand({
  id: 'leadsheet.copy',
  scope: 'leadsheet',
  label: 'Copy',
  keys: ['Mod+KeyC'],
});
defineCommand({
  id: 'leadsheet.paste',
  scope: 'leadsheet',
  label: 'Paste',
  keys: ['Mod+KeyV'],
});
defineCommand({
  id: 'leadsheet.chord',
  scope: 'leadsheet',
  label: 'Add a chord symbol',
  keys: ['Mod+KeyK'],
});
defineCommand({
  id: 'leadsheet.rehearsalMark',
  scope: 'leadsheet',
  label: 'Rehearsal mark',
  keys: ['Mod+KeyM'],
});
defineCommand({
  id: 'leadsheet.systemBreak',
  scope: 'leadsheet',
  label: 'Start a new line at the barline',
  keys: ['Enter'],
});
defineCommand({
  id: 'leadsheet.delete',
  scope: 'leadsheet',
  label: 'Delete what’s selected',
  keys: ['Delete', 'Backspace'],
});
defineCommand({
  id: 'leadsheet.escape',
  scope: 'leadsheet',
  label: 'Clear the selection',
  keys: ['Escape'],
});

// ── Everywhere ───────────────────────────────────────────────────────────

export const GLOBAL_SCOPE = defineScope({
  id: 'global',
  label: 'Everywhere',
  level: 'global',
});

defineCommand({
  id: 'transport.playPause',
  scope: 'global',
  label: 'Play / Pause',
  keys: ['Space'],
});
defineCommand({
  id: 'transport.record',
  scope: 'global',
  label: 'Record',
  keys: ['KeyR'],
});
defineCommand({
  id: 'transport.stop',
  scope: 'global',
  label: 'Stop',
  keys: ['Escape'],
});
defineCommand({
  id: 'transport.loop',
  scope: 'global',
  label: 'Loop on / off',
  keys: ['KeyL'],
});
defineCommand({
  id: 'transport.metronome',
  scope: 'global',
  label: 'Metronome on / off',
  keys: ['KeyM'],
});
defineCommand({
  id: 'project.save',
  scope: 'global',
  label: 'Save',
  keys: ['Mod+KeyS'],
  allowInEditable: true,
});
defineCommand({
  id: 'edit.undo',
  scope: 'global',
  label: 'Undo',
  keys: ['Mod+KeyZ'],
  repeat: true,
});
defineCommand({
  id: 'edit.redo',
  scope: 'global',
  label: 'Redo',
  keys: ['Mod+Shift+KeyZ'],
  repeat: true,
});
defineCommand({
  id: 'project.exportMidi',
  scope: 'global',
  label: 'Export MIDI',
  keys: ['Mod+KeyE'],
});
defineCommand({
  id: 'project.analyze',
  scope: 'global',
  label: 'Analyze (UNISON)',
  keys: ['Mod+Shift+KeyU'],
});
defineCommand({
  id: 'typing.on',
  scope: 'global',
  label: 'Play notes from the computer keyboard',
  keys: ['Backquote'],
});
defineCommand({
  id: 'view.inspector',
  scope: 'global',
  label: 'Show or hide the Inspector',
  keys: ['KeyI'],
});
defineCommand({
  id: 'help.shortcuts',
  scope: 'global',
  label: 'Keyboard shortcuts',
  keys: ['?'],
});
// Outside a text field these never reach the browser: ⌘A would select the
// page's text and ⌘D open a bookmark dialog over the editor.
defineCommand({
  id: 'browser.selectAll',
  scope: 'global',
  label: 'Select all (kept from the browser)',
  keys: ['Mod+KeyA'],
  hidden: true,
});
defineCommand({
  id: 'browser.bookmark',
  scope: 'global',
  label: 'Bookmark (kept from the browser)',
  keys: ['Mod+KeyD'],
  hidden: true,
});
