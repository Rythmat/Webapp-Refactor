/**
 * Data the Globe loads when it is first needed instead of with the page.
 *
 * Wraps one async loader (usually a dynamic `import()`) so that:
 *  - it runs at most once while it succeeds: every caller shares one promise,
 *    and `peek()` hands the result back synchronously afterwards;
 *  - a failure is not remembered: the next `load()` tries again, so a dropped
 *    connection doesn't leave a panel broken for the rest of the visit;
 *  - React can subscribe to it (`useLazyResource`) and re-render when it lands.
 */

export type LazySnapshot<T> =
  | { status: 'idle'; data?: undefined; error?: undefined }
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'ready'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: unknown };

export interface LazyResource<T> {
  /** Start loading (or join the load under way); resolves with the data. */
  load(): Promise<T>;
  /** The data if it has loaded, else undefined. Never starts a load. */
  peek(): T | undefined;
  /** The current state, as a stable object until it changes. */
  getSnapshot(): LazySnapshot<T>;
  subscribe(listener: () => void): () => void;
}

const IDLE = { status: 'idle' } as const;
const LOADING = { status: 'loading' } as const;

export function lazyResource<T>(loader: () => Promise<T>): LazyResource<T> {
  let snapshot: LazySnapshot<T> = IDLE;
  let pending: Promise<T> | null = null;
  const listeners = new Set<() => void>();

  const set = (next: LazySnapshot<T>) => {
    snapshot = next;
    for (const listener of [...listeners]) listener();
  };

  return {
    load() {
      if (snapshot.status === 'ready') return Promise.resolve(snapshot.data);
      if (pending) return pending;
      set(LOADING);
      pending = Promise.resolve()
        .then(loader)
        .then(
          (data) => {
            pending = null;
            set({ status: 'ready', data });
            return data;
          },
          (error: unknown) => {
            // Forget the failure so the next load() retries.
            pending = null;
            set({ status: 'error', error });
            throw error;
          },
        );
      return pending;
    },
    peek: () => snapshot.data,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
