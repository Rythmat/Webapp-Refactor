import { FxRack } from '@/daw/shell/mix/FxRack';
import { useStore } from '@/daw/store';

// ── The dock's Effects tab (milestones 2.8, 2.10) ──────────────────────────
//
// The selected track's rack: its chain, the Add effect slot that arms the
// side rail's library, and the picked effect's controls. The same FxRack
// as the dock's Master and the Mix view's racks.

export function DockEffects() {
  const trackId = useStore((s) => s.selectedTrackId);
  const roomy = useStore((s) => s.dockMaximized);
  if (trackId === null) {
    return (
      <p className="m-auto p-4 text-center text-[length:var(--daw-font-body)] text-daw-text-3">
        Select a track to edit effects
      </p>
    );
  }
  return <FxRack target={{ kind: 'track', id: trackId }} roomy={roomy} />;
}
