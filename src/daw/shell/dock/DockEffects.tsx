import { FxRack } from '@/daw/shell/mix/FxRack';
import { useStore } from '@/daw/store';

// ── The dock's Effects tab (milestones 2.8, 2.10) ──────────────────────────
//
// The selected track's rack: a card per effect, then the Add effect card
// that arms the side rail's library (FxCards). The same FxRack as the
// dock's Master and the Mix view's racks.

export function DockEffects() {
  const trackId = useStore((s) => s.selectedTrackId);
  const setMaximized = useStore((s) => s.setDockMaximized);
  if (trackId === null) {
    return (
      <p className="m-auto p-4 text-center text-[length:var(--daw-font-body)] text-daw-text-3">
        Select a track to edit effects
      </p>
    );
  }
  // A card that keeps only its main controls offers the rest: the dock,
  // maximized.
  return (
    <FxRack
      target={{ kind: 'track', id: trackId }}
      onShowAll={() => setMaximized(true)}
    />
  );
}
