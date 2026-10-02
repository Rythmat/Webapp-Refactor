import { describe, expect, it } from 'vitest';
import { fingerprintCacheStage, whyStale } from '../stageFingerprint';

const base = {
  registry: [{ slug: 'toto', name: 'Toto' }],
  songs: [{ id: 'africa', title: 'Africa', artist: 'Toto', year: 1982 }],
  code: ['export const stage = 1;'],
  inputs: { '_mb_cache.json': { sha256: 'aaa' } },
};

describe('the cache stage fingerprint', () => {
  it('is the same for the same inputs, whatever order their keys came in', () => {
    const again = fingerprintCacheStage({
      ...base,
      songs: [{ year: 1982, artist: 'Toto', title: 'Africa', id: 'africa' }],
    });
    expect(again).toEqual(fingerprintCacheStage(base));
    expect(again).toMatchObject({ registryArtists: 1, songs: 1 });
  });

  it('changes with the registry, a song, the code or a local input', () => {
    const before = fingerprintCacheStage(base);
    const changes = [
      { registry: [{ slug: 'toto', name: 'Toto', aliases: ['TOTO'] }] },
      { songs: [{ ...base.songs[0], title: 'Africa (Remastered)' }] },
      // A lead act linked since: the song now reaches another artist.
      { songs: [{ ...base.songs[0], artistGlobeId: 'toto' }] },
      { code: ['export const stage = 2;'] },
      { inputs: { '_mb_cache.json': { sha256: 'bbb' } } },
    ];
    for (const change of changes) {
      expect(
        whyStale(before, fingerprintCacheStage({ ...base, ...change })),
      ).toMatch(/changed since/);
    }
    expect(whyStale(before, fingerprintCacheStage(base))).toBeNull();
  });

  it('says what changed when a count did, and treats no fingerprint as stale', () => {
    const current = fingerprintCacheStage(base);
    const grown = fingerprintCacheStage({
      ...base,
      registry: [...base.registry, { slug: 'war', name: 'War' }],
    });
    expect(whyStale(current, grown)).toBe(
      'it was built from 1 registry artists, and there are 2 now',
    );
    expect(whyStale(undefined, current)).toMatch(/before stage outputs/);
  });
});
