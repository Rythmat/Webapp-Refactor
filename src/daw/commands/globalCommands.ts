import { useEffect } from 'react';
import { useShortcutSheetStore } from '@/daw/shell/help/useShortcutSheetStore';
import { useStore } from '@/daw/store';
import { smartRedo, smartUndo } from '@/daw/store/undoMiddleware';
import { useKeyDispatcher } from './dispatcher';
import { GLOBAL_SCOPE } from './keymaps';
import { useMusicalTypingStore } from './musicalTypingStore';
import { analyzeProject, exportProjectMidi } from './projectCommands';
import { bindKeymap, type KeymapHandlers } from './registry';
import { requestRecord } from './requestRecord';
import { skipBack, skipForward } from './transportSkip';
import { saveProject } from './saveProject';

// ── The editor's global keys (milestone 1.6) ───────────────────────────────
//
// Transport, save, undo, export, the Inspector and the '?' sheet, in every
// view. They run
// the same commands as their buttons: R is requestRecord (which asks before
// recording over a take), ⌘S is saveProject (File ▸ Save's toasts and
// chip), ⌘E and ⇧⌘U are File ▸ Export MIDI and Analyze. Undo and redo stand
// aside while recording, as their buttons are disabled then.

function togglePlayback() {
  const state = useStore.getState();
  if (state.isPlaying) state.pause();
  else state.play();
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
  'browser.selectAll': () => true,
  'browser.bookmark': () => true,
};

const globalHandlers = { current: GLOBAL_HANDLERS };

/** The one key listener, with the global keys bound. DawApp calls it once. */
export function useGlobalCommands(): void {
  useKeyDispatcher();
  useEffect(() => bindKeymap(GLOBAL_SCOPE.id, globalHandlers), []);
}
