import { useMemo } from 'react';
import type { EffectSlotType, TrackEffectState } from '@/daw/audio/EffectChain';
import {
  previewMasteringEffects,
  previewReturnEffects,
} from '@/daw/engine/preview';
import { previewTrack } from '@/daw/engine/trackReconciler';
import { useStore } from '@/daw/store';
import type { RackTarget } from '@/daw/store/effectRack';

// ── One rack, whichever it is (milestone 2.10) ─────────────────────────────
//
// A track's chain, a return's and the master's live in three slices with
// their own actions. FxRack reads and writes any of them through this one
// shape, so the dock's Effects tab, the dock's Master, the Mix view's racks
// and the side rail's Effects library are one implementation.

export interface Rack {
  /** What the rack is called where it shows ('Bass', 'Return A', 'Master'). */
  name: string;
  /** The id FxControlsPanel and the lesson anchors know the rack by. */
  fxId: string;
  chain: readonly EffectSlotType[];
  effects: TrackEffectState;
  update: (effects: Partial<TrackEffectState>) => void;
  remove: (slot: EffectSlotType) => void;
  add: (slot: EffectSlotType) => void;
  preview: (effects: TrackEffectState) => void;
  /** Whose chain the meters read on the meter bus; null: none to meter. */
  meterTarget: string | null;
}

/** The sidechain keys off another track: a track's rack only. */
export const TRACK_ONLY_EFFECTS: readonly EffectSlotType[] = ['ducker'];

/** Whether `slot` can go in `target`'s rack. */
export function rackTakes(
  target: RackTarget | null,
  slot: EffectSlotType,
): boolean {
  return target?.kind === 'track' || !TRACK_ONLY_EFFECTS.includes(slot);
}

/** The rack `target` names, or null when it is gone (a deleted track). */
export function useRack(target: RackTarget | null): Rack | null {
  const kind = target?.kind ?? null;
  const id = target && target.kind !== 'master' ? target.id : null;
  const track = useStore((s) =>
    kind === 'track' ? s.tracks.find((t) => t.id === id) : undefined,
  );
  const ret = useStore((s) =>
    kind === 'return' ? s.returns.find((r) => r.id === id) : undefined,
  );
  const masterChain = useStore((s) => s.masteringFxChain);
  const masterEffects = useStore((s) => s.masteringEffects);

  return useMemo((): Rack | null => {
    const s = () => useStore.getState();
    if (kind === 'master') {
      return {
        name: 'Master',
        fxId: 'master',
        chain: masterChain,
        effects: masterEffects,
        update: (effects) => s().updateMasteringEffects(effects),
        remove: (slot) => s().removeMasteringFx(slot),
        add: (slot) => s().addMasteringFx(slot),
        preview: previewMasteringEffects,
        meterTarget: 'master',
      };
    }
    if (kind === 'return' && ret) {
      const rid = ret.id;
      return {
        name: `Return ${rid}`,
        fxId: `return-${rid}`,
        chain: ret.fxChain,
        effects: ret.effects,
        update: (effects) => s().updateReturnEffects(rid, effects),
        remove: (slot) => s().removeReturnFx(rid, slot),
        add: (slot) => s().addReturnFx(rid, slot),
        preview: (effects) => previewReturnEffects(rid, effects),
        // Return chains aren't on the meter bus (no return tap yet).
        meterTarget: null,
      };
    }
    if (kind === 'track' && track) {
      const tid = track.id;
      return {
        name: track.name,
        fxId: tid,
        chain: track.activeEffects,
        effects: track.effects,
        update: (effects) => s().updateTrackEffects(tid, effects),
        remove: (slot) => s().removeActiveEffect(tid, slot),
        add: (slot) => s().addActiveEffect(tid, slot),
        preview: (effects) => previewTrack(tid, { effects }),
        meterTarget: tid,
      };
    }
    return null;
  }, [kind, track, ret, masterChain, masterEffects]);
}
