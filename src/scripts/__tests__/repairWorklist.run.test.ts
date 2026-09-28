import { readFileSync, writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import { repairRow, worklistMarkdown } from '@/scripts/repairWorklist';

/**
 * The runner for the repair worklist.
 *
 *   CHART_WORKLIST_OUT=docs/chart-repair-worklist.md \
 *     [CHART_PDF_FACTS=/tmp/pdfFacts.json] \
 *     npx vitest run src/scripts/__tests__/repairWorklist.run.test.ts
 *
 * `getSong()` is empty outside the app, so the corpus has to be globbed.
 * Skips with the variable unset, because every `vitest run` collects this
 * file and none of them asked for a document.
 */

const OUT = process.env.CHART_WORKLIST_OUT;
const FACTS = process.env.CHART_PDF_FACTS;

const loaders = import.meta.glob<Record<string, unknown>>(
  '../../curriculum/data/songs/*.ts',
);

const isSong = (v: unknown): v is Song =>
  !!v && typeof v === 'object' && 'sections' in v && 'keyRoot' in v;

/** The prop book names its files by title; the library names them by id. */
const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/** Title → the bar count the prop book prints, when the extractor was run. */
function pageBarsByTitle(): Map<string, number> {
  const out = new Map<string, number>();
  if (!FACTS) return out;
  try {
    for (const fact of JSON.parse(readFileSync(FACTS, 'utf8')) as Array<{
      file?: string;
      bars?: { estimate?: number };
    }>)
      if (fact.file && fact.bars?.estimate)
        out.set(slug(fact.file), fact.bars.estimate);
  } catch {
    // No facts file is fine: the missing-bars column simply goes unfilled.
  }
  return out;
}

describe('repair worklist', () => {
  it.skipIf(!OUT)('writes the worklist', async () => {
    const pages = pageBarsByTitle();
    const rows = [];
    for (const load of Object.values(loaders))
      for (const exported of Object.values(await load()))
        if (isSong(exported))
          rows.push(repairRow(exported, pages.get(slug(exported.title))));

    expect(rows.length).toBeGreaterThan(600);

    const markdown = worklistMarkdown(rows);
    const config = await resolveConfig(OUT!);
    writeFileSync(
      OUT!,
      await format(markdown, { ...config, parser: 'markdown' }),
    );
  });
});
