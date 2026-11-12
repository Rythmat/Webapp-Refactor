// ── The Library's rendered audio, kept on this device ──────────────────────
// A session's mix is rendered in the browser the first
// time it is played, then kept here, so the next play starts at once. Never
// uploaded: a database of its own ('ma-library-previews'), keyed by the
// user, the session and its version, so an edit gets a new render
// and one student never hears another's from the cache. The oldest-played
// go first past CAP_BYTES. Where IndexedDB isn't there (tests, a private
// window that refuses it) the page keeps them in memory.

export interface CachedPreview {
  key: string;
  userKey: string;
  blob: Blob;
  /** Normalized 0–1 peaks for the player's waveform. */
  peaks: number[];
  duration: number;
  size: number;
  usedAt: number;
}

const DB_NAME = 'ma-library-previews';
const STORE = 'previews';
/** What the cache may hold before the oldest-played go. */
export const CAP_BYTES = 300 * 1024 * 1024;

export function previewKey(
  userKey: string,
  sourceKey: string,
  version: string,
): string {
  return [userKey, sourceKey, version, 'mix'].join('|');
}

const memory = new Map<string, CachedPreview>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('usedAt', 'usedAt');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** The kept render, or null; marks it used. Never throws. */
export async function getPreview(key: string): Promise<CachedPreview | null> {
  try {
    const db = await openDb();
    if (!db) {
      const hit = memory.get(key) ?? null;
      if (hit) hit.usedAt = Date.now();
      return hit;
    }
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
    const hit = (await request(store.get(key))) as CachedPreview | undefined;
    if (!hit) return null;
    hit.usedAt = Date.now();
    store.put(hit);
    return hit;
  } catch (err) {
    console.warn('[library] The preview cache could not be read', err);
    return null;
  }
}

/** Keep a render; the oldest-played go past the cap. Never throws. */
export async function putPreview(
  entry: Omit<CachedPreview, 'size' | 'usedAt'>,
): Promise<void> {
  const full: CachedPreview = {
    ...entry,
    size: entry.blob.size,
    usedAt: Date.now(),
  };
  try {
    const db = await openDb();
    if (!db) {
      memory.set(full.key, full);
      trimMemory();
      return;
    }
    await request(
      db.transaction(STORE, 'readwrite').objectStore(STORE).put(full),
    );
    await trim(db);
  } catch (err) {
    // Storage full or refused: the render plays this once.
    console.warn('[library] A preview could not be kept', err);
  }
}

/** Forget every render of a project (deleted). Never throws. */
export async function dropPreviews(
  userKey: string,
  sourceKey: string,
): Promise<void> {
  const prefix = `${userKey}|${sourceKey}|`;
  try {
    const db = await openDb();
    if (!db) {
      for (const key of [...memory.keys()]) {
        if (key.startsWith(prefix)) memory.delete(key);
      }
      return;
    }
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
    const range = IDBKeyRange.bound(prefix, `${prefix}￿`);
    await request(store.delete(range));
  } catch (err) {
    console.warn('[library] Previews could not be dropped', err);
  }
}

function trimMemory(): void {
  let total = 0;
  for (const entry of memory.values()) total += entry.size;
  const oldest = [...memory.values()].sort((a, b) => a.usedAt - b.usedAt);
  for (const entry of oldest) {
    if (total <= CAP_BYTES) break;
    memory.delete(entry.key);
    total -= entry.size;
  }
}

async function trim(db: IDBDatabase): Promise<void> {
  const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
  const all = (await request(store.getAll())) as CachedPreview[];
  let total = all.reduce((sum, entry) => sum + entry.size, 0);
  if (total <= CAP_BYTES) return;
  const tx = db.transaction(STORE, 'readwrite').objectStore(STORE);
  for (const entry of all.sort((a, b) => a.usedAt - b.usedAt)) {
    if (total <= CAP_BYTES) break;
    tx.delete(entry.key);
    total -= entry.size;
  }
}

/** Tests: forget the page's copy and the database handle. */
export function resetPreviewCacheForTests(): void {
  memory.clear();
  dbPromise = null;
}
