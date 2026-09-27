import { writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  extraBarRows,
  reviewMarkdown,
  type ExtraBarClass,
} from '@/scripts/extraBarCandidates';

/**
 * The runner for the extra-bar review.
 *
 * `getSong()` is empty outside the app — songs load from the CDN bundle at
 * runtime — so the only way to get at the corpus is a glob under vitest. The
 * loaders are lazy on purpose: this file is collected by every `vitest run` and
 * costs nothing until asked.
 *
 *   CHART_EXTRA_BAR_OUT=docs/chart-extra-bar-review.md \
 *     npx vitest run src/scripts/__tests__/extraBarCandidates.run.test.ts
 *
 * With the variable unset it skips, because globbing 640 files to write a file
 * nobody asked for is not what a test run is for.
 */

const OUT = process.env.CHART_EXTRA_BAR_OUT;

const loaders = import.meta.glob<Record<string, unknown>>(
  '../../curriculum/data/songs/*.ts',
);

const isSong = (value: unknown): value is Song =>
  typeof value === 'object' &&
  value !== null &&
  'sections' in value &&
  'keyRoot' in value;

async function loadCorpus(): Promise<Song[]> {
  const songs: Song[] = [];
  for (const [path, load] of Object.entries(loaders)) {
    if (/\/(index|bundled|_generated_index)\.ts$/.test(path)) continue;
    for (const value of Object.values(await load()))
      if (isSong(value)) songs.push(value);
  }
  return songs;
}

describe.runIf(OUT)('extra-bar review over the corpus', () => {
  it('gives every 4k+1 section exactly one class, and writes the sheet', async () => {
    const songs = await loadCorpus();
    expect(songs.length).toBeGreaterThan(600);

    const rows = extraBarRows(songs);
    const known = new Set<ExtraBarClass>([
      'duplicate of the bar before it',
      'duplicate of the bar after it',
      'empty',
      'distinct',
      'no extra bar to find',
    ]);
    expect(rows.filter((row) => !known.has(row.cls))).toEqual([]);
    // A candidate always names a bar to drop; a non-candidate never does.
    expect(rows.filter((row) => row.tier <= 5 && row.bar === 0)).toEqual([]);
    expect(rows.filter((row) => row.tier > 5 && row.bar !== 0)).toEqual([]);

    // `docs/` is not prettier-ignored, so a sheet written raw would fail the
    // next `yarn lint`. Padding the tables here keeps regeneration one command.
    const markdown = reviewMarkdown(songs);
    const options = await resolveConfig(OUT!);
    writeFileSync(
      OUT!,
      await format(markdown, { ...options, parser: 'markdown' }),
    );
  }, 120_000);
});
