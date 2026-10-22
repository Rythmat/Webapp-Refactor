import { FxRack } from '@/daw/shell/mix/FxRack';
import { useStore } from '@/daw/store';

// ── The dock's Effects tab (milestones 2.8, 2.10) ──────────────────────────
//
// The selected track's rack: a card per effect, then the Add effect card
// that arms the side rail's library (FxCards). The same FxRack as the Mix
// view's racks. While the dock shows Master it is the master chain's, the
// same cards a track's Effects has (owner, 2026-10-22: Master's dock is
// Effects and Automation, like the others). Its EQ is one of those cards
// when the student adds one, the same EQ a track's is; Master has none by
// default (owner, 2026-10-22).

export function DockEffects() {
  const trackId = useStore((s) => s.selectedTrackId);
  const master = useStore((s) => s.dockMaster);
  const setMaximized = useStore((s) => s.setDockMaximized);
  if (master) {
    return (
      <div data-tutorial-id="dock-master" className="flex h-full min-h-0">
        <FxRack target={MASTER} onShowAll={() => setMaximized(true)} />
      </div>
    );
  }
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

const MASTER = { kind: 'master' } as const;
