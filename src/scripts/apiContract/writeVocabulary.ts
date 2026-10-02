import { createHash } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVocabulary } from './vocabulary';

/**
 * Writes the API's copy of the vocabulary, `vocabulary.generated.json`, and
 * its hash in manifest.json: what `WRITE_CONTRACT=1` and a hand edit of the
 * manifest do, as one call.
 *
 * For the console's saves on the owner's machine: a genre, subgenre or
 * instrument written to its file can change this copy (`buildVocabulary`
 * says which fields do), and manifest.test.ts fails until the manifest names
 * the new hash. The dev repo content server works out both files' new text
 * with `vocabularyContractTexts` for the records it is about to write, and
 * writes them with the vocabulary file, through its own hash check. From a
 * shell,
 *
 *   npx tsx src/scripts/apiContract/writeVocabulary.ts
 *
 * regenerates both from the repo's files. A file whose text would not change
 * is not written, so a tag edit leaves the contract as it was.
 *
 * The manifest follows the rules manifest.test.ts holds it to: the file's
 * `sha256` becomes the new hash, and `draftVersion` is `artifactsVersion + 1`
 * exactly while some file differs from its `handedOff`. So an edit undone
 * closes a draft only it opened, never one another file keeps open.
 * `artifactsVersion` and `handedOff` move only at a hand-off, never here.
 */

/** This folder, where the contract artifacts live. */
export const CONTRACT_DIR = fileURLToPath(new URL('.', import.meta.url));

export const VOCABULARY_FILE = 'vocabulary.generated.json';
export const MANIFEST_FILE = 'manifest.json';

type VocabularyInput = Parameters<typeof buildVocabulary>[0];
type ProgressionsInput = Parameters<typeof buildVocabulary>[1];

/**
 * `vocabulary.generated.json`'s text for these records (the repo's when left
 * out), with the progression styles of `progressions` (the repo's library
 * when left out).
 */
export const vocabularyJson = (
  records?: VocabularyInput,
  progressions?: ProgressionsInput,
): string =>
  `${JSON.stringify(buildVocabulary(records, progressions), null, 2)}\n`;

export const sha256 = (text: string): string =>
  createHash('sha256').update(text).digest('hex');

interface ManifestEntry {
  file: string;
  sha256: string;
  handedOff: string;
}

interface Manifest {
  artifactsVersion: number;
  draftVersion?: number;
  files: ManifestEntry[];
}

/**
 * The manifest's text with `file`'s hash set to `hash`, and `draftVersion`
 * opened or closed to match. Every other key keeps its place, and
 * `draftVersion` sits right after `artifactsVersion`, as the manifest keeps
 * it. Throws when the manifest does not list the file.
 */
export function manifestWithHash(
  text: string,
  file: string,
  hash: string,
): string {
  const manifest = JSON.parse(text) as Manifest & Record<string, unknown>;
  const entry = manifest.files.find((f) => f.file === file);
  if (!entry) throw new Error(`manifest.json does not list ${file}`);
  entry.sha256 = hash;
  const drafted = manifest.files.some((f) => f.sha256 !== f.handedOff);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(manifest)) {
    if (key === 'draftVersion') continue;
    out[key] = value;
    if (key === 'artifactsVersion' && drafted) {
      out.draftVersion = manifest.artifactsVersion + 1;
    }
  }
  return `${JSON.stringify(out, null, 2)}\n`;
}

/** Written beside the file and renamed over it, so no reader sees half. */
function writeWhole(path: string, text: string) {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, text);
  renameSync(temp, path);
}

/** The two contract files a vocabulary change can touch, as text. */
export interface VocabularyContractTexts {
  /** `vocabulary.generated.json`. */
  vocabulary: string;
  /** `manifest.json`. */
  manifest: string;
}

/**
 * What the two files should say for these records, given what they say now:
 * the pure half of `writeVocabularyContract`. A text that comes back equal
 * to the one passed in needs no write. The dev repo content server plans
 * both files with this beside the vocabulary file a save writes, so all
 * three go through its hash check and are written together
 * (src/scripts/repoContent/sources/vocabulary.ts). Throws when the manifest
 * does not list the vocabulary file.
 */
export function vocabularyContractTexts(
  current: VocabularyContractTexts,
  records?: VocabularyInput,
  progressions?: ProgressionsInput,
): VocabularyContractTexts {
  const vocabulary = vocabularyJson(records, progressions);
  return {
    vocabulary,
    manifest: manifestWithHash(
      current.manifest,
      VOCABULARY_FILE,
      sha256(vocabulary),
    ),
  };
}

/**
 * Regenerates `vocabulary.generated.json` from `records` (the repo's files
 * when left out) and puts its hash in manifest.json, writing each only when
 * its text changes. Returns the names of the files it wrote.
 */
export function writeVocabularyContract(
  records?: VocabularyInput,
  dir: string = CONTRACT_DIR,
): string[] {
  const written: string[] = [];
  const vocabularyPath = join(dir, VOCABULARY_FILE);
  const manifestPath = join(dir, MANIFEST_FILE);
  const current: VocabularyContractTexts = {
    vocabulary: readFileSync(vocabularyPath, 'utf8'),
    manifest: readFileSync(manifestPath, 'utf8'),
  };
  const next = vocabularyContractTexts(current, records);
  if (next.vocabulary !== current.vocabulary) {
    writeWhole(vocabularyPath, next.vocabulary);
    written.push(VOCABULARY_FILE);
  }
  if (next.manifest !== current.manifest) {
    writeWhole(manifestPath, next.manifest);
    written.push(MANIFEST_FILE);
  }
  return written;
}

// Run from a shell: `npx tsx src/scripts/apiContract/writeVocabulary.ts`.
// Imported (by the content server or a test), it only exports.
if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const written = writeVocabularyContract();
  console.log(
    written.length
      ? `Wrote ${written.join(' and ')} in ${CONTRACT_DIR}`
      : `${VOCABULARY_FILE} and its hash are current: nothing written`,
  );
}
