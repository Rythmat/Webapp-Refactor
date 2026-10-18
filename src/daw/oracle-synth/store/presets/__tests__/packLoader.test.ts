/**
 * The SERUM pack loader (milestone 2.14): the Library reads the pack's
 * presets once `loadOraclePacks()` resolves, so a second caller while the
 * first load is fetching waits for that load (it never resolves early with
 * nothing registered). The manifest is fetched once, however many ask.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../audio/wavetableImport', () => ({
  registerPackTables: vi.fn(),
}));

import { useSynthStore } from '../../index';
import {
  fetchPackManifest,
  loadOraclePacks,
  resetPackLoaderForTests,
  type PackManifest,
} from '../packLoader';

const MANIFEST: PackManifest = {
  packId: 'serum2',
  displayName: 'SERUM 2',
  version: 1,
  presets: [{ name: 'Glass Pad', file: 'glass-pad.json', category: 'Pad' }],
  wavetables: [{ name: 'Glass', file: 'glass.wav', frames: 64 }],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const ok = (body: unknown) =>
  ({ ok: true, json: async () => body }) as unknown as Response;

const fetchMock = vi.fn();
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  resetPackLoaderForTests();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  useSynthStore.setState({ packDisplayName: null, packPresets: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetPackLoaderForTests();
});

describe('loadOraclePacks', () => {
  it('makes a second caller wait until the first load has registered the presets', async () => {
    const manifest = deferred<Response>();
    const preset = deferred<Response>();
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('manifest.json') ? manifest.promise : preset.promise,
    );

    const first = loadOraclePacks();
    let secondDone = false;
    let presetsWhenSecondResolved = -1;
    const second = loadOraclePacks().then(() => {
      secondDone = true;
      presetsWhenSecondResolved = useSynthStore.getState().packPresets.length;
    });

    manifest.resolve(ok(MANIFEST));
    await flush();
    // Still fetching the preset: neither caller is done.
    expect(secondDone).toBe(false);
    expect(useSynthStore.getState().packPresets).toEqual([]);

    preset.resolve(ok({ name: 'Glass Pad' }));
    await Promise.all([first, second]);
    expect(secondDone).toBe(true);
    expect(presetsWhenSecondResolved).toBe(1);
    expect(useSynthStore.getState().packPresets.map((p) => p.name)).toEqual([
      'Glass Pad',
    ]);
    // One load: the manifest and the preset fetched once each.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('fetchPackManifest', () => {
  it('fetches the manifest once for two callers', async () => {
    fetchMock.mockImplementation(async () => ok(MANIFEST));
    const [a, b] = await Promise.all([
      fetchPackManifest(),
      fetchPackManifest(),
    ]);
    expect(a).toEqual(MANIFEST);
    expect(b).toEqual(MANIFEST);
    expect(await fetchPackManifest()).toEqual(MANIFEST);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/manifest\.json$/);
  });
});
