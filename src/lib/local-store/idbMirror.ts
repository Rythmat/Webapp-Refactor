/**
 * IDB-backed store with a synchronous in-memory mirror.
 *
 * The classroom "heavy" stores (published days, annual plan) were plain
 * localStorage: fully synchronous `read()`/`write()` used directly in React
 * render, plus a same-tab `<key>:changed` event and a cross-tab `storage`
 * event. As a teacher accumulates content these grew until the origin's
 * localStorage quota filled — starving everything else that shares it.
 *
 * This moves the bytes to IndexedDB (GB-scale quota) WITHOUT changing the
 * stores' synchronous public API:
 *   - reads/writes go through a synchronous in-memory `mirror`;
 *   - on first load the mirror hydrates from IDB, migrating any existing
 *     localStorage value into IDB once and then FREEING the localStorage copy;
 *   - cross-tab sync (which localStorage got for free via the `storage` event,
 *     and IDB does not) is restored with a `BroadcastChannel`.
 *
 * Where IndexedDB is unavailable (SSR, jsdom tests) it transparently stays on
 * the caller's synchronous localStorage path (`readLegacy`/`writeLegacy`), so
 * existing behavior and unit tests are unchanged.
 */
import { hasIndexedDb, idbGet, idbSet } from './idbKeyValue';

const hasBroadcastChannel = typeof BroadcastChannel !== 'undefined';
const CHANNEL_NAME = 'ma-idb-store';

export interface IdbMirrorConfig<T> {
  /** Stable key — the IDB record key and the legacy localStorage key. */
  key: string;
  /** Synchronous localStorage read (existing behavior; may write a `.bak`). */
  readLegacy: () => T;
  /** Synchronous localStorage write (existing behavior; fires same-tab event). */
  writeLegacy: (value: T) => void;
  /** Remove the legacy localStorage key(s) once migrated to IDB. */
  clearLegacy: () => void;
}

export interface IdbMirror<T> {
  read: () => T;
  write: (value: T) => void;
  subscribe: (listener: () => void) => () => void;
  /** Resolves once IDB hydration/migration is done (immediately when no IDB). */
  ready: Promise<void>;
}

const registry = new Map<string, IdbMirror<unknown>>();

export function getIdbMirror<T>(config: IdbMirrorConfig<T>): IdbMirror<T> {
  const cached = registry.get(config.key);
  if (cached) return cached as IdbMirror<T>;

  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  let mirror: T | null = null;
  let hydrated = false;

  const channel =
    hasBroadcastChannel && hasIndexedDb
      ? new BroadcastChannel(CHANNEL_NAME)
      : null;

  const refreshFromIdb = async (): Promise<void> => {
    const fromIdb = (await idbGet<T>(config.key)) ?? null;
    if (fromIdb !== null) {
      mirror = fromIdb;
      hydrated = true;
      notify();
    }
  };

  const read = (): T =>
    hydrated && mirror !== null ? mirror : config.readLegacy();

  const write = (value: T): void => {
    if (!hasIndexedDb) {
      // Unchanged synchronous localStorage behavior (tests / no-IDB env).
      config.writeLegacy(value);
      notify();
      return;
    }
    mirror = value;
    hydrated = true;
    void idbSet(config.key, value).catch(() => {
      // IDB write failed at runtime — fall back so data isn't silently lost.
      try {
        config.writeLegacy(value);
      } catch {
        // Last resort: keep it in the in-memory mirror for this session.
      }
    });
    config.clearLegacy();
    notify();
    channel?.postMessage({ key: config.key });
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const ready: Promise<void> = (async () => {
    if (!hasIndexedDb) return;
    try {
      const fromIdb = (await idbGet<T>(config.key)) ?? null;
      if (hydrated) return; // a write already set authoritative state
      if (fromIdb !== null) {
        mirror = fromIdb;
        hydrated = true;
        notify();
        return;
      }
      // First run on this device: migrate any legacy localStorage value in.
      const legacy = config.readLegacy();
      mirror = legacy;
      hydrated = true;
      await idbSet(config.key, legacy);
      config.clearLegacy();
      notify();
    } catch {
      // IDB blocked/unavailable at runtime — stay on the legacy path.
    }
  })();

  if (channel) {
    channel.onmessage = (event: MessageEvent) => {
      if (!event.data || event.data.key !== config.key) return;
      void refreshFromIdb().catch(() => {
        // ignore cross-tab refresh failures
      });
    };
  }

  const instance: IdbMirror<T> = { read, write, subscribe, ready };
  registry.set(config.key, instance as IdbMirror<unknown>);
  return instance;
}
