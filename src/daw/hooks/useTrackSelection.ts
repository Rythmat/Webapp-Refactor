import { useStore } from '@/daw/store';

// ── Hook ──────────────────────────────────────────────────────────────────
// Convenience accessor for the selected-track state & setter.

export function useTrackSelection() {
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const setSelectedTrackId = useStore((s) => s.setSelectedTrackId);

  return { selectedTrackId, setSelectedTrackId };
}
