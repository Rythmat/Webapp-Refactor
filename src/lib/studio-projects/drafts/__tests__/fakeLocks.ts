// A LockManager in memory, for the draft-lock, mirror and legacy-import
// tests. It follows the rules Chromium enforces (critic2's locks-probe):
// - `ifAvailable` together with `signal` rejects NotSupportedError;
// - an already-aborted signal, or one that aborts while the request waits,
//   rejects with the signal's reason (a TimeoutError for
//   AbortSignal.timeout, an AbortError for a plain abort());
// - an ifAvailable request on a held lock calls back with null;
// - the lock is held until the callback's promise settles.
// Exclusive mode only (the drafts never ask for shared locks).

interface Waiter {
  name: string;
  grant: () => void;
}

export interface FakeLockManager extends LockManager {
  /** Hold `name` from "another tab" until the returned function runs. */
  holdElsewhere(name: string): () => void;
  /** Names held now. */
  heldNames(): string[];
  /** Every options object request() was given. */
  readonly calls: { name: string; options: LockOptions }[];
}

export function createFakeLockManager(): FakeLockManager {
  const held = new Set<string>();
  const queue: Waiter[] = [];
  const calls: { name: string; options: LockOptions }[] = [];

  const pump = () => {
    for (let i = 0; i < queue.length; i++) {
      const waiter = queue[i];
      if (held.has(waiter.name)) continue;
      queue.splice(i, 1);
      waiter.grant();
      i = -1;
    }
  };

  const release = (name: string) => {
    held.delete(name);
    queueMicrotask(pump);
  };

  function request<T>(
    name: string,
    optionsOrCallback: LockOptions | ((lock: Lock | null) => T),
    maybeCallback?: (lock: Lock | null) => T,
  ): Promise<Awaited<T>> {
    const options: LockOptions =
      typeof optionsOrCallback === 'function' ? {} : optionsOrCallback;
    const callback = (
      typeof optionsOrCallback === 'function'
        ? optionsOrCallback
        : maybeCallback
    ) as (lock: Lock | null) => T;
    calls.push({ name, options });
    if (options.ifAvailable && options.signal) {
      return Promise.reject(
        new DOMException(
          "The 'signal' and 'ifAvailable' options cannot be used together.",
          'NotSupportedError',
        ),
      );
    }
    const { signal } = options;
    if (signal?.aborted) return Promise.reject(signal.reason);

    const run = async (): Promise<Awaited<T>> => {
      held.add(name);
      try {
        return await callback({ name, mode: 'exclusive' } as Lock);
      } finally {
        release(name);
      }
    };

    if (!held.has(name)) return run();
    if (options.ifAvailable) {
      return Promise.resolve().then(
        async (): Promise<Awaited<T>> => await callback(null),
      );
    }
    return new Promise<Awaited<T>>((resolve, reject) => {
      const waiter: Waiter = {
        name,
        grant: () => {
          signal?.removeEventListener('abort', onAbort);
          run().then(resolve, reject);
        },
      };
      const onAbort = () => {
        const at = queue.indexOf(waiter);
        if (at >= 0) queue.splice(at, 1);
        reject(signal?.reason);
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      queue.push(waiter);
    });
  }

  return {
    request: request as LockManager['request'],
    query: () =>
      Promise.resolve({
        held: [...held].map((name) => ({ name, mode: 'exclusive' as const })),
        pending: queue.map((w) => ({
          name: w.name,
          mode: 'exclusive' as const,
        })),
      }),
    holdElsewhere(name: string) {
      let done: () => void = () => {};
      void request(name, {}, () => new Promise<void>((r) => (done = r)));
      return () => done();
    },
    heldNames: () => [...held],
    calls,
  };
}
