import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useRef, useCallback } from 'react';
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
import { useStore } from '@/daw/store';
import {
  importMidiFile,
  exportMidiFile,
  downloadMidiBlob,
} from '@/daw/midi/MidiFileIO';
import { downloadLeadSheet } from '@/daw/midi/MusicXmlExport';
import {
  serializeSession,
  deserializeSession,
} from '@/daw/persistence/SessionSerializer';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  listSessions,
  deleteSession,
} from '@/daw/persistence/SessionStorage';
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

  // ── Project management ──

  const handleNewProject = useCallback(() => {
    // Reset to a fresh state by reloading the page without a saved session
    // This is the simplest approach — the store initializes with defaults
    if (!window.confirm('Create a new project? Unsaved changes will be lost.'))
      return;
    // Clear any auto-loaded session and reload
    const state = useStore.getState();
    state.setProjectName('Untitled Project');
    window.location.reload();
  }, []);

  const handleSave = useCallback(() => {
    const state = useStore.getState();
    const session = serializeSession();
    saveToLocalStorage(session, state.projectName);
  }, []);

  const handleSaveAs = useCallback(() => {
    const state = useStore.getState();
    const name = window.prompt('Project name:', state.projectName);
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    state.setProjectName(trimmed);
    const session = serializeSession();
    saveToLocalStorage(session, trimmed);
  }, []);

  const handleOpenProject = useCallback((name: string) => {
    const session = loadFromLocalStorage(name);
    if (session) {
      deserializeSession(session);
    }
  }, []);

  const handleDeleteProject = useCallback(() => {
    const state = useStore.getState();
    const name = state.projectName;
    if (!window.confirm(`Delete project "${name}"?`)) return;
    deleteSession(name);
  }, []);

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

  const savedSessions = listSessions();

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mid,.midi"
        className="hidden"
        onChange={handleFileChange}
      />

      <DropdownMenu.Root>
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
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            sideOffset={4}
          >
            {/* Project management */}
            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={handleNewProject}
            >
              <FilePlus size={13} strokeWidth={2} />
              New Project
            </DropdownMenu.Item>

            <div style={separatorStyle} />

            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={handleSave}
            >
              <Save size={13} strokeWidth={2} />
              Save
              <span
                className="ml-auto text-[10px]"
                style={{ color: 'var(--color-text-dim)' }}
              >
                {'\u2318'}S
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className={itemClass}
              style={itemStyle}
              onSelect={handleSaveAs}
            >
              <SaveAll size={13} strokeWidth={2} />
              Save As…
            </DropdownMenu.Item>

            {/* Open submenu */}
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className={itemClass} style={itemStyle}>
                <FolderOpen size={13} strokeWidth={2} />
                Open
                <ChevronRight size={11} className="ml-auto" strokeWidth={2} />
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  className="z-50 min-w-[140px] rounded-lg p-1 shadow-lg"
                  style={{
                    backgroundColor: 'var(--color-surface-2)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                  sideOffset={4}
                >
                  {savedSessions.length === 0 ? (
                    <DropdownMenu.Item
                      className={itemClass}
                      style={{ color: 'var(--color-text-dim)' }}
                      disabled
                    >
                      (No saved projects)
                    </DropdownMenu.Item>
                  ) : (
                    savedSessions.map((name) => (
                      <DropdownMenu.Item
                        key={name}
                        className={itemClass}
                        style={itemStyle}
                        onSelect={() => handleOpenProject(name)}
                      >
                        {name}
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
              onSelect={handleDeleteProject}
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
                {'\u21e7\u2318'}U
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
