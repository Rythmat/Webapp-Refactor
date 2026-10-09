import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import {
  ANON_USER_KEY,
  DEVICE_USER_KEY,
  getLocalStoreUserKey,
  onLocalStoreUserChange,
  otherUserNamespaces,
  type KnownUserKeysSource,
  type UserKey,
} from '@/lib/local-store/userScope';

interface TutorialProgressState {
  /** Unix ms of when each tutorial id was first completed. */
  completedAt: Record<string, number>;
  /** Record a tutorial as completed (first-completion time only). */
  markComplete: (id: string) => void;
  isComplete: (id: string) => boolean;
}

// ── Whose progress this is ─────────────────────────────────────────────────
//
// Completion badges follow the student, not the device: on a shared
// Chromebook each user's live under `music-atlas-tutorial-progress:<userKey>`
// (userScope.ts), in zustand persist's `{state: {completedAt}, version}`
// shape. The store switches key whenever the device's user changes (sign-in,
// sign-out, another account without a reload), and starts that user from
// their own record, never from the last user's.
//
// Before 1.4 there was one record per device (LEGACY_PROGRESS_KEY). A user's
// first load moves its completions over only on a device where no one else
// has used the Studio (otherUserNamespaces); anywhere else they start empty.
// The device record itself is never written or deleted, and a user gets a
// record of their own only once it holds something, so merely opening the
// Production tab doesn't make someone count as another user of the device.
//
// Following userScope.ts: nothing is read or written while the device's user
// is unknown (auth hasn't answered yet), and completions made then live in
// memory and join the user's record once known; a signed-out session keeps
// its own under 'anon'.

/** The pre-1.4 device-wide record: read for a migration, never written. */
export const LEGACY_PROGRESS_KEY = 'music-atlas-tutorial-progress';

/** Where a user's progress lives. */
export function tutorialProgressKey(userKey: UserKey): string {
  return `${LEGACY_PROGRESS_KEY}:${userKey}`;
}

function localStorageOrNull(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Writes held while the store changes user (see switchUser). */
let switching = false;

const userStorage: StateStorage = {
  getItem: (name) => {
    if (getLocalStoreUserKey() === null) return null;
    try {
      return localStorageOrNull()?.getItem(name) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (switching || getLocalStoreUserKey() === null) return;
    try {
      localStorageOrNull()?.setItem(name, value);
    } catch {
      // Storage full or unavailable: the badge shows until the next load.
    }
  },
  removeItem: (name) => {
    try {
      localStorageOrNull()?.removeItem(name);
    } catch {
      // ignore
    }
  },
};

/** The persist key for whoever the device's user is now ('anon' unknown). */
function currentKey(): string {
  return tutorialProgressKey(getLocalStoreUserKey() ?? ANON_USER_KEY);
}

/**
 * Persists which Studio tutorials the user has finished, so the Production tab
 * can show a "Completed" badge across sessions. Client-side localStorage, same
 * pattern as `useAwardEarnedStore` / `useSeenChallengesStore`, keyed by user.
 */
export const useTutorialProgressStore = create<TutorialProgressState>()(
  persist(
    (set, get) => ({
      completedAt: {},
      markComplete: (id) =>
        set((state) =>
          state.completedAt[id] != null
            ? state
            : { completedAt: { ...state.completedAt, [id]: Date.now() } },
        ),
      isComplete: (id) => get().completedAt[id] != null,
    }),
    {
      name: currentKey(),
      storage: createJSONStorage(() => userStorage),
      partialize: (state) => ({ completedAt: state.completedAt }),
    },
  ),
);

// ── The pre-1.4 record ─────────────────────────────────────────────────────

/** The device record's completions, or null when there are none. */
function readLegacyCompletions(): Record<string, number> | null {
  try {
    const raw = localStorageOrNull()?.getItem(LEGACY_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: { completedAt?: unknown };
    } | null;
    const completedAt = parsed?.state?.completedAt;
    if (!completedAt || typeof completedAt !== 'object') return null;
    const entries = Object.entries(completedAt).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isFinite(entry[1]),
    );
    return entries.length > 0 ? Object.fromEntries(entries) : null;
  } catch {
    return null;
  }
}

/**
 * Who else has drafts on this device: the draft store's owners. Loaded on
 * demand, only when localStorage alone can't settle a first load (a device
 * record to move and no one else seen), and null when the store can't be
 * had, in which case localStorage alone decides.
 */
let draftOwners: () => Promise<KnownUserKeysSource | null> = async () => {
  try {
    const { getDraftStore } = await import(
      '@/lib/studio-projects/drafts/draftStore'
    );
    return getDraftStore();
  } catch {
    return null;
  }
};

/** Tests: where the draft store's owners come from. */
export function setTutorialProgressDraftOwners(
  source: () => Promise<KnownUserKeysSource | null>,
): void {
  draftOwners = source;
}

/** How long a first load waits for the draft store's owners. */
export const DRAFT_OWNERS_TIMEOUT_MS = 1500;

/**
 * The draft store's owners within DRAFT_OWNERS_TIMEOUT_MS: null when it
 * doesn't answer in time (the first load is then retried on a later load,
 * never decided on half the facts); an empty set when it fails.
 */
async function draftOwnerKeys(): Promise<Set<UserKey> | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), DRAFT_OWNERS_TIMEOUT_MS);
  });
  const answer = (async () => {
    try {
      const source = await draftOwners();
      return source ? await source.knownUserKeys() : new Set<UserKey>();
    } catch {
      return new Set<UserKey>();
    }
  })();
  try {
    return await Promise.race([answer, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A user's first load (no record of their own yet): move the device record's
 * completions to them when nobody else has used the Studio here. Otherwise
 * nothing is written: they start empty, and their record appears with their
 * first completion. Completions they made meanwhile are kept.
 */
async function firstLoad(userKey: UserKey): Promise<void> {
  const legacy = readLegacyCompletions();
  if (!legacy) return;
  // localStorage first: when it already shows someone else, the draft store
  // isn't opened at all.
  if ((await otherUserNamespaces(userKey, { store: null })).size > 0) return;
  const owners = await draftOwnerKeys();
  if (owners === null) return;
  const others = await otherUserNamespaces(userKey, {
    store: { knownUserKeys: async () => owners },
  });
  if (others.size > 0) return;
  // Only into this user's record: another may have signed in meanwhile.
  if (getLocalStoreUserKey() !== userKey) return;
  if (
    useTutorialProgressStore.persist.getOptions().name !==
    tutorialProgressKey(userKey)
  )
    return;
  useTutorialProgressStore.setState((state) => ({
    completedAt: { ...legacy, ...state.completedAt },
  }));
}

let pendingFirstLoad: Promise<void> | null = null;

/** Start the first load of a user with no record of their own yet. */
function firstLoadIfNew(userKey: UserKey): void {
  // A signed-out session, or unowned work, never takes the device record.
  if (userKey === ANON_USER_KEY || userKey === DEVICE_USER_KEY) return;
  if (userStorage.getItem(tutorialProgressKey(userKey)) !== null) return;
  pendingFirstLoad = firstLoad(userKey).catch((err) => {
    console.warn('[tutorial progress] first load failed:', err);
  });
}

/** Tests: wait for the last switch's or first load's work to settle. */
export function whenTutorialProgressSettled(): Promise<void> {
  return pendingFirstLoad ?? Promise.resolve();
}

/** The user key the store last loaded for (null: unknown). */
let loadedFor: UserKey | null = getLocalStoreUserKey();

/**
 * Switch the store to the current user's record. Clears the last user's
 * completions first, writing them nowhere (zustand's default merge would
 * otherwise keep them for a user with no record, to be saved under that
 * user's name), then reads the new user's. Completions made while the user
 * was unknown were never anyone's yet: they join the new user's record.
 */
function switchUser(): void {
  const userKey = getLocalStoreUserKey();
  const previous = loadedFor;
  loadedFor = userKey;
  if (userKey === previous) return;
  const { persist: api } = useTutorialProgressStore;
  const carried =
    previous === null ? useTutorialProgressStore.getState().completedAt : {};
  switching = true;
  try {
    api.setOptions({
      name: tutorialProgressKey(userKey ?? ANON_USER_KEY),
    });
    useTutorialProgressStore.setState({ completedAt: {} });
  } finally {
    switching = false;
  }
  if (userKey === null) return;
  firstLoadIfNew(userKey);
  const rehydrated = Promise.resolve(api.rehydrate()).then(() => {
    if (Object.keys(carried).length === 0) return;
    if (getLocalStoreUserKey() !== userKey) return;
    useTutorialProgressStore.setState((state) => ({
      completedAt: { ...carried, ...state.completedAt },
    }));
  });
  const firstLoadDone = pendingFirstLoad;
  pendingFirstLoad = Promise.all([rehydrated, firstLoadDone]).then(
    () => undefined,
    (err: unknown) => {
      console.warn('[tutorial progress] loading a user failed:', err);
    },
  );
}

onLocalStoreUserChange(switchUser);
// The user may be known before this module loads (the editor loads late):
// persist has read their record already, under currentKey().
if (loadedFor !== null) firstLoadIfNew(loadedFor);
