// Reverb impulse-response converter CLI.
//
//   node tools/ir-convert/src/cli.ts scan --library "<IR source dir>"
//   node tools/ir-convert/src/cli.ts pack --library "<IR source dir>"
//
// `scan` lists the .SDIR/.wav/.aiff candidates under --library (grouped by
// folder) so you can pick sources for pack-list.json.
// `pack` reads pack-list.json and emits the runtime assets (one 16-bit WAV per
// entry + manifest.json) into public/daw-assets/reverb-irs/. Source paths are
// only ever passed via --library — nothing under the library dir is committed.
//
// Requires ffmpeg + ffprobe on PATH (brew install ffmpeg). `.SDIR` is AIFF
// underneath, so ffmpeg reads it directly.

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const TOOL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(TOOL_ROOT, '..', '..');
const PACK_DIR = join(REPO_ROOT, 'public', 'daw-assets', 'reverb-irs');
const REPORTS_DIR = join(TOOL_ROOT, 'reports');
const PACK_LIST = join(TOOL_ROOT, 'pack-list.json');

// Loudness-match target. The runtime `gain` for each IR is chosen so that
// `gain × rms × sqrt(duration)` ≈ ENERGY_TARGET — i.e. every type lands at the
// same wet-signal loudness regardless of its RMS/length. Calibrate this ONE
// constant by ear against the current synthetic reverb during verification
// (bump it up if the real IRs sound quieter than the old synthetic hall).
const ENERGY_TARGET = 0.1;
const GAIN_MIN = 0.05;
const GAIN_MAX = 8;

const IR_EXTS = ['.sdir', '.wav', '.aif', '.aiff', '.flac'];

interface PackEntry {
  type: string;
  id: string;
  name: string;
  /** Path to the source IR, relative to --library. */
  source: string;
  license: string;
  sourceName: string;
  attribution?: string;
}

interface ManifestEntry {
  id: string;
  type: string;
  name: string;
  file: string;
  decaySeconds: number;
  gain: number;
  license: string;
  sourceName: string;
  attribution: string;
}

function arg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

function requireLibrary(): string {
  const lib = arg('--library');
  if (!lib || !existsSync(lib)) {
    console.error(
      'Pass --library "<path to an IR source folder>" (an existing directory)',
    );
    process.exit(1);
  }
  return lib;
}

function run(cmd: string, args: string[]): { stdout: string; stderr: string } {
  const res = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (res.error) {
    console.error(`Failed to run ${cmd}: ${res.error.message}`);
    process.exit(1);
  }
  return { stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

/** Peak (dBFS) of a file, via ffmpeg volumedetect (reads stderr). */
function measureMaxVolume(file: string): number {
  const { stderr } = run('ffmpeg', [
    '-hide_banner',
    '-i',
    file,
    '-af',
    'volumedetect',
    '-f',
    'null',
    '-',
  ]);
  const m = stderr.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
  return m ? parseFloat(m[1]) : 0;
}

/** Mean RMS (dBFS) of a file, via ffmpeg volumedetect. */
function measureRmsDb(file: string): number {
  const { stderr } = run('ffmpeg', [
    '-hide_banner',
    '-i',
    file,
    '-af',
    'volumedetect',
    '-f',
    'null',
    '-',
  ]);
  const m = stderr.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
  return m ? parseFloat(m[1]) : -20;
}

function probeDuration(file: string): number {
  const { stdout } = run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=nw=1:nk=1',
    file,
  ]);
  const d = parseFloat(stdout.trim());
  return Number.isFinite(d) ? d : 0;
}

/**
 * Convert one source IR into a shipped 16-bit WAV:
 *   trim leading silence (app adds its own pre-delay) → trim trailing
 *   near-silence (caps convolver CPU) → peak-normalize to -1 dBFS → force
 *   stereo 44.1k → dithered 16-bit. Returns the runtime metadata.
 */
function convertOne(srcPath: string, entry: PackEntry): ManifestEntry {
  const outFile = `${entry.id}.wav`;
  const outPath = join(PACK_DIR, outFile);

  const inPeak = measureMaxVolume(srcPath);
  const peakGainDb = -1 - inPeak; // land the peak at -1 dBFS

  const filter = [
    'silenceremove=start_periods=1:start_threshold=-60dB:start_silence=0:detection=peak',
    'areverse',
    'silenceremove=start_periods=1:start_threshold=-60dB:start_silence=0:detection=peak',
    'areverse',
    `volume=${peakGainDb.toFixed(2)}dB`,
  ].join(',');

  run('ffmpeg', [
    '-hide_banner',
    '-y',
    '-i',
    srcPath,
    '-af',
    filter,
    '-ac',
    '2',
    '-ar',
    '44100',
    '-sample_fmt',
    's16',
    '-dither_method',
    'triangular',
    outPath,
  ]);

  const duration = probeDuration(outPath);
  const rmsDb = measureRmsDb(outPath);
  const rmsLin = Math.pow(10, rmsDb / 20);
  const denom = rmsLin * Math.sqrt(Math.max(0.001, duration));
  const gain = Math.min(
    GAIN_MAX,
    Math.max(GAIN_MIN, denom > 0 ? ENERGY_TARGET / denom : 1),
  );

  return {
    id: entry.id,
    type: entry.type,
    name: entry.name,
    file: outFile,
    decaySeconds: Math.round(duration * 100) / 100,
    gain: Math.round(gain * 1000) / 1000,
    license: entry.license,
    sourceName: entry.sourceName,
    attribution: entry.attribution ?? '',
  };
}

// ── scan ───────────────────────────────────────────────────────────────────

function walk(dir: string, base: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, base, out);
    } else if (
      IR_EXTS.includes(name.slice(name.lastIndexOf('.')).toLowerCase())
    ) {
      out.push(relative(base, full));
    }
  }
}

function cmdScan(): void {
  const library = requireLibrary();
  const files: string[] = [];
  walk(library, library, files);
  files.sort();
  console.log(`Found ${files.length} IR candidates under ${library}:\n`);
  for (const f of files) console.log(`  ${f}`);
}

// ── pack ───────────────────────────────────────────────────────────────────

function cmdPack(): void {
  const library = requireLibrary();
  if (!existsSync(PACK_LIST)) {
    console.error(`Missing curation file: ${PACK_LIST}`);
    process.exit(1);
  }
  const list = JSON.parse(readFileSync(PACK_LIST, 'utf8')) as {
    entries: PackEntry[];
  };
  mkdirSync(PACK_DIR, { recursive: true });
  mkdirSync(REPORTS_DIR, { recursive: true });

  const irs: ManifestEntry[] = [];
  const reportRows: string[] = [];
  for (const entry of list.entries) {
    const srcPath = join(library, entry.source);
    if (!existsSync(srcPath)) {
      console.warn(`  ⚠ skip ${entry.id}: source not found — ${entry.source}`);
      continue;
    }
    process.stdout.write(`  ${entry.id} (${entry.type}) … `);
    const meta = convertOne(srcPath, entry);
    irs.push(meta);
    console.log(
      `${meta.decaySeconds}s  gain=${meta.gain}  ${(
        statSync(join(PACK_DIR, meta.file)).size / 1024
      ).toFixed(0)}KB`,
    );
    reportRows.push(
      `| ${meta.type} | ${meta.id} | ${meta.decaySeconds}s | ${meta.gain} | ${entry.sourceName} | ${meta.license} |`,
    );
  }

  const anyPlaceholder = irs.some((i) => /placeholder/i.test(i.license));
  const manifest = {
    version: 1,
    ...(anyPlaceholder
      ? {
          _warning:
            'CONTAINS PLACEHOLDER assets derived from reference (non-redistributable) IRs for local verification ONLY. Replace with licensed sources in pack-list.json and re-run `pack` before shipping.',
        }
      : {}),
    irs,
  };
  writeFileSync(
    join(PACK_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );

  const report = [
    '# Reverb IR pack — fidelity / levels',
    '',
    '| type | id | decay | gain | source | license |',
    '| --- | --- | --- | --- | --- | --- |',
    ...reportRows,
    '',
  ].join('\n');
  writeFileSync(join(REPORTS_DIR, 'pack.md'), report);

  console.log(`\nWrote ${irs.length} IRs + manifest.json → ${PACK_DIR}`);
  if (anyPlaceholder) {
    console.log(
      '⚠ Manifest contains PLACEHOLDER (non-shippable) IRs — replace before release.',
    );
  }
}

// ── entry ─────────────────────────────────────────────────────────────────

const command = process.argv[2];
if (command === 'scan') cmdScan();
else if (command === 'pack') cmdPack();
else {
  console.error('Usage: cli.ts <scan|pack> --library "<IR source dir>"');
  process.exit(1);
}
