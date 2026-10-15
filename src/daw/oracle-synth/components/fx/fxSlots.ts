import type { FXParams, FXRoute, FXType } from '../../audio/types';

// ── What the FX panel lists ────────────────────────────────────────────────
//
// The panel is a projection of the synth's real chain (FXChain), not of the
// saved route list. Most pack presets switch an effect on without a route
// (70 of 82), so a panel built from routes alone said "No effects" while
// drive or delay was audibly on (synth-ui-09). A slot is shown for every
// effect that is routed or switched on, in the order the chain processes
// them. An effect that is on with no route gets a derived slot; it becomes
// a real route only when the student edits the slot.

/** FXChain's processing order: drive → chorus → phaser → delay → reverb → compressor. */
export const FX_CHAIN_ORDER: readonly FXType[] = [
  'drive',
  'chorus',
  'phaser',
  'delay',
  'reverb',
  'compressor',
];

const DERIVED_PREFIX = 'derived:';

export interface FxSlotView {
  route: FXRoute;
  /** True when the effect is on but the patch has no route for it. */
  derived: boolean;
}

/** The effect a derived slot's id stands for, or null for a real route. */
export function derivedSlotType(id: string): FXType | null {
  if (!id.startsWith(DERIVED_PREFIX)) return null;
  const type = id.slice(DERIVED_PREFIX.length) as FXType;
  return FX_CHAIN_ORDER.includes(type) ? type : null;
}

export function projectFxSlots(
  fx: FXParams,
  fxRoutes: readonly FXRoute[],
): FxSlotView[] {
  const slots: FxSlotView[] = [];
  for (const type of FX_CHAIN_ORDER) {
    const route = fxRoutes.find((r) => r.type === type);
    if (route) slots.push({ route, derived: false });
    else if (fx[type]?.enabled) {
      slots.push({
        route: { id: `${DERIVED_PREFIX}${type}`, type, target: 'master' },
        derived: true,
      });
    }
  }
  return slots;
}
