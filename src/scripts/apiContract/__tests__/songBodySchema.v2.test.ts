import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { songBodySchema as v2 } from '@/scripts/apiContract/songBodySchema.v2';

/**
 * Level v2 is frozen for artifacts version 4, as v1 was before it, and
 * handed over with it: the file Ryan copies and the file this repo calls
 * "v2" must stay the same thing. New song fields go into the regenerated
 * `songBodySchema.ts`, which becomes level v3.
 */

const DIR = 'src/scripts/apiContract';
const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8')) as {
  songSchemaLevels: { v2: { file: string; sha256: string } };
};

const MINIMAL = {
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

describe('song body schema level v2', () => {
  it('is byte-for-byte the frozen file the manifest names', () => {
    const { file, sha256 } = manifest.songSchemaLevels.v2;
    expect(file).toBe('songBodySchema.v2.ts');
    const actual = createHash('sha256')
      .update(readFileSync(`${DIR}/${file}`))
      .digest('hex');
    expect(actual).toBe(sha256);
  });

  it('takes the v2 fields, and is strict about anything else', () => {
    expect(v2.safeParse(MINIMAL).success).toBe(true);
    expect(
      v2.safeParse({
        ...MINIMAL,
        releases: [{ releaseId: 'marvin-gaye-whats-going-on', track: 1 }],
        subgenreIds: ['motown'],
        session: { studioId: 'hitsville-u-s-a', placeId: 'detroit' },
      }).success,
    ).toBe(true);
    expect(v2.safeParse({ ...MINIMAL, provenance: [] }).success).toBe(false);
  });
});
