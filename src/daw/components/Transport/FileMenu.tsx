import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileDown,
  FileUp,
  ChevronDown,
  Music,
  FilePlus,
  Save,
  SaveAll,
  FolderOpen,
  Trash2,
  Sparkles,
  AudioWaveform,
} from 'lucide-react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { getAudioBuffer } from '@/daw/audio/AudioBufferStore';
import {
  setLastSaved,
  useCloudSaveStore,
  whenSavesSettled,
} from '@/daw/commands/cloudSaveStore';
import { saveProject } from '@/daw/commands/saveProject';
import { samplerBufferKey } from '@/daw/instruments/samplerChops';
import { useStore } from '@/daw/store';
import {
  importMidiFile,
  exportMidiFile,
  downloadMidiBlob,
} from '@/daw/midi/MidiFileIO';
import { downloadLeadSheet } from '@/daw/midi/MusicXmlExport';
import { openSession } from '@/daw/session/openSession';
import { getSessionDeps } from '@/daw/session/sessionDeps';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { useProjectsDialogStore } from '@/daw/shell/projects/useProjectsDialogStore';
import { modShortcut } from '@/daw/shell/topbar/platformKeys';
import { studioProjectsApi } from '@/lib/studio-projects/api';
import type { AssetStamp } from '@/lib/studio-assets/upload-pending';
import { showError, showSuccess } from '@/components/utils/toast';
import {
  DEFAULT_EXPORT_CHOICES,
  ExportAudioDialog,
  type ExportChoices,
} from './ExportAudioDialog';
import type { MidiNoteEvent } from '@prism/engine';

// ── Helpers ─────────────────────────────────────────────────────────────────

const OUR_PPQ = 480;

/** Scale ticks if the imported file uses a different PPQ. */
function rescaleTick(tick: number, sourcePpq: number): number {
  if (sourcePpq === OUR_PPQ) return tick;
  return Math.round((tick * OUR_PPQ) / sourcePpq);
}

// ── Styles ──────────────────────────────────────────────────────────────────

const itemClass =
  'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs outline-none transition-colors hover:bg-white/5';
const itemStyle = { color: 'var(--color-text)' };
const dimItemStyle = { color: 'var(--color-text-dim)' };
const separatorStyle = {
  height: 1,
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  margin: '4px 8px',
};

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

export function FileMenu() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = useAuthToken();
  // In a shared session (E15: membership is the room id), New and Open are
  // off: either would replace the room's project for everyone in it, or be
  // replaced by it. Each student saves a copy to their own account instead.
  const inRoom = useStore((s) => s.roomId !== null);
  const saving = useCloudSaveStore((s) => s.phase === 'saving');
  // The modifier the student's keyboard has: ⌘ on a Mac, Ctrl elsewhere.
  const saveKeys = modShortcut('S').label;
  const analyzeKeys = modShortcut('U', { shift: true }).label;

  const [menuOpen, setMenuOpen] = useState(false);

  // Radix portals the menu content to document.body, which is outside the
  // `.daw-root` element that the theme tokens (--color-surface-2, etc.) are
  // scoped to — so `var(...)` references resolve to nothing and the menu
  // renders transparent. Snapshot the active theme's custom properties from
  // `.daw-root` whenever the menu opens and re-apply them inline on the
  // portalled content, so every `var(...)` inside resolves and the surface
  // stays fully opaque (and theme-accurate) without coupling to the store.
  const [menuVars, setMenuVars] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!menuOpen) return;
    const root = document.querySelector('.daw-root');
    if (!root) return;
    const computed = getComputedStyle(root);
    const vars: Record<string, string> = {};
    for (const name of [
      '--color-surface-2',
      '--color-text',
      '--color-text-dim',
      '--color-border',
      '--color-bg',
      '--color-accent',
    ]) {
      vars[name] = computed.getPropertyValue(name);
    }
    setMenuVars(vars as unknown as React.CSSProperties);
  }, [menuOpen]);

  const [exportAudioOpen, setExportAudioOpen] = useState(false);
  const [exportChoices, setExportChoices] = useState<ExportChoices>(
    DEFAULT_EXPORT_CHOICES,
  );

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

  // window.prompt stays until 2.3's Prompt primitive. The copy takes the
  // name and the cloud link only once it is saved.
  const handleSaveAs = useCallback(() => {
    const name = window.prompt(
      'Project name:',
      useStore.getState().projectName,
    );
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
  // makes a new project. window.confirm stays until 2.3.
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
    if (!window.confirm(`Delete project "${state.projectName}"?`)) return;
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
      const file = e.target.files?.[0];
      if (!file) return;

      const arrayBuffer = await file.arrayBuffer();
      const sequences = importMidiFile(arrayBuffer);

      const state = useStore.getState();

      for (let i = 0; i < sequences.length; i++) {
        const seq = sequences[i];
        const ppq = seq.ticksPerQuarterNote;

        // addTrack picks the colour from the track palette.
        const trackId = state.addTrack('midi', 'oracle-synth', seq.trackName);

        const events: MidiNoteEvent[] = seq.events.map((ev: MidiNoteEvent) => ({
          ...ev,
          startTick: rescaleTick(ev.startTick, ppq),
          durationTicks: rescaleTick(ev.durationTicks, ppq),
        }));

        state.addMidiClip(trackId, {
          id: `clip-import-${crypto.randomUUID().slice(0, 8)}`,
          name: seq.trackName,
          startTick: 0,
          events,
        });
      }

      // Imported notes come without chord symbols: offer to analyze them.
      state.offerChordAnalysis();

      e.target.value = '';
    },
    [],
  );

  const handleExport = useCallback(() => {
    const state = useStore.getState();
    const sequences = new Map<
      number,
      {
        ticksPerQuarterNote: number;
        trackName: string;
        events: MidiNoteEvent[];
      }
    >();

    for (let i = 0; i < state.tracks.length; i++) {
      const track = state.tracks[i];
      if (track.midiClips.length === 0) continue;

      const allEvents = track.midiClips.flatMap((clip) => clip.events);
      if (allEvents.length === 0) continue;

      sequences.set(i + 1, {
        ticksPerQuarterNote: OUR_PPQ,
        trackName: track.name,
        events: allEvents,
      });
    }

    if (sequences.size === 0) return;

    const blob = exportMidiFile(sequences, state.bpm);
    downloadMidiBlob(blob, 'prism-session.mid');
  }, []);

  const handleExportLeadSheet = useCallback(() => {
    const state = useStore.getState();
    if (state.chordRegions.length === 0) return;
    downloadLeadSheet(
      state.chordRegions,
      {
        title: state.projectName,
        bpm: state.bpm,
        rootNote: state.rootNote,
        mode: state.mode,
      },
      `${state.projectName}.musicxml`,
    );
  }, []);

  const handleAnalyze = useCallback(() => {
    const state = useStore.getState();
    state.analyzeSession();
    state.analyzeChords(state.chordAnalysis?.trackIds ?? null);
    state.setLibraryOpen(true);
  }, []);

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

      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            data-tutorial-id="file-menu"
            className="flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors hover:bg-white/5"
            style={{
              color: 'var(--color-text)',
              background: 'none',
              border: 'none',
            }}
          >
            File
            <ChevronDown size={10} strokeWidth={2} />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-[180px] rounded-lg p-1 shadow-lg"
            style={{
              ...menuVars,
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            sideOffset={4}
          >
            {/* Project management. New and Open are off in a shared session:
                either would replace the room's project for everyone. */}
            <DropdownMenu.Item
              className={itemClass}
              style={inRoom ? dimItemStyle : itemStyle}
              onSelect={handleNewProject}
              disabled={inRoom}
            >
              <FilePlus size={13} strokeWidth={2} />
              New Project
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className={itemClass}
              style={inRoom ? dimItemStyle : itemStyle}
              onSelect={handleOpen}
              disabled={inRoom}
            >
              <FolderOpen size={13} strokeWidth={2} />
              Open…
            </DropdownMenu.Item>

            <div style={separatorStyle} />

            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={handleSave}
              disabled={saving}
            >
              <Save size={13} strokeWidth={2} />
              {saving ? 'Saving…' : 'Save'}
              <span
                className="ml-auto text-[10px]"
                style={{ color: 'var(--color-text-dim)' }}
              >
                {saveKeys}
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={handleSaveAs}
              disabled={saving}
            >
              <SaveAll size={13} strokeWidth={2} />
              Save As…
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className={itemClass}
              style={{
                ...itemStyle,
                color: 'var(--color-text-dim)',
              }}
              onSelect={() => void handleDeleteProject()}
              disabled={saving}
            >
              <Trash2 size={13} strokeWidth={2} />
              Delete Project
            </DropdownMenu.Item>

            <div style={separatorStyle} />

            {/* MIDI & Lead Sheet I/O */}
            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={handleImport}
            >
              <FileUp size={13} strokeWidth={2} />
              Import MIDI
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={handleExport}
            >
              <FileDown size={13} strokeWidth={2} />
              Export MIDI
            </DropdownMenu.Item>

            <DropdownMenu.Item
              data-tutorial-id="file-export-audio"
              className={itemClass}
              style={itemStyle}
              onSelect={() => setExportAudioOpen(true)}
            >
              <AudioWaveform size={13} strokeWidth={2} />
              Export Audio…
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={handleExportLeadSheet}
            >
              <Music size={13} strokeWidth={2} />
              Export Lead Sheet
            </DropdownMenu.Item>

            <div style={separatorStyle} />

            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={handleAnalyze}
            >
              <Sparkles size={13} strokeWidth={2} />
              Analyze
              <span
                className="ml-auto text-[10px]"
                style={{ color: 'var(--color-text-dim)' }}
              >
                {analyzeKeys}
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={handleExportUnison}
            >
              <FileDown size={13} strokeWidth={2} />
              Export Analysis JSON
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Mounted only while open: it subscribes to the whole track list, so
          an always-mounted dialog re-rendered the transport bar's region on
          every track edit (shell-17). The student's format, bit depth and
          range live here instead, so they carry over to the next export. */}
      {exportAudioOpen && (
        <ExportAudioDialog
          open
          onOpenChange={setExportAudioOpen}
          choices={exportChoices}
          onChoicesChange={setExportChoices}
        />
      )}
    </>
  );
}
