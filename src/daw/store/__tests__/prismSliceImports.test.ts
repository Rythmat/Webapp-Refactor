/**
 * Pages outside the Studio load prismSlice first, for its chord helpers
 * (Learn's practice tracks, the song library's export, the UNISON
 * converters), so whatever prismSlice loads, they load before the store. It
 * must not load tracksSlice: everything that slice imports (the project
 * registry, projectDocument/fields.ts, among it) would then load first too,
 * and a store import anywhere in there would have the store built before
 * tracksSlice had finished loading, which fails on those pages. The
 * track-lock rule the two slices share lives in trackLock.ts for that
 * reason. (Load order, not size: the build puts prismSlice, tracksSlice and
 * the registry in one chunk.)
 *
 * Run: npx vitest run src/daw/store/__tests__/prismSliceImports.test.ts
 */
import { expect, it, vi } from 'vitest';

const loaded = vi.hoisted(() => new Set<string>());

vi.mock('@/daw/store/tracksSlice', async (importOriginal) => {
  loaded.add('tracksSlice');
  return importOriginal();
});
vi.mock('@/daw/persistence/projectDocument/fields', async (importOriginal) => {
  loaded.add('fields');
  return importOriginal();
});

it('loads without tracksSlice or the project registry', async () => {
  const prism = await import('../prismSlice');
  // What those pages use is there.
  expect(typeof prism.nextChordId).toBe('function');
  expect(typeof prism.deriveChordRegionsFromNotes).toBe('function');
  expect([...loaded]).toEqual([]);
});

it('still offers the lock rule where it has always been', async () => {
  const [{ isTrackLockedByRemote }, tracks] = await Promise.all([
    import('../trackLock'),
    import('../tracksSlice'),
  ]);
  expect(tracks.isTrackLockedByRemote).toBe(isTrackLockedByRemote);
  const remoteUsers = new Map([
    [7, { selectedTrackId: 'keys' }],
  ]) as unknown as Parameters<typeof isTrackLockedByRemote>[0];
  expect(isTrackLockedByRemote(remoteUsers, 'keys')).toBe(true);
  expect(isTrackLockedByRemote(remoteUsers, 'bass')).toBe(false);
});
