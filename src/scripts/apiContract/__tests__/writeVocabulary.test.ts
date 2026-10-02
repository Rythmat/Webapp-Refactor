import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { REPO_VOCABULARY } from '@/content/vocabulary/repo';
import {
  CONTRACT_DIR,
  manifestWithHash,
  sha256,
  vocabularyJson,
  writeVocabularyContract,
} from '../writeVocabulary';

/**
 * The writer a console save uses to keep the API's vocabulary copy and the
 * manifest current. It must write what `WRITE_CONTRACT=1` writes, leave
 * both files alone when nothing changed, and leave the manifest as
 * manifest.test.ts requires: the new hash, and a draft open exactly while
 * some file differs from its hand-off.
 */

const VOCABULARY = 'vocabulary.generated.json';
const read = (dir: string, file: string) =>
  readFileSync(join(dir, file), 'utf8');

const entry = (file: string, hash: string, handedOff = hash) => ({
  file,
  sha256: hash,
  handedOff,
  what: file,
});

const manifestText = (
  files: ReturnType<typeof entry>[],
  draftVersion?: number,
) =>
  `${JSON.stringify(
    {
      artifactsVersion: 3,
      ...(draftVersion === undefined ? {} : { draftVersion }),
      description: 'Contract artifacts.',
      files,
    },
    null,
    2,
  )}\n`;

const OLD = 'a'.repeat(64);
const NEW = 'b'.repeat(64);
const OTHER = 'c'.repeat(64);

describe('the vocabulary text', () => {
  it('is the committed file for the repo’s records', () => {
    expect(vocabularyJson()).toBe(read(CONTRACT_DIR, VOCABULARY));
    expect(vocabularyJson(REPO_VOCABULARY)).toBe(
      read(CONTRACT_DIR, VOCABULARY),
    );
  });

  it('changes with a name, not with a tag', () => {
    const renamed = {
      ...REPO_VOCABULARY,
      genres: REPO_VOCABULARY.genres.map((g) =>
        g.id === 'jam-band' ? { ...g, name: 'Jam' } : g,
      ),
    };
    const tagged = {
      ...REPO_VOCABULARY,
      genres: REPO_VOCABULARY.genres.map((g) =>
        g.id === 'jam-band' ? { ...g, tags: [...g.tags, 'Jam'] } : g,
      ),
    };
    expect(vocabularyJson(renamed)).not.toBe(vocabularyJson());
    expect(vocabularyJson(renamed)).toContain('"name": "Jam"');
    expect(vocabularyJson(tagged)).toBe(vocabularyJson());
  });
});

describe('the manifest', () => {
  it('is unchanged when the hash is the one it records', () => {
    const text = read(CONTRACT_DIR, 'manifest.json');
    expect(
      manifestWithHash(
        text,
        VOCABULARY,
        sha256(read(CONTRACT_DIR, VOCABULARY)),
      ),
    ).toBe(text);
  });

  it('opens a draft after artifactsVersion, and closes it when undone', () => {
    const handedOver = manifestText([
      entry(VOCABULARY, OLD),
      entry('x', OTHER),
    ]);
    const changed = manifestWithHash(handedOver, VOCABULARY, NEW);
    expect(changed).toBe(
      manifestText([entry(VOCABULARY, NEW, OLD), entry('x', OTHER)], 4),
    );
    expect(Object.keys(JSON.parse(changed))).toEqual([
      'artifactsVersion',
      'draftVersion',
      'description',
      'files',
    ]);
    expect(manifestWithHash(changed, VOCABULARY, OLD)).toBe(handedOver);
  });

  it('keeps a draft another file holds open', () => {
    const drafted = manifestText(
      [entry(VOCABULARY, NEW, OLD), entry('x', NEW, OTHER)],
      4,
    );
    expect(manifestWithHash(drafted, VOCABULARY, OLD)).toBe(
      manifestText([entry(VOCABULARY, OLD), entry('x', NEW, OTHER)], 4),
    );
  });

  it('refuses a file it does not list', () => {
    expect(() =>
      manifestWithHash(manifestText([entry('x', OLD)]), VOCABULARY, NEW),
    ).toThrow(/does not list/);
  });
});

describe('writing', () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  /** A contract folder whose vocabulary is as handed over. */
  const handedOverDir = () => {
    dir = mkdtempSync(join(tmpdir(), 'vocabulary-contract-'));
    const text = vocabularyJson();
    writeFileSync(join(dir, VOCABULARY), text);
    writeFileSync(
      join(dir, 'manifest.json'),
      manifestText([entry(VOCABULARY, sha256(text)), entry('x', OTHER)]),
    );
    return dir;
  };

  it('writes nothing when nothing changed', () => {
    const at = handedOverDir();
    const before = read(at, 'manifest.json');
    expect(writeVocabularyContract(undefined, at)).toEqual([]);
    expect(read(at, 'manifest.json')).toBe(before);
  });

  it('writes the file and its hash on a rename, and opens the draft', () => {
    const at = handedOverDir();
    const renamed = {
      ...REPO_VOCABULARY,
      instruments: REPO_VOCABULARY.instruments.map((i) =>
        i.id === 'sampler' ? { ...i, name: 'Sampler (MPC)' } : i,
      ),
    };
    expect(writeVocabularyContract(renamed, at)).toEqual([
      VOCABULARY,
      'manifest.json',
    ]);
    const text = read(at, VOCABULARY);
    expect(text).toBe(vocabularyJson(renamed));
    const manifest = JSON.parse(read(at, 'manifest.json')) as {
      draftVersion?: number;
      files: { file: string; sha256: string }[];
    };
    expect(manifest.files.find((f) => f.file === VOCABULARY)?.sha256).toBe(
      sha256(text),
    );
    expect(manifest.draftVersion).toBe(4);
    // Written again, the same records change nothing.
    expect(writeVocabularyContract(renamed, at)).toEqual([]);
    // And the repo's own records put it back as it was handed over.
    expect(writeVocabularyContract(undefined, at)).toEqual([
      VOCABULARY,
      'manifest.json',
    ]);
    expect(
      (JSON.parse(read(at, 'manifest.json')) as { draftVersion?: number })
        .draftVersion,
    ).toBeUndefined();
  });
});
