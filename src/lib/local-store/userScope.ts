// ── Whose device storage this is ───────────────────────────────────────────
//
// School Chromebooks are shared, so what the Studio keeps on a device for one
// person (drafts, their media, tutorial progress, Oracle presets, prefs) sits
// under a key naming them: their user key. It is the same namespace the 1.3
// stores use (storageNamespace.ts userNamespace): the user id, encoded so it
// never holds a ':' and one id can't be the start of another's; 'anon' while
// signed out. Work found on the device that names nobody (a pre-1.4 autosave
// on a device several people use) goes under DEVICE_USER_KEY until someone
// claims it.
//
// This module also holds who the device's storage currently belongs to: the
// signed-in user, signed out, or not yet known. Per-user stores read it to
// pick their key and listen for a change (sign-in, sign-out, a switch of
// account without a reload). It is isolation between people sharing a
// device, not security.
//
// No imports beyond types: the Studio dashboard loads this, and so does every
// per-user store.

/** A user's namespace in storage keys: encodeURIComponent(userId) or 'anon'. */
export type UserKey = string;

/** Work on this device that names no owner ('Found on this device'). */
export const DEVICE_USER_KEY: UserKey = '~device';

/** Signed out: what userKeyOf gives for no user. */
export const ANON_USER_KEY: UserKey = 'anon';

/**
 * A user's key: their id, URI-encoded (so it never holds ':'); 'anon' for
 * null, undefined or ''. Equal to 1.3's userNamespace for every input.
 */
export function userKeyOf(userId: string | null | undefined): UserKey {
  return userId ? encodeURIComponent(userId) : ANON_USER_KEY;
}

// ── The device's current user ──────────────────────────────────────────────
//
// Three states: unknown (auth hasn't answered yet: the page's start), signed
// out (null: writes go under 'anon'), and a user's id. A per-user store skips
// writes only while the user is unknown, so it never writes one person's
// state under another's key during boot, yet a signed-out (guest) session
// still keeps its presets and progress under 'anon'.

/** undefined = unknown (auth hasn't answered); null = signed out. */
let localStoreUser: string | null | undefined = undefined;
const userListeners = new Set<(userId: string | null) => void>();

/**
 * Whom device storage belongs to now: the signed-in user's id, or null while
 * signed out or before auth has told (isLocalStoreUserKnown tells the two
 * apart).
 */
export function getLocalStoreUser(): string | null {
  return localStoreUser ?? null;
}

/** Whether auth has said who the user is (signed out counts as known). */
export function isLocalStoreUserKnown(): boolean {
  return localStoreUser !== undefined;
}

/**
 * The key per-user stores write under now: userKeyOf(the user), 'anon' when
 * signed out, or null while the user is unknown (write nothing then).
 */
export function getLocalStoreUserKey(): UserKey | null {
  return localStoreUser === undefined ? null : userKeyOf(localStoreUser);
}

/**
 * Set whom device storage belongs to: an id, null for signed out, undefined
 * for unknown again (tests, a remount of auth). Does nothing when unchanged
 * ('' counts as null). Listeners run synchronously, before this returns, in
 * the order they subscribed, with the new id (null for signed out or
 * unknown: they read isLocalStoreUserKnown when it matters); one that throws
 * is logged and the rest still run. Unknown → signed out is a change.
 *
 * AuthContext calls it once auth resolves (the dev-bypass user included), and
 * at sign-out only AFTER runBeforeSignOut, so the flush and cleanup still see
 * the outgoing user.
 */
export function setLocalStoreUser(userId: string | null | undefined): void {
  const next = userId === undefined ? undefined : userId || null;
  if (next === localStoreUser) return;
  localStoreUser = next;
  for (const listener of [...userListeners]) {
    try {
      listener(next ?? null);
    } catch (err) {
      console.error('[user scope] a user-change listener failed:', err);
    }
  }
}

/** Call `listener` on every change of user, until the returned function runs. */
export function onLocalStoreUserChange(
  listener: (userId: string | null) => void,
): () => void {
  userListeners.add(listener);
  return () => {
    userListeners.delete(listener);
  };
}

// ── Other people on this device ────────────────────────────────────────────

/**
 * The localStorage prefixes followed by `<userKey>` (then ':' or the end of
 * the key) that show someone has used the Studio on this device. 1.3's
 * unreadable and backup entries put the owner first too; 1.1's unreadable
 * entries (prefix + ISO time) name nobody and are skipped.
 */
export const USER_NAMESPACED_PREFIXES: readonly string[] = Object.freeze([
  'musicAtlas:daw:prefs:',
  'musicAtlas:daw:kept:',
  'musicAtlas:daw:unreadable:',
  'musicAtlas:daw:backup:',
  'musicAtlas:daw:mirror:',
  'musicAtlas:daw:draft:',
  'music-atlas-tutorial-progress:',
  'oracle-synth-presets:',
]);

/** Keys that never stand for another person: signed out, and unowned work. */
const NOT_A_PERSON: ReadonlySet<UserKey> = new Set([
  ANON_USER_KEY,
  DEVICE_USER_KEY,
]);

// 1.1's unowned unreadable entries: the prefix, then only an ISO time.
const BARE_ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

/** What otherUserNamespaces needs of the draft store (DraftStore has it). */
export interface KnownUserKeysSource {
  knownUserKeys(): Promise<Set<UserKey>>;
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** The user keys localStorage holds Studio data for (see the prefixes). */
export function storageUserKeys(
  storage: Storage | null = defaultStorage(),
): Set<UserKey> {
  const keys = new Set<UserKey>();
  if (storage === null) return keys;
  let count = 0;
  try {
    count = storage.length;
  } catch {
    return keys;
  }
  for (let i = 0; i < count; i++) {
    let key: string | null = null;
    try {
      key = storage.key(i);
    } catch {
      continue;
    }
    if (key === null) continue;
    for (const prefix of USER_NAMESPACED_PREFIXES) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      if (rest === '' || BARE_ISO.test(rest)) break;
      const end = rest.indexOf(':');
      const owner = end < 0 ? rest : rest.slice(0, end);
      if (owner !== '') keys.add(owner);
      break;
    }
  }
  return keys;
}

/**
 * Everyone but `userKey` who has Studio data on this device: the user keys
 * in localStorage (USER_NAMESPACED_PREFIXES) and, given a store, the owners
 * of its drafts. 'anon' and DEVICE_USER_KEY never count: being signed out on
 * a device, or unowned work found on it, is nobody else. A store that fails
 * to answer counts as no one (the caller's single-user rule then still sees
 * localStorage). Never throws.
 */
export async function otherUserNamespaces(
  userKey: UserKey,
  opts: {
    store?: KnownUserKeysSource | null;
    storage?: Storage | null;
  } = {},
): Promise<Set<UserKey>> {
  const found = storageUserKeys(
    opts.storage === undefined ? defaultStorage() : opts.storage,
  );
  if (opts.store) {
    try {
      for (const key of await opts.store.knownUserKeys()) found.add(key);
    } catch (err) {
      console.warn('[user scope] listing draft owners failed:', err);
    }
  }
  found.delete(userKey);
  for (const key of NOT_A_PERSON) found.delete(key);
  return found;
}
