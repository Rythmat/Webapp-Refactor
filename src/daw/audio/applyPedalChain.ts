// ── applyPedalChain ───────────────────────────────────────────────────────
// A Guitar/Bass/Vocal track's amp and pedals, brought to the adapter that
// plays them. The track stores its chain (guitarChain / vocalChain), and this
// is the one way it reaches an adapter, for the three places that need it:
//   · the live engine (trackReconciler), as soon as a track's adapter is
//     built and whenever the stored chain changes from anywhere (undo, a
//     project opened over this one, a collaborator), so a track plays its
//     tone whether or not its view has been opened;
//   · the track's view (GuitarBassView / VocalView), on every edit it makes,
//     a knob drag's every move included, before the edit is saved;
//   · a bounce (offlinePedalChain), on the adapter it builds offline.
//
// Each adapter remembers the blocks it last took, so an apply of the same
// chain does nothing: the view opening on the chain the engine applied, or
// the engine hearing the store write of a chain the view applied already.
// A change to parameters only updates the pedals in place; a pedal added,
// removed or moved rebuilds the chain.
//
// The amp's NAM model loads in the background, once per adapter and model:
// the amp plays its classic model until the NAM one is in, then switches.
// Loads run one at a time per adapter, and the model asked for last wins.
// An amp whose block names no model plays its classic model.

import type { Track } from '@/daw/store/tracksSlice';
import type { PedalBlockDescriptor } from './pedals/PedalProcessor';
import { BUNDLED_MODELS, fetchBundledModel } from './nam/NamModelStore';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import type { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';

export type PedalChainAdapter = GuitarFxAdapter | VocalFxAdapter;

type StoredChain = readonly PedalBlockDescriptor[] | undefined;

/** The stored chain as the adapter takes it (the phaser syncs to the
 *  project tempo). */
export function pedalBlocksOf(
  chain: StoredChain,
  bpm: number,
): PedalBlockDescriptor[] {
  return (chain ?? []).map((b) => ({
    type: b.type,
    enabled: b.enabled,
    params: b.type === 'phaser' ? { ...b.params, bpm } : b.params,
    namModelId: b.namModelId,
  }));
}

/** The chain `track` stores for the kind of adapter: the guitar chain for a
 *  guitar or bass adapter, the vocal chain for a vocal one. */
export function storedChainFor(
  adapter: PedalChainAdapter,
  track: Pick<Track, 'guitarChain' | 'vocalChain'>,
): StoredChain {
  return adapter instanceof GuitarFxAdapter
    ? track.guitarChain
    : track.vocalChain;
}

// ── What each adapter holds ─────────────────────────────────────────────

interface AdapterState {
  /** The blocks last applied, as JSON. A new adapter's chain is empty. */
  applied: string;
  /** The model the blocks last applied name (null: none). */
  chainModel: string | null;
  /** The model the amp should hold; null for its classic model. */
  wanted: string | null;
  /** The model last loaded into the amp. */
  loaded: string | null;
  /** A model that failed to load: not tried again until asked for again. */
  failed: string | null;
  /** The amp mode last set here; unknown after a rebuild. */
  mode: 'nam' | 'classic' | null;
  /** Counts chain rebuilds, which can replace the amp (and drop its model). */
  rebuilds: number;
  /** The load under way, which ends with the amp on `wanted`. */
  loading: Promise<void> | null;
  /** Ends the wait for a download when another model is wanted. */
  wake: (() => void) | null;
}

const states = new WeakMap<PedalChainAdapter, AdapterState>();

function stateOf(adapter: PedalChainAdapter): AdapterState {
  let state = states.get(adapter);
  if (!state) {
    state = {
      applied: '[]',
      chainModel: null,
      wanted: null,
      loaded: null,
      failed: null,
      mode: null,
      rebuilds: 0,
      loading: null,
      wake: null,
    };
    states.set(adapter, state);
  }
  return state;
}

// ── Applying ────────────────────────────────────────────────────────────

/**
 * Bring `adapter`'s pedals to `blocks`, and start loading the amp's model.
 * Resolves once the amp holds the model the blocks name (or it failed to
 * load, which leaves the amp on its classic model); playback needn't wait.
 * Never rejects.
 */
export function applyPedalChain(
  adapter: PedalChainAdapter,
  blocks: PedalBlockDescriptor[],
): Promise<void> {
  const state = stateOf(adapter);
  const json = JSON.stringify(blocks);
  if (json !== state.applied) {
    if (!adapter.updateChainParams(blocks)) {
      adapter.syncChain(blocks);
      state.rebuilds += 1;
      state.mode = null;
      // A pedal added, removed or moved is the student at work: a model that
      // failed before gets another try.
      state.failed = null;
    }
    state.applied = json;
  }
  if (!(adapter instanceof GuitarFxAdapter)) return Promise.resolve();

  // The model the amp should hold changes only when the chain names another
  // one, so a model loading ahead of the chain (loadPedalChainModel) isn't
  // called off by the chain applied meanwhile.
  const named = blocks.find((b) => b.type === 'nam-amp')?.namModelId ?? null;
  if (named !== state.chainModel) {
    state.chainModel = named;
    want(state, named);
  }
  return settleAmp(adapter, state);
}

/**
 * `applyPedalChain` with the chain `track` stores. A track that stores none
 * (its view never opened) leaves the adapter as it is: a new adapter plays
 * through the empty chain, dry.
 */
export function applyStoredPedalChain(
  adapter: PedalChainAdapter,
  track: Pick<Track, 'guitarChain' | 'vocalChain'>,
  bpm: number,
): Promise<void> {
  const chain = storedChainFor(adapter, track);
  if (!chain) return Promise.resolve();
  return applyPedalChain(adapter, pedalBlocksOf(chain, bpm));
}

/**
 * Load a bundled model into the adapter's amp ahead of the chain naming it:
 * the view's model list, and its first model for a new track. Resolves true
 * once the amp holds it, false when it failed to load or another model was
 * asked for meanwhile.
 */
export async function loadPedalChainModel(
  adapter: GuitarFxAdapter,
  modelId: string,
): Promise<boolean> {
  const state = stateOf(adapter);
  want(state, modelId);
  await settleAmp(adapter, state);
  return state.loaded === modelId && adapter.isNamLoaded();
}

// ── The amp's model ─────────────────────────────────────────────────────

/** Asks for `modelId` (null: the classic model), tried afresh. */
function want(state: AdapterState, modelId: string | null): void {
  state.failed = null;
  if (state.wanted === modelId) return;
  state.wanted = modelId;
  state.wake?.();
}

/** `work`, or null as soon as another model is wanted (a slow download
 *  doesn't hold up the next one). */
function untilWantChanges<T>(
  state: AdapterState,
  work: Promise<T>,
): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    state.wake = () => resolve(null);
    work.then(resolve, reject);
  }).finally(() => {
    state.wake = null;
  });
}

function bundledUrl(modelId: string): string | undefined {
  return BUNDLED_MODELS.find((m) => m.id === modelId)?.url;
}

/** Whether the amp still has to load the model it should hold. */
function needsLoad(adapter: GuitarFxAdapter, state: AdapterState): boolean {
  const want = state.wanted;
  if (!want || want === state.failed || !bundledUrl(want)) return false;
  return !(state.loaded === want && adapter.isNamLoaded());
}

/** Puts the amp on the model it should hold, loading it if need be. */
function settleAmp(
  adapter: GuitarFxAdapter,
  state: AdapterState,
): Promise<void> {
  // A load under way reads `wanted` again before it ends.
  if (state.loading) return state.loading;
  if (!needsLoad(adapter, state)) {
    settleMode(adapter, state);
    return Promise.resolve();
  }
  let done = () => {};
  state.loading = new Promise<void>((resolve) => {
    done = resolve;
  });
  // loadWanted clears `loading` itself, in the same step as its last look
  // at `wanted`, so a model asked for after that starts a load of its own.
  void loadWanted(adapter, state).finally(done);
  return state.loading;
}

/** Loads models, one at a time, until the amp holds the one wanted. */
async function loadWanted(
  adapter: GuitarFxAdapter,
  state: AdapterState,
): Promise<void> {
  let reloads = 0;
  try {
    while (needsLoad(adapter, state)) {
      const modelId = state.wanted!;
      const entry = BUNDLED_MODELS.find((m) => m.id === modelId)!;
      const rebuilds = state.rebuilds;
      try {
        const model = await untilWantChanges(
          state,
          fetchBundledModel(entry.url!),
        );
        // Another model was asked for while this one downloaded.
        if (!model || state.wanted !== modelId) continue;
        await adapter.loadNamModel(model, entry.gainCompensation);
      } catch (err) {
        state.failed = modelId;
        console.warn(
          `[PedalChain] The amp model "${entry.name}" didn't load; the amp plays its classic model:`,
          err,
        );
        continue;
      }
      if (adapter.isNamLoaded()) {
        state.loaded = modelId;
      } else if (state.rebuilds === rebuilds || ++reloads > 3) {
        // No amp took it (the adapter is gone): nothing to try again.
        state.failed = modelId;
      }
      // Otherwise a rebuild replaced the amp while it loaded: load it again.
    }
  } finally {
    state.loading = null;
  }
  settleMode(adapter, state);
}

/** The amp plays its NAM model when it holds the one wanted, and its classic
 *  model when no model is wanted; otherwise it keeps what it plays. */
function settleMode(adapter: GuitarFxAdapter, state: AdapterState): void {
  const mode = !state.wanted
    ? 'classic'
    : state.loaded === state.wanted
      ? 'nam'
      : null;
  if (!mode || mode === state.mode || !adapter.isNamLoaded()) return;
  adapter.setAmpSimMode(mode);
  state.mode = mode;
}
