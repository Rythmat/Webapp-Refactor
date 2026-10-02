import { beforeAll, describe, expect, it } from 'vitest';
import { loadRepoStore, REPO_ROOT, type RepoStore } from '../repoStore';
import { ARTISTS_FILE } from '../sources/artists';
import { type ItemChange, RepoContentError } from '../sources/common';
import { REPO_SOURCES } from '../sources/index';
import { VOCABULARY_CONTRACT_FILES } from '../sources/vocabulary';

/**
 * Saving an item unchanged changes no file.
 *
 *  - Planned plainly, every item of every writable kind, all at once, gives
 *    no plan at all: the adapters see nothing to write.
 *  - Forced, every file those items live in (each song file, `bundled.ts`,
 *    the 16 events files, the cities, the registry, the library, the
 *    vocabulary files) goes through its writer, prettier and the read-back
 *    check, and comes out byte-identical. So do the API's copy of the
 *    vocabulary and the manifest that records its hash, which a vocabulary
 *    save regenerates. That is what proves the adapters' paths are exact,
 *    not only the writers under them (`tsCorpus.test.ts`).
 *
 * In memory, over the live repo: nothing is written. The files are read
 * once, by the load, so another session editing them meanwhile does not
 * matter here.
 */

let store: RepoStore;
let unchanged: ItemChange[];

beforeAll(async () => {
  store = await loadRepoStore({ root: REPO_ROOT });
  unchanged = store
    .items()
    .filter((item) => item.kind !== 'artist_location')
    .map((item) => ({ kind: item.kind, slug: item.slug, body: item.body }));
}, 60_000);

describe('a no-op save', () => {
  it('plans nothing for every item of every writable kind', async () => {
    expect(unchanged.length).toBeGreaterThan(4000);
    expect(await store.plan(unchanged)).toEqual([]);
    // Restating the status and the roster place changes nothing either.
    const restated = store
      .items()
      .filter((item) => item.kind === 'song' || item.kind === 'artist')
      .map((item) => ({
        kind: item.kind,
        slug: item.slug,
        body: item.body,
        ...(item.kind === 'song'
          ? { status: item.status }
          : { roster: item.file.endsWith('artistRegistry.ts') }),
      }));
    expect(await store.plan(restated)).toEqual([]);
  }, 60_000);

  it('forced through every writer, gives every file back byte for byte', async () => {
    const plans = await store.plan(unchanged, { force: true });
    const changed = plans.filter((plan) => plan.text !== plan.before);
    expect(changed.map((plan) => plan.path)).toEqual([]);
    // Every file that exists and holds a writable item was planned.
    const expected = new Set(
      store
        .items()
        .filter((item) => item.kind !== 'artist_location')
        .flatMap((item) => item.files),
    );
    expected.add('src/curriculum/data/songs/bundled.ts');
    // artists.json is where every artist's other fields go, so a forced save
    // of the artists runs it through its writer too, even while it holds no
    // row for any of them (it starts out empty).
    if (store.file(ARTISTS_FILE)) expected.add(ARTISTS_FILE);
    // A vocabulary save works out the API's copy of the vocabulary and its
    // hash in the manifest from the records it writes; unchanged records
    // give both files back as they are.
    for (const path of Object.values(VOCABULARY_CONTRACT_FILES))
      expected.add(path);
    expect(new Set(plans.map((plan) => plan.path))).toEqual(expected);
    for (const plan of plans) {
      expect(plan.baseSha256).toBe(store.file(plan.path)?.sha256);
    }
    // And the forced plans read back as the same store.
    const after = await store.verify(unchanged, plans);
    expect(after.items().length).toBe(store.items().length);
  }, 300_000);

  it('refuses any change to an artist location, even one that changes nothing', async () => {
    const location = store.items('artist_location')[0];
    const error = await store
      .plan([
        { kind: 'artist_location', slug: location.slug, body: location.body },
      ])
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RepoContentError);
    expect(error).toMatchObject({ code: 'REPO_READ_ONLY', status: 403 });
  });

  it('lists every file each adapter reads', async () => {
    const listed = new Set(
      (
        await Promise.all(REPO_SOURCES.map((s) => s.files(store.reader)))
      ).flat(),
    );
    for (const path of store.fileIndex().keys()) expect(listed).toContain(path);
  });
});
