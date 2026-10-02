import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildVocabulary } from '@/scripts/apiContract/vocabulary';

/**
 * The API's copy of the code-owned vocabularies, kept current: regenerated
 * here and compared with what is committed. WRITE_CONTRACT=1 rewrites it —
 * and then its hash in manifest.json is updated and it joins the open draft
 * (`draftVersion`; see manifest.test.ts).
 */

const OUT = 'src/scripts/apiContract/vocabulary.generated.json';

describe('the generated vocabulary', () => {
  const vocabulary = buildVocabulary();
  const wanted = `${JSON.stringify(vocabulary, null, 2)}\n`;

  it('matches what the code registries say today', () => {
    if (process.env.WRITE_CONTRACT) writeFileSync(OUT, wanted);
    expect(readFileSync(OUT, 'utf8')).toBe(wanted);
  });

  it('lists what the contract promises', () => {
    expect(vocabulary.genres.length).toBe(29);
    expect(vocabulary.genres.filter((g) => g.taught).length).toBe(12);
    expect(vocabulary.songGenreTags).toHaveLength(12);
    expect(vocabulary.instruments.length).toBeGreaterThan(50);
    expect(vocabulary.vibes).toHaveLength(16);
    expect(vocabulary.regions).toHaveLength(18);
    expect(vocabulary.eras.length).toBeGreaterThan(5);
  });

  it('gives every subgenre a parent that is a genre', () => {
    const genres = new Set(vocabulary.genres.map((g) => g.id));
    expect(
      vocabulary.subgenres.filter((s) => !genres.has(s.parent)).slice(0, 5),
    ).toEqual([]);
  });

  it('has unique ids in every list', () => {
    for (const [name, list] of Object.entries(vocabulary)) {
      const ids = (list as (string | { id: string })[]).map((x) =>
        typeof x === 'string' ? x : x.id,
      );
      expect(ids.length, name).toBe(new Set(ids).size);
    }
  });
});
