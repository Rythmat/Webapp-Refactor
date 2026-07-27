// Serum 2 → Oracle converter CLI.
//
//   node tools/serum-convert/src/cli.ts scan    --library "<Xfer Records dir>"
//   node tools/serum-convert/src/cli.ts convert --library "…" <preset files…>
//   node tools/serum-convert/src/cli.ts pack    --library "<Xfer Records dir>"
//
// `scan` converts the whole curation pool and writes reports/candidates.md.
// `pack` reads pack-list.json and emits the runtime pack assets into
// public/daw-assets/oracle-packs/serum2/. Xfer source paths are only ever
// passed via --library — nothing under the library dir is committed.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCalibrate } from './calibrate.ts';
import { convertPreset } from './convert.ts';
import { queryCandidates, type CandidateRow } from './db.ts';
import { formatReport, type FidelityReport } from './fidelity.ts';
import { parseSerumMetaOnly } from './serumPreset.ts';
import {
  parseWavetableFile,
  downsampleFrames,
  writePackWav,
  resolveTablePath,
} from './wavetable.ts';

const TOOL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(TOOL_ROOT, '..', '..');
const PACK_DIR = join(
  REPO_ROOT,
  'public',
  'daw-assets',
  'oracle-packs',
  'serum2',
);
const REPORTS_DIR = join(TOOL_ROOT, 'reports');

function arg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

function requireLibrary(): string {
  const lib = arg('--library');
  if (!lib || !existsSync(join(lib, 'Serum 2 Presets'))) {
    console.error(
      'Pass --library "<path to Xfer Records folder>" (must contain "Serum 2 Presets")',
    );
    process.exit(1);
  }
  return lib;
}

function dbPath(library: string): string {
  return join(library, 'Serum 2 Presets', 'System', 'presets.db');
}

function safeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── scan ─────────────────────────────────────────────────────────────────

function cmdScan(): void {
  const library = requireLibrary();
  const candidates = queryCandidates(dbPath(library));
  console.log(`curation pool: ${candidates.length} presets`);

  const reports: (FidelityReport & { file: string })[] = [];
  let failed = 0;
  for (const c of candidates) {
    if (!existsSync(c.file)) {
      console.warn(`missing file: ${c.file}`);
      failed++;
      continue;
    }
    try {
      const { report } = convertPreset(c.file, c.category);
      reports.push({ ...report, file: c.file });
    } catch (err) {
      console.warn(`FAILED ${c.name}: ${(err as Error).message}`);
      failed++;
    }
  }

  mkdirSync(REPORTS_DIR, { recursive: true });
  const byCategory = new Map<string, typeof reports>();
  for (const r of reports) {
    const cat = r.category || 'Other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(r);
  }

  const lines: string[] = [
    '# Serum 2 → Oracle conversion candidates',
    '',
    `${reports.length} converted, ${failed} failed. Ranked by fidelity score`,
    '(100 = near-faithful). Mark picks in pack-list.json, then run `pack`.',
    '',
  ];
  for (const [cat, list] of [...byCategory.entries()].sort()) {
    list.sort((a, b) => b.score - a.score);
    lines.push(`## ${cat} (${list.length})`, '');
    for (const r of list) {
      const drops = r.dropped.length
        ? ` — dropped: ${r.dropped.slice(0, 3).join('; ')}${r.dropped.length > 3 ? '…' : ''}`
        : '';
      lines.push(`- **${r.score}** ${r.preset}${drops}`);
    }
    lines.push('');
  }
  writeFileSync(join(REPORTS_DIR, 'candidates.md'), lines.join('\n'));
  writeFileSync(
    join(REPORTS_DIR, 'scan.json'),
    JSON.stringify(reports, null, 1),
  );
  console.log(`wrote ${join(REPORTS_DIR, 'candidates.md')}`);
}

// ── convert (individual files, for debugging) ────────────────────────────

function cmdConvert(): void {
  requireLibrary();
  const files = process.argv.slice(3).filter((a) => a.endsWith('.SerumPreset'));
  for (const f of files) {
    const { preset, report } = convertPreset(f);
    console.log(JSON.stringify(preset, null, 1));
    console.error(formatReport(report));
  }
}

// ── pack ─────────────────────────────────────────────────────────────────

interface PackList {
  presets: string[]; // preset names as in the DB
}

function cmdPack(): void {
  const library = requireLibrary();
  const packListPath = join(TOOL_ROOT, 'pack-list.json');
  if (!existsSync(packListPath)) {
    console.error(`missing ${packListPath} — run scan and mark picks first`);
    process.exit(1);
  }
  const packList = JSON.parse(readFileSync(packListPath, 'utf8')) as PackList;
  const candidates = queryCandidates(dbPath(library));
  const norm = (s: string) => s.trim().toLowerCase();
  const byName = new Map(candidates.map((c) => [norm(c.name), c]));

  // The scan/shortlists use the preset's INTERNAL metadata name, which can
  // differ from the DB/file name (e.g. a trailing space, or a variant
  // number). Lazily index by metadata name so pack-list entries resolve.
  let byMetaName: Map<string, CandidateRow> | null = null;
  const resolveCandidate = (name: string): CandidateRow | undefined => {
    const direct = byName.get(norm(name));
    if (direct) return direct;
    if (!byMetaName) {
      byMetaName = new Map();
      for (const c of candidates) {
        if (!existsSync(c.file)) continue;
        try {
          byMetaName.set(norm(parseSerumMetaOnly(c.file).presetName), c);
        } catch {
          /* skip unreadable */
        }
      }
    }
    return byMetaName.get(norm(name));
  };

  mkdirSync(join(PACK_DIR, 'presets'), { recursive: true });
  mkdirSync(join(PACK_DIR, 'wavetables'), { recursive: true });

  const manifest = {
    packId: 'serum2',
    displayName: 'SERUM',
    version: 1,
    presets: [] as {
      name: string;
      file: string;
      category: string;
      wavetables: string[];
    }[],
    wavetables: [] as { name: string; file: string; frames: number }[],
  };
  const writtenTables = new Map<string, { file: string; frames: number }>();
  const reports: string[] = [];

  for (const name of packList.presets) {
    const cand = resolveCandidate(name);
    if (!cand || !existsSync(cand.file)) {
      console.warn(`pack-list entry not found: ${name}`);
      continue;
    }
    const { preset, report, wavetables } = convertPreset(
      cand.file,
      cand.category,
    );

    // Extract + downsample this preset's tables (embedded or file-referenced)
    for (const wt of wavetables) {
      if (writtenTables.has(wt.name)) continue;
      let frames: Float32Array[];
      if (wt.embeddedFrames) {
        frames = wt.embeddedFrames.map((f) => Float32Array.from(f));
      } else if (wt.sourcePath) {
        const src = resolveTablePath(wt.sourcePath, library);
        if (!src) {
          console.warn(`  table not found: ${wt.sourcePath} (${name})`);
          continue;
        }
        frames = parseWavetableFile(src).frames;
      } else {
        continue;
      }
      const packed = downsampleFrames(frames);
      const fileName = `${safeFileName(wt.name.replace(/^S2\//, ''))}.wav`;
      writePackWav(join(PACK_DIR, 'wavetables', fileName), packed);
      writtenTables.set(wt.name, { file: fileName, frames: packed.length });
    }

    const presetFile = `${safeFileName(preset.name)}.json`;
    writeFileSync(
      join(PACK_DIR, 'presets', presetFile),
      JSON.stringify(preset, null, 1),
    );
    manifest.presets.push({
      name: preset.name,
      file: presetFile,
      category: cand.category || 'Other',
      wavetables: wavetables
        .map((w) => w.name)
        .filter((n) => writtenTables.has(n)),
    });
    reports.push(formatReport(report));
  }

  manifest.wavetables = [...writtenTables.entries()].map(([name, t]) => ({
    name,
    file: t.file,
    frames: t.frames,
  }));
  writeFileSync(
    join(PACK_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 1),
  );
  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(
    join(REPORTS_DIR, 'pack-fidelity.md'),
    reports.join('\n\n---\n\n'),
  );
  console.log(
    `pack: ${manifest.presets.length} presets, ${manifest.wavetables.length} wavetables → ${PACK_DIR}`,
  );
}

// ── main ─────────────────────────────────────────────────────────────────

const cmd = process.argv[2];
if (cmd === 'scan') cmdScan();
else if (cmd === 'convert') cmdConvert();
else if (cmd === 'pack') cmdPack();
else if (cmd === 'calibrate') {
  const refdir = arg('--refdir');
  if (!refdir) {
    console.error('usage: cli.ts calibrate --refdir "<reference presets dir>"');
    process.exit(1);
  }
  runCalibrate(refdir);
} else {
  console.error(
    'usage: cli.ts <scan|convert|pack> --library "<dir>" | calibrate --refdir "<dir>"',
  );
  process.exit(1);
}
