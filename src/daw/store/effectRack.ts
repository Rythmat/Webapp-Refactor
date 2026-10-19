// ── An effect rack's size (milestone 2.8) ──────────────────────────────────
//
// A rack holds at most this many effects: a track's chain, the master's and
// each return's. The store refuses a sixth (tracksSlice, masteringSlice,
// returnsSlice), and the lists that add effects say so at the cap. It was a
// constant in four places, and a track's own add didn't check it.

export const MAX_RACK_EFFECTS = 5;

// ── Which rack (milestone 2.10) ────────────────────────────────────────────
//
// A rack is a track's chain, a return's or the master's. The Mix view's
// RackDock shows one at a time, and the side rail's Effects library adds to
// the rack that shows (FxBody), so both name it the same way.

export type ReturnId = 'A' | 'B';

export type RackTarget =
  | { kind: 'track'; id: string }
  | { kind: 'return'; id: ReturnId }
  | { kind: 'master' };

export function sameRack(a: RackTarget | null, b: RackTarget | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  return a.kind === 'master' || a.id === (b as { id: string }).id;
}

/** The rack stamp the lesson anchors carry (anchorRegistry's AnchorRack). */
export function anchorRackOf(
  target: RackTarget,
): 'track' | 'master' | `return:${string}` {
  if (target.kind === 'master') return 'master';
  if (target.kind === 'return') return `return:${target.id}`;
  return 'track';
}
