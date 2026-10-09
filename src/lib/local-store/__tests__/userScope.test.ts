import { afterEach, describe, expect, it, vi } from 'vitest';
import { userNamespace } from '@/daw/persistence/storageNamespace';
import {
  ANON_USER_KEY,
  DEVICE_USER_KEY,
  getLocalStoreUser,
  getLocalStoreUserKey,
  isLocalStoreUserKnown,
  onLocalStoreUserChange,
  otherUserNamespaces,
  setLocalStoreUser,
  storageUserKeys,
  userKeyOf,
} from '../userScope';

// ── Whose device storage this is (milestone 1.4, E2) ──────────────────────
// Run: npx vitest run src/lib/local-store/__tests__/userScope.test.ts

/** A Map-backed Storage, enough for key scans. */
function memoryStorage(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

const stops: Array<() => void> = [];

afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  setLocalStoreUser(undefined);
  vi.restoreAllMocks();
});

describe('userKeyOf', () => {
  it("gives 'anon' for no user", () => {
    expect(userKeyOf(null)).toBe('anon');
    expect(userKeyOf(undefined)).toBe('anon');
    expect(userKeyOf('')).toBe('anon');
    expect(ANON_USER_KEY).toBe('anon');
    expect(DEVICE_USER_KEY).toBe('~device');
  });

  it('URI-encodes the id, so a key never holds a colon', () => {
    expect(userKeyOf('auth0|abc:1')).toBe('auth0%7Cabc%3A1');
    expect(userKeyOf('u-42')).toBe('u-42');
  });

  it("matches 1.3's userNamespace for every input", () => {
    for (const id of [null, undefined, '', 'u-1', 'auth0|x', 'a:b c', 'é']) {
      expect(userKeyOf(id)).toBe(userNamespace(id));
    }
  });
});

describe('the device’s current user', () => {
  it('starts unknown and tells listeners synchronously, only on a change', () => {
    expect(getLocalStoreUser()).toBeNull();
    expect(isLocalStoreUserKnown()).toBe(false);
    const heard: Array<string | null> = [];
    stops.push(onLocalStoreUserChange((id) => heard.push(id)));

    setLocalStoreUser('a');
    expect(heard).toEqual(['a']);
    expect(getLocalStoreUser()).toBe('a');

    setLocalStoreUser('a');
    expect(heard).toEqual(['a']);

    setLocalStoreUser('b');
    setLocalStoreUser('');
    setLocalStoreUser(null);
    expect(heard).toEqual(['a', 'b', null]);
  });

  it('tells unknown, signed out and a user apart', () => {
    const heard: Array<string | null> = [];
    stops.push(onLocalStoreUserChange((id) => heard.push(id)));

    // Unknown: per-user stores write nothing.
    expect(isLocalStoreUserKnown()).toBe(false);
    expect(getLocalStoreUserKey()).toBeNull();

    // Signed out is known, and is a change from unknown: writes go to 'anon'.
    setLocalStoreUser(null);
    expect(heard).toEqual([null]);
    expect(isLocalStoreUserKnown()).toBe(true);
    expect(getLocalStoreUser()).toBeNull();
    expect(getLocalStoreUserKey()).toBe('anon');

    setLocalStoreUser('auth0|a');
    expect(getLocalStoreUserKey()).toBe('auth0%7Ca');

    // Back to unknown (a remount of auth).
    setLocalStoreUser(undefined);
    expect(isLocalStoreUserKnown()).toBe(false);
    expect(getLocalStoreUserKey()).toBeNull();
    expect(heard).toEqual([null, 'auth0|a', null]);
    setLocalStoreUser(undefined);
    expect(heard).toHaveLength(3);
  });

  it('keeps calling the rest when one listener throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const heard: Array<string | null> = [];
    stops.push(
      onLocalStoreUserChange(() => {
        throw new Error('boom');
      }),
    );
    stops.push(onLocalStoreUserChange((id) => heard.push(id)));
    setLocalStoreUser('x');
    expect(heard).toEqual(['x']);
    expect(console.error).toHaveBeenCalled();
  });

  it('stops calling a listener once unsubscribed', () => {
    const heard: Array<string | null> = [];
    const stop = onLocalStoreUserChange((id) => heard.push(id));
    setLocalStoreUser('a');
    stop();
    setLocalStoreUser('b');
    expect(heard).toEqual(['a']);
  });
});

describe('other people on this device', () => {
  const storage = memoryStorage({
    'musicAtlas:daw:prefs:me': '{}',
    'musicAtlas:daw:prefs:anon': '{}',
    'musicAtlas:daw:kept:alice:2026-10-07T09:00:00.000Z': '{}',
    'musicAtlas:daw:unreadable:2026-10-01T09:00:00.000Z': 'x',
    'musicAtlas:daw:unreadable:bob:1a2b3c4d:2026-10-07T09:00:00.000Z': 'x',
    'musicAtlas:daw:backup:carol:1a2b3c4d:2026-10-07T09:00:00.000Z': 'x',
    'musicAtlas:daw:mirror:~device:d1': '{}',
    'musicAtlas:daw:mirror:dave:d2': '{}',
    'music-atlas-tutorial-progress:erin': '{}',
    'music-atlas-tutorial-progress': '{}',
    'oracle-synth-presets:frank': '[]',
    'oracle-synth-presets': '[]',
    'musicAtlas:daw:autosave': '{}',
    'unrelated:key': '1',
  });

  it('reads the owner of every namespaced key, skipping unowned 1.1 entries', () => {
    expect([...storageUserKeys(storage)].sort()).toEqual(
      [
        '~device',
        'alice',
        'anon',
        'bob',
        'carol',
        'dave',
        'erin',
        'frank',
        'me',
      ].sort(),
    );
  });

  it("leaves out the user, 'anon' and '~device', and adds the draft owners", async () => {
    const store = {
      knownUserKeys: async () => new Set(['me', 'gina', 'anon', '~device']),
    };
    const others = await otherUserNamespaces('me', { store, storage });
    expect([...others].sort()).toEqual(
      ['alice', 'bob', 'carol', 'dave', 'erin', 'frank', 'gina'].sort(),
    );
  });

  it('counts nobody on a device with only this user, signed-out data and found work', async () => {
    const solo = memoryStorage({
      'musicAtlas:daw:prefs:me': '{}',
      'musicAtlas:daw:prefs:anon': '{}',
      'musicAtlas:daw:mirror:~device:d1': '{}',
      'musicAtlas:daw:autosave': '{}',
    });
    expect((await otherUserNamespaces('me', { storage: solo })).size).toBe(0);
  });

  it('never throws when the store fails or storage is missing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = {
      knownUserKeys: async (): Promise<Set<string>> => {
        throw new Error('idb gone');
      },
    };
    expect(
      (await otherUserNamespaces('me', { store, storage: null })).size,
    ).toBe(0);
  });
});
