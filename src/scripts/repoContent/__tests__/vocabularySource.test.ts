import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  sha256 as contractSha,
  writeVocabularyContract,
} from '@/scripts/apiContract/writeVocabulary';
import { loadRepoStore, REPO_ROOT, type RepoStore } from '../repoStore';
import {
  type FilePlan,
  fsReader,
  type ItemChange,
  type RepoReader,
} from '../sources/common';
import {
  regeneratedContractFiles,
  VOCABULARY_CONTRACT_FILES,
  VOCABULARY_DATA_FILES,
  vocabularySource,
} from '../sources/vocabulary';

/**
 * The vocabulary's adapter: genres, subgenres and instruments in their
 * one-record-per-line files, and the API's copy of the vocabulary that a
 * save can change.
 *
 * Nothing here writes to the repo. Plans are worked out over the live
 * files, read-only; a write goes into a temp copy of the vocabulary and
 * contract files (everything else is read from the repo), through
 * `checkBases` right before it, as the store's flush does.
 */

const GENRES = VOCABULARY_DATA_FILES.genre;
const SUBGENRES = VOCABULARY_DATA_FILES.subgenre;
const INSTRUMENTS = VOCABULARY_DATA_FILES.instrument;
const CONTRACT = VOCABULARY_CONTRACT_FILES;
const LOCAL = [
  ...Object.values(VOCABULARY_DATA_FILES),
  ...Object.values(VOCABULARY_CONTRACT_FILES),
];

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

/**
 * A temp copy of the vocabulary and contract files, and a reader that
 * takes those from it and everything else from the repo.
 */
function scratch(): { dir: string; reader: RepoReader } {
  const dir = mkdtempSync(join(tmpdir(), 'repo-vocabulary-'));
  temps.push(dir);
  for (const path of LOCAL) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    copyFileSync(join(REPO_ROOT, path), join(dir, path));
  }
  const repo = fsReader(REPO_ROOT);
  const copy = fsReader(dir);
  return {
    dir,
    reader: {
      root: dir,
      read: (path) =>
        LOCAL.includes(path) ? copy.read(path) : repo.read(path),
      list: (path) => repo.list(path),
    },
  };
}

const at = (dir: string, path: string) => join(dir, path);
const readAt = (dir: string, path: string) =>
  readFileSync(at(dir, path), 'utf8');

/** The flush's last two steps: the hash check, then the files. */
async function write(store: RepoStore, dir: string, plans: FilePlan[]) {
  await store.checkBases(plans);
  for (const planned of plans) {
    if (planned.text === null) unlinkSync(at(dir, planned.path));
    else writeFileSync(at(dir, planned.path), planned.text);
  }
}

const planOf = (plans: FilePlan[], path: string) => {
  const found = plans.find((planned) => planned.path === path);
  if (!found) throw new Error(`${path} was not planned`);
  return found;
};

/** The lines that differ between two texts of the same length. */
const changedLines = (before: string, after: string) => {
  const a = before.split('\n');
  const b = after.split('\n');
  expect(b.length).toBe(a.length);
  return b.filter((line, index) => line !== a[index]);
};

let live: RepoStore;
beforeAll(async () => {
  live = await loadRepoStore({ root: REPO_ROOT });
}, 60_000);

const body = (kind: 'genre' | 'subgenre' | 'instrument', slug: string) => {
  const item = live.item(kind, slug);
  if (!item) throw new Error(`no ${kind} ${slug}`);
  return item.body;
};

describe('loading', () => {
  it('holds each file’s records as items, in the file’s order, beside the contract files', async () => {
    for (const [kind, path] of Object.entries(VOCABULARY_DATA_FILES)) {
      const ids = (
        JSON.parse(readFileSync(join(REPO_ROOT, path), 'utf8')) as {
          records: { id: string }[];
        }
      ).records.map((record) => record.id);
      expect(
        live.items(kind as 'genre').map((item) => item.slug),
        kind,
      ).toEqual(ids);
      expect(
        live.items(kind as 'genre').every((item) => item.file === path),
      ).toBe(true);
    }
    for (const path of Object.values(CONTRACT))
      expect(live.file(path)?.text).toBe(
        readFileSync(join(REPO_ROOT, path), 'utf8'),
      );
    expect(await vocabularySource.files(live.reader)).toEqual(LOCAL);
    expect(live.warnings.filter((w) => w.includes('vocabulary'))).toEqual([]);
  });

  it('refuses a file that is not its kind’s, or a record with no id', async () => {
    const { dir, reader } = scratch();
    writeFileSync(
      at(dir, GENRES),
      readAt(dir, GENRES).replace('"kind": "genre"', '"kind": "subgenre"'),
    );
    await expect(loadRepoStore({ reader })).rejects.toMatchObject({
      code: 'REPO_LOAD_FAILED',
      file: GENRES,
    });
    copyFileSync(join(REPO_ROOT, GENRES), at(dir, GENRES));
    writeFileSync(
      at(dir, INSTRUMENTS),
      readAt(dir, INSTRUMENTS).replace('{"id":"piano",', '{'),
    );
    await expect(loadRepoStore({ reader })).rejects.toMatchObject({
      code: 'REPO_LOAD_FAILED',
      file: INSTRUMENTS,
    });
  }, 60_000);

  it('still loads a file out of the one-per-line layout, and says so', async () => {
    const { dir, reader } = scratch();
    writeFileSync(
      at(dir, GENRES),
      `${JSON.stringify(JSON.parse(readAt(dir, GENRES)), null, 2)}\n`,
    );
    const store = await loadRepoStore({ reader });
    expect(store.items('genre').length).toBe(live.items('genre').length);
    expect(store.warnings).toContain(
      `${GENRES} is not in the one-record-per-line layout; its next write re-lays the whole file`,
    );
  }, 60_000);
});

describe('a save', () => {
  it('renames a genre in its one line, and brings the API’s copy and its hash along', async () => {
    const renamed = { ...body('genre', 'jam-band'), name: 'Jam' };
    const changes: ItemChange[] = [
      { kind: 'genre', slug: 'jam-band', body: renamed },
    ];
    const plans = await live.plan(changes);
    expect(plans.map((planned) => planned.path)).toEqual([
      GENRES,
      CONTRACT.vocabulary,
      CONTRACT.manifest,
    ]);
    expect(regeneratedContractFiles(plans)).toEqual([
      CONTRACT.vocabulary,
      CONTRACT.manifest,
    ]);
    const genres = planOf(plans, GENRES);
    expect(changedLines(genres.before!, genres.text!)).toEqual([
      '    {"id":"jam-band","name":"Jam","taught":true,"tags":["Jam Band"]},',
    ]);
    for (const planned of plans) {
      expect(planned.items).toEqual(['genre:jam-band']);
      expect(planned.baseSha256).toBe(live.file(planned.path)?.sha256);
    }
    // The texts are what writeVocabularyContract writes for these records.
    const contract = mkdtempSync(join(tmpdir(), 'vocabulary-contract-'));
    temps.push(contract);
    copyFileSync(
      join(REPO_ROOT, CONTRACT.vocabulary),
      join(contract, 'vocabulary.generated.json'),
    );
    copyFileSync(
      join(REPO_ROOT, CONTRACT.manifest),
      join(contract, 'manifest.json'),
    );
    const records = {
      genres: live
        .items('genre')
        .map((item) => (item.slug === 'jam-band' ? renamed : item.body)),
      subgenres: live.items('subgenre').map((item) => item.body),
      instruments: live.items('instrument').map((item) => item.body),
    } as unknown as Parameters<typeof writeVocabularyContract>[0];
    writeVocabularyContract(records, contract);
    expect(planOf(plans, CONTRACT.vocabulary).text).toBe(
      readFileSync(join(contract, 'vocabulary.generated.json'), 'utf8'),
    );
    expect(planOf(plans, CONTRACT.manifest).text).toBe(
      readFileSync(join(contract, 'manifest.json'), 'utf8'),
    );
    // Read back, the store is the same but for the one record.
    await live.verify(changes, plans);
  }, 60_000);

  it('lands on disk, and the files read back as the renamed vocabulary', async () => {
    const { dir, reader } = scratch();
    const store = await loadRepoStore({ reader });
    const changes: ItemChange[] = [
      {
        kind: 'instrument',
        slug: 'sampler',
        body: { ...body('instrument', 'sampler'), name: 'Sampler (MPC)' },
      },
    ];
    await write(store, dir, await store.plan(changes));
    const after = await loadRepoStore({ reader });
    expect(after.item('instrument', 'sampler')?.body.name).toBe(
      'Sampler (MPC)',
    );
    const manifest = JSON.parse(readAt(dir, CONTRACT.manifest)) as {
      files: { file: string; sha256: string }[];
    };
    expect(
      manifest.files.find((f) => f.file === 'vocabulary.generated.json')
        ?.sha256,
    ).toBe(contractSha(readAt(dir, CONTRACT.vocabulary)));
    expect(readAt(dir, CONTRACT.vocabulary)).toContain(
      '"name": "Sampler (MPC)"',
    );
    // Saving the same again changes nothing.
    expect(await after.plan(changes)).toEqual([]);
  }, 60_000);

  it('edits a tag in its line and leaves the API’s copy alone, which holds no tags', async () => {
    const plans = await live.plan([
      {
        kind: 'genre',
        slug: 'jam-band',
        body: { ...body('genre', 'jam-band'), tags: ['Jam Band', 'Jam'] },
      },
    ]);
    expect(plans.map((planned) => planned.path)).toEqual([GENRES]);
    expect(changedLines(plans[0].before!, plans[0].text!)).toEqual([
      '    {"id":"jam-band","name":"Jam Band","taught":true,"tags":["Jam Band","Jam"]},',
    ]);
  }, 60_000);

  it('appends a new subgenre as the last record, the one before it gaining its comma', async () => {
    const created = {
      id: 'surf-rock',
      name: 'Surf Rock',
      parent: 'rock',
      tags: ['Surf Rock'],
    };
    const changes: ItemChange[] = [
      { kind: 'subgenre', slug: 'surf-rock', body: created },
    ];
    const plans = await live.plan(changes);
    expect(plans.map((planned) => planned.path)).toEqual([
      SUBGENRES,
      CONTRACT.vocabulary,
      CONTRACT.manifest,
    ]);
    const before = planOf(plans, SUBGENRES).before!.split('\n');
    const after = planOf(plans, SUBGENRES).text!.split('\n');
    expect(after.length).toBe(before.length + 1);
    // `  ]`, `}` and the final newline close the file.
    const last = before.length - 4;
    expect(after.slice(0, last)).toEqual(before.slice(0, last));
    expect(after[last]).toBe(`${before[last]},`);
    expect(after[last + 1]).toBe(`    ${JSON.stringify(created)}`);
    expect(after.slice(last + 2)).toEqual(before.slice(last + 1));
    expect(planOf(plans, CONTRACT.vocabulary).text).toContain(
      '"id": "surf-rock"',
    );
    await live.verify(changes, plans);
  }, 60_000);

  it('takes a deleted record’s line out, and nothing else', async () => {
    const [first] = live.items('subgenre');
    const changes: ItemChange[] = [
      { kind: 'subgenre', slug: first.slug, body: null },
    ];
    const plans = await live.plan(changes);
    const planned = planOf(plans, SUBGENRES);
    const before = planned.before!.split('\n');
    const after = planned.text!.split('\n');
    expect(before.filter((line) => !after.includes(line))).toEqual([
      `    ${JSON.stringify(first.body)},`,
    ]);
    expect(after.length).toBe(before.length - 1);
    await live.verify(changes, plans);
  }, 60_000);

  it('plans each file once when a save changes several kinds', async () => {
    const plans = await live.plan([
      {
        kind: 'genre',
        slug: 'jam-band',
        body: { ...body('genre', 'jam-band'), name: 'Jam' },
      },
      {
        kind: 'instrument',
        slug: 'sampler',
        body: { ...body('instrument', 'sampler'), section: 'other' },
      },
    ]);
    expect(plans.map((planned) => planned.path)).toEqual([
      GENRES,
      INSTRUMENTS,
      CONTRACT.vocabulary,
      CONTRACT.manifest,
    ]);
    expect(planOf(plans, CONTRACT.manifest).items).toEqual([
      'genre:jam-band',
      'instrument:sampler',
    ]);
  }, 60_000);
});

describe('what a save is refused', () => {
  const refusal = (changes: ItemChange[]) =>
    live.plan(changes).then(
      () => null,
      (error: unknown) =>
        error as { code: string; status: number; message: string },
    );

  it('a body that renames, an id off the grammar, a delete of nothing', async () => {
    expect(
      await refusal([
        {
          kind: 'genre',
          slug: 'jam-band',
          body: { ...body('genre', 'jam-band'), id: 'jam' },
        },
      ]),
    ).toMatchObject({ code: 'REPO_BAD_CHANGE', status: 422 });
    expect(
      await refusal([
        {
          kind: 'genre',
          slug: 'Jam_Band',
          body: { ...body('genre', 'jam-band'), id: 'Jam_Band' },
        },
      ]),
    ).toMatchObject({ code: 'REPO_BAD_CHANGE' });
    expect(
      await refusal([{ kind: 'subgenre', slug: 'no-such-style', body: null }]),
    ).toMatchObject({ code: 'REPO_BAD_CHANGE' });
  }, 60_000);

  it('a record the file cannot hold, naming the file', async () => {
    const error = await refusal([
      {
        kind: 'instrument',
        slug: 'sampler',
        body: { ...body('instrument', 'sampler'), section: 'kitchen' },
      },
    ]);
    expect(error).toMatchObject({ code: 'REPO_UNWRITABLE', status: 422 });
    expect(error?.message).toContain(INSTRUMENTS);
  }, 60_000);

  it('a write that would drop what a hand edit left in another record', async () => {
    const { dir, reader } = scratch();
    writeFileSync(
      at(dir, GENRES),
      readAt(dir, GENRES).replace(
        '{"id":"rock","name":"Rock",',
        '{"id":"rock","name":"Rock","era":"1950s",',
      ),
    );
    const store = await loadRepoStore({ reader });
    expect(store.warnings).toContain(
      `${GENRES} is not in the one-record-per-line layout; its next write re-lays the whole file`,
    );
    await expect(
      store.plan([
        {
          kind: 'genre',
          slug: 'jam-band',
          body: { ...body('genre', 'jam-band'), name: 'Jam' },
        },
      ]),
    ).rejects.toMatchObject({ code: 'REPO_UNWRITABLE' });
  }, 60_000);

  it('a write over a contract file edited since the load (409, nothing written)', async () => {
    const { dir, reader } = scratch();
    const store = await loadRepoStore({ reader });
    const plans = await store.plan([
      {
        kind: 'genre',
        slug: 'jam-band',
        body: { ...body('genre', 'jam-band'), name: 'Jam' },
      },
    ]);
    const genresBefore = readAt(dir, GENRES);
    writeFileSync(
      at(dir, CONTRACT.manifest),
      `${readAt(dir, CONTRACT.manifest)}\n`,
    );
    await expect(write(store, dir, plans)).rejects.toMatchObject({
      code: 'REPO_FILE_CHANGED',
      status: 409,
      file: CONTRACT.manifest,
    });
    expect(readAt(dir, GENRES)).toBe(genresBefore);
  }, 60_000);

  it('nothing of the contract when its files are missing: the load says so', async () => {
    const { dir, reader } = scratch();
    unlinkSync(at(dir, CONTRACT.manifest));
    const store = await loadRepoStore({ reader });
    expect(store.missing).toContain(CONTRACT.manifest);
    expect(store.warnings).toContain(
      `${CONTRACT.manifest} is missing, so a vocabulary save cannot bring the API's copy of the vocabulary up to date`,
    );
    const plans = await store.plan([
      {
        kind: 'genre',
        slug: 'jam-band',
        body: { ...body('genre', 'jam-band'), name: 'Jam' },
      },
    ]);
    expect(plans.map((planned) => planned.path)).toEqual([GENRES]);
  }, 60_000);
});
