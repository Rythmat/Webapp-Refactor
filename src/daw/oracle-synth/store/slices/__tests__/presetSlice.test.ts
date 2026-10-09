// @vitest-environment jsdom
/**
 * Oracle user presets are per user (milestone 1.4): a shared Chromebook keeps
 * each student's under `oracle-synth-presets:<userKey>`. A user's first load
 * copies the pre-1.4 device list, so nobody loses a preset they could see;
 * the device list is never written. While the user is unknown nothing is
 * read or written, and a preset saved then joins the user's list once known;
 * a signed-out session keeps its own under 'anon'. The store reloads the
 * list when the user changes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocalStoreUser, userKeyOf } from '@/lib/local-store/userScope';
import type { StoredPreset } from '../../presets/PresetData';

const DEVICE: StoredPreset[] = [
  { name: 'Old Pad', isFactory: false, data: { name: 'Old Pad' } as never },
];

const read = (key: string): StoredPreset[] | null => {
  const raw = localStorage.getItem(key);
  return raw === null ? null : (JSON.parse(raw) as StoredPreset[]);
};
const names = (list: { name: string }[]) => list.map((p) => p.name);

async function loadStore() {
  const { useSynthStore } = await import('../../index');
  const slice = await import('../presetSlice');
  return { useSynthStore, ...slice };
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});

afterEach(async () => {
  // The module registry was reset: forget the user in the copy now loaded.
  const scope = await import('@/lib/local-store/userScope');
  scope.setLocalStoreUser(undefined);
  setLocalStoreUser(undefined);
});

describe('Oracle user presets per user', () => {
  it('reads and writes nothing while no user is known', async () => {
    localStorage.setItem('oracle-synth-presets', JSON.stringify(DEVICE));
    const { useSynthStore } = await loadStore();

    expect(useSynthStore.getState().userPresets).toEqual([]);
    useSynthStore.getState().savePreset('Mine');
    expect(names(useSynthStore.getState().userPresets)).toEqual(['Mine']);
    // Only the device list, untouched, is in storage.
    expect(Object.keys(localStorage)).toEqual(['oracle-synth-presets']);
    expect(read('oracle-synth-presets')).toEqual(DEVICE);
  });

  it('copies the device list into a user’s own key on their first load', async () => {
    localStorage.setItem('oracle-synth-presets', JSON.stringify(DEVICE));
    const scope = await import('@/lib/local-store/userScope');
    scope.setLocalStoreUser('auth0|ana');
    const { useSynthStore, userPresetsKey } = await loadStore();

    expect(userPresetsKey(userKeyOf('auth0|ana'))).toBe(
      'oracle-synth-presets:auth0%7Cana',
    );
    expect(names(useSynthStore.getState().userPresets)).toEqual(['Old Pad']);
    expect(read('oracle-synth-presets:auth0%7Cana')).toEqual(DEVICE);
    expect(read('oracle-synth-presets')).toEqual(DEVICE);
  });

  it('keeps each user’s saves to themselves, and reloads on a switch', async () => {
    localStorage.setItem('oracle-synth-presets', JSON.stringify(DEVICE));
    const { useSynthStore } = await loadStore();
    const scope = await import('@/lib/local-store/userScope');
    const list = () => names(useSynthStore.getState().userPresets);

    scope.setLocalStoreUser('ana');
    expect(list()).toEqual(['Old Pad']);
    useSynthStore.getState().savePreset('Ana Lead');
    expect(names(read('oracle-synth-presets:ana')!)).toEqual([
      'Old Pad',
      'Ana Lead',
    ]);

    // Ben on the same device, same page: the device list, not Ana's.
    scope.setLocalStoreUser('ben');
    expect(list()).toEqual(['Old Pad']);
    useSynthStore.getState().deletePreset('Old Pad');
    expect(list()).toEqual([]);
    expect(read('oracle-synth-presets:ben')).toEqual([]);

    // Ana's are as she left them.
    scope.setLocalStoreUser('ana');
    expect(list()).toEqual(['Old Pad', 'Ana Lead']);

    // Signed out: not Ana's; the session's own ('anon'), which starts from
    // the device list as everyone's did before 1.4.
    scope.setLocalStoreUser(null);
    expect(list()).toEqual(['Old Pad']);

    // The device list was never written.
    expect(read('oracle-synth-presets')).toEqual(DEVICE);
  });

  it('starts a user with no device list empty', async () => {
    const scope = await import('@/lib/local-store/userScope');
    scope.setLocalStoreUser('cara');
    const { useSynthStore } = await loadStore();
    expect(useSynthStore.getState().userPresets).toEqual([]);
    // No empty list written: opening the synth alone mustn't make Cara
    // count as another user of the device.
    expect(read('oracle-synth-presets:cara')).toBeNull();
  });

  it('gives a preset saved while the user was unknown to the user once known', async () => {
    localStorage.setItem(
      'oracle-synth-presets:ana',
      JSON.stringify([{ ...DEVICE[0], name: 'Ana Lead' }]),
    );
    const { useSynthStore } = await loadStore();
    const scope = await import('@/lib/local-store/userScope');
    useSynthStore.getState().savePreset('X');
    expect(read('oracle-synth-presets:ana')!.length).toBe(1);

    scope.setLocalStoreUser('ana');
    expect(names(useSynthStore.getState().userPresets)).toEqual([
      'Ana Lead',
      'X',
    ]);
    expect(names(read('oracle-synth-presets:ana')!)).toEqual(['Ana Lead', 'X']);

    // A later switch carries nothing over: Ana's 'X' is not Ben's.
    scope.setLocalStoreUser('ben');
    expect(names(useSynthStore.getState().userPresets)).toEqual([]);
  });

  it('reads an unreadable list as empty', async () => {
    localStorage.setItem('oracle-synth-presets:dan', '{nope');
    const scope = await import('@/lib/local-store/userScope');
    scope.setLocalStoreUser('dan');
    const { useSynthStore } = await loadStore();
    expect(useSynthStore.getState().userPresets).toEqual([]);
  });
});
