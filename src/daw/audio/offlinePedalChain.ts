// ── offlinePedalChain ─────────────────────────────────────────────────────
// A Guitar/Bass/Vocal track's amp and pedals in a bounce. Live, the track's
// view (GuitarBassView / VocalView) applies the chain the track stores to
// its adapter, loads the amp's NAM model, and playback runs the recorded DI
// clips through it. A bounce builds the same adapter on the offline context
// (renderProject); this applies the same stored chain to it, loads the same
// model, and waits for every pedal's worklet before the render starts, so
// the clips bounce through the amped tone rather than dry.
//
// What still differs from playback: the wah's envelope follower runs on the
// page's frame loop, which an offline render outruns, so a bounced wah is
// its filter held at rest (WahPedal). A NAM model that fails to load leaves
// the amp on its classic waveshaper, as it is live until a model arrives.

import type { Track } from '@/daw/store/tracksSlice';
import type { PedalBlockDescriptor } from './pedals/PedalProcessor';
import { BUNDLED_MODELS, fetchBundledModel } from './nam/NamModelStore';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import type { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';

/** The stored chain as the views hand it to the adapter (the phaser syncs
 *  to the project tempo). */
export function pedalBlocksOf(
  chain: readonly PedalBlockDescriptor[] | undefined,
  bpm: number,
): PedalBlockDescriptor[] {
  return (chain ?? []).map((b) => ({
    type: b.type,
    enabled: b.enabled,
    params: b.type === 'phaser' ? { ...b.params, bpm } : b.params,
    namModelId: b.namModelId,
  }));
}

/**
 * Apply `track`'s stored chain to the adapter a bounce built for it, and
 * resolve once the chain is ready to render. A track with no stored chain
 * (its view never opened) plays through the empty chain, as it does live.
 */
export async function applyOfflinePedalChain(
  adapter: GuitarFxAdapter | VocalFxAdapter,
  track: Pick<Track, 'name' | 'guitarChain' | 'vocalChain'>,
  bpm: number,
): Promise<void> {
  const isGuitar = adapter instanceof GuitarFxAdapter;
  const blocks = pedalBlocksOf(
    isGuitar ? track.guitarChain : track.vocalChain,
    bpm,
  );
  if (blocks.length === 0) return;
  adapter.syncChain(blocks);

  // The amp model, restored as GuitarBassView restores it.
  const modelId = blocks.find((b) => b.type === 'nam-amp')?.namModelId;
  const entry = modelId && BUNDLED_MODELS.find((m) => m.id === modelId);
  if (isGuitar && entry && entry.url) {
    try {
      const model = await fetchBundledModel(entry.url);
      await adapter.loadNamModel(model, entry.gainCompensation);
      adapter.setAmpSimMode('nam');
    } catch (err) {
      console.warn(
        `[renderProject] NAM model for "${track.name}" didn't load; its amp bounces on the classic model:`,
        err,
      );
    }
  }
  await adapter.whenChainReady();
}
