import { useEffect, useState } from 'react';
import {
  DEVICE_USER_KEY,
  getLocalStoreUserKey,
} from '@/lib/local-store/userScope';
import { getDecodeContext } from '@/lib/studio-assets/load-audio';

// ── The Studio Library's audio (stems and uploads) ─────────────────────────
//
// What the Library's Stems and Uploads list: each stem Export › Stems
// renders, and each audio file uploaded into a project, kept as an item of
// its own (with its bytes), so it outlives the project it came from — as in
// Suno, where a stem or an upload is a library item, not a clip.
//
// On this device for now: a database of its own ('ma-studio-library'),
// apart from the drafts' ('ma-studio'), whose media is collected when no
// draft uses it. Per user, by the local store's user key. Cloud sync waits
// on an assets list API (S6).

export type LibraryAudioKind = 'stem' | 'upload';

export interface LibraryAudioItem {
  id: string;
  kind: LibraryAudioKind;
  userKey: string;
  /** 'Midnight Groove (Drums)' for a stem; the file's name for an upload. */
  name: string;
  /** The short label on its row: the instrument, or the file type. */
  tag: string;
  /** The project it came from. */
  project: string;
  /** Its track's color. */
  color: string;
  contentType: string;
  size: number;
  durationSec: number | null;
  createdAt: number;
  favorite: boolean;
}

interface StoredItem extends LibraryAudioItem {
  blob: Blob;
}

export type NewLibraryAudio = Omit<
  LibraryAudioItem,
  'id' | 'userKey' | 'createdAt' | 'favorite' | 'durationSec'
> & { blob: Blob; durationSec?: number | null };

const DB_NAME = 'ma-studio-library';
const STORE = 'audio';

/** Whose library this is: the signed-in user's, or the device's. */
const currentUserKey = () => getLocalStoreUserKey() ?? DEVICE_USER_KEY;

// ── Storage: IndexedDB, or memory where there is none (tests) ─────────────

const memory = new Map<string, StoredItem>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('userKey', 'userKey');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        if (!db) return resolve(undefined);
        const req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

async function putStored(item: StoredItem): Promise<void> {
  if (!(await openDb())) {
    memory.set(item.id, item);
    return;
  }
  await run('readwrite', (s) => s.put(item));
}

async function getStored(id: string): Promise<StoredItem | null> {
  if (!(await openDb())) return memory.get(id) ?? null;
  return ((await run('readonly', (s) => s.get(id))) as StoredItem) ?? null;
}

// ── Change notification ────────────────────────────────────────────────────

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((fn) => fn());

// ── API ────────────────────────────────────────────────────────────────────

/** How long the audio plays, from its bytes; null when they won't decode. */
async function measure(blob: Blob): Promise<number | null> {
  try {
    const bytes = await blob.arrayBuffer();
    return (await getDecodeContext().decodeAudioData(bytes)).duration;
  } catch {
    return null;
  }
}

/** Keeps a stem or an upload in this user's library. Never throws. */
export async function saveLibraryAudio(input: NewLibraryAudio): Promise<void> {
  try {
    const { blob, durationSec, ...rest } = input;
    await putStored({
      ...rest,
      blob,
      id: `${input.kind}-${crypto.randomUUID()}`,
      userKey: currentUserKey(),
      createdAt: Date.now(),
      favorite: false,
      durationSec: durationSec ?? (await measure(blob)),
    });
    changed();
  } catch (err) {
    console.warn('[library] An item could not be kept:', err);
  }
}

/** This user's items, newest first, without their bytes. */
export async function listLibraryAudio(): Promise<LibraryAudioItem[]> {
  const userKey = currentUserKey();
  const all = (await openDb())
    ? (((await run('readonly', (s) =>
        s.index('userKey').getAll(userKey),
      )) as StoredItem[]) ?? [])
    : [...memory.values()].filter((i) => i.userKey === userKey);
  return all
    .map(({ blob: _blob, ...item }) => item)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** An item's audio. */
export async function libraryAudioBlob(id: string): Promise<Blob | null> {
  return (await getStored(id))?.blob ?? null;
}

/** An item with its bytes (to add it to the song, or download it). */
export async function getLibraryAudio(id: string): Promise<StoredItem | null> {
  return getStored(id);
}

export async function setLibraryAudioFavorite(
  id: string,
  favorite: boolean,
): Promise<void> {
  const item = await getStored(id);
  if (!item) return;
  await putStored({ ...item, favorite });
  changed();
}

export async function deleteLibraryAudio(id: string): Promise<void> {
  if (!(await openDb())) memory.delete(id);
  else await run('readwrite', (s) => s.delete(id));
  changed();
}

/** This user's library audio, kept current as items come and go. */
export function useLibraryAudio(): {
  items: LibraryAudioItem[];
  loaded: boolean;
} {
  const [state, setState] = useState<{
    items: LibraryAudioItem[];
    loaded: boolean;
  }>({ items: [], loaded: false });
  useEffect(() => {
    let live = true;
    const load = () =>
      void listLibraryAudio()
        .then((items) => live && setState({ items, loaded: true }))
        .catch(() => live && setState((s) => ({ ...s, loaded: true })));
    load();
    listeners.add(load);
    return () => {
      live = false;
      listeners.delete(load);
    };
  }, []);
  return state;
}

/** Tests: forget everything kept in memory. */
export function resetLibraryAudioForTests(): void {
  memory.clear();
  dbPromise = null;
}
