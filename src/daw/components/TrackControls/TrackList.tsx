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
      className="w-64 shrink-0 flex flex-col overflow-y-auto"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      {/* ── Track Headers ─────────────────────────────────────── */}
      {tracks.map((track, i) => (
        <TrackHeader key={track.id} track={track} index={i} />
      ))}

      {/* ── Add Track Button ──────────────────────────────────── */}
      <button
        onClick={openModal}
        className="flex items-center justify-center gap-2 h-12 m-2 rounded-lg border border-dashed transition-colors cursor-pointer"
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
