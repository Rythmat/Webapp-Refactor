/**
 * Where the Mind Map remembers its layout between visits, so reopening it
 * starts from the picture it last showed instead of a fresh explosion.
 *
 * Positions are kept in IndexedDB (database `ma-console-graph-layout`), one
 * record per filter signature: the filters that change which nodes and links
 * exist (tags, curriculum, existing items only, guessed and unconfirmed links,
 * orphans), never the search, so a search starts from the unfiltered
 * positions and filtering feels stable. Each record holds node ids and their
 * positions, so a lookup is by node id. The four most recently saved
 * signatures are kept and older ones deleted.
 *
 * A layout is saved when it settles and when the page is hidden. On load, if
 * at least 95% of the nodes asked for have a position, the start is warm:
 * the simulation begins at alpha 0.05 and the map opens looking still.
 *
 * Nothing here ever throws or rejects. Without IndexedDB (a private window,
 * a refused sandbox, node) every load is a cold start and saves do nothing.
 */
import { alignPositions, startAlphaFor } from './forceLayout';

export const POSITION_DATABASE = 'ma-console-graph-layout';
const DATABASE_VERSION = 1;
const LAYOUT_STORE = 'layouts';
const SAVED_AT_INDEX = 'savedAt';

/** How many filter signatures keep their positions. */
export const KEEP_SIGNATURES = 4;

/** A stored layout. */
interface LayoutRecord {
  signature: string;
  savedAt: number;
  ids: string[];
  xy: Float32Array;
}

/** What a layout starts from. */
export interface WarmStart {
  /** Positions in the order of the ids asked for; NaN where none was kept. */
  xy: Float32Array;
  /** How many of the ids had a position. */
  placed: number;
  /** `placed` as a share of the ids asked for (0 when none were). */
  coverage: number;
  /** The alpha to start at: 0.05 at 95% coverage or more, else 1. */
  alpha: number;
}

/** A layout to save: positions as x0, y0, x1, y1, … in the order of `ids`. */
export interface PositionSnapshot {
  signature: string;
  ids: readonly string[];
  xy: ArrayLike<number>;
}

/** Where to hear that the page is being hidden or left. */
export interface PageHideEvents {
  window: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> | null;
  document:
    | (Pick<EventTarget, 'addEventListener' | 'removeEventListener'> & {
        readonly visibilityState: string;
      })
    | null;
}

export interface PositionCache {
  /**
   * Positions for `ids` under `signature`. With `center`, they are shifted
   * so that node sits at the origin (a local graph starting from the global
   * graph's positions).
   */
  load(
    signature: string,
    ids: readonly string[],
    options?: { center?: string },
  ): Promise<WarmStart>;
  /** Save a layout; resolves true once it has landed, false if it could not. */
  save(snapshot: PositionSnapshot): Promise<boolean>;
  /**
   * Save whatever `snapshot` returns when the page is hidden or left.
   * Returns a function that stops listening.
   */
  saveOnPageHide(
    snapshot: () => PositionSnapshot | null,
    events?: PageHideEvents | null,
  ): () => void;
  /** Settles once every save started so far has. */
  settled(): Promise<void>;
  close(): void;
}

export interface PositionCacheOptions {
  /** Defaults to the browser's; null runs without storage. */
  indexedDB?: IDBFactory | null;
  /** Milliseconds since the epoch; defaults to `Date.now()`. */
  now?: () => number;
  keep?: number;
  name?: string;
}

/**
 * A signature from the filters that shape the graph: a scope (such as
 * "global") and the filter values, in a stable order whatever order they
 * were given in. List values are sorted.
 */
export function layoutSignature(
  scope: string,
  filters: Record<string, boolean | number | string | readonly string[]>,
): string {
  const parts = Object.keys(filters)
    .sort()
    .map((key) => {
      const value = filters[key];
      const text = Array.isArray(value)
        ? [...value].sort().join(',')
        : String(value);
      return `${key}=${text}`;
    });
  return `${scope}|${parts.join('|')}`;
}

const browserIndexedDB = (): IDBFactory | null => {
  try {
    return typeof indexedDB === 'undefined' ? null : indexedDB;
  } catch {
    return null;
  }
};

const browserPageEvents = (): PageHideEvents | null =>
  typeof window === 'undefined'
    ? null
    : {
        window,
        document: typeof document === 'undefined' ? null : document,
      };

const coldStart = (count: number): WarmStart => ({
  xy: new Float32Array(count * 2).fill(NaN),
  placed: 0,
  coverage: 0,
  alpha: startAlphaFor(0),
});

const isRecord = (value: unknown): value is LayoutRecord => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<LayoutRecord>;
  return (
    typeof record.signature === 'string' &&
    Array.isArray(record.ids) &&
    record.ids.every((id) => typeof id === 'string') &&
    record.xy instanceof Float32Array &&
    record.xy.length === record.ids.length * 2
  );
};

/** FNV-1a over the positions' bits, to skip saving what was just saved. */
const hashPositions = (xy: Float32Array) => {
  const words = new Uint32Array(xy.buffer, xy.byteOffset, xy.length);
  let hash = 0x811c9dc5;
  for (let i = 0; i < words.length; i++) {
    hash ^= words[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const openDatabase = (factory: IDBFactory, name: string) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    // open() itself throws where storage is refused; the executor turns that
    // into a rejection like any other.
    const request = factory.open(name, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LAYOUT_STORE)) {
        const store = db.createObjectStore(LAYOUT_STORE, {
          keyPath: 'signature',
        });
        store.createIndex(SAVED_AT_INDEX, 'savedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export function createPositionCache(
  options: PositionCacheOptions = {},
): PositionCache {
  const factory =
    options.indexedDB === undefined ? browserIndexedDB() : options.indexedDB;
  const now = options.now ?? (() => Date.now());
  const keep = Math.max(1, options.keep ?? KEEP_SIGNATURES);
  const name = options.name ?? POSITION_DATABASE;

  let opening: Promise<IDBDatabase | null> | null = null;
  let closed = false;
  let lastStamp = 0;
  let lastSaved: {
    signature: string;
    ids: readonly string[];
    hash: number;
  } | null = null;
  const inFlight = new Set<Promise<boolean>>();

  const database = (): Promise<IDBDatabase | null> => {
    if (closed || !factory) return Promise.resolve(null);
    opening ??= openDatabase(factory, name).then(
      (db) => {
        // Never hold up another tab's upgrade, or a "Clear site data".
        db.onversionchange = () => db.close();
        return db;
      },
      () => null,
    );
    return opening;
  };

  const read = async (signature: string): Promise<LayoutRecord | null> => {
    const db = await database();
    if (!db) return null;
    try {
      const value = await new Promise<unknown>((resolve, reject) => {
        const request = db
          .transaction(LAYOUT_STORE, 'readonly')
          .objectStore(LAYOUT_STORE)
          .get(signature);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return isRecord(value) ? value : null;
    } catch {
      return null;
    }
  };

  const write = async (record: LayoutRecord): Promise<boolean> => {
    const db = await database();
    if (!db) return false;
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(LAYOUT_STORE, 'readwrite');
        const store = transaction.objectStore(LAYOUT_STORE);
        store.put(record);
        // Oldest first: everything before the newest `keep` goes.
        const keys = store.index(SAVED_AT_INDEX).getAllKeys();
        keys.onsuccess = () => {
          const all = keys.result;
          for (const key of all.slice(0, Math.max(0, all.length - keep)))
            store.delete(key);
          // Commit now rather than when this task ends: on pagehide there
          // may be no later.
          transaction.commit?.();
        };
        transaction.oncomplete = () => resolve();
        transaction.onabort = () =>
          reject(
            transaction.error ??
              new DOMException('The save was cancelled.', 'AbortError'),
          );
      });
      return true;
    } catch {
      return false;
    }
  };

  const save = (snapshot: PositionSnapshot): Promise<boolean> => {
    if (closed || !factory) return Promise.resolve(false);
    const { signature, ids } = snapshot;
    if (snapshot.xy.length !== ids.length * 2) return Promise.resolve(false);
    const xy = Float32Array.from(snapshot.xy);
    const hash = hashPositions(xy);
    if (
      lastSaved &&
      lastSaved.signature === signature &&
      lastSaved.ids === ids &&
      lastSaved.hash === hash
    )
      return Promise.resolve(true);
    lastStamp = Math.max(now(), lastStamp + 1);
    const record: LayoutRecord = {
      signature,
      savedAt: lastStamp,
      ids: [...ids],
      xy,
    };
    const remembered = { signature, ids, hash };
    const pending = write(record).then((landed) => {
      if (landed) lastSaved = remembered;
      return landed;
    });
    inFlight.add(pending);
    const forget = () => {
      inFlight.delete(pending);
    };
    pending.then(forget, forget);
    return pending;
  };

  return {
    async load(signature, ids, loadOptions = {}) {
      const record = await read(signature);
      if (!record) return coldStart(ids.length);
      const { xy, placed } = alignPositions(record.ids, record.xy, ids, {
        center: loadOptions.center,
      });
      const coverage = ids.length === 0 ? 0 : placed / ids.length;
      return { xy, placed, coverage, alpha: startAlphaFor(coverage) };
    },
    save,
    saveOnPageHide(snapshot, events = browserPageEvents()) {
      const flush = () => {
        const current = snapshot();
        if (current) void save(current);
      };
      const onVisibilityChange = () => {
        if (events?.document?.visibilityState === 'hidden') flush();
      };
      events?.window?.addEventListener('pagehide', flush);
      events?.document?.addEventListener(
        'visibilitychange',
        onVisibilityChange,
      );
      return () => {
        events?.window?.removeEventListener('pagehide', flush);
        events?.document?.removeEventListener(
          'visibilitychange',
          onVisibilityChange,
        );
      };
    },
    settled: async () => {
      await Promise.allSettled([...inFlight]);
    },
    close() {
      closed = true;
      void opening?.then((db) => db?.close());
    },
  };
}
