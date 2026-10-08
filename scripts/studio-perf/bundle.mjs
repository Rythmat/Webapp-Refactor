/* eslint-env node */
/**
 * The Studio editor's bundle report, part of the milestone 1.0 baseline. It
 * runs a production build into a temp directory (never the repo's dist) and
 * reports the editor's chunk (DawApp-*.js) raw, gzip and brotli, the entry
 * chunk and the JS index.html preloads with it, all JS together, the 25
 * biggest modules under src/daw by rendered size, and what the DawApp chunk
 * is made of (src/daw, other src, packages).
 *
 *   node scripts/studio-perf/bundle.mjs [--out=dir] [--treemap] [--keep]
 *
 * (`npm run studio:bundle` runs the same.) The build takes about 40 s here
 * (Vite 8 builds with Rolldown), longer on a busy machine. It is
 * `vite build --outDir <tmp>/dist --emptyOutDir` with ANALYZE=1, which makes
 * vite.config.ts add rollup-plugin-visualizer: ANALYZE_JSON receives its
 * raw-data report (the module sizes) and ANALYZE_OUT the treemap. From a git
 * worktree without env files the build reads the main checkout's
 * (VITE_ENV_DIR), as the perf harness's dev server does, so the VITE_* values
 * Vite inlines match a normal build.
 *
 * Sizes: gzip level 9 and brotli quality 11 in text mode, which is how the
 * visualizer measures modules, so chunk and module numbers compare.
 * `viteReported` is what the build log printed for the chunk (its gzip uses
 * a lower level). A module's rendered size is its code in the chunk before
 * minification, as the visualizer reports it, so module sizes rank modules
 * but do not add up to the chunk. A module's gzip and brotli sizes are those
 * of its code alone, so they overstate its share of a compressed chunk. Files
 * copied from public/ (vendored worklets) are listed apart from the chunks.
 *
 * The audit's June figure for the DawApp chunk was about 1.13 MB raw and
 * 286 KB gzip; Stage A (1.12a) budgets the boot chunk at 150 KB gzip. Both
 * are reported for comparison, never enforced.
 *
 * Output (docs/studio-perf/runs/bundle/ unless --out): bundle.json and
 * summary.md (formatted by Prettier, so a baseline committed by check.mjs
 * passes `prettier . --check`), plus build.log when the build fails.
 * `--treemap` also copies the visualizer's treemap as bundle.html (3–4 MB,
 * so not into a committed baseline); `--keep` leaves the temp directory
 * (the built files, the raw data, the treemap and the build log) for a
 * closer look. It exits 1 when the build fails or no DawApp chunk comes out
 * of it.
 */
import { execFileSync, spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { format, resolveConfig } from 'prettier';
import { ROOT, parseArgs, writeJson } from './harness.mjs';

/** The audit's figure for the DawApp chunk (June 2026), for comparison. */
const JUNE_DAWAPP = { rawBytes: 1_130_000, gzipBytes: 286_000 };
/** Stage A's budget for the editor's boot chunk (1.12a), gzip. */
const BOOT_BUDGET_GZIP = 150_000;
const TOP_MODULES = 25;

const kb = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;
/** kB with one decimal, for table cells. */
const k = (bytes) =>
  typeof bytes === 'number' ? (bytes / 1000).toFixed(1) : '–';
const signedKb = (bytes) =>
  `${bytes < 0 ? '−' : '+'}${(Math.abs(bytes) / 1000).toFixed(1)} kB`;

function gitState() {
  try {
    const git = (...gitArgs) =>
      execFileSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8' }).trim();
    return {
      commit: git('rev-parse', '--short', 'HEAD'),
      dirty: git('status', '--porcelain').length > 0,
    };
  } catch {
    return { commit: null, dirty: null };
  }
}

/**
 * The main checkout's directory when this checkout (a git worktree) has no
 * env files of its own; null otherwise.
 */
function envDirForBuild() {
  const hasEnv = (dir) =>
    existsSync(join(dir, '.env')) || existsSync(join(dir, '.env.local'));
  if (hasEnv(ROOT)) return null;
  try {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    const main = resolve(ROOT, common, '..');
    return hasEnv(main) ? main : null;
  } catch {
    return null;
  }
}

/** Runs the analyzed production build into `tmp`; resolves with its log. */
function build(tmp, envDir) {
  const env = {
    ...process.env,
    ANALYZE: '1',
    ANALYZE_JSON: join(tmp, 'bundle-raw.json'),
    ANALYZE_OUT: join(tmp, 'bundle.html'),
    // Plain text, so the size lines in the log parse.
    NO_COLOR: '1',
  };
  // Vite decides the mode; a stray NODE_ENV=development would skew the build.
  delete env.NODE_ENV;
  if (envDir) env.VITE_ENV_DIR = envDir;
  return new Promise((done, fail) => {
    const child = spawn(
      join(ROOT, 'node_modules/.bin/vite'),
      ['build', '--outDir', join(tmp, 'dist'), '--emptyOutDir'],
      { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const log = [];
    child.stdout.on('data', (data) => log.push(String(data)));
    child.stderr.on('data', (data) => log.push(String(data)));
    child.on('error', fail);
    child.on('close', (code) => {
      const text = log.join('');
      if (code === 0) done(text);
      else {
        const error = new Error(`vite build exited with code ${code}`);
        error.log = text;
        fail(error);
      }
    });
  });
}

/** Raw, gzip (level 9) and brotli (quality 11, text) sizes of `code`. */
function sizesOf(code) {
  return {
    rawBytes: code.length,
    gzipBytes: gzipSync(code, { level: 9 }).length,
    brotliBytes: brotliCompressSync(code, {
      params: {
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: code.length,
      },
    }).length,
  };
}

/** Every file under `dir`, as paths relative to it with forward slashes. */
function filesUnder(dir, prefix = '') {
  return readdirSync(join(dir, prefix), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      return entry.isDirectory() ? filesUnder(dir, path) : [path];
    },
  );
}

/** The size line the build log printed for `file`, if it printed one. */
function viteReported(log, file) {
  const name = basename(file).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const line = log
    .split('\n')
    .find((text) => new RegExp(`${name}\\s`).test(text));
  const match = line?.match(
    /([\d,.]+) (kB|MB)\s*│\s*gzip:\s*([\d,.]+) (kB|MB)/,
  );
  if (!match) return null;
  const bytes = (value, unit) =>
    Math.round(Number(value.replace(/,/g, '')) * (unit === 'MB' ? 1e6 : 1e3));
  return {
    rawBytes: bytes(match[1], match[2]),
    gzipBytes: bytes(match[3], match[4]),
  };
}

/** The entry script and the chunks index.html preloads, as dist paths. */
function initialScripts(dist) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const strip = (path) => path.replace(/^\//, '');
  const entry = html.match(/<script\b[^>]*\bsrc="([^"]+\.js)"/)?.[1];
  const preloads = [...html.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => tag.includes('modulepreload'))
    .map((tag) => tag.match(/\bhref="([^"]+)"/)?.[1])
    .filter(Boolean);
  return { entry: entry && strip(entry), preloads: preloads.map(strip) };
}

/** 'react-dom' or '@scope/name' for a module under node_modules. */
function packageOf(id) {
  const rest = id.split('/node_modules/').at(-1);
  const parts = rest.split('/');
  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}

function groupOf(id) {
  if (id.includes('/node_modules/')) return 'node_modules';
  if (id.includes('/src/daw/')) return 'src/daw';
  if (id.includes('/src/')) return 'src (other)';
  return 'other';
}

/**
 * From the visualizer's raw data: the biggest src/daw modules, and what the
 * DawApp chunk is made of. nodeMetas maps a module to its part in each
 * output chunk (moduleParts); nodeParts holds each part's sizes.
 */
function moduleReport(raw, dawChunk) {
  const modules = [];
  const composition = {};
  const packages = new Map();
  for (const meta of Object.values(raw.nodeMetas)) {
    const parts = Object.entries(meta.moduleParts ?? {})
      .map(([chunk, uid]) => ({ chunk, ...raw.nodeParts[uid] }))
      .filter((part) => typeof part.renderedLength === 'number');
    for (const part of parts.filter((p) => p.chunk === dawChunk)) {
      const group = groupOf(meta.id);
      composition[group] = (composition[group] ?? 0) + part.renderedLength;
      if (group === 'node_modules') {
        const name = packageOf(meta.id);
        packages.set(name, (packages.get(name) ?? 0) + part.renderedLength);
      }
    }
    if (!meta.id.includes('/src/daw/')) continue;
    const total = (key) => parts.reduce((sum, part) => sum + part[key], 0);
    modules.push({
      module: meta.id.replace(/^\//, ''),
      renderedBytes: total('renderedLength'),
      gzipBytes: total('gzipLength'),
      brotliBytes: total('brotliLength'),
      chunks: parts.map((part) => part.chunk),
    });
  }
  modules.sort((a, b) => b.renderedBytes - a.renderedBytes);
  return {
    dawModules: {
      count: modules.length,
      renderedBytes: modules.reduce((sum, row) => sum + row.renderedBytes, 0),
    },
    topDawModules: modules.slice(0, TOP_MODULES),
    dawAppComposition: composition,
    dawAppTopPackages: [...packages.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, renderedBytes]) => ({ package: name, renderedBytes })),
  };
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

/** The report as markdown, for summary.md (check.mjs gathers these). */
function summarize(report) {
  const { dawApp, entry, initialJs, totalJs } = report;
  const reported = dawApp.viteReported;
  const preloads = Math.max(0, initialJs.files.length - 1);
  return [
    '# Studio editor bundle',
    '',
    `${report.date} · commit ${report.commit}${report.dirty ? ' (dirty)' : ''} · Vite ${report.vite} · built in ${report.buildSeconds} s`,
    '',
    'Written by scripts/studio-perf/bundle.mjs from a production build. Sizes',
    'in kB (1,000 bytes): gzip level 9, brotli quality 11.',
    '',
    table(
      ['chunk', 'file', 'raw', 'gzip', 'brotli'],
      [
        [
          'DawApp (the editor)',
          dawApp.file,
          k(dawApp.rawBytes),
          k(dawApp.gzipBytes),
          k(dawApp.brotliBytes),
        ],
        entry
          ? [
              'entry',
              entry.file,
              k(entry.rawBytes),
              k(entry.gzipBytes),
              k(entry.brotliBytes),
            ]
          : ['entry', 'not found', '–', '–', '–'],
        [
          `initial JS (entry and ${preloads} preloads)`,
          '–',
          k(initialJs.rawBytes),
          k(initialJs.gzipBytes),
          '–',
        ],
        [
          `all JS chunks (${totalJs.files} files)`,
          '–',
          k(totalJs.rawBytes),
          k(totalJs.gzipBytes),
          '–',
        ],
      ],
    ),
    '',
    `DawApp against the June figure (${kb(JUNE_DAWAPP.rawBytes)} raw, ` +
      `${kb(JUNE_DAWAPP.gzipBytes)} gzip): ` +
      `${signedKb(dawApp.changeSinceJune.rawBytes)} raw, ` +
      `${signedKb(dawApp.changeSinceJune.gzipBytes)} gzip. Stage A's boot ` +
      `chunk budget (1.12a) is ${kb(BOOT_BUDGET_GZIP)} gzip, and this chunk ` +
      `is ${kb(Math.abs(dawApp.overBootBudgetGzipBytes))} ` +
      `${dawApp.overBootBudgetGzipBytes > 0 ? 'over' : 'under'} it.` +
      (reported
        ? ` Vite's own log: ${kb(reported.rawBytes)} raw, ` +
          `${kb(reported.gzipBytes)} gzip.`
        : ''),
    '',
    '## What the DawApp chunk is made of',
    '',
    'Rendered size, before minification.',
    '',
    table(
      ['source', 'kB'],
      Object.entries(report.dawAppComposition)
        .sort((a, b) => b[1] - a[1])
        .map(([group, bytes]) => [group, k(bytes)]),
    ),
    '',
    `Largest packages in it: ${report.dawAppTopPackages
      .map((row) => `${row.package} ${kb(row.renderedBytes)}`)
      .join(' · ')}.`,
    '',
    `## Largest src/daw modules (${report.dawModules.count} in all)`,
    '',
    'Rendered size before minification; gzip of the module alone.',
    '',
    table(
      ['module', 'rendered kB', 'gzip kB', 'chunk'],
      report.topDawModules.map((row) => [
        row.module,
        k(row.renderedBytes),
        k(row.gzipBytes),
        row.chunks.map((chunk) => basename(chunk)).join(', '),
      ]),
    ),
    '',
  ].join('\n');
}

/**
 * Writes markdown as the repo's Prettier formats it: a baseline that
 * check.mjs commits under docs/studio-perf/baselines must pass
 * `prettier . --check` (npm run lint), which aligns table columns.
 */
async function writeMarkdown(file, markdown) {
  const options = (await resolveConfig(file)) ?? {};
  writeFileSync(file, await format(markdown, { ...options, filepath: file }));
}

export async function runBundle(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const outDir = resolve(
    args.out ?? join(ROOT, 'docs/studio-perf/runs/bundle'),
  );
  mkdirSync(outDir, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'studio-bundle-'));
  const dist = join(tmp, 'dist');
  const envDir = envDirForBuild();
  console.log(`bundle: building into ${tmp} (about 40 s)`);
  const started = Date.now();
  let log;
  try {
    log = await build(tmp, envDir);
  } catch (error) {
    writeFileSync(join(outDir, 'build.log'), error.log ?? String(error));
    console.error(`bundle: ${error.message}; see ${outDir}/build.log`);
    if (args.keep !== 'true') rmSync(tmp, { recursive: true, force: true });
    process.exitCode = 1;
    return null;
  }
  const buildSeconds = Math.round((Date.now() - started) / 1000);
  // A clean build's log is only kept with the rest (--keep); its sizes are
  // in the report.
  writeFileSync(join(tmp, 'build.log'), log);
  try {
    const js = filesUnder(dist).filter((file) => file.endsWith('.js'));
    // Vite writes its chunks under assets/; other JS was copied from
    // public/ as is (vendored worklets) and is reported apart.
    const scripts = js.filter((file) => file.startsWith('assets/'));
    const publicScripts = js.filter((file) => !file.startsWith('assets/'));
    const code = (file) => readFileSync(join(dist, file));
    const dawFiles = scripts.filter((file) =>
      /^DawApp-[\w-]+\.js$/.test(basename(file)),
    );
    if (!dawFiles.length) {
      throw new Error('no DawApp-*.js chunk in the build');
    }
    // One chunk is expected; with more, the largest is the editor's.
    const dawFile = dawFiles
      .map((file) => ({ file, raw: code(file).length }))
      .sort((a, b) => b.raw - a.raw)[0].file;
    const daw = sizesOf(code(dawFile));
    const { entry, preloads } = initialScripts(dist);
    const initial = [entry, ...preloads].filter((file) =>
      scripts.includes(file),
    );
    const sum = (list, key) => list.reduce((total, row) => total + row[key], 0);
    const gzipOnly = (file) => ({
      rawBytes: code(file).length,
      gzipBytes: gzipSync(code(file), { level: 9 }).length,
    });
    const initialSizes = initial.map(gzipOnly);
    const allSizes = scripts.map(gzipOnly);
    const rawData = JSON.parse(
      readFileSync(join(tmp, 'bundle-raw.json'), 'utf8'),
    );
    const vitePackage = JSON.parse(
      readFileSync(join(ROOT, 'node_modules/vite/package.json'), 'utf8'),
    );
    const report = {
      date: new Date().toISOString(),
      ...gitState(),
      vite: vitePackage.version,
      envDir: envDir && relative(ROOT, envDir),
      buildSeconds,
      dawApp: {
        file: dawFile,
        ...daw,
        viteReported: viteReported(log, dawFile),
        otherDawAppChunks: dawFiles.filter((file) => file !== dawFile),
        juneBaseline: JUNE_DAWAPP,
        changeSinceJune: {
          rawBytes: daw.rawBytes - JUNE_DAWAPP.rawBytes,
          gzipBytes: daw.gzipBytes - JUNE_DAWAPP.gzipBytes,
        },
        bootBudgetGzipBytes: BOOT_BUDGET_GZIP,
        overBootBudgetGzipBytes: daw.gzipBytes - BOOT_BUDGET_GZIP,
      },
      entry: entry ? { file: entry, ...sizesOf(code(entry)) } : null,
      initialJs: {
        files: initial,
        rawBytes: sum(initialSizes, 'rawBytes'),
        gzipBytes: sum(initialSizes, 'gzipBytes'),
      },
      totalJs: {
        files: scripts.length,
        rawBytes: sum(allSizes, 'rawBytes'),
        gzipBytes: sum(allSizes, 'gzipBytes'),
      },
      publicJs: {
        files: publicScripts,
        rawBytes: publicScripts.reduce(
          (total, file) => total + code(file).length,
          0,
        ),
      },
      ...moduleReport(rawData, dawFile),
    };
    writeJson(outDir, 'bundle', report);
    await writeMarkdown(join(outDir, 'summary.md'), summarize(report));
    if (args.treemap === 'true' && existsSync(join(tmp, 'bundle.html'))) {
      copyFileSync(join(tmp, 'bundle.html'), join(outDir, 'bundle.html'));
    }
    console.log(
      `bundle: ${dawFile} ${kb(daw.rawBytes)} raw, ${kb(daw.gzipBytes)} gzip, ` +
        `${kb(daw.brotliBytes)} brotli (June: ${kb(JUNE_DAWAPP.rawBytes)} / ` +
        `${kb(JUNE_DAWAPP.gzipBytes)} gzip; budget ${kb(BOOT_BUDGET_GZIP)} gzip)`,
    );
    console.log(
      `bundle: total JS ${kb(report.totalJs.rawBytes)} raw in ` +
        `${scripts.length} files; wrote ${join(outDir, 'bundle.json')}`,
    );
    return report;
  } catch (error) {
    console.error(`bundle: ${error.message}`);
    process.exitCode = 1;
    return null;
  } finally {
    if (args.keep === 'true') console.log(`bundle: kept ${tmp}`);
    else rmSync(tmp, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await runBundle();
}
