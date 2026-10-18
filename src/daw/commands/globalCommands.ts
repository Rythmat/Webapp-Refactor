import { useEffect } from 'react';
import { usePaletteStore } from '@/daw/shell/help/usePaletteStore';
import { useShortcutSheetStore } from '@/daw/shell/help/useShortcutSheetStore';
import { openExport } from '@/daw/shell/export/exportDialogStore';
import { openAddTrackSheet } from '@/daw/shell/tracklist/addTrack';
import { duplicateTrack } from '@/daw/shell/tracklist/duplicateTrack';
import { useStore } from '@/daw/store';
import { smartRedo, smartUndo } from '@/daw/store/undoMiddleware';
import { useKeyDispatcher } from './dispatcher';
import { GLOBAL_SCOPE } from './keymaps';
import { useMusicalTypingStore } from './musicalTypingStore';
import { analyzeProject, exportProjectMidi } from './projectCommands';
import { bindKeymap, type KeymapHandlers } from './registry';
import { requestRecord } from './requestRecord';
import {
  fastForwardBar,
  goToStart,
  rewindBar,
  skipBack,
  skipForward,
} from './transportSkip';
import { saveProject } from './saveProject';

// ── The editor's global keys (milestone 1.6) ───────────────────────────────
//
// Transport, save, undo, export, the Inspector, the '?' sheet and the
// command palette, in every view, and the palette's commands without keys
// (Add a track…, the views, the Library). They run
// the same commands as their buttons: R is requestRecord (which asks before
// recording over a take), ⌘S is saveProject (File ▸ Save's toasts and
// chip), ⇧⌘E and ⇧⌘U are File ▸ Export MIDI and Analyze. Undo and redo stand
// aside while recording, as their buttons are disabled then.

function togglePlayback() {
  const state = useStore.getState();
  if (state.isPlaying) state.pause();
  else state.play();
}

/** The side rail's Library, opened (left open when it already shows). */
function openLibrary() {
  const s = useStore.getState();
  if (s.libraryOpen && s.inspectorPanel === 'library') return;
  s.toggleInspectorPanel('library');
}

function undoOrRedo(redo: boolean): boolean {
  if (useStore.getState().isRecording) return false;
  if (redo) smartRedo();
  else smartUndo();
  return true;
}

export const GLOBAL_HANDLERS: KeymapHandlers = {
  'transport.playPause': togglePlayback,
  'transport.record': () => {
    requestRecord();
  },
  'transport.stop': () => useStore.getState().stop(),
  'transport.back': skipBack,
  'transport.forward': skipForward,
  'transport.toStart': goToStart,
  'transport.rewind': rewindBar,
  'transport.fastForward': fastForwardBar,
  'transport.loop': () => useStore.getState().toggleLoop(),
  'transport.metronome': () => useStore.getState().toggleMetronome(),
  'project.save': () => {
    void saveProject({ source: 'shortcut' });
  },
  'edit.undo': () => undoOrRedo(false),
  'edit.redo': () => undoOrRedo(true),
  'project.exportMidi': () => {
    void exportProjectMidi();
  },
  'project.analyze': analyzeProject,
  'view.inspector': () => useStore.getState().toggleLibrary(),
  'typing.on': () => useMusicalTypingStore.getState().setEnabled(true),
  'help.shortcuts': () => useShortcutSheetStore.getState().open(),
  'help.palette': () => usePaletteStore.getState().open(),
  'track.add': openAddTrackSheet,
  'track.duplicate': () => {
    const id = useStore.getState().selectedTrackId;
    if (!id) return false;
    duplicateTrack(id);
  },
  'project.export': () => openExport(),
  'view.create': () => useStore.getState().setCurrentView('arrange'),
  'view.mix': () => useStore.getState().setCurrentView('studio'),
  'view.score': () => useStore.getState().setCurrentView('score'),
  'view.library': openLibrary,
  'view.effects': () => useStore.getState().openEffectsLibrary(),
  'view.settings': () => useStore.getState().setSettingsOpen(true),
  'browser.selectAll': () => true,
  'browser.bookmark': () => true,
  'browser.search': () => true,
};

const globalHandlers = { current: GLOBAL_HANDLERS };

/** The one key listener, with the global keys bound. DawApp calls it once. */
export function useGlobalCommands(): void {
  useKeyDispatcher();
  useEffect(() => bindKeymap(GLOBAL_SCOPE.id, globalHandlers), []);
}
