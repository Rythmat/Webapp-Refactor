import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { songBodySchema as v1 } from '@/scripts/apiContract/songBodySchema.v1';

/**
 * Level v1 is what the API is asked to adopt first, so it must not move under
 * anyone's feet: a change to it would mean the file Ryan copied and the file
 * this repo calls "v1" are different things. New fields go into the
 * regenerated `songBodySchema.ts` (level v2) instead.
 */

const DIR = 'src/scripts/apiContract';
const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8')) as {
  songSchemaLevels: { v1: { file: string; sha256: string } };
};

describe('song body schema level v1', () => {
  it('is byte-for-byte the frozen file the manifest names', () => {
    const { file, sha256 } = manifest.songSchemaLevels.v1;
    const actual = createHash('sha256')
      .update(readFileSync(`${DIR}/${file}`))
      .digest('hex');
    expect(actual).toBe(sha256);
  });

  it('is strict, so an unknown field is refused', () => {
    const minimal = {
      id: 'x',
      title: 'X',
      artist: 'Y',
      key: 'C major',
      keyRoot: 60,
      mode: 'major',
      tempo: 120,
      timeSignature: [4, 4],
      difficulty: 1,
      genreTags: [],
      techniques: [],
      sections: [],
      audioSources: [],
      artistImageSource: 'none',
    };
    expect(v1.safeParse(minimal).success).toBe(true);
    // A v2 field is exactly what a v1 server must reject.
    expect(v1.safeParse({ ...minimal, releases: [] }).success).toBe(false);
  });
});
