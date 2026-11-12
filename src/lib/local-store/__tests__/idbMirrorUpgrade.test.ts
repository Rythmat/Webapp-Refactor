// A value already in IndexedDB is brought up to this build's shape as it
// hydrates, and stored again once; a current one is left as it was. IDB is
// faked here (jsdom has none).
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();
const idbSet = vi.fn(async (key: string, value: unknown) => {
  store.set(key, value);
});

vi.mock('../idbKeyValue', () => ({
  hasIndexedDb: true,
  idbGet: async (key: string) => store.get(key),
  idbSet: (key: string, value: unknown) => idbSet(key, value),
}));

const { getIdbMirror } = await import('../idbMirror');

type Blob = { schemaVersion: number; note: string };

const mirrorFor = (key: string) =>
  getIdbMirror<Blob>({
    key,
    readLegacy: () => ({ schemaVersion: 2, note: 'legacy' }),
    writeLegacy: () => {},
    clearLegacy: () => {},
    upgrade: (stored) =>
      stored.schemaVersion < 2
        ? { schemaVersion: 2, note: `${stored.note}, upgraded` }
        : null,
  });

beforeEach(() => {
  idbSet.mockClear();
});

describe('getIdbMirror — upgrading a stored value', () => {
  it('upgrades an old value on hydration and stores it once', async () => {
    store.set('test:upgrade:old', { schemaVersion: 1, note: 'mine' });
    const mirror = mirrorFor('test:upgrade:old');
    await mirror.ready;
    expect(mirror.read()).toEqual({ schemaVersion: 2, note: 'mine, upgraded' });
    expect(idbSet).toHaveBeenCalledTimes(1);
    expect(store.get('test:upgrade:old')).toEqual({
      schemaVersion: 2,
      note: 'mine, upgraded',
    });
  });

  it('leaves a current value as stored', async () => {
    store.set('test:upgrade:current', { schemaVersion: 2, note: 'mine' });
    const mirror = mirrorFor('test:upgrade:current');
    await mirror.ready;
    expect(mirror.read()).toEqual({ schemaVersion: 2, note: 'mine' });
    expect(idbSet).not.toHaveBeenCalled();
  });
});
