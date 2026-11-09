// ── Which ducker keys may be connected ──────────────────────────────────────
// A ducker's key is a real audio edge: the key track's post-fader tap feeds
// the ducker's second input. A loop of them (A ducked by B, B ducked by A)
// is a cycle without a DelayNode, which Web Audio renders as silence, so a
// key that leads back to the ducked track is refused, live and in exports.

import type { DuckerParams } from '../EffectChain';

/** What the check reads of a track. */
export interface DuckerKeyTrack {
  id: string;
  effects?: { ducker?: DuckerParams };
}

/**
 * Whether ducking track `ownId` by `keyId` would close a loop among
 * `tracks`: the key is the track itself, or the key's ducker (and its key's,
 * and so on) is keyed by it.
 */
export function duckerKeyLoops(
  tracks: readonly DuckerKeyTrack[],
  ownId: string,
  keyId: string,
): boolean {
  const seen = new Set<string>();
  let id: string | null = keyId;
  while (id !== null && !seen.has(id)) {
    if (id === ownId) return true;
    seen.add(id);
    const at: string = id;
    const ducker = tracks.find((t) => t.id === at)?.effects?.ducker;
    id = ducker?.enabled ? ducker.keyTrackId : null;
  }
  return false;
}
