import { writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { captureVocabularyGolden, goldenDigests, goldenJson } from './golden';

/**
 * The vocabulary modules read JSON now, and nothing they decide changed: the
 * golden (`golden.ts`) captured from the code modules before the move, one
 * sha256 per section, is what they give today.
 *
 * To see a difference, set VOCAB_GOLDEN_OUT to a file path: the whole golden
 * is written there as JSON, to diff against a capture from before the change.
 * A content change (an artist's genres, an event's tags) moves only the
 * sections that read content (`golden.ts` names them); once the diff shows
 * nothing else, take the new digests from the failure. Once the console
 * edits the vocabulary (plan phase P5), every edit changes them, and this
 * test and `golden.ts` go.
 */

// `eventConnections.ts` reads the content store for its arc drawing; the arcs
// themselves are a plain list (as in repoSnapshot.test.ts).
vi.mock('@/content/contentStore', () => ({
  contentGeneration: 0,
  MUSIC_HISTORY: [],
}));

/**
 * Captured 30 Sep 2026 from genres.ts, genreTags.ts, instrumentGenres.ts and
 * curriculum/data/instruments.ts while they were still code.
 *
 * `tables` was taken again the same day for a Table registry change, not a
 * vocabulary one: the Instruments table's Artists column split its one part
 * into what the artist states (`stated`) and what they played on records or
 * in a group (`played`), so cell edits can tell the chips they may remove
 * (Amendment 6). Captures before and after differ only in those part ids and
 * labels; every chip and count is the same.
 *
 * `graph`, `tables` and `placeAndGenreNames` were taken again after the bulk
 * import of 30 September 2026, a content change: it gave artists their
 * genres and instruments, credited 561 songs, and made 349 places the
 * console's event matcher now knows by name. Only those three sections,
 * which read the repo's content, moved; `exports`, `pickers`,
 * `vocabularyPage` and the three lookups are as captured.
 *
 * `graph` and `tables` were taken again after that import's review, a
 * content change: six studios re-slugged by place or years, two film
 * producers and four late albums taken off songs, and years active
 * corrected on fifteen artists. No other section moved.
 *
 * `tables` was taken again on 1 October 2026 for a label change, not a
 * vocabulary one: people named in imported song credits who have no artist
 * record now show the name the credit prints ("Bobby Emmons", "Earl “Wya”
 * Lindo") instead of their slug, which also re-sorts those chips. No
 * other section changed.
 */
const GOLDEN: Record<string, string> = {
  exports: 'f7774d8035e3707578cc26cd4e6dda7825291bdc22928860d9ae08908b4dc75b',
  // 7 Oct 2026: instrument content (grooves, parts) joined the repo graph —
  // 98 edges onto genre and instrument nodes, nothing else moved.
  graph: 'bc37904f446dc740c6df43e1bb9c1bb392cc5fd404af3c814c7d15e3c73cfb2d',
  mapGenre: '8bd762b39a6fba226af4828d3bcd81f8e2b44198abf4a2c2e24c3d5b4af7921a',
  mapInstrument:
    'f694219a31ced971e2bb90549148765b874ac5f533ab3ae11a303696eafa22d0',
  pickers: 'dad698660b582175e90534ed62c0af974a4b686fd102a7ce98acd16c71d2aaed',
  placeAndGenreNames:
    'a11c56170e14a67b14d3e901a17dd3875d4f1bc1887c24b6541903e80761a41d',
  resolveGenreTag:
    '761075b0a6f5a5bdf91295a92f493232f88daf69d6f9d282dfdde9ca93fa66f7',
  // 7 Oct 2026: the same 13 genre and instrument rows now list those edges.
  tables: '3e89ace316b48504f012390fdd2b735012090f834821d6ad90f96c96473df0c6',
  vocabularyPage:
    '8c3210c3ab7a49f6ed4bd98ca606443f27260841f432852e72235b8819b26b2e',
};

describe('the vocabulary golden', () => {
  it('is what the code modules gave before the move', async () => {
    const golden = await captureVocabularyGolden();
    const out = process.env.VOCAB_GOLDEN_OUT;
    if (out) writeFileSync(out, `${goldenJson(golden, 1)}\n`);
    expect(goldenDigests(golden)).toEqual(GOLDEN);
  }, 60_000);
});
