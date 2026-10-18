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
  palette: false,
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

/**
 * The dock grown over the canvas (milestone 2.9, Maximize): Escape gives
 * the canvas back. Not modal: every other key works as in the dock. It
 * replaced the modal piano roll's and the pop-outs' scopes.
 */
export const DOCK_MAX_SCOPE = defineScope({
  id: 'dockMax',
  label: 'Maximized dock',
  level: 'dialog',
});

defineCommand({
  id: 'dockMax.restore',
  scope: 'dockMax',
  label: 'Restore the dock',
  keys: ['Escape'],
});

/**
 * A section's edge being dragged in the sections lane (milestone 2.13):
 * Escape puts it back. A dialog's level, bound only while the drag lasts,
 * so the key does that and nothing else (it never reaches Stop).
 */
export const SECTION_DRAG_SCOPE = defineScope({
  id: 'sectionDrag',
  label: 'Resizing a section',
  level: 'dialog',
});

defineCommand({
  id: 'sectionDrag.cancel',
  scope: 'sectionDrag',
  label: 'Put the edge back',
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
  palette: false,
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

/**
 * The editor dock, while focus is in it. Escape shuts it. The timeline's
 * clip keys stay out (Delete, the arrows, ⌘D would act on the clip behind
 * it, as the modal piano roll kept them out before); the global keys and
 * the computer keyboard get through. The note editors inside it are
 * regions of their own and answer first.
 */
export const DOCK_SCOPE = defineScope({
  id: 'dock',
  label: 'Editor dock',
  level: 'region',
  passThrough: ['global', 'typing'],
});

defineCommand({
  id: 'dock.close',
  scope: 'dock',
  label: 'Close the dock',
  keys: ['Escape'],
});

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

// The track list (milestone 2.6): with focus on a track row, the arrows
// move the selection (A11Y#3) and M and S mute and solo that track, ahead of
// the global M (the metronome). Musical typing, a level above, has the keys
// while it is on.
export const TRACKS_SCOPE = defineScope({
  id: 'tracks',
  label: 'Track list',
  level: 'region',
});

defineCommand({
  id: 'tracks.previous',
  scope: 'tracks',
  label: 'Select the track above',
  keys: ['ArrowUp'],
  repeat: true,
});
defineCommand({
  id: 'tracks.next',
  scope: 'tracks',
  label: 'Select the track below',
  keys: ['ArrowDown'],
  repeat: true,
});
defineCommand({
  id: 'tracks.first',
  scope: 'tracks',
  label: 'Select the first track',
  keys: ['Home', 'Mod+ArrowUp'],
});
defineCommand({
  id: 'tracks.last',
  scope: 'tracks',
  label: 'Select the last track',
  keys: ['End', 'Mod+ArrowDown'],
});
defineCommand({
  id: 'tracks.moveUp',
  scope: 'tracks',
  label: 'Move the track up',
  // ChromeOS can turn Alt+Up into Page Up: the second pair is for it.
  keys: ['Alt+ArrowUp', 'Mod+Shift+ArrowUp'],
  repeat: true,
});
defineCommand({
  id: 'tracks.moveDown',
  scope: 'tracks',
  label: 'Move the track down',
  keys: ['Alt+ArrowDown', 'Mod+Shift+ArrowDown'],
  repeat: true,
});
defineCommand({
  id: 'tracks.edit',
  scope: 'tracks',
  label: 'Edit the track in the dock',
  keys: ['Enter'],
});
defineCommand({
  id: 'tracks.rename',
  scope: 'tracks',
  label: 'Rename the track',
  keys: ['F2', 'KeyN'],
});
defineCommand({
  id: 'tracks.duplicate',
  scope: 'tracks',
  label: 'Duplicate the track',
  keys: ['Mod+KeyD'],
});
defineCommand({
  id: 'tracks.menu',
  scope: 'tracks',
  label: 'Open the track’s menu',
  keys: ['Alt+Enter', 'Shift+F10', 'ContextMenu'],
});
defineCommand({
  id: 'tracks.mute',
  scope: 'tracks',
  label: 'Mute the track',
  keys: ['KeyM'],
});
defineCommand({
  id: 'tracks.solo',
  scope: 'tracks',
  label: 'Solo the track',
  keys: ['KeyS'],
});

// The sections lane (milestone 2.13): with focus on a section, the arrows
// move between sections, Enter goes to one, and its menu and edits are a
// key away, as the track list's are. Musical typing, a level above, has the
// letters while it is on.
export const SECTIONS_SCOPE = defineScope({
  id: 'sections',
  label: 'Sections lane',
  level: 'region',
});

defineCommand({
  id: 'sections.previous',
  scope: 'sections',
  label: 'The section before',
  keys: ['ArrowLeft'],
  repeat: true,
});
defineCommand({
  id: 'sections.next',
  scope: 'sections',
  label: 'The section after',
  keys: ['ArrowRight'],
  repeat: true,
});
defineCommand({
  id: 'sections.first',
  scope: 'sections',
  label: 'The first section',
  keys: ['Home'],
});
defineCommand({
  id: 'sections.last',
  scope: 'sections',
  label: 'The last section',
  keys: ['End'],
});
defineCommand({
  id: 'sections.seek',
  scope: 'sections',
  label: 'Go to the section',
  keys: ['Enter'],
});
defineCommand({
  id: 'sections.longer',
  scope: 'sections',
  label: 'Make the section a bar longer',
  keys: ['Shift+ArrowRight'],
  repeat: true,
});
defineCommand({
  id: 'sections.shorter',
  scope: 'sections',
  label: 'Make the section a bar shorter',
  keys: ['Shift+ArrowLeft'],
  repeat: true,
});
// N first: it is the one a Chromebook has, and the menu shows the first.
defineCommand({
  id: 'sections.rename',
  scope: 'sections',
  label: 'Rename the section',
  keys: ['KeyN', 'F2'],
});
defineCommand({
  id: 'sections.duplicate',
  scope: 'sections',
  label: 'Duplicate the section with its clips',
  keys: ['Mod+KeyD'],
});
defineCommand({
  id: 'sections.delete',
  scope: 'sections',
  label: 'Delete the section (its clips stay)',
  keys: ['Delete', 'Backspace'],
});
defineCommand({
  id: 'sections.menu',
  scope: 'sections',
  label: 'Open the section’s menu',
  keys: ['Alt+Enter', 'Shift+F10', 'ContextMenu'],
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
    'help.palette',
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

// The clip menu's items (milestone 2.12) with keys, as the menu shows them.
// Key clashes settled for it: ⌘E splits, as in Soundtrap and Ableton, and
// Export MIDI moved to ⇧⌘E; M stays the click, so Mute clip is ⇧M (not
// Soundtrap's ⌘M, which minimizes the window on a Mac).
defineCommand({
  id: 'clip.cut',
  scope: 'arrange',
  label: 'Cut the selected clip',
  keys: ['Mod+KeyX'],
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
// N first: it is the one a Chromebook has, and the menu shows the first.
defineCommand({
  id: 'clip.rename',
  scope: 'arrange',
  label: 'Rename the selected clip',
  keys: ['KeyN', 'F2'],
});
defineCommand({
  id: 'clip.split',
  scope: 'arrange',
  label: 'Split the selected clip at the playhead',
  keys: ['Mod+KeyE'],
});
defineCommand({
  id: 'clip.mute',
  scope: 'arrange',
  label: 'Mute or unmute the selected clip',
  keys: ['Shift+KeyM'],
});
// The clip menu without a right-click: the Edit pill's menu, for a
// keyboard. Shift+F10 and the menu key are the usual ones; Alt+Return is for
// a Chromebook, which has neither.
defineCommand({
  id: 'clip.menu',
  scope: 'arrange',
  label: 'Open the selected clip’s menu',
  keys: ['Alt+Enter', 'Shift+F10', 'ContextMenu'],
});
defineCommand({
  id: 'clip.transposeUp',
  scope: 'arrange',
  label: 'Selected clip’s notes up a half step',
  keys: ['Shift+ArrowUp'],
  repeat: true,
});
defineCommand({
  id: 'clip.transposeDown',
  scope: 'arrange',
  label: 'Selected clip’s notes down a half step',
  keys: ['Shift+ArrowDown'],
  repeat: true,
});
defineCommand({
  id: 'clip.octaveUp',
  scope: 'arrange',
  label: 'Selected clip’s notes up an octave',
  keys: ['Mod+Shift+ArrowUp'],
  repeat: true,
});
defineCommand({
  id: 'clip.octaveDown',
  scope: 'arrange',
  label: 'Selected clip’s notes down an octave',
  keys: ['Mod+Shift+ArrowDown'],
  repeat: true,
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
  // It always lets Escape fall through to Stop, so by name it would
  // only say it did nothing.
  palette: false,
});
// V, B and C, as the Create toolbar shows them (plan default); the digits
// still work.
defineCommand({
  id: 'tool.cursor',
  scope: 'arrange',
  label: 'Pointer tool',
  keys: ['KeyV', 'Digit1'],
});
defineCommand({
  id: 'tool.pencil',
  scope: 'arrange',
  label: 'Draw tool',
  keys: ['KeyB', 'Digit2'],
});
defineCommand({
  id: 'tool.scissors',
  scope: 'arrange',
  label: 'Cut tool',
  keys: ['KeyC', 'Digit3'],
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

// + Marker left Create's toolbar when it folded away (milestone 2.13): the
// ruler adds one where it is right- or double-clicked, and this adds one at
// the playhead, also while playing (the palette, 2.15, lists it). M stays
// the click.
defineCommand({
  id: 'timeline.addMarker',
  scope: 'arrange',
  label: 'Add a marker at the playhead',
  keys: ['Alt+KeyM'],
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
  id: 'score.duration',
  scope: 'score',
  label: 'Note length: 32nd, 16th, eighth, quarter, half, whole',
  keys: ['2', '3', '4', '5', '6', '7'],
  keysLabel: '2–7',
  palette: false,
});
defineCommand({
  id: 'score.articulation',
  scope: 'score',
  label: 'Staccato, accent, marcato, tenuto, fermata',
  keys: ['.', '>', '-', '_', ';'],
  keysLabel: '. > - _ ;',
  palette: false,
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
  label: 'Clear the selection',
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
// Home and End: the markers, the start and the end (the top bar's Back and
// Forward buttons until 2.7 trimmed it).
defineCommand({
  id: 'transport.back',
  scope: 'global',
  label: 'Back to the previous marker or the start',
  keys: ['Home'],
});
defineCommand({
  id: 'transport.forward',
  scope: 'global',
  label: 'Forward to the next marker or the end',
  keys: ['End'],
});
// Go to start, Rewind and Fast-forward: the bottom rail's buttons (2.8).
// Comma and full stop step a bar, as in Logic; Go to start is ⇧Home, since
// Home alone is Back (a Chromebook's Search + ← is Home).
defineCommand({
  id: 'transport.toStart',
  scope: 'global',
  label: 'Go to the start',
  keys: ['Shift+Home'],
});
defineCommand({
  id: 'transport.rewind',
  scope: 'global',
  label: 'Back one bar',
  keys: ['Comma'],
  repeat: true,
});
defineCommand({
  id: 'transport.fastForward',
  scope: 'global',
  label: 'On one bar',
  keys: ['Period'],
  repeat: true,
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
  keywords: ['click'],
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
// ⇧⌘E since 2.12: ⌘E splits a clip.
defineCommand({
  id: 'project.exportMidi',
  scope: 'global',
  label: 'Export MIDI',
  keys: ['Mod+Shift+KeyE'],
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
  keywords: ['help'],
});
// The command palette (2.15). ⌘K, as in most editors; the Lead sheet keeps
// ⌘K for a chord symbol while something on the chart is selected, so ⇧⌘P
// opens the palette from anywhere.
defineCommand({
  id: 'help.palette',
  scope: 'global',
  label: 'Find a command',
  keys: ['Mod+KeyK', 'Mod+Shift+KeyP'],
  // From a text field too (the project's name): Ctrl+K would otherwise
  // jump to the browser's address bar on a Chromebook.
  allowInEditable: true,
  // Not in its own list: picking it would only open it again.
  palette: false,
});
// Commands with no keys, for the palette: what the menus and buttons do.
defineCommand({
  id: 'project.export',
  scope: 'global',
  label: 'Export…',
  keys: [],
  keywords: [
    'bounce',
    'mixdown',
    'stems',
    'wav',
    'midi',
    'musicxml',
    'download',
  ],
});
defineCommand({
  id: 'track.duplicate',
  scope: 'global',
  label: 'Duplicate the selected track',
  keys: [],
  keywords: ['copy'],
});
defineCommand({
  id: 'track.add',
  scope: 'global',
  label: 'Add a track…',
  keys: [],
  keywords: ['new track', 'instrument'],
});
defineCommand({
  id: 'view.create',
  scope: 'global',
  label: 'Go to Create',
  keys: [],
  keywords: ['timeline', 'arrange', 'view'],
});
defineCommand({
  id: 'view.mix',
  scope: 'global',
  label: 'Go to Mix',
  keys: [],
  keywords: ['mixer', 'view'],
});
defineCommand({
  id: 'view.score',
  scope: 'global',
  label: 'Go to the Score',
  keys: [],
  keywords: ['notation', 'lead sheet', 'view'],
});
defineCommand({
  id: 'view.library',
  scope: 'global',
  label: 'Open the Library',
  keys: [],
  keywords: ['browser', 'parts', 'grooves', 'kits', 'presets', 'templates'],
});
defineCommand({
  id: 'view.effects',
  scope: 'global',
  label: 'Open the Effects library',
  keys: [],
  keywords: ['fx', 'reverb', 'delay', 'eq'],
});
defineCommand({
  id: 'view.settings',
  scope: 'global',
  label: 'Audio & MIDI settings',
  keys: [],
  keywords: ['microphone', 'output', 'device', 'latency'],
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
// ⌘E splits a clip in Create (2.12); anywhere else (no clip selected, the
// Score, the dock) it would send focus to Chrome's address bar.
defineCommand({
  id: 'browser.search',
  scope: 'global',
  label: 'Search the web (kept from the browser)',
  keys: ['Mod+KeyE'],
  hidden: true,
});
