import { useCallback, useRef, useState } from 'react';
import {
  AudioWaveform,
  ChevronDown,
  FileDown,
  FilePlus,
  FileUp,
  FolderOpen,
  Music,
  Save,
  SaveAll,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { cn } from '@/components/utilities';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { getAudioBuffer } from '@/daw/audio/AudioBufferStore';
import {
  setLastSaved,
  useCloudSaveStore,
  whenSavesSettled,
} from '@/daw/commands/cloudSaveStore';
import {
  analyzeProject,
  exportProjectMidiOrSay,
} from '@/daw/commands/projectCommands';
import { saveProject } from '@/daw/commands/saveProject';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { samplerBufferKey } from '@/daw/instruments/samplerChops';
import { importMidiFileOrSay } from '@/daw/midi/importMidiToTracks';
import { useStore } from '@/daw/store';
import { openSession } from '@/daw/session/openSession';
import { getSessionDeps } from '@/daw/session/sessionDeps';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { useProjectsDialogStore } from '@/daw/shell/projects/useProjectsDialogStore';
import { studioProjectsApi } from '@/lib/studio-projects/api';
import type { AssetStamp } from '@/lib/studio-assets/upload-pending';
import { showError, showSuccess } from '@/components/utils/toast';
import { openExport } from '@/daw/shell/export/exportDialogStore';
import { buttonVariants } from '@/daw/ui/Button';
import { confirmDialog, promptDialog } from '@/daw/ui/DialogHost';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { TYPE_CLASS } from '@/daw/ui/styles';

// ── The Project menu (milestone 2.5; File menu until then) ─────────────────
//
// New, Open…, Save and Save as…, Import, Export, the analysis, and Delete
// on its own at the bottom in red. It keeps the File menu's lesson anchors:
// 'file-menu' on the trigger and 'file-export-audio' on Export ▸ Audio….
// Export's Audio… and Notation… open the one Export dialog (2.15) on that
// side, as the top bar's Export pill does; MIDI file downloads at once (⇧⌘E).
// Export's items sit in a labelled group rather than a submenu, so a lesson
// step's click and the keyboard reach them in one move. The '?' menu holds
// Keyboard shortcuts now.

/**
 * The project the server just deleted reclaimed its audio assets (E12: the
 * session stays open as device-only work). Clips and Chops samples whose
 * audio is still in memory go back to pending, so the device draft keeps
 * their bytes and the next Save uploads them again. Only in the session
 * the Delete was asked in. upload-pending is loaded on demand, as by every
 * other caller: it pulls in the Opus encoder and the assets API, which stay
 * out of the editor's entry chunk.
 */
async function unstampDeletedAssets(generation: number): Promise<void> {
  const { revertAssetStamps } = await import(
    '@/lib/studio-assets/upload-pending'
  );
  if (getSessionGeneration() !== generation) return;
  const stamps: AssetStamp[] = [];
  for (const track of useStore.getState().tracks) {
    for (const clip of track.audioClips) {
      if (clip.assetId && getAudioBuffer(clip.id)) {
        stamps.push({
          kind: 'clip',
          trackId: track.id,
          clipId: clip.id,
          assetId: clip.assetId,
        });
      }
    }
    const sample = track.samplerSample;
    if (
      sample?.assetId &&
      !sample.sourceUrl &&
      getAudioBuffer(samplerBufferKey(sample.sampleId))
    ) {
      stamps.push({
        kind: 'sample',
        trackId: track.id,
        sampleId: sample.sampleId,
        assetId: sample.assetId,
      });
    }
  }
  revertAssetStamps(stamps, { generation });
}

// ── Component ───────────────────────────────────────────────────────────────

export function ProjectMenu() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = useAuthToken();
  // In a shared session (E15: membership is the room id), New and Open are
  // off: either would replace the room's project for everyone in it, or be
  // replaced by it. Each student saves a copy to their own account instead.
  const inRoom = useStore((s) => s.roomId !== null);
  const saving = useCloudSaveStore((s) => s.phase === 'saving');
  // The modifier the student's keyboard has: ⌘ on a Mac, Ctrl elsewhere.
  const saveKeys = shortcutKeys('project.save').label;
  const analyzeKeys = shortcutKeys('project.analyze').label;
  const exportMidiKeys = shortcutKeys('project.exportMidi').label;

  const [menuOpen, setMenuOpen] = useState(false);

  // ── Project management ──

  // In place, with no question (owner decision 6) and no reload: the work
  // it replaces is kept first, with a Restore (openSession).
  const handleNewProject = useCallback(() => {
    if (useStore.getState().roomId !== null) return;
    void openSession({ kind: 'new' }, { source: 'menu' });
  }, []);

  // One save path for the menu, Cmd/Ctrl-S and the chip: saveProject toasts
  // the outcome and handles a student who isn't signed in.
  const handleSave = useCallback(() => {
    void saveProject({ source: 'menu' });
  }, []);

  // The copy takes the name and the cloud link only once it is saved.
  const handleSaveAs = useCallback(async () => {
    const name = await promptDialog({
      title: 'Save a copy',
      label: 'Project name',
      defaultValue: useStore.getState().projectName,
      confirmLabel: 'Save',
      validate: (value) =>
        value.trim() ? null : 'Give the copy a name to save it.',
    });
    if (!name || !name.trim()) return;
    void saveProject({ source: 'menu', saveAs: { name: name.trim() } });
  }, []);

  // The Projects dialog: drafts on this device and the account's projects.
  // It shows a tick after the store opens it, once this menu has closed.
  const handleOpen = useCallback(() => {
    if (useStore.getState().roomId !== null) return;
    useProjectsDialogStore.getState().openDialog();
  }, []);

  // Deletes the open project from the account. The session stays open as
  // work on this device (E12), no longer linked to it, so the next Save
  // makes a new project.
  const handleDeleteProject = useCallback(async () => {
    if (!token) {
      showError('Sign in to delete a project from your account.');
      return;
    }
    // A save still out would PUT to the deleted project, get a 404 and
    // re-create it (E12): let it land first, then read what is open.
    await whenSavesSettled(10_000);
    const state = useStore.getState();
    const projectId = state.projectId;
    if (!projectId) {
      showError('This project has not been saved to your account yet.');
      return;
    }
    const confirmed = await confirmDialog({
      title: `Delete “${state.projectName}”?`,
      description:
        'It is removed from your account. The work stays open on this device, so you can save it again as a new project.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    const generation = getSessionGeneration();
    const drafts = getSessionDeps()?.drafts ?? null;
    const draftId = drafts?.activeDraftId() ?? null;
    try {
      await studioProjectsApi.remove(token, projectId);
    } catch (err) {
      console.error('Cloud delete failed', err);
      showError(
        "Couldn't delete the project. Check your connection and try again.",
      );
      return;
    }
    const live =
      getSessionGeneration() === generation &&
      useStore.getState().projectId === projectId;
    if (live) {
      // The next draft write takes the project id from the store.
      useStore.getState().setProjectId(null);
      setLastSaved(null);
      await unstampDeletedAssets(generation).catch((err: unknown) => {
        console.error('Re-pending the deleted project’s audio failed', err);
      });
    }
    // The draft that held this project no longer points at it, whether it
    // is still open or not, so reopening it never re-creates the project.
    if (drafts && draftId) {
      void drafts.patchCloud(draftId, { projectId: null, cloud: null });
    }
    showSuccess('Project deleted');
  }, [token]);

  // ── MIDI import/export ──

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const file = input.files?.[0];
      // Cleared first, so choosing the same file again (after a bad one)
      // still fires (shell-26).
      input.value = '';
      if (!file) return;
      // A file that isn't MIDI is caught there and said in a notice.
      await importMidiFileOrSay(file);
    },
    [],
  );

  const handleExportUnison = useCallback(() => {
    useStore.getState().exportUnisonJSON();
  }, []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mid,.midi"
        className="hidden"
        onChange={handleFileChange}
      />

      <Menu open={menuOpen} onOpenChange={setMenuOpen}>
        <MenuTrigger
          data-tutorial-id="file-menu"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'md' }),
            TYPE_CLASS.label,
            'gap-1 px-2.5',
          )}
        >
          Project
          <ChevronDown aria-hidden />
        </MenuTrigger>

        <MenuContent align="start" sideOffset={6} className="w-60">
          {/* New and Open are off in a shared session: either would replace
              the room's project for everyone. */}
          <MenuItem
            icon={<FilePlus />}
            onSelect={handleNewProject}
            disabled={inRoom}
          >
            New project
          </MenuItem>
          <MenuItem
            icon={<FolderOpen />}
            onSelect={handleOpen}
            disabled={inRoom}
          >
            Open…
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            data-tutorial-id="file-save"
            icon={<Save />}
            shortcut={saveKeys}
            onSelect={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </MenuItem>
          <MenuItem
            data-tutorial-id="file-save-as"
            icon={<SaveAll />}
            onSelect={() => void handleSaveAs()}
            disabled={saving}
          >
            Save as…
          </MenuItem>
          <MenuSeparator />
          <MenuLabel>Import</MenuLabel>
          <MenuItem icon={<FileUp />} onSelect={handleImport}>
            MIDI file…
          </MenuItem>
          <MenuLabel>Export</MenuLabel>
          <MenuItem
            data-tutorial-id="file-export-audio"
            icon={<AudioWaveform />}
            onSelect={() => openExport({ tab: 'audio' })}
          >
            Audio…
          </MenuItem>
          <MenuItem
            data-tutorial-id="file-export-notation"
            icon={<Music />}
            onSelect={() => openExport({ tab: 'notation' })}
          >
            Notation (MIDI, MusicXML)…
          </MenuItem>
          <MenuItem
            data-tutorial-id="file-export-midi"
            icon={<FileDown />}
            shortcut={exportMidiKeys}
            onSelect={() => void exportProjectMidiOrSay()}
          >
            MIDI file
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            data-tutorial-id="file-analyze"
            icon={<Sparkles />}
            shortcut={analyzeKeys}
            onSelect={analyzeProject}
          >
            Analyze
          </MenuItem>
          <MenuItem icon={<FileDown />} onSelect={handleExportUnison}>
            Export analysis (JSON)
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<Trash2 />}
            danger
            onSelect={() => void handleDeleteProject()}
            disabled={saving}
          >
            Delete project…
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );
}
