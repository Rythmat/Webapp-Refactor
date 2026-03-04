import * as Dialog from '@radix-ui/react-dialog';
import { useCallback } from 'react';
import { useStore } from '@/daw/store';
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

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
        <Dialog.Content
          className="fixed top-[5%] left-[5%] right-[5%] bottom-[10%] rounded-2xl z-50 outline-none flex flex-col overflow-hidden"
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
            className="flex items-center justify-between px-4 shrink-0"
            style={{ height: 44, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Dialog.Title className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {clip?.name || clip?.id || 'Piano Roll'}
              {track && (
                <span className="ml-2 text-xs font-normal" style={{ color: track.color }}>
                  {track.name}
                </span>
              )}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Edit MIDI notes in this clip.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
                style={{ color: 'var(--color-text-dim)' }}
                aria-label="Close"
              >
                &#x2715;
              </button>
            </Dialog.Close>
          </div>

          {/* Piano Roll */}
          <div className="flex-1 overflow-hidden">
            {clip && track ? (
              <PianoRoll
                events={clip.events}
                clipStartTick={clip.startTick}
                clipColor={track.color}
                onChange={handleChange}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--color-text-dim)' }}>
                No clip selected
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
