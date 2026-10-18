import type { EffectSlotType } from '@/daw/audio/EffectChain';
import { useStore, type AllSlices } from '@/daw/store';
import type { RackTarget } from '@/daw/store/effectRack';

// ── Which rack shows, and which one the library fills (milestone 2.10) ─────
//
// The side rail's Effects library is the only list that adds effects
// (2.8). It fills the rack in front of the student: in Create, the dock's
// Master when it shows, else the selected track's chain; in Mix, the rack
// the RackDock shows, else the selected track's.

type RackState = Pick<
  AllSlices,
  'currentView' | 'dockMaster' | 'mixRack' | 'selectedTrackId' | 'tracks'
>;

/** The rack the library adds to now, or null when there is none. */
export function rackTargetOf(s: RackState): RackTarget | null {
  if (s.currentView === 'arrange' && s.dockMaster) return { kind: 'master' };
  if (s.currentView === 'studio' && s.mixRack) {
    // A rack whose track has gone shows nothing and takes nothing.
    if (
      s.mixRack.kind === 'track' &&
      !s.tracks.some((t) => t.id === (s.mixRack as { id: string }).id)
    ) {
      return null;
    }
    return s.mixRack;
  }
  const id = s.selectedTrackId;
  return id !== null && s.tracks.some((t) => t.id === id)
    ? { kind: 'track', id }
    : null;
}

/** The library's rack, as a hook (a new object only when it changes). */
export function useRackTarget(): RackTarget | null {
  const view = useStore((s) => s.currentView);
  const master = useStore((s) => s.dockMaster);
  const mixRack = useStore((s) => s.mixRack);
  const selected = useStore((s) => s.selectedTrackId);
  const exists = useStore((s) => {
    const id =
      s.currentView === 'studio' && s.mixRack?.kind === 'track'
        ? s.mixRack.id
        : s.selectedTrackId;
    return id !== null && s.tracks.some((t) => t.id === id);
  });
  if (view === 'arrange' && master) return MASTER;
  if (view === 'studio' && mixRack) {
    return mixRack.kind === 'track' && !exists ? null : mixRack;
  }
  return selected !== null && exists ? { kind: 'track', id: selected } : null;
}

const MASTER: RackTarget = { kind: 'master' };

/**
 * Opens the Mix view's RackDock on `target`, showing `effect` when given (a
 * click on that effect's name in a strip). A track's rack selects the track
 * too, so the dock and the library agree on it in every view.
 */
export function openRack(target: RackTarget, effect?: EffectSlotType): void {
  const s = useStore.getState();
  if (target.kind === 'track' && s.selectedTrackId !== target.id) {
    s.setSelectedTrackId(target.id);
  }
  s.setMixRack(target);
  if (effect) s.setDockEffect(effect);
}
