import type { EffectSlotType } from '@/daw/audio/EffectChain';
import { useStore, type AllSlices } from '@/daw/store';
import type { RackTarget } from '@/daw/store/effectRack';

// ── Which rack shows, and which one the library fills (milestone 2.10) ─────
//
// The Add effect picker is the only list that adds effects
// (2.8). It fills the rack in front of the student: in Create, the dock's
// Master when it shows, else the selected track's chain; in Mix, the rack
// the RackDock shows, else the selected track's. A rack whose track was
// deleted counts as none.

type RackState = Pick<
  AllSlices,
  | 'currentView'
  | 'practiceSession'
  | 'dockMaster'
  | 'mixRack'
  | 'selectedTrackId'
  | 'tracks'
>;

/**
 * Whether Create's timeline and dock show: Create itself, or the practice
 * view before its session exists (StudioShell shows Create's then).
 */
export function createShows(
  s: Pick<AllSlices, 'currentView' | 'practiceSession'>,
): boolean {
  return (
    s.currentView === 'arrange' ||
    (s.currentView === 'practice' && s.practiceSession === null)
  );
}

const hasTrack = (s: Pick<AllSlices, 'tracks'>, id: string | null) =>
  id !== null && s.tracks.some((t) => t.id === id);

/** The Mix view's open rack, or null when it is shut or its track is gone. */
export function liveMixRack(
  s: Pick<AllSlices, 'mixRack' | 'tracks'>,
): RackTarget | null {
  const rack = s.mixRack;
  if (!rack) return null;
  return rack.kind === 'track' && !hasTrack(s, rack.id) ? null : rack;
}

/** The rack the library adds to now, or null when there is none. */
export function rackTargetOf(s: RackState): RackTarget | null {
  if (createShows(s) && s.dockMaster) return MASTER;
  if (s.currentView === 'studio') {
    const rack = liveMixRack(s);
    if (rack) return rack;
  }
  return hasTrack(s, s.selectedTrackId)
    ? { kind: 'track', id: s.selectedTrackId as string }
    : null;
}

/** The library's rack, as a hook (a new object only when it changes). */
export function useRackTarget(): RackTarget | null {
  const kind = useStore((s) => rackTargetOf(s)?.kind ?? null);
  const id = useStore((s) => {
    const rack = rackTargetOf(s);
    return rack && rack.kind !== 'master' ? rack.id : null;
  });
  if (kind === null) return null;
  if (kind === 'master') return MASTER;
  return kind === 'return'
    ? { kind, id: id as 'A' | 'B' }
    : { kind, id: id as string };
}

const MASTER: RackTarget = { kind: 'master' };

/**
 * Opens the Mix view's RackDock on `target`, showing `effect` when given (a
 * click on that effect's name in a strip). A track's rack selects the track
 * too, so the dock and the library agree on it in every view (refused for a
 * track a collaborator holds, as any selection is).
 */
export function openRack(target: RackTarget, effect?: EffectSlotType): void {
  const s = useStore.getState();
  if (target.kind === 'track' && s.selectedTrackId !== target.id) {
    s.setSelectedTrackId(target.id);
  }
  useStore.setState(
    effect ? { mixRack: target, dockEffect: effect } : { mixRack: target },
  );
}
