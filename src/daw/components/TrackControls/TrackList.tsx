import { useState, useCallback } from 'react';
import { useStore } from '@/daw/store';
import { TrackHeader } from './TrackHeader';
import { NewTrackModal } from './NewTrackModal';

// ── Component ────────────────────────────────────────────────────────────

export function TrackList() {
  const tracks = useStore((s) => s.tracks);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = useCallback(() => setModalOpen(true), []);

  return (
    <div
      className="flex w-64 shrink-0 flex-col overflow-y-auto"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      {/* ── Track Headers ─────────────────────────────────────── */}
      {tracks.map((track, i) => (
        <TrackHeader key={track.id} track={track} index={i} />
      ))}

      {/* ── Add Track Button ──────────────────────────────────── */}
      <button
        onClick={openModal}
        className="m-2 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed transition-colors"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-dim)',
        }}
      >
        <span className="text-lg leading-none">+</span>
        <span className="text-sm">Add Track</span>
      </button>

      {/* ── New Track Modal ───────────────────────────────────── */}
      <NewTrackModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
