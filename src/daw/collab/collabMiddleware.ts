// ── Collab Middleware ─────────────────────────────────────────────────────
// A Zustand middleware that intercepts all set() calls at the store level.
// When a collaborative session is active, it diffs prev/next state and
// propagates changes to the Yjs document via the bridge.
//
// This approach requires ZERO changes to individual slice files — the
// middleware wraps the entire store creator.

import type { ZustandYjsBridge } from './ZustandYjsBridge';
import type { AllSlices } from '@/daw/store/index';

// ── Module-level bridge reference ───────────────────────────────────────
// Set by CollabProvider when a session starts; cleared when it ends.

let _bridge: ZustandYjsBridge | null = null;

export function setBridge(bridge: ZustandYjsBridge | null): void {
  _bridge = bridge;
}

export function getBridge(): ZustandYjsBridge | null {
  return _bridge;
}

// ── Middleware ───────────────────────────────────────────────────────────

/**
 * Zustand middleware that intercepts `set()` and forwards state deltas
 * to the Yjs document when collaboration is active.
 *
 * Usage in store/index.ts:
 * ```ts
 * import { collabMiddleware } from '@/daw/collab/collabMiddleware';
 *
 * export const useStore = create<AllSlices>()(
 *   subscribeWithSelector(
 *     collabMiddleware((...a) => ({
 *       ...createTransportSlice(...a),
 *       ...createTracksSlice(...a),
 *       // etc.
 *     }))
 *   )
 * );
 * ```
 */
export const collabMiddleware =
  (
    config: (
      set: (
        partial:
          | AllSlices
          | Partial<AllSlices>
          | ((state: AllSlices) => AllSlices | Partial<AllSlices>),
        replace?: boolean,
      ) => void,
      get: () => AllSlices,
      api: {
        setState: (
          partial:
            | AllSlices
            | Partial<AllSlices>
            | ((state: AllSlices) => AllSlices | Partial<AllSlices>),
          replace?: boolean,
        ) => void;
        getState: () => AllSlices;
        getInitialState: () => AllSlices;
        subscribe: (listener: (state: AllSlices, prevState: AllSlices) => void) => () => void;
      },
    ) => AllSlices,
  ) =>
  (
    set: (
      partial:
        | AllSlices
        | Partial<AllSlices>
        | ((state: AllSlices) => AllSlices | Partial<AllSlices>),
      replace?: boolean,
    ) => void,
    get: () => AllSlices,
    api: {
      setState: (
        partial:
          | AllSlices
          | Partial<AllSlices>
          | ((state: AllSlices) => AllSlices | Partial<AllSlices>),
        replace?: boolean,
      ) => void;
      getState: () => AllSlices;
      getInitialState: () => AllSlices;
      subscribe: (listener: (state: AllSlices, prevState: AllSlices) => void) => () => void;
    },
  ): AllSlices => {
    const collabSet: typeof set = (partial, replace) => {
      const prev = get();
      set(partial, replace);

      // If the bridge is active and the change didn't come FROM Yjs,
      // propagate to the shared document.
      if (_bridge && !_bridge.suppressStoreToYjs) {
        const next = get();
        if (prev !== next) {
          _bridge.syncToYjs(prev, next);
        }
      }
    };

    return config(collabSet, get, api);
  };
