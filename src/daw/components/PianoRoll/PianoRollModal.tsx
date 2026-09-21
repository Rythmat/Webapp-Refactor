import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useStore } from '@/daw/store';
import { DRUM_PADS } from '@/daw/instruments/DrumMachineEngine';
import { auditionNote } from '@/daw/audio/auditionNote';
import { PianoRoll } from './PianoRoll';
import type { MidiNoteEvent } from '@prism/engine';

// ── PianoRollModal ──────────────────────────────────────────────────────────
// Opens when a clip is double-clicked on the timeline.
// Reads editingClipId/editingClipTrackId from uiSlice.

export function PianoRollModal() {
  const editingClipId = useStore((s) => s.editingClipId);
  const editingClipTrackId = useStore((s) => s.editingClipTrackId);
  const tracks = useStore((s) => s.tracks);
  const setEditingClip = useStore((s) => s.setEditingClip);
  const updateMidiClipEvents = useStore((s) => s.updateMidiClipEvents);

  const isOpen = editingClipId !== null && editingClipTrackId !== null;

  // The editor's loop is a tool inside the editor, never the project loop:
  // each session starts with no loop, and it's dropped on close so playback
  // goes back to the project loop.
  const setEditorLoop = useStore((s) => s.setEditorLoop);
  useEffect(() => {
    if (!isOpen) return;
    setEditorLoop({ enabled: false, start: 0, end: 0 });
    return () => setEditorLoop(null);
  }, [isOpen, setEditorLoop]);

  // Find the clip + track
  const track = tracks.find((t) => t.id === editingClipTrackId);
  const clip = track?.midiClips.find((c) => c.id === editingClipId);

  const handleClose = useCallback(() => {
    setEditingClip(null, null);
  }, [setEditingClip]);

  const handleChange = useCallback(
    (newEvents: MidiNoteEvent[]) => {
      if (editingClipTrackId && editingClipId) {
        updateMidiClipEvents(editingClipTrackId, editingClipId, newEvents);
      }
    },
    [editingClipTrackId, editingClipId, updateMidiClipEvents],
  );

  // Notes picked with the Select tool can be sent to Insight: they become the
  // main editor's note selection, get analyzed, and the editor closes so the
  // result is in view.
  const [selectedNoteIndices, setSelectedNoteIndices] = useState<number[]>([]);
  const setSelectedNotes = useStore((s) => s.setSelectedNotes);
  const analyzeNoteSelection = useStore((s) => s.analyzeNoteSelection);
  const handleAnalyzeSelection = useCallback(() => {
    if (!editingClipTrackId || !editingClipId) return;
    if (selectedNoteIndices.length === 0) return;
    const selection = [
      {
        trackId: editingClipTrackId,
        clipId: editingClipId,
        noteIndices: selectedNoteIndices,
      },
    ];
    setSelectedNotes(selection);
    analyzeNoteSelection(selection);
    const { libraryOpen, toggleLibrary } = useStore.getState();
    if (!libraryOpen) toggleLibrary();
    handleClose();
  }, [
    editingClipTrackId,
    editingClipId,
    selectedNoteIndices,
    setSelectedNotes,
    analyzeNoteSelection,
    handleClose,
  ]);

  const handleAuditionNote = useCallback(
    (note: number, velocity: number) => {
      if (editingClipTrackId) auditionNote(editingClipTrackId, note, velocity);
    },
    [editingClipTrackId],
  );

  // Events are clip-relative; after a front-trim the clip sits at a non-zero
  // startTick while its events still start near tick 0. Anchor the editor at
  // whichever is smaller so notes never render off the left edge.
  const pianoRollStartTick = clip
    ? clip.events.reduce((min, e) => Math.min(min, e.startTick), clip.startTick)
    : 0;

  // Drum tracks: label the key column with the same drum-pad codes (KCK, SNR, …)
  // the track's drum control shows, instead of scale note names.
  const noteLabels = useMemo(
    () =>
      track?.instrument === 'drum-machine'
        ? new Map(DRUM_PADS.map((p) => [p.note, p.shortLabel]))
        : undefined,
    [track?.instrument],
  );

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-x-[5%] bottom-[10%] top-[5%] z-50 flex flex-col overflow-hidden rounded-2xl outline-none"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
          onKeyDown={(e) => {
            // Prevent Delete/Backspace from propagating to timeline clip delete
            if (e.code === 'Delete' || e.code === 'Backspace') {
              e.stopPropagation();
            }
          }}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center justify-between px-4"
            style={{
              height: 44,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Dialog.Title
              className="text-sm font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              {clip?.name || clip?.id || 'Piano Roll'}
              {track && (
                <span
                  className="ml-2 text-xs font-normal"
                  style={{ color: track.color }}
                >
                  {track.name}
                </span>
              )}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Edit MIDI notes in this clip.
            </Dialog.Description>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAnalyzeSelection}
                disabled={selectedNoteIndices.length === 0}
                title={
                  selectedNoteIndices.length === 0
                    ? 'Select notes with the Select tool to analyze them'
                    : undefined
                }
                className="flex h-7 items-center gap-1 rounded-full px-3 text-xs font-medium transition-colors enabled:hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
                style={{
                  color: 'var(--color-accent)',
                  border: '1px solid rgba(126, 207, 207, 0.4)',
                }}
              >
                <Sparkles size={12} strokeWidth={2} />
                {selectedNoteIndices.length === 0
                  ? 'Analyze in Insight'
                  : `Analyze ${selectedNoteIndices.length} note${
                      selectedNoteIndices.length === 1 ? '' : 's'
                    } in Insight`}
              </button>
              <Dialog.Close asChild>
                <button
                  className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                  style={{ color: 'var(--color-text-dim)' }}
                  aria-label="Close"
                >
                  &#x2715;
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Piano Roll */}
          <div className="flex-1 overflow-hidden">
            {clip && track ? (
              <PianoRoll
                events={clip.events}
                clipStartTick={pianoRollStartTick}
                timelineStartTick={clip.startTick}
                loopScope="editor"
                clipColor={track.color}
                onChange={handleChange}
                noteLabels={noteLabels}
                onAuditionNote={handleAuditionNote}
                onSelectionChange={setSelectedNoteIndices}
              />
            ) : (
              <div
                className="flex h-full items-center justify-center text-sm"
                style={{ color: 'var(--color-text-dim)' }}
              >
                No clip selected
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
