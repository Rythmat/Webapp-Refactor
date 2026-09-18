import { describe, expect, it } from 'vitest';
import {
  expectedDegreeNumbers,
  isNoChord,
  songTonic,
  spelledPitchClass,
  splitDegreeLabel,
} from '@/curriculum/songLibrary/hybridDegree';
import type { Song } from '@/curriculum/types/songLibrary';

/**
 * Every song chord's hybrid degree label must match its letter symbol and the
 * song's key: degrees count from the MAJOR scale of the tonic in every mode
 * (A minor: G → '♭7 maj', E7 → '5 7'), accidentals follow the root's letter.
 *
 * Globs the song files directly (not bundled.ts) so charts that are not in the
 * bundle yet are checked too.
 */

const modules = import.meta.glob<Record<string, unknown>>('../*.ts', {
  eager: true,
});

const songs: Song[] = Object.entries(modules)
  .filter(([path]) => !/\/(index|bundled)\.ts$/.test(path))
  .flatMap(([, mod]) =>
    Object.values(mod).filter(
      (value): value is Song =>
        typeof value === 'object' &&
        value !== null &&
        'sections' in value &&
        'keyRoot' in value,
    ),
  );

/**
 * Chord symbols left as-is because the chart itself is garbled and the intended
 * chord can't be recovered from the surrounding sections. Keyed `songId|chordName`.
 */
const ALLOWED_GARBLED = new Set([
  // Bar reads C♯min7 · B7 · ? · B — could be A, G♯min7, or both split.
  'cigarettes_and_chocolate_milk|AG♯min7',
  // Parallel sections have C♯min7 here, but F♯/C♯ and F♯min7 are also plausible.
  'look_what_i_found|F♯C♯min7',
]);

const hitsOf = (song: Song) =>
  song.sections.flatMap((section) => section.bars.flatMap((bar) => bar.chords));

describe('song library degree labels', () => {
  it('loads the song files', () => {
    expect(songs.length).toBeGreaterThan(600);
  });

  it("declares a key whose tonic matches keyRoot's pitch class", () => {
    const mismatched = songs.filter((song) => {
      const tonic = songTonic(song.key, []);
      if (!tonic) return true;
      return spelledPitchClass(tonic) !== ((song.keyRoot % 12) + 12) % 12;
    });
    expect(mismatched.map((song) => `${song.id}: ${song.key}`)).toEqual([]);
  });

  it('numbers every chord from the major scale of the tonic', () => {
    const mismatches: string[] = [];
    for (const song of songs) {
      const hits = hitsOf(song);
      const tonic = songTonic(
        song.key,
        hits.map((hit) => hit.chordName),
      );
      if (!tonic) {
        mismatches.push(`${song.id}: unparseable key '${song.key}'`);
        continue;
      }
      for (const hit of hits) {
        if (isNoChord(hit.chordName)) continue;
        if (ALLOWED_GARBLED.has(`${song.id}|${hit.chordName}`)) continue;
        const expected = expectedDegreeNumbers(hit.chordName, tonic);
        const stored = splitDegreeLabel(hit.degree);
        if (
          !expected ||
          !stored ||
          expected.root !== stored.root ||
          expected.bass !== stored.bass
        ) {
          const want = expected
            ? `${expected.root}${expected.bass ? `/${expected.bass}` : ''}`
            : '?';
          mismatches.push(
            `${song.id} (${song.key}): ${hit.chordName} [${hit.degree}] expected ${want}`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('keeps N.C. hits labelled n.c.', () => {
    const bad = songs.flatMap((song) =>
      hitsOf(song)
        .filter((hit) => isNoChord(hit.chordName) && hit.degree !== 'n.c.')
        .map((hit) => `${song.id}: ${hit.degree}`),
    );
    expect(bad).toEqual([]);
  });
});
