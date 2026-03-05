import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/daw/store';
import { PitchEditor } from './PitchEditor';
import { getAudioBuffer } from '@/daw/audio/AudioBufferStore';
import { analyzeBuffer } from '@/daw/audio/pitch-analysis/PitchAnalyzer';

// ── PitchEditorModal ────────────────────────────────────────────────────────
// Opens when a vocal audio clip is double-clicked on the timeline.

export function PitchEditorModal() {
  const editingAudioClipId = useStore((s) => s.editingAudioClipId);
  const editingAudioClipTrackId = useStore((s) => s.editingAudioClipTrackId);
  const tracks = useStore((s) => s.tracks);
  const pitchData = useStore((s) => s.pitchData);
  const bpm = useStore((s) => s.bpm);
  const setEditingAudioClip = useStore((s) => s.setEditingAudioClip);
  const setPitchSegments = useStore((s) => s.setPitchSegments);
  const addPitchEdit = useStore((s) => s.addPitchEdit);
  const removePitchEdit = useStore((s) => s.removePitchEdit);
  const clearPitchEdits = useStore((s) => s.clearPitchEdits);

  const [analyzing, setAnalyzing] = useState(false);

  const isOpen =
    editingAudioClipId !== null && editingAudioClipTrackId !== null;

  const track = tracks.find((t) => t.id === editingAudioClipTrackId);
  const clip = track?.audioClips.find((c) => c.id === editingAudioClipId);
  const clipPitchData = editingAudioClipId
    ? pitchData[editingAudioClipId]
    : undefined;

  // Auto-analyze on open
  useEffect(() => {
    if (!isOpen || !editingAudioClipId || clipPitchData?.analyzed) return;

    const buffer = getAudioBuffer(editingAudioClipId);
    if (!buffer) return;

    setAnalyzing(true);
    // Run analysis async (setTimeout to avoid blocking)
    setTimeout(() => {
      const segments = analyzeBuffer(buffer);
      setPitchSegments(editingAudioClipId, segments);
      setAnalyzing(false);
    }, 50);
  }, [isOpen, editingAudioClipId, clipPitchData?.analyzed, setPitchSegments]);

  const handleClose = useCallback(() => {
    setEditingAudioClip(null, null);
  }, [setEditingAudioClip]);

  const handleEditSegment = useCallback(
    (segmentId: string, targetMidiNote: number) => {
      if (editingAudioClipId) {
        addPitchEdit(editingAudioClipId, segmentId, targetMidiNote);
      }
    },
    [editingAudioClipId, addPitchEdit],
  );

  const handleRemoveEdit = useCallback(
    (segmentId: string) => {
      if (editingAudioClipId) {
        removePitchEdit(editingAudioClipId, segmentId);
      }
    },
    [editingAudioClipId, removePitchEdit],
  );

  const handleResetAll = useCallback(() => {
    if (editingAudioClipId) {
      clearPitchEdits(editingAudioClipId);
    }
  }, [editingAudioClipId, clearPitchEdits]);

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
            backgroundColor: 'rgba(10, 10, 15, 0.92)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.6)',
          }}
          onKeyDown={(e) => {
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
              Vocal Pitch Editor
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
              Edit vocal pitch segments in this clip.
            </Dialog.Description>
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

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {analyzing ? (
              <div
                className="flex h-full items-center justify-center text-sm"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Analyzing pitch...
              </div>
            ) : clip && track && clipPitchData?.analyzed ? (
              <PitchEditor
                segments={clipPitchData.segments}
                edits={clipPitchData.edits}
                clipId={clip.id}
                clipStartTick={clip.startTick}
                clipDurationTicks={clip.duration}
                clipColor={track.color}
                bpm={bpm}
                onEditSegment={handleEditSegment}
                onRemoveEdit={handleRemoveEdit}
                onResetAll={handleResetAll}
              />
            ) : (
              <div
                className="flex h-full items-center justify-center text-sm"
                style={{ color: 'var(--color-text-dim)' }}
              >
                {!clip ? 'No clip selected' : 'No audio buffer available'}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
