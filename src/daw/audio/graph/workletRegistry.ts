// ── AudioWorklet modules, loaded once per context ───────────────────────────
// A worklet module has to be added to every context that makes its nodes:
// the live AudioContext, each export's OfflineAudioContext, the pedals'
// native context. ensureWorklet() adds a module to each native context once
// (Tone's wrapper and its native context count as one) and hands every
// caller the same load; a failed load is forgotten, so the next call tries
// again.
//
// The track and bus chains live on Tone's context, a standardized-audio-
// context wrapper, and a node in that graph has to be made by the wrapper's
// own AudioWorkletNode (a native node can't be connected to a wrapped one).
// Tone builds that constructor; createWorkletNode() reaches it through
// Tone's Context, which picks the native constructor for a native context.

import dynamicsProcessorUrl from '../worklets/dynamics-processor.js?url';

/** The gate, ducker and envelope-follower processor (worklets/dynamics-processor.js). */
export const DYNAMICS_WORKLET_URL: string = dynamicsProcessorUrl;
export const DYNAMICS_PROCESSOR = 'ma-dynamics';

type WorkletNodeFactory = (
  ctx: BaseAudioContext,
  name: string,
  options: AudioWorkletNodeOptions,
) => AudioWorkletNode;

const modules = new WeakMap<BaseAudioContext, Map<string, Promise<void>>>();
const ready = new WeakMap<BaseAudioContext, Set<string>>();
let wrappedFactory: WorkletNodeFactory | null = null;
let wrappedFactoryPromise: Promise<void> | null = null;

/** Whether `ctx` is a standardized-audio-context wrapper (Tone's contexts). */
function isWrapped(ctx: BaseAudioContext): boolean {
  return '_nativeContext' in (ctx as object);
}

/** Loads Tone's AudioWorkletNode factory, for wrapped contexts. */
function loadWrappedFactory(): Promise<void> {
  if (wrappedFactory) return Promise.resolve();
  wrappedFactoryPromise ??= import('tone')
    .then((tone) => {
      // Context.createAudioWorkletNode only reads `this.rawContext`, so it
      // makes a node on any context, not just Tone's current one (an export
      // can be under way while a live chain loads its gate).
      const create = tone.Context.prototype.createAudioWorkletNode;
      wrappedFactory = (ctx, name, options) =>
        create.call({ rawContext: ctx }, name, options) as AudioWorkletNode;
    })
    .catch((err: unknown) => {
      wrappedFactoryPromise = null;
      throw err;
    });
  return wrappedFactoryPromise;
}

/**
 * The native context behind `ctx`. Tone's wrapper adds a module to its
 * native context, so a module is loaded once per NATIVE context, whichever
 * door it came in by: the live chains' gate (through the wrapper) and the
 * pedals' wah (on the native context) share one AudioWorkletGlobalScope,
 * where registering a processor name twice is an error.
 */
function nativeOf(ctx: BaseAudioContext): BaseAudioContext {
  return (ctx as { _nativeContext?: BaseAudioContext })._nativeContext ?? ctx;
}

/**
 * Adds the worklet module at `url` to `ctx`'s native context, once: through
 * the wrapper when `ctx` is wrapped (so the wrapper knows the processor),
 * else on the context itself. Every call for the same native context and url
 * shares the load until it settles; a rejected load is dropped, so a later
 * call loads it again. A wrapped context also needs Tone's node factory.
 */
export function ensureWorklet(
  ctx: BaseAudioContext,
  url: string,
): Promise<void> {
  const native = nativeOf(ctx);
  let byUrl = modules.get(native);
  if (!byUrl) {
    byUrl = new Map();
    modules.set(native, byUrl);
  }
  let loading = byUrl.get(url);
  if (!loading) {
    const worklet = (ctx as { audioWorklet?: AudioWorklet }).audioWorklet;
    const added: Promise<void> = worklet
      ? worklet.addModule(url).then(() => {
          let urls = ready.get(native);
          if (!urls) {
            urls = new Set();
            ready.set(native, urls);
          }
          urls.add(url);
        })
      : Promise.reject(
          new Error(
            'AudioWorklet is not available (it needs a secure context)',
          ),
        );
    const map = byUrl;
    map.set(url, added);
    added.catch(() => {
      if (map.get(url) === added) map.delete(url);
    });
    loading = added;
  }
  return isWrapped(ctx)
    ? Promise.all([loading, loadWrappedFactory()]).then(() => undefined)
    : loading;
}

/** Whether the module at `url` has finished loading for `ctx`. */
export function isWorkletReady(ctx: BaseAudioContext, url: string): boolean {
  if (isWrapped(ctx) && !wrappedFactory) return false;
  return ready.get(nativeOf(ctx))?.has(url) ?? false;
}

/** Whether `ctx` can run AudioWorklets at all. */
export function supportsWorklets(ctx: BaseAudioContext): boolean {
  return !!(ctx as { audioWorklet?: AudioWorklet }).audioWorklet;
}

/**
 * Makes an AudioWorkletNode of a processor whose module ensureWorklet() has
 * loaded on `ctx`: the wrapper's node on a wrapped context, the native one
 * otherwise.
 */
export function createWorkletNode(
  ctx: BaseAudioContext,
  name: string,
  options: AudioWorkletNodeOptions,
): AudioWorkletNode {
  if (isWrapped(ctx)) {
    if (!wrappedFactory) {
      throw new Error(`createWorkletNode(${name}) before ensureWorklet`);
    }
    return wrappedFactory(ctx, name, options);
  }
  return new AudioWorkletNode(ctx, name, options);
}

/**
 * Ends a worklet node: its processor is told to stop (process() returns
 * false, so the audio thread lets it go), the port is closed and the node
 * disconnected.
 */
export function disposeWorkletNode(node: AudioWorkletNode): void {
  try {
    node.port.postMessage({ type: 'dispose' });
    node.port.onmessage = null;
    node.port.close();
  } catch {
    /* a port that is already closed */
  }
  try {
    node.disconnect();
  } catch {
    /* not connected */
  }
}
