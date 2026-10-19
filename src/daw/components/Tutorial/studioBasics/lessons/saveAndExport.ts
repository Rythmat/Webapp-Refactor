import type { TutorialStep } from '../../tutorials';
import { doneMomentMoved } from '../saveAndExportChecks';

// ── Studio Basics 9 · Save and Export ──────────────────────────────────
// Keep the song, then share it: Save to the student's account, then export
// MIDI, MusicXML and audio, each from the Project menu. Each step checks the
// done moment that really happened (a save the cloud accepted, a file
// downloaded). The demos open the menu, point and close it with Esc; the
// audio demo opens the Export Audio box and closes it the same way. None
// saves or downloads anything.

const STAGE = 'Save and export';

/** Esc on a menu item closes the menu and nothing else. */
const closeMenu = (on: string) => ({
  target: on,
  caption: '**Esc** closes the menu',
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
      'Open **Project** again and choose **MIDI**, under Export: the notes, for other music apps.',
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
        caption: '**MIDI** is the notes, for music apps',
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
      'Now choose **Lead sheet (MusicXML)** in the **Project** menu: a file notation apps like MuseScore open.',
    hint: 'It holds the chords for a lead sheet. No chords in your song yet? The MusicXML button in the Score makes one too.',
    target: ['file-export-musicxml', 'file-menu'],
    requires: { view: 'arrange' },
    demo: [
      {
        target: 'file-menu',
        caption: 'One more file, for sheet music',
        action: 'click',
      },
      {
        target: 'file-export-musicxml',
        caption: '**MusicXML** opens in apps like MuseScore',
        action: 'hover',
      },
      closeMenu('file-export-musicxml'),
    ],
    check: doneMomentMoved('exportMusicXml'),
  },
  {
    id: 'export-audio',
    stage: STAGE,
    instruction:
      'Choose **Audio…** in the **Project** menu, then click **Export** to make a sound file.',
    hint: 'An audio file plays anywhere, so it is the one to share. It takes a moment to make.',
    target: ['export-audio-run', 'file-export-audio', 'file-menu'],
    requires: { view: 'arrange' },
    demo: [
      {
        target: 'file-menu',
        caption: 'Audio is your song as sound',
        action: 'click',
      },
      {
        target: 'file-export-audio',
        caption: '**Audio…** opens the export box',
        action: 'click',
      },
      {
        target: 'export-audio-run',
        caption: '**Export** makes the sound file',
        action: 'hover',
      },
      {
        target: 'export-audio-run',
        caption: '**Esc** closes the box for now',
        action: { key: 'Escape', on: 'element' },
      },
    ],
    check: doneMomentMoved('exportAudio'),
  },
  {
    id: 'wrap-up',
    stage: STAGE,
    instruction:
      'Your song is saved, with three files to share: **MIDI** for other music apps, **MusicXML** for notation apps like MuseScore, and **audio** to send and listen to. Press **Finish**.',
    target: 'file-menu',
  },
];
