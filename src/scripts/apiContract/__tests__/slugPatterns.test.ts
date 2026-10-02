import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARTIST_REGISTRY } from '@/components/atlas/data/artistRegistry';
import { CITIES } from '@/components/atlas/data/cities';
import { BUNDLED_MUSIC_HISTORY } from '@/components/atlas/data/events';
import LIB from '@/curriculum/data/chordProgressionLibrary';
import { BUNDLED_SONGS } from '@/curriculum/data/songs/bundled';
import { buildSlugPatterns } from '@/scripts/apiContract/slugPatterns';

/**
 * The API's copy of the slug grammar, kept current and kept true: regenerated
 * from `SLUG_PATTERN` and compared with what is committed, then every seed id
 * the contract promises passes is checked against the pattern it will meet.
 */

const OUT = 'src/scripts/apiContract/slugPatterns.generated.json';
const patterns = buildSlugPatterns();
const re = (kind: string) => new RegExp(patterns[kind].pattern!);

describe('the generated slug patterns', () => {
  it('match what ids.ts says today', () => {
    const wanted = `${JSON.stringify(patterns, null, 2)}\n`;
    if (process.env.WRITE_CONTRACT) writeFileSync(OUT, wanted);
    expect(readFileSync(OUT, 'utf8')).toBe(wanted);
  });

  it('never allow a colon', () => {
    for (const [kind, { pattern }] of Object.entries(patterns)) {
      if (pattern) expect(new RegExp(pattern).test('a:b'), kind).toBe(false);
    }
  });
});

describe('every seed id passes its pattern', () => {
  const failing = (kind: string, ids: string[]) =>
    ids.filter((id) => !re(kind).test(id)).slice(0, 5);

  it('songs', () => {
    const ids = Object.keys(BUNDLED_SONGS);
    expect(ids.length).toBe(638);
    expect(failing('song', ids)).toEqual([]);
  });

  it('globe events', () => {
    const ids = BUNDLED_MUSIC_HISTORY.map((e) => e.id);
    expect(ids.length).toBe(1723);
    expect(failing('globe_event', ids)).toEqual([]);
  });

  it('cities', () => {
    const ids = CITIES.map((c) => c.id);
    expect(ids.length).toBe(299);
    expect(new Set(ids).size).toBe(ids.length);
    expect(failing('globe_city', ids)).toEqual([]);
  });

  it('artists', () => {
    const ids = ARTIST_REGISTRY.map((a) => a.slug);
    // 907 until 30 Sep 2026, when the owner's 23 duplicate merges and the
    // album title "Remind In Light" (read as an artist) left the registry.
    expect(ids.length).toBe(883);
    expect(failing('artist', ids)).toEqual([]);
  });

  it('chord progressions', () => {
    const ids = LIB.map((p) => String(p.id));
    expect(ids.length).toBe(695);
    expect(new Set(ids).size).toBe(ids.length);
    expect(failing('chord_progression', ids)).toEqual([]);
  });
});
