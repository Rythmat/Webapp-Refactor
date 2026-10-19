// ── pedalChainBuilder ───────────────────────────────────────────────────────
// A guitar, bass or vocal track's pedal chain built from what the store holds
// (Track.guitarChain / Track.vocalChain), on any context: an export's
// OfflineAudioContext as well as the live one. It is the GuitarPedalChain the
// adapters use, synced with the same blocks the panels send (GuitarBassView,
// VocalView), so the pedals and their order are the ones heard in playback.
//
// What a live chain does over time, `ready` does before it resolves: the amp's
// NAM model is fetched (once per model id, through the model cache) and loaded,
// and the pedals that run in an AudioWorklet (pitch correction, the wah's
// envelope follower) have their nodes in place. A model that can't be loaded
// (one this build doesn't bundle, saved by a newer client, or a failed fetch)
// leaves its amp passing the signal through untouched, and the report names
// it. `ready` never rejects.

import { GuitarPedalChain } from '../GuitarPedalChain';
import type { PedalBlockDescriptor } from '../pedals/PedalProcessor';
import { BUNDLED_MODELS, fetchBundledModel } from '../nam/NamModelStore';
import type { NamModelFile } from '../nam/NamModelParser';
import {
  DYNAMICS_WORKLET_URL,
  ensureWorklet,
  supportsWorklets,
} from './workletRegistry';

/** A stored pedal block (Track.guitarChain / Track.vocalChain). */
export interface StoredPedalBlock {
  type: string;
  enabled: boolean;
  params: Record<string, number>;
  namModelId?: string | null;
}

/** Parsed NAM models by model id, shared by the renders that use them. */
export type NamModelCache = Map<string, Promise<NamModelFile>>;

/** The cache exports share: a stems export fetches each model once. */
export const sharedNamModelCache: NamModelCache = new Map();

/** An amp whose model couldn't be loaded, so it passes the signal through. */
export interface PedalChainFailure {
  /** The amp block's place in the chain. */
  blockIndex: number;
  modelId: string;
  /** The model's name in the amp list, or its id. */
  modelName: string;
  reason: string;
}

export interface PedalChainReport {
  failedModels: PedalChainFailure[];
}

export interface BuiltPedalChain {
  /** Where the track's audio clips play into (a native node). */
  input: AudioNode;
  /** Connect this to the track's input (a native node). */
  output: AudioNode;
  /** Resolves once every model and worklet the chain uses is in place. */
  ready: Promise<PedalChainReport>;
  dispose(): void;
}

export interface BuildPedalChainOptions {
  /** The song's tempo: the phaser's synced rate follows it, as live. */
  bpm: number;
  modelCache?: NamModelCache;
}

// The pedals whose processor runs in an AudioWorklet, and its module. The
// pitch corrector's url is PitchCorrectionNode's; the wah's follower is the
// dynamics processor.
const PEDAL_WORKLETS: Record<string, string> = {
  'pitch-correction': '/daw-assets/pitch-correction-processor.js',
  wah: DYNAMICS_WORKLET_URL,
};

/** The blocks as the panels hand them to syncChain: the phaser hears the bpm. */
export function pedalBlocksFor(
  blocks: readonly StoredPedalBlock[],
  bpm: number,
): PedalBlockDescriptor[] {
  return blocks.map((b) => ({
    type: b.type,
    enabled: b.enabled,
    params: b.type === 'phaser' ? { ...b.params, bpm } : b.params,
    namModelId: b.namModelId,
  }));
}

/** The parsed model `id`, fetched once per cache; a failed fetch is forgotten. */
function cachedModel(id: string, cache: NamModelCache): Promise<NamModelFile> {
  const entry = BUNDLED_MODELS.find((m) => m.id === id);
  if (!entry?.url) {
    return Promise.reject(new Error('it is not one of the bundled amp models'));
  }
  let loading = cache.get(id);
  if (!loading) {
    loading = fetchBundledModel(entry.url);
    cache.set(id, loading);
    const mine = loading;
    mine.catch(() => {
      if (cache.get(id) === mine) cache.delete(id);
    });
  }
  return loading;
}

/**
 * Builds `blocks` as a pedal chain on `ctx`. The chain's nodes are made on the
 * native context behind a standardized-audio-context wrapper (as the adapters
 * make theirs), so `input` and `output` are native nodes.
 */
export function buildPedalChain(
  ctx: BaseAudioContext,
  blocks: readonly StoredPedalBlock[],
  { bpm, modelCache = sharedNamModelCache }: BuildPedalChainOptions,
): BuiltPedalChain {
  // The pedals only use node factories every BaseAudioContext has.
  const chain = new GuitarPedalChain(ctx as unknown as AudioContext);
  chain.syncChain(pedalBlocksFor(blocks, bpm));
  const native = ((ctx as { _nativeContext?: BaseAudioContext })
    ._nativeContext ?? ctx) as BaseAudioContext;
  let disposed = false;

  const loadAmp = async (): Promise<PedalChainFailure[]> => {
    // As live (GuitarBassView), the first amp in the chain gets the model.
    const blockIndex = blocks.findIndex((b) => b.type === 'nam-amp');
    const amp = blocks[blockIndex];
    // A bypassed amp isn't heard, and one with no model plays its classic
    // shaper, as it does live.
    if (!amp?.enabled || !amp.namModelId) return [];
    const modelId = amp.namModelId;
    const entry = BUNDLED_MODELS.find((m) => m.id === modelId);
    try {
      const model = await cachedModel(modelId, modelCache);
      if (disposed) return [];
      await chain.loadNamModel(model, entry?.gainCompensation);
      if (disposed) return [];
      chain.setAmpSimMode('nam');
      if (!chain.isNamLoaded()) throw new Error('the model did not load');
      return [];
    } catch (err) {
      if (disposed) return [];
      // Not the classic shaper either: an amp that can't be itself stays out.
      chain.updateAmpSim({ enabled: false });
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[pedalChain] amp model ${modelId} left out:`, reason);
      return [
        { blockIndex, modelId, modelName: entry?.name ?? modelId, reason },
      ];
    }
  };

  const settleWorklets = async (): Promise<void> => {
    if (!supportsWorklets(native)) return;
    const urls = new Set(
      blocks
        .filter(
          (b) =>
            b.type in PEDAL_WORKLETS &&
            (b.type !== 'pitch-correction' || b.enabled),
        )
        .map((b) => PEDAL_WORKLETS[b.type]),
    );
    if (urls.size === 0) return;
    // The same loads the pedals are waiting on (one per context and url);
    // a pedal whose module fails stays bypassed, as it does live.
    await Promise.allSettled(
      [...urls].map((url) => ensureWorklet(native, url)),
    );
    // Each pedal makes and wires its node in the promise callbacks after
    // that load: they have all run by the next task.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  };

  const ready = Promise.all([loadAmp(), settleWorklets()]).then(
    ([failedModels]) => ({ failedModels }),
  );

  return {
    input: chain.getInputNode(),
    output: chain.getOutputNode(),
    ready,
    dispose() {
      disposed = true;
      chain.dispose();
    },
  };
}
