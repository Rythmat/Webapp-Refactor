// ── offlinePedalChain ─────────────────────────────────────────────────────
// A Guitar/Bass/Vocal track's amp and pedals in a bounce. Live, the engine
// applies the chain the track stores to its adapter, with its amp's NAM
// model, and playback runs the recorded DI clips through it
// (applyPedalChain). A bounce builds the same adapter on the offline context
// (renderProject); this applies the same stored chain to it the same way,
// and waits for the model and every pedal's worklet before the render
// starts, so the clips bounce through the amped tone rather than dry.
//
// What still differs from playback: the wah's envelope follower runs on the
// page's frame loop, which an offline render outruns, so a bounced wah is
// its filter held at rest (WahPedal). A NAM model that fails to load leaves
// the amp on its classic waveshaper, as it is live until a model arrives.

import type { Track } from '@/daw/store/tracksSlice';
import type { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import type { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';
import { applyStoredPedalChain } from './applyPedalChain';

/**
 * Apply `track`'s stored chain to the adapter a bounce built for it, and
 * resolve once the chain is ready to render. A track with no stored chain
 * (its view never opened) plays through the empty chain, as it does live.
 */
export async function applyOfflinePedalChain(
  adapter: GuitarFxAdapter | VocalFxAdapter,
  track: Pick<Track, 'guitarChain' | 'vocalChain'>,
  bpm: number,
): Promise<void> {
  await applyStoredPedalChain(adapter, track, bpm);
  await adapter.whenChainReady();
}
