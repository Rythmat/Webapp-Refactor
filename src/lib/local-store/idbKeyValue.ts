/**
 * Minimal promise-based IndexedDB key/value store. One database, one object
 * store, string keys, structured-clone values. No dependencies.
 *
 * Used by {@link ./idbMirror} to give the heavy classroom stores (published
 * days, annual plan) a large-quota home instead of localStorage — which the
 * Auth0 token cache and everything else also share. Guarded so it never runs
 * where `indexedDB` is absent (SSR, jsdom tests).
 */
const DB_NAME = 'ma-local-store';
const STORE = 'kv';

export const hasIndexedDb = (() => {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
})();

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('indexedDB open blocked'));
  });
  return dbPromise;
};

const run = <T>(
  mode: IDBTransactionMode,
  make: (store: IDBObjectStore) => IDBRequest,
): Promise<T> =>
  openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = make(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );

export const idbGet = <T>(key: string): Promise<T | undefined> =>
  run<T | undefined>('readonly', (s) => s.get(key));

export const idbSet = (key: string, value: unknown): Promise<void> =>
  run<IDBValidKey>('readwrite', (s) => s.put(value, key)).then(() => undefined);

export const idbDelete = (key: string): Promise<void> =>
  run<undefined>('readwrite', (s) => s.delete(key)).then(() => undefined);
