import { describe, expect, it } from 'vitest';
import { africa } from '@/curriculum/data/songs/africa';
import { aint_no_mountain_high_enough } from '@/curriculum/data/songs/aint_no_mountain_high_enough';
import { jump_jive_an_wail } from '@/curriculum/data/songs/jump_jive_an_wail';
import { kashmir } from '@/curriculum/data/songs/kashmir';
import { respect } from '@/curriculum/data/songs/respect';
import { they_long_to_be_close_to_you } from '@/curriculum/data/songs/they_long_to_be_close_to_you';
import { chordNameToMidi } from '@/curriculum/songLibrary/chordParser';
import { exportSongToChordRegions } from '@/curriculum/songLibrary/exportToStudio';
import {
  chordRootAndBass,
  expectedDegreeNumbers,
  isNoChord,
  songTonic,
  spelledPitchClass,
  splitDegreeLabel,
} from '@/curriculum/songLibrary/hybridDegree';
import {
  writtenBarKeys,
  writtenBars,
} from '@/curriculum/songLibrary/performance';
import type { Song } from '@/curriculum/types/songLibrary';
import { semitonesToTonic, transposeSong } from '../transpose';

/**
 * Transposition must leave the music's meaning alone: same degrees, same
 * structure, every chord moved by exactly the interval asked for, and every
 * rule songDegrees.test.ts enforces on the published charts still true of the
 * transposed ones.
 */

const SAMPLE: { song: Song; why: string }[] = [
  { song: they_long_to_be_close_to_you, why: 'G major, key change to A♭' },
  { song: jump_jive_an_wail, why: 'B♭ blues, key change to B' },
  { song: respect, why: 'C mixolydian' },
  { song: kashmir, why: 'dual-key label' },
  { song: africa, why: 'B major with a chorus elsewhere' },
];

const OFFSETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const hitsOf = (song: Song) =>
  song.sections.flatMap((section) => section.bars.flatMap((bar) => bar.chords));

/** The degree rules songDegrees.test.ts applies, per local key. */
function degreeMismatches(song: Song): string[] {
  const out: string[] = [];
  const tonic = songTonic(song.key, []);
  if (!tonic || spelledPitchClass(tonic) !== mod12(song.keyRoot))
    out.push(`key '${song.key}' does not match keyRoot ${song.keyRoot}`);

  const keys = writtenBarKeys(song);
  const byKey = new Map<
    string,
    (typeof song.sections)[number]['bars'][number]['chords']
  >();
  writtenBars(song).forEach(({ bar }, i) => {
    const at = byKey.get(keys[i].key) ?? [];
    at.push(...bar.chords);
    byKey.set(keys[i].key, at);
  });

  for (const [key, hits] of byKey) {
    const localTonic = songTonic(
      key,
      hits.map((hit) => hit.chordName),
    );
    if (!localTonic) {
      out.push(`unparseable key '${key}'`);
      continue;
    }
    for (const hit of hits) {
      if (isNoChord(hit.chordName)) continue;
      const expected = expectedDegreeNumbers(hit.chordName, localTonic);
      const stored = splitDegreeLabel(hit.degree);
      if (
        !expected ||
        !stored ||
        expected.root !== stored.root ||
        expected.bass !== stored.bass
      )
        out.push(`${key}: ${hit.chordName} [${hit.degree}]`);
    }
  }
  return out;
}

describe('transposeSong', () => {
  it('returns the song itself at no transposition', () => {
    expect(transposeSong(they_long_to_be_close_to_you, 0)).toBe(
      they_long_to_be_close_to_you,
    );
  });

  it('returns the same object for the same request, so chord identity holds', () => {
    // ChordChart maps a bar's key by ChordHit identity; a fresh copy per
    // render would drop every chord back to the home key.
    expect(transposeSong(respect, 5)).toBe(transposeSong(respect, 5));
    expect(transposeSong(respect, 17)).toBe(transposeSong(respect, 5));
  });

  it('never mutates the published chart', () => {
    const before = JSON.stringify(africa);
    OFFSETS.forEach((n) => transposeSong(africa, n));
    expect(JSON.stringify(africa)).toBe(before);
  });

  for (const { song, why } of SAMPLE) {
    describe(`${song.title} (${why})`, () => {
      it('keeps every degree and the whole structure', () => {
        for (const n of OFFSETS) {
          const moved = transposeSong(song, n);
          expect(moved.sections.map((s) => s.label)).toEqual(
            song.sections.map((s) => s.label),
          );
          expect(moved.sections.map((s) => s.bars.length)).toEqual(
            song.sections.map((s) => s.bars.length),
          );
          // A chord's quality is never touched. Its number only moves when
          // the chord had to be respelled (♭5 → ♯4), which the degree-rule
          // test below holds to the new spelling.
          expect(
            hitsOf(moved).map((h) => splitDegreeLabel(h.degree)?.quality),
          ).toEqual(
            hitsOf(song).map((h) => splitDegreeLabel(h.degree)?.quality),
          );
          expect(hitsOf(moved).map((h) => `${h.beat}:${h.duration}`)).toEqual(
            hitsOf(song).map((h) => `${h.beat}:${h.duration}`),
          );
          expect(moved.mode).toBe(song.mode);
          expect(moved.tempo).toBe(song.tempo);
          // Roadmap marks travel untouched, apart from the key they name.
          expect(
            moved.sections.flatMap((s) =>
              s.bars.map(
                (b) =>
                  `${b.repeatStart ?? ''}${b.ending ?? ''}${b.jump ?? ''}${b.cue ?? ''}`,
              ),
            ),
          ).toEqual(
            song.sections.flatMap((s) =>
              s.bars.map(
                (b) =>
                  `${b.repeatStart ?? ''}${b.ending ?? ''}${b.jump ?? ''}${b.cue ?? ''}`,
              ),
            ),
          );
        }
      });

      it('moves every chord by exactly the interval', () => {
        for (const n of OFFSETS) {
          const moved = transposeSong(song, n);
          const before = hitsOf(song);
          const after = hitsOf(moved);
          after.forEach((hit, i) => {
            if (isNoChord(hit.chordName)) {
              expect(hit.chordName).toBe(before[i].chordName);
              return;
            }
            const from = chordRootAndBass(before[i].chordName);
            const to = chordRootAndBass(hit.chordName);
            expect(to, `${hit.chordName} unreadable`).not.toBeNull();
            if (!from || !to) return;
            expect(spelledPitchClass(to.root)).toBe(
              mod12(spelledPitchClass(from.root) + n),
            );
            expect(to.bass ? spelledPitchClass(to.bass) : null).toBe(
              from.bass ? mod12(spelledPitchClass(from.bass) + n) : null,
            );
          });
          expect(mod12(moved.keyRoot)).toBe(mod12(song.keyRoot + n));
        }
      });

      it('still obeys the chart degree rules in every key', () => {
        for (const n of OFFSETS)
          expect(degreeMismatches(transposeSong(song, n))).toEqual([]);
      });

      it('writes no double accidentals', () => {
        for (const n of OFFSETS) {
          const moved = transposeSong(song, n);
          const written = [
            moved.key,
            ...moved.sections.flatMap((s) =>
              s.bars.flatMap((b) => [
                b.keyChange ?? '',
                ...b.chords.map((c) => c.chordName),
              ]),
            ),
          ].join(' ');
          expect(written).not.toMatch(/♯♯|♭♭|𝄪|𝄫/);
        }
      });

      it('stays readable to both chord parsers', () => {
        for (const n of OFFSETS) {
          const moved = transposeSong(song, n);
          for (const hit of hitsOf(moved)) {
            if (isNoChord(hit.chordName)) continue;
            expect(
              chordNameToMidi(hit.chordName).length,
              `${hit.chordName} has no notes`,
            ).toBeGreaterThan(0);
          }
          // The Studio export has its own note table; a root it can't read
          // silently became a C major triad.
          const { regions } = exportSongToChordRegions(moved, {
            voicingMode: 'auto',
            bassLine: false,
          });
          regions.forEach((region) => {
            const root = chordRootAndBass(region.noteName ?? '');
            if (!root || !region.midis?.length) return;
            expect(mod12(region.midis[0])).toBe(spelledPitchClass(root.root));
          });
        }
      });

      it('moves the key changes with the song', () => {
        const changes = (s: Song) =>
          s.sections.flatMap((section) =>
            section.bars.flatMap((bar) =>
              bar.keyChange ? [bar.keyChange] : [],
            ),
          );
        for (const n of OFFSETS) {
          const moved = transposeSong(song, n);
          expect(changes(moved)).toHaveLength(changes(song).length);
          changes(moved).forEach((label, i) => {
            const from = songTonic(changes(song)[i], []);
            const to = songTonic(label, []);
            if (from && to)
              expect(spelledPitchClass(to)).toBe(
                mod12(spelledPitchClass(from) + n),
              );
          });
        }
      });

      it('round-trips back to the published key', () => {
        for (const n of OFFSETS) {
          const back = transposeSong(transposeSong(song, n), 12 - n);
          expect(back.key).toBe(song.key);
          // Pitch, not spelling: a chromatic chord that had to be respelled
          // on the way out (E in A♭ would be F♯♯ in B, so it is written G)
          // can come home as F♭ rather than E. Same sound, and the degree
          // that comes back with it still matches the symbol.
          hitsOf(back).forEach((hit, i) => {
            const from = chordRootAndBass(hitsOf(song)[i].chordName);
            const to = chordRootAndBass(hit.chordName);
            if (!from || !to) return;
            expect(spelledPitchClass(to.root)).toBe(
              spelledPitchClass(from.root),
            );
          });
          expect(degreeMismatches(back)).toEqual([]);
        }
      });
    });
  }
});

describe('respelled chords', () => {
  it("moves a chord's degree with its spelling: D major's ♭5 is E♭'s ♯4", () => {
    // Ain't No Mountain High Enough is in D; A♭ is its ♭5. Up a half step the
    // chart is in E♭, where the same chord is written A — the ♯4.
    const moved = transposeSong(aint_no_mountain_high_enough, 1);
    const before = hitsOf(aint_no_mountain_high_enough).findIndex(
      (h) => h.chordName === 'A♭',
    );
    expect(before).toBeGreaterThanOrEqual(0);
    expect(hitsOf(aint_no_mountain_high_enough)[before].degree).toBe('♭5 maj');
    expect(hitsOf(moved)[before].chordName).toBe('A');
    expect(hitsOf(moved)[before].degree).toBe('♯4 maj');
  });
});

describe('semitonesToTonic', () => {
  it('answers 0 for the key the song is already in', () => {
    expect(
      semitonesToTonic(
        they_long_to_be_close_to_you,
        mod12(they_long_to_be_close_to_you.keyRoot),
      ),
    ).toBe(0);
  });

  it('lands the song on the tonic asked for', () => {
    for (let pc = 0; pc < 12; pc++) {
      const moved = transposeSong(respect, semitonesToTonic(respect, pc));
      expect(mod12(moved.keyRoot)).toBe(pc);
    }
  });
});
