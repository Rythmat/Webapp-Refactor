import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  canonical,
  describeChanges,
  planImport,
  tally,
  toWrite,
} from '../songImportPlan';

/**
 * Deciding what to write into a content database, tested without one.
 *
 * The real case this was built for: the store's Natural Woman has five
 * sections named with rehearsal letters and the repo's has eight named
 * properly. The plan has to see that, say it in words, and — the part that
 * matters — never propose deleting the songs only the store has.
 */

const song = (over: Partial<Song> = {}): Song =>
  ({
    id: 'nw',
    title: 'Natural Woman',
    artist: 'Carole King',
    key: 'A major',
    keyRoot: 69,
    mode: 'major',
    tempo: 83,
    timeSignature: [6, 8],
    difficulty: 2,
    genreTags: ['pop'],
    techniques: [],
    sections: [
      {
        id: 'v1',
        label: 'Verse 1',
        bars: [{ chords: [] }, { chords: [] }],
      },
    ],
    audioSources: [],
    artistImageSource: 'none',
    ...over,
  }) as Song;

const stored = (...songs: Song[]) => new Map(songs.map((s) => [s.id, s]));

describe('canonical', () => {
  it('ignores the order the fields were typed in', () => {
    expect(canonical({ b: 1, a: 2 })).toEqual(canonical({ a: 2, b: 1 }));
    expect(JSON.stringify(canonical({ b: 1, a: 2 }))).toBe('{"a":2,"b":1}');
  });

  it('treats an explicit undefined as an absent field', () => {
    expect(JSON.stringify(canonical({ a: 1, b: undefined }))).toBe('{"a":1}');
  });

  it('leaves an array order alone, because order is the meaning', () => {
    expect(canonical([3, 1, 2])).toEqual([3, 1, 2]);
  });
});

describe('planImport', () => {
  it('says nothing to do when the two agree', () => {
    const plan = planImport([song()], stored(song()));
    expect(plan[0].state).toBe('same');
    expect(toWrite(plan)).toEqual([]);
  });

  it('agrees across a differently-ordered but identical song', () => {
    // Same song, fields written in a different order.
    const entries = Object.entries(
      song() as unknown as Record<string, unknown>,
    );
    const reordered = Object.fromEntries(entries.reverse()) as unknown as Song;
    expect(planImport([song()], stored(reordered))[0].state).toBe('same');
  });

  it('marks a song the store has never seen as one to create', () => {
    expect(planImport([song()], stored())[0].state).toBe('missing');
  });

  it('never proposes touching a song only the store has', () => {
    // The store is about to become the source of truth. Anything in it that
    // the repo does not know about is someone's work, not a stale row.
    const plan = planImport([], stored(song({ id: 'only_here' })));
    expect(plan[0].state).toBe('extra');
    expect(toWrite(plan)).toEqual([]);
  });

  it('puts what it would create first and what it would leave last', () => {
    const plan = planImport(
      [song({ id: 'b' }), song({ id: 'a', tempo: 99 })],
      stored(song({ id: 'a' }), song({ id: 'z' })),
    );
    expect(plan.map((r) => r.state)).toEqual(['missing', 'differs', 'extra']);
  });

  it('counts what an import would come to', () => {
    const plan = planImport(
      [song({ id: 'a' }), song({ id: 'b', tempo: 99 }), song({ id: 'c' })],
      stored(song({ id: 'b' }), song({ id: 'c' }), song({ id: 'old' })),
    );
    expect(tally(plan)).toEqual({ same: 1, differs: 1, missing: 1, extra: 1 });
  });
});

describe('describeChanges', () => {
  const four = (labels: string[]): Song =>
    song({
      sections: labels.map((label, i) => ({
        id: `s${i}`,
        label,
        bars: [{ chords: [] }, { chords: [] }],
      })),
    });

  it('reads store-first, so it says what would happen', () => {
    const changes = describeChanges(four(['A', 'B', 'C']), four(['A']));
    expect(changes).toContain('sections 1 → 3');
    expect(changes).toContain('bars 2 → 6');
  });

  it('names the section labels that would go', () => {
    // The Natural Woman case, which is what this was built for.
    const changes = describeChanges(
      four(['Verse 1', 'Pre-Chorus 1']),
      four(['Verse', 'Section B']),
    );
    expect(
      changes.some((c) => c.includes('Section B') && c.includes('dropping')),
    ).toBe(true);
  });

  it('spells out a key, a tempo and a metre', () => {
    const changes = describeChanges(
      song({ key: 'B major', tempo: 100, timeSignature: [5, 4] }),
      song(),
    );
    expect(changes).toContain('key A major → B major');
    expect(changes).toContain('tempo 83 → 100');
    expect(changes).toContain('metre 6/8 → 5/4');
  });

  it('counts roadmap marks, which is the point of the whole migration', () => {
    const marked = song({
      sections: [
        {
          id: 'v',
          label: 'Verse 1',
          bars: [
            { chords: [], repeatStart: true },
            { chords: [], repeatEnd: true, repeatTimes: 3 },
          ],
        },
      ],
    });
    expect(describeChanges(marked, song())).toContain('roadmap marks 0 → 2');
  });

  it('admits it when something differs that it cannot name', () => {
    // Reporting "no changes" on a song about to be overwritten would be the
    // worst thing this could do.
    const changes = describeChanges(song({ difficulty: 3 }), song());
    expect(changes).toEqual(['other fields']);
  });
});
