import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The API runs copies of these files. A copy is only as good as knowing which
 * version it is, so every artifact's hash is recorded in manifest.json, and
 * change a file and this fails until its hash is updated.
 *
 * The version moves once per hand-off, not once per edit (design C31).
 * `artifactsVersion` is the version last handed over, and each file's
 * `handedOff` is its hash then. A file that has changed since is part of the
 * open draft, `draftVersion`, the next number: it exists exactly while some
 * file differs from its hand-off. At the hand-off `artifactsVersion` takes
 * the draft's number, every `handedOff` takes its file's hash, and
 * `draftVersion` goes. So the repo can never describe a draft under the
 * number of what was handed over, which the API reports back in
 * GET /capabilities.
 */

const DIR = 'src/scripts/apiContract';
const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8')) as {
  artifactsVersion: number;
  draftVersion?: number;
  files: { file: string; sha256: string; handedOff: string; what: string }[];
};

const sha256 = (file: string) =>
  createHash('sha256')
    .update(readFileSync(`${DIR}/${file}`))
    .digest('hex');

const next = manifest.artifactsVersion + 1;

describe('the contract manifest', () => {
  it('records the current hash of every artifact', () => {
    const stale = manifest.files
      .filter((f) => sha256(f.file) !== f.sha256)
      .map(
        (f) =>
          `${f.file} changed: update its sha256 in manifest.json. It is then part of the draft, so set draftVersion to ${next} if it is not already; artifactsVersion (${manifest.artifactsVersion}) moves only at a hand-off`,
      );
    expect(stale).toEqual([]);
  });

  it('opens a draft exactly while a file differs from its hand-off', () => {
    const drafted = manifest.files
      .filter((f) => f.sha256 !== f.handedOff)
      .map((f) => f.file);
    if (drafted.length) {
      expect(
        manifest.draftVersion,
        `${drafted.join(', ')} changed since version ${manifest.artifactsVersion} was handed over, so draftVersion must be ${next}`,
      ).toBe(next);
    } else {
      expect(
        manifest.draftVersion,
        'every file is as it was handed over, so there is no draft: remove draftVersion',
      ).toBeUndefined();
    }
  });

  it('records every hash in full', () => {
    const hex = /^[0-9a-f]{64}$/;
    const bad = manifest.files.filter(
      (f) => !hex.test(f.sha256) || !hex.test(f.handedOff),
    );
    expect(bad.map((f) => f.file)).toEqual([]);
  });

  it('lists the files the API copies', () => {
    expect(manifest.files.map((f) => f.file).sort()).toEqual([
      '../../content/graph/slugs.ts',
      'recordBodySchemas.ts',
      'refPaths.ts',
      'slugPatterns.generated.json',
      'songBodySchema.ts',
      'songBodySchema.v1.ts',
      'songBodySchema.v2.ts',
      'suggestionSchema.ts',
      'vocabulary.generated.json',
    ]);
  });
});
