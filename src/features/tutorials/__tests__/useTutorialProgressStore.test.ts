// @vitest-environment jsdom
/**
 * Tutorial completion badges are per user (milestone 1.4): a shared
 * Chromebook keeps each student's under
 * `music-atlas-tutorial-progress:<userKey>`. The pre-1.4 device record moves
 * to a user's own key on their first load only on a device nobody else has
 * used the Studio on; elsewhere they start empty. A switch of user in the
 * page never carries one user's badges into another's.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const LEGACY = 'music-atlas-tutorial-progress';
const legacyRecord = (completedAt: Record<string, number>) =>
  JSON.stringify({ state: { completedAt }, version: 0 });
const readRecord = (key: string) => {
  const raw = localStorage.getItem(key);
  return raw === null
    ? null
    : (JSON.parse(raw) as { state: { completedAt: Record<string, number> } })
        .state.completedAt;
};

/** A fresh page: the user scope and the store load anew. */
async function load(
  opts: {
    user?: string;
    draftOwners?: string[];
    knownUserKeys?: () => Promise<Set<string>>;
  } = {},
) {
  vi.resetModules();
  const scope = await import('@/lib/local-store/userScope');
  if (opts.user) scope.setLocalStoreUser(opts.user);
  const mod = await import('../useTutorialProgressStore');
  const knownUserKeys = vi.fn(
    opts.knownUserKeys ?? (async () => new Set(opts.draftOwners ?? [])),
  );
  mod.setTutorialProgressDraftOwners(async () => ({ knownUserKeys }));
  return { scope, knownUserKeys, ...mod };
}

beforeEach(() => {
  localStorage.clear();
});

describe('tutorial progress per user', () => {
  it('keeps completions in memory only while no user is known', async () => {
    const { useTutorialProgressStore } = await load();
    useTutorialProgressStore.getState().markComplete('intro');
    expect(useTutorialProgressStore.getState().isComplete('intro')).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it('writes a user’s completions under their own key', async () => {
    const { scope, useTutorialProgressStore, whenTutorialProgressSettled } =
      await load();
    scope.setLocalStoreUser('auth0|ana');
    await whenTutorialProgressSettled();
    useTutorialProgressStore.getState().markComplete('intro');

    expect(
      Object.keys(
        readRecord('music-atlas-tutorial-progress:auth0%7Cana') ?? {},
      ),
    ).toEqual(['intro']);
    expect(localStorage.getItem(LEGACY)).toBeNull();
  });

  it('moves the device record to the only user of the device', async () => {
    localStorage.setItem(LEGACY, legacyRecord({ intro: 111, drums: 222 }));
    const { useTutorialProgressStore, whenTutorialProgressSettled } =
      await load({ user: 'ana' });
    await whenTutorialProgressSettled();

    expect(useTutorialProgressStore.getState().completedAt).toEqual({
      intro: 111,
      drums: 222,
    });
    expect(readRecord('music-atlas-tutorial-progress:ana')).toEqual({
      intro: 111,
      drums: 222,
    });
    // The device record stays for an older tab or a revert.
    expect(localStorage.getItem(LEGACY)).toBe(
      legacyRecord({ intro: 111, drums: 222 }),
    );
  });

  it('ignores signed-out and unowned namespaces when counting users', async () => {
    localStorage.setItem(LEGACY, legacyRecord({ intro: 111 }));
    localStorage.setItem('musicAtlas:daw:prefs:anon', '{}');
    const { scope, useTutorialProgressStore, whenTutorialProgressSettled } =
      await load({ draftOwners: ['~device', 'anon', 'ana'] });
    scope.setLocalStoreUser('ana');
    await whenTutorialProgressSettled();
    expect(useTutorialProgressStore.getState().isComplete('intro')).toBe(true);
  });

  it('starts a user empty when someone else has Studio data here', async () => {
    localStorage.setItem(LEGACY, legacyRecord({ intro: 111 }));
    localStorage.setItem('musicAtlas:daw:prefs:ben', '{}');
    const { useTutorialProgressStore, whenTutorialProgressSettled } =
      await load({ user: 'ana' });
    await whenTutorialProgressSettled();

    expect(useTutorialProgressStore.getState().completedAt).toEqual({});
    // No empty record: opening the Production tab alone mustn't make Ana
    // count as another user of the device.
    expect(readRecord('music-atlas-tutorial-progress:ana')).toBeNull();
  });

  it('settles a first load from localStorage alone when it already shows someone else', async () => {
    localStorage.setItem(LEGACY, legacyRecord({ intro: 111 }));
    localStorage.setItem('oracle-synth-presets:ben', '[]');
    const { knownUserKeys, whenTutorialProgressSettled } = await load({
      user: 'ana',
    });
    await whenTutorialProgressSettled();
    expect(knownUserKeys).not.toHaveBeenCalled();
  });

  it('writes no record for a user with nothing to move', async () => {
    const { knownUserKeys, whenTutorialProgressSettled } = await load({
      user: 'ana',
    });
    await whenTutorialProgressSettled();
    expect(localStorage.length).toBe(0);
    expect(knownUserKeys).not.toHaveBeenCalled();
  });

  it('decides nothing when the draft store does not answer in time', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      localStorage.setItem(LEGACY, legacyRecord({ intro: 111 }));
      const { scope, useTutorialProgressStore, whenTutorialProgressSettled } =
        await load({
          knownUserKeys: () => new Promise<Set<string>>(() => {}),
        });
      scope.setLocalStoreUser('ana');
      const settled = whenTutorialProgressSettled();
      await vi.advanceTimersByTimeAsync(1500);
      await settled;
      expect(useTutorialProgressStore.getState().completedAt).toEqual({});
      expect(readRecord('music-atlas-tutorial-progress:ana')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives completions made while the user was unknown to the user once known', async () => {
    localStorage.setItem(
      'music-atlas-tutorial-progress:ana',
      legacyRecord({ drums: 5 }),
    );
    const { scope, useTutorialProgressStore, whenTutorialProgressSettled } =
      await load();
    useTutorialProgressStore.getState().markComplete('intro');
    expect(localStorage.length).toBe(1);

    scope.setLocalStoreUser('ana');
    await whenTutorialProgressSettled();
    expect(
      Object.keys(useTutorialProgressStore.getState().completedAt).sort(),
    ).toEqual(['drums', 'intro']);
    expect(
      Object.keys(readRecord('music-atlas-tutorial-progress:ana')!).sort(),
    ).toEqual(['drums', 'intro']);
  });

  it('keeps a signed-out session’s completions under anon', async () => {
    const { scope, useTutorialProgressStore, whenTutorialProgressSettled } =
      await load();
    scope.setLocalStoreUser(null);
    await whenTutorialProgressSettled();
    useTutorialProgressStore.getState().markComplete('intro');
    expect(
      Object.keys(readRecord('music-atlas-tutorial-progress:anon')!),
    ).toEqual(['intro']);
  });

  it('counts the owners of drafts on the device as other users', async () => {
    localStorage.setItem(LEGACY, legacyRecord({ intro: 111 }));
    const { scope, useTutorialProgressStore, whenTutorialProgressSettled } =
      await load({ draftOwners: ['ben'] });
    scope.setLocalStoreUser('ana');
    await whenTutorialProgressSettled();
    expect(useTutorialProgressStore.getState().completedAt).toEqual({});
  });

  it('reads a returning user’s own record and never the device record', async () => {
    localStorage.setItem(LEGACY, legacyRecord({ intro: 111 }));
    localStorage.setItem(
      'music-atlas-tutorial-progress:ana',
      legacyRecord({ drums: 5 }),
    );
    const { useTutorialProgressStore, whenTutorialProgressSettled } =
      await load({ user: 'ana' });
    await whenTutorialProgressSettled();
    expect(useTutorialProgressStore.getState().completedAt).toEqual({
      drums: 5,
    });
  });

  it('never carries one user’s badges into another’s on an in-page switch', async () => {
    localStorage.setItem('musicAtlas:daw:prefs:ben', '{}');
    const { scope, useTutorialProgressStore, whenTutorialProgressSettled } =
      await load({ user: 'ana' });
    await whenTutorialProgressSettled();
    useTutorialProgressStore.getState().markComplete('intro');

    // Ben, with no record yet, on the same page.
    scope.setLocalStoreUser('ben');
    await whenTutorialProgressSettled();
    expect(useTutorialProgressStore.getState().completedAt).toEqual({});
    useTutorialProgressStore.getState().markComplete('drums');
    expect(
      Object.keys(readRecord('music-atlas-tutorial-progress:ben')!),
    ).toEqual(['drums']);
    // Ana's record was not touched by the switch.
    expect(
      Object.keys(readRecord('music-atlas-tutorial-progress:ana')!),
    ).toEqual(['intro']);

    // Back to Ana: hers again.
    scope.setLocalStoreUser('ana');
    expect(
      Object.keys(useTutorialProgressStore.getState().completedAt),
    ).toEqual(['intro']);

    // Signed out: Ana's badges aren't shown, and the switch writes nothing.
    scope.setLocalStoreUser(null);
    expect(useTutorialProgressStore.getState().completedAt).toEqual({});
    expect(
      localStorage.getItem('music-atlas-tutorial-progress:anon'),
    ).toBeNull();
  });

  it('keeps a completion made while the first load was deciding', async () => {
    localStorage.setItem(LEGACY, legacyRecord({ intro: 111 }));
    const { useTutorialProgressStore, whenTutorialProgressSettled } =
      await load({ user: 'ana' });
    useTutorialProgressStore.getState().markComplete('drums');
    await whenTutorialProgressSettled();
    expect(
      Object.keys(useTutorialProgressStore.getState().completedAt).sort(),
    ).toEqual(['drums', 'intro']);
  });
});
