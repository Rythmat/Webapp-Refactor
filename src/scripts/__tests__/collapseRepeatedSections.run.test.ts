import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Song } from '@/curriculum/types/songLibrary';
import {
  applyPlan,
  barKey,
  gate,
  performanceSignature,
  planCollapses,
  rewriteSource,
  type CollapsePlan,
} from '@/scripts/collapseRepeatedSections';

/**
 * The runner for the collapse script.
 *
 * `getSong()` is empty outside the app, so the only way to get at the corpus is
 * a glob under vitest. The loaders are lazy on purpose: this file is collected
 * by every `vitest run` and must cost nothing until asked.
 *
 *   COLLAPSE_MODE=report  — plan and gate every song, write the report data
 *   COLLAPSE_MODE=apply   — plan, gate, then rewrite the song files
 *   COLLAPSE_MODE=verify  — re-read the corpus and prove the performances held
 *
 * `apply` writes `COLLAPSE_SIGS` (default /tmp/collapse-signatures.json) as it
 * goes: the performance signature of every song as it was BEFORE the edit.
 * `verify` runs in a fresh process, so its glob sees the rewritten files, and
 * compares against that record. That is the end-to-end proof — the in-process
 * gate only ever sees objects it built itself.
 */

const MODE = process.env.COLLAPSE_MODE ?? '';
const OUT = process.env.COLLAPSE_OUT ?? '/tmp/collapse-report.json';
const SIGS = process.env.COLLAPSE_SIGS ?? '/tmp/collapse-signatures.json';

const loaders = import.meta.glob<Record<string, unknown>>(
  '../../curriculum/data/songs/*.ts',
);

const isSong = (value: unknown): value is Song =>
  typeof value === 'object' &&
  value !== null &&
  'sections' in value &&
  'keyRoot' in value;

interface Loaded {
  song: Song;
  path: string;
}

async function loadCorpus(): Promise<Loaded[]> {
  const out: Loaded[] = [];
  for (const [key, load] of Object.entries(loaders)) {
    if (/\/(index|bundled|_generated_index)\.ts$/.test(key)) continue;
    const mod = await load();
    const path = fileURLToPath(new URL(key, import.meta.url));
    for (const value of Object.values(mod))
      if (isSong(value)) out.push({ song: value, path });
  }
  return out.sort((a, b) => a.song.id.localeCompare(b.song.id));
}

const barCount = (song: Song) =>
  song.sections.reduce((n, s) => n + s.bars.length, 0);

/** Bars in sections whose bars repeat an earlier section of the same song,
 *  adjacent or not. This is the corpus-wide figure the work plan quotes. */
function duplicateBars(song: Song): { total: number; adjacent: number } {
  const seen = new Set<string>();
  let total = 0;
  let adjacent = 0;
  song.sections.forEach((section, idx) => {
    const key = section.bars.map(barKey).join('|');
    if (section.bars.length === 0) return;
    if (seen.has(key)) {
      total += section.bars.length;
      const prev = song.sections[idx - 1];
      if (prev && prev.bars.map(barKey).join('|') === key)
        adjacent += section.bars.length;
    }
    seen.add(key);
  });
  return { total, adjacent };
}

interface Outcome {
  songId: string;
  path: string;
  bars: number;
  plan: CollapsePlan;
  /** Null when the gate passed. */
  gateFailure: string | null;
  /** Null when nothing was in the way. */
  writeFailure: string | null;
  duplicate: { total: number; adjacent: number };
}

/** Plan and gate one song. Nothing here touches the disk. */
function assess({ song, path }: Loaded): Outcome {
  const plan = planCollapses(song);
  const result = plan.runs.length
    ? gate(song, applyPlan(song, plan))
    : { ok: true };
  return {
    songId: song.id,
    path,
    bars: barCount(song),
    plan,
    gateFailure: result.ok ? null : (result.reason ?? 'unknown'),
    writeFailure: null,
    duplicate: duplicateBars(song),
  };
}

function summarise(outcomes: Outcome[]): string {
  const collapsible = outcomes.filter((o) => o.plan.runs.length > 0);
  const passed = collapsible.filter((o) => !o.gateFailure && !o.writeFailure);
  const lines = [
    `songs: ${outcomes.length}, bars: ${outcomes.reduce((n, o) => n + o.bars, 0)}`,
    `duplicate bars: ${outcomes.reduce((n, o) => n + o.duplicate.total, 0)} total, ${outcomes.reduce((n, o) => n + o.duplicate.adjacent, 0)} of them adjacent`,
    `songs with an adjacent run: ${collapsible.length + outcomes.filter((o) => o.plan.skipped.length).length}`,
    `collapsible: ${collapsible.length} songs, ${collapsible.reduce((n, o) => n + o.plan.barsRemoved, 0)} bars`,
    `gate rejected: ${collapsible.filter((o) => o.gateFailure).length}`,
    `write refused: ${collapsible.filter((o) => o.writeFailure).length}`,
    `applied: ${passed.length} songs, ${passed.reduce((n, o) => n + o.plan.barsRemoved, 0)} bars`,
  ];
  return lines.join('\n');
}

describe.runIf(MODE)(`collapse runner (${MODE})`, () => {
  it.runIf(MODE === 'report' || MODE === 'apply')(
    'plans, gates and reports',
    async () => {
      const corpus = await loadCorpus();
      expect(corpus.length).toBeGreaterThan(600);

      const outcomes = corpus.map(assess);
      const signatures: Record<string, string> = {};
      for (const { song } of corpus)
        signatures[song.id] = performanceSignature(song);

      if (MODE === 'apply') {
        writeFileSync(SIGS, JSON.stringify(signatures));
        const byId = new Map(corpus.map((c) => [c.song.id, c.song]));
        for (const outcome of outcomes) {
          if (!outcome.plan.runs.length || outcome.gateFailure) continue;
          try {
            writeFileSync(
              outcome.path,
              rewriteSource(
                readFileSync(outcome.path, 'utf8'),
                outcome.plan,
                byId.get(outcome.songId)!,
              ),
            );
          } catch (error) {
            outcome.writeFailure =
              error instanceof Error ? error.message : String(error);
          }
        }
      }

      writeFileSync(OUT, JSON.stringify(outcomes, null, 2));
      // eslint-disable-next-line no-console
      console.log(summarise(outcomes));
    },
    120_000,
  );

  it.runIf(MODE === 'verify')(
    'plays every rewritten chart exactly as it played before',
    async () => {
      const before: Record<string, string> = JSON.parse(
        readFileSync(SIGS, 'utf8'),
      );
      const corpus = await loadCorpus();
      expect(Object.keys(before)).toHaveLength(corpus.length);

      const changed: string[] = [];
      for (const { song } of corpus) {
        const want = before[song.id];
        if (want === undefined) {
          changed.push(`${song.id}: not in the record`);
          continue;
        }
        const got = performanceSignature(song);
        if (got === want) continue;
        const a = want.split('\n');
        const b = got.split('\n');
        const at = a.findIndex((line, i) => line !== b[i]);
        changed.push(
          `${song.id}: ${a.length} bars → ${b.length}, first diff at ${at + 1}`,
        );
      }
      expect(changed).toEqual([]);

      // Running the script again must find nothing left to do.
      const again = corpus.flatMap(({ song }) =>
        planCollapses(song).runs.map(
          (r) => `${song.id}: ${r.labels.join(' + ')} ×${r.times}`,
        ),
      );
      expect(again).toEqual([]);
    },
    120_000,
  );
});
