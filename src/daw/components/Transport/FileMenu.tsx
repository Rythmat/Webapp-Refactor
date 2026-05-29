import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileDown,
  FileUp,
  ChevronDown,
  ChevronRight,
  Music,
  FilePlus,
  Save,
  SaveAll,
  FolderOpen,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { useStore } from '@/daw/store';
import {
  importMidiFile,
  exportMidiFile,
  downloadMidiBlob,
} from '@/daw/midi/MidiFileIO';
import { downloadLeadSheet } from '@/daw/midi/MusicXmlExport';
import { deserializeCloudProject } from '@/daw/persistence/SessionSerializer';
import {
  saveCurrentProjectToCloud,
  studioProjectsApi,
  type StudioProjectSummary,
} from '@/lib/studio-projects/api';
import { clearLocalSession } from '@/lib/studio-projects/localSession';
import { loadCloudProjectAudio } from '@/lib/studio-assets/load-audio';
import { PartialUploadError } from '@/lib/studio-assets/upload-pending';
import { showError, showSuccess } from '@/components/utils/toast';
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
const separatorStyle = {
  height: 1,
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  margin: '4px 8px',
};

// ── Component ───────────────────────────────────────────────────────────────

export function FileMenu() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = useAuthToken();

  // Controlled state lets us close the "Open" submenu on mouse-leave and reset
  // it whenever the root menu closes (e.g. after a selection is processed).
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(false);

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

  // Cloud project list for the Open submenu. Re-fetched on save / delete.
  const [cloudProjects, setCloudProjects] = useState<StudioProjectSummary[]>(
    [],
  );
  const [cloudListError, setCloudListError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refreshCloudProjects = useCallback(async () => {
    if (!token) return;
    try {
      const list = await studioProjectsApi.list(token);
      setCloudProjects(list);
      setCloudListError(null);
    } catch (err) {
      console.error('Failed to list cloud projects', err);
      setCloudListError(
        err instanceof Error ? err.message : 'Failed to list projects',
      );
    }
  }, [token]);

  useEffect(() => {
    void refreshCloudProjects();
  }, [refreshCloudProjects]);

  // ── Project management ──

  const handleNewProject = useCallback(async () => {
    if (!window.confirm('Create a new project? Unsaved changes will be lost.'))
      return;

    // If the user was working on a cloud project, eagerly clean up any failed-
    // upload orphans for it before reloading. Best-effort — if the cleanup
    // call fails, the hourly cron will still catch them within ~25h.
    const previousProjectId = useStore.getState().projectId;
    if (previousProjectId && token) {
      try {
        await studioProjectsApi.cleanupPendingAssets(token, previousProjectId);
      } catch (err) {
        console.warn(
          'Failed to clean up pending assets for previous project',
          err,
        );
      }
    }

    // Drop the local autosave so the upcoming reload doesn't restore the
    // session we're explicitly leaving behind.
    clearLocalSession();
    const state = useStore.getState();
    state.setProjectId(null);
    state.setProjectName('Untitled Project');
    window.location.reload();
  }, [token]);

  const handleSave = useCallback(async () => {
    if (!token) {
      showError('You must be signed in to save.');
      return;
    }
    setSaving(true);
    try {
      await saveCurrentProjectToCloud(token);
      await refreshCloudProjects();
      showSuccess('Project saved');
    } catch (err) {
      console.error('Cloud save failed', err);
      if (err instanceof PartialUploadError) {
        // Partial success — succeeded clips kept their assetIds, retry will
        // only re-upload the failed ones. Show the helper's own message.
        showError(err.message);
      } else {
        showError(
          `Save failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        );
      }
    } finally {
      setSaving(false);
    }
  }, [token, refreshCloudProjects]);

  const handleSaveAs = useCallback(async () => {
    if (!token) {
      showError('You must be signed in to save.');
      return;
    }
    const state = useStore.getState();
    const name = window.prompt('Project name:', state.projectName);
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    state.setProjectName(trimmed);
    // Clear projectId so the helper POSTs (creates a new project) instead of
    // overwriting the currently loaded one.
    state.setProjectId(null);
    setSaving(true);
    try {
      await saveCurrentProjectToCloud(token);
      await refreshCloudProjects();
      showSuccess(`Saved as "${trimmed}"`);
    } catch (err) {
      console.error('Cloud save-as failed', err);
      if (err instanceof PartialUploadError) {
        showError(err.message);
      } else {
        showError(
          `Save As failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        );
      }
    } finally {
      setSaving(false);
    }
  }, [token, refreshCloudProjects]);

  const handleOpenProject = useCallback(
    async (id: string) => {
      if (!token) {
        showError('You must be signed in to open a cloud project.');
        return;
      }
      try {
        const project = await studioProjectsApi.get(token, id);
        deserializeCloudProject(project);
        // Audio buffers download + decode in the background; clips appear in
        // the timeline immediately and become playable as their bytes arrive.
        void loadCloudProjectAudio(token).catch((err) => {
          console.error('Audio asset load failed', err);
        });
      } catch (err) {
        console.error('Cloud open failed', err);
        showError(
          `Open failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        );
      }
    },
    [token],
  );

  const handleDeleteProject = useCallback(async () => {
    if (!token) {
      showError('You must be signed in to delete a cloud project.');
      return;
    }
    const state = useStore.getState();
    if (!state.projectId) {
      showError('This project has not been saved to the cloud yet.');
      return;
    }
    if (!window.confirm(`Delete project "${state.projectName}"?`)) return;
    try {
      await studioProjectsApi.remove(token, state.projectId);
      state.setProjectId(null);
      await refreshCloudProjects();
      showSuccess('Project deleted');
    } catch (err) {
      console.error('Cloud delete failed', err);
      showError(
        `Delete failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    }
  }, [token, refreshCloudProjects]);

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
      const COLORS = [
        '#8b5cf6',
        '#a855f7',
        '#f59e0b',
        '#f97316',
        '#22c55e',
        '#3b82f6',
        '#ef4444',
        '#06b6d4',
      ];

      for (let i = 0; i < sequences.length; i++) {
        const seq = sequences[i];
        const ppq = seq.ticksPerQuarterNote;
        const color = COLORS[i % COLORS.length];

        const trackId = state.addTrack(
          'midi',
          'oracle-synth',
          seq.trackName,
          color,
        );

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

      <DropdownMenu.Root
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          // Reset the submenu when the whole menu closes so it doesn't
          // auto-reopen the next time the File menu is opened.
          if (!open) setOpenSubmenu(false);
        }}
      >
        <DropdownMenu.Trigger asChild>
          <button
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
            {/* Project management */}
            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={() => void handleNewProject()}
            >
              <FilePlus size={13} strokeWidth={2} />
              New Project
            </DropdownMenu.Item>

            <div style={separatorStyle} />

            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={() => void handleSave()}
              disabled={saving}
            >
              <Save size={13} strokeWidth={2} />
              {saving ? 'Saving…' : 'Save'}
              <span
                className="ml-auto text-[10px]"
                style={{ color: 'var(--color-text-dim)' }}
              >
                {'⌘'}S
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={() => void handleSaveAs()}
              disabled={saving}
            >
              <SaveAll size={13} strokeWidth={2} />
              Save As…
            </DropdownMenu.Item>

            {/* Open submenu */}
            <DropdownMenu.Sub open={openSubmenu} onOpenChange={setOpenSubmenu}>
              <DropdownMenu.SubTrigger className={itemClass} style={itemStyle}>
                <FolderOpen size={13} strokeWidth={2} />
                Open
                <ChevronRight size={11} className="ml-auto" strokeWidth={2} />
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  className="z-50 min-w-[200px] rounded-lg p-1 shadow-lg"
                  style={{
                    ...menuVars,
                    backgroundColor: 'var(--color-surface-2)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                  sideOffset={4}
                  // Close the submenu as soon as the pointer leaves it.
                  onPointerLeave={() => setOpenSubmenu(false)}
                >
                  {cloudListError ? (
                    <DropdownMenu.Item
                      className={itemClass}
                      style={{ color: 'var(--color-text-dim)' }}
                      disabled
                    >
                      {cloudListError}
                    </DropdownMenu.Item>
                  ) : cloudProjects.length === 0 ? (
                    <DropdownMenu.Item
                      className={itemClass}
                      style={{ color: 'var(--color-text-dim)' }}
                      disabled
                    >
                      (No saved projects)
                    </DropdownMenu.Item>
                  ) : (
                    cloudProjects.map((p) => (
                      <DropdownMenu.Item
                        key={p.id}
                        className={itemClass}
                        style={itemStyle}
                        onSelect={() => void handleOpenProject(p.id)}
                      >
                        {p.name}
                      </DropdownMenu.Item>
                    ))
                  )}
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>

            <DropdownMenu.Item
              className={itemClass}
              style={{
                ...itemStyle,
                color: 'var(--color-text-dim)',
              }}
              onSelect={() => void handleDeleteProject()}
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
                {'⇧⌘'}U
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
    </>
  );
}
