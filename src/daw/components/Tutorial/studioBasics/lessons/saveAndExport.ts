import type { TutorialStep } from '../../tutorials';
import { doneMomentMoved } from '../saveAndExportChecks';

// ── Studio Basics 9 · Save and Export ──────────────────────────────────
// Keep the song, then share it: Save to the student's account, then export
// a MIDI file (Project ▾ ▸ MIDI file, which downloads at once), MusicXML
// (Project ▾ ▸ Notation…, the Export dialog's Notation side, where the
// format is picked before Export) and audio (the top bar's Export pill,
// which opens the same dialog on Audio). Each step checks the done moment
// that really happened (a save the cloud accepted, a file downloaded). The
// demos open the menu or the dialog, point and close it with Esc; they never
// pick a format (the dialog remembers it), save or download anything.

const STAGE = 'Save and export';

/** Esc on a menu item closes the menu and nothing else. */
const closeMenu = (on: string) => ({
  target: on,
  caption: '**Esc** closes the menu',
  action: { key: 'Escape', on: 'element' as const },
});

/** Esc on the dialog's Export button closes the dialog, exporting nothing. */
const closeDialog = (on: string) => ({
  target: on,
  caption: '**Esc** closes the box for now',
  action: { key: 'Escape', on: 'element' as const },
});

export const saveAndExportSteps: TutorialStep[] = [
  {
    id: 'save',
    stage: STAGE,
    instruction:
      'Open the **Project** menu at the top left and choose **Save**.',
    hint: 'Your song is saved to your Music Atlas account, so you can open it on any computer. ⌘S (Ctrl+S on Windows) saves too.',
    target: ['file-save', 'file-menu'],
    requires: { view: 'arrange', libraryOpen: false },
    demo: [
      {
        target: 'file-menu',
        caption: 'Save your song, then share it',
        action: 'click',
      },
      {
        target: 'file-save',
        caption: '**Save** keeps it in your account',
        action: 'hover',
      },
      closeMenu('file-save'),
    ],
    check: doneMomentMoved('save'),
  },
  {
    id: 'export-midi',
    stage: STAGE,
    instruction:
      'Open **Project** again and choose **MIDI file**, under Export. It downloads right away.',
    hint: 'A MIDI file holds the notes, for other music apps like GarageBand.',
    target: ['file-export-midi', 'file-menu'],
    requires: { view: 'arrange' },
    demo: [
      {
        target: 'file-menu',
        caption: 'Export makes files to share',
        action: 'click',
      },
      {
        target: 'file-export-midi',
        caption: '**MIDI file** is the notes, for music apps',
        action: 'hover',
      },
      closeMenu('file-export-midi'),
    ],
    check: doneMomentMoved('exportMidi'),
  },
  {
    id: 'export-musicxml',
    stage: STAGE,
    instruction:
      'Now sheet music: choose **Notation (MIDI, MusicXML)…** in the **Project** menu, pick **MusicXML: full score**, and click **Export**.',
    hint: 'MusicXML is sheet music in a file, for notation apps like MuseScore. MusicXML: lead sheet writes only the chords.',
    // The format first: the step points at it while the dialog is open.
    target: ['export-notation-score', 'file-export-notation', 'file-menu'],
    requires: { view: 'arrange' },
    demo: [
      {
        target: 'file-menu',
        caption: 'Sheet music has its own file',
        action: 'click',
      },
      {
        target: 'file-export-notation',
        caption: '**Notation…** opens the export box',
        action: 'click',
      },
      {
        target: 'export-notation-score',
        caption: 'Pick **MusicXML: full score**',
        action: 'hover',
      },
      {
        target: 'export-notation-run',
        caption: 'Then **Export** makes the file',
        action: 'hover',
      },
      closeDialog('export-notation-run'),
    ],
    check: doneMomentMoved('exportMusicXml'),
  },
  {
    id: 'export-audio',
    stage: STAGE,
    instruction:
      'Last, a sound file: click **Export** at the top right. The box opens on **Audio**: click its **Export** button.',
    hint: 'An audio file plays anywhere, so it is the one to share. It takes a moment to make.',
    target: ['export-audio-run', 'export-pill'],
    requires: { view: 'arrange' },
    demo: [
      {
        target: 'export-pill',
        caption: '**Export** opens the export box',
        action: 'click',
      },
      {
        target: 'export-audio-run',
        caption: 'On **Audio**, **Export** makes the sound file',
        action: 'hover',
      },
      closeDialog('export-audio-run'),
    ],
    check: doneMomentMoved('exportAudio'),
  },
  {
    id: 'wrap-up',
    stage: STAGE,
    instruction:
      'Your song is saved, with three files to share: **MIDI** for other music apps, **MusicXML** for notation apps like MuseScore, and **audio** to send and listen to anywhere. Press **Finish**.',
    target: 'export-pill',
  },
];
