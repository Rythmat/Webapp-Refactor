#!/usr/bin/env node
/* eslint-env node */
/**
 * One command for the Studio editor checks: the verification tiers of the
 * editor overhaul (docs/studio-audit-2026-10/plan.md).
 *
 *   npm run studio:check        fast tier, before every milestone PR: the
 *                               unit ratchets and the lesson-anchor
 *                               inventory (vitest), the reload round-trips,
 *                               and the 8 lessons on the chromebook profile
 *   npm run studio:check:full   adds the perf scenarios (chromebook and
 *                               laptop), the golden renders and timing
 *                               traces, and the bundle report
 *   npm run studio:baseline     the full tier, written to
 *                               docs/studio-perf/baselines/<date>/
 *
 * It starts one bypass dev server for every browser suite (--reuse=URL uses
 * one that is already running; --port=5263 picks the port), runs the suites
 * one after another so they don't skew each other's timings, prints a table,
 * and exits 1 if any suite failed. `--only=roundtrip,lessons` runs a subset.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startServer, waitClosed } from '../lib/devServer.mjs';
import { ROOT, parseArgs, studioServerEnv } from './harness.mjs';

const args = parseArgs();
const baseline = args.baseline === 'true';
const full = baseline || args.full === 'true';
const only = args.only ? new Set(args.only.split(',')) : null;
const outRoot = baseline
  ? join(
      ROOT,
      'docs/studio-perf/baselines',
      new Date().toLocaleDateString('en-CA'),
    )
  : join(ROOT, 'docs/studio-perf/runs/check');
mkdirSync(outRoot, { recursive: true });

/** Vitest files: the persistence and autosave ratchets, the anchor inventory. */
const UNIT_TESTS = [
  'src/daw/persistence/__tests__/persistenceMatrix.test.ts',
  'src/daw/hooks/__tests__/autosaveStarvation.test.ts',
  'src/daw/components/Tutorial/__tests__/tutorialAnchors.test.ts',
  'src/daw/persistence/__tests__/fixtures/v2/manifest.test.ts',
];

/** Browser suites, in the order they run. `server: false` builds instead. */
const SUITES = [
  { name: 'roundtrip', script: 'roundtrip.mjs', args: [] },
  { name: 'lessons', script: 'lessons.mjs', args: ['--profile=chromebook'] },
  ...(full
    ? [
        {
          name: 'perf',
          script: 'perf.mjs',
          args: ['--profile=chromebook,laptop'],
        },
        { name: 'golden', script: 'golden.mjs', args: [] },
        { name: 'golden-trace', script: 'golden.mjs', args: ['--trace'] },
        { name: 'bundle', script: 'bundle.mjs', args: [], server: false },
      ]
    : []),
].filter((suite) => !only || only.has(suite.name));

const results = [];
const run = (name, command, commandArgs) => {
  const started = Date.now();
  console.log(`\n── ${name} ─ ${command} ${commandArgs.join(' ')}`);
  const { status } = spawnSync(command, commandArgs, {
    cwd: ROOT,
    stdio: 'inherit',
  });
  results.push({
    name,
    pass: status === 0,
    seconds: Math.round((Date.now() - started) / 1000),
  });
};

if (!only || only.has('unit')) {
  run('unit', 'npx', ['vitest', 'run', ...UNIT_TESTS.filter(existsSync)]);
}

const needsServer = SUITES.some((suite) => suite.server !== false);
const port = Number(args.port ?? 5263);
let server = null;
let base = args.reuse;
if (needsServer && !base) {
  server = await startServer({
    root: ROOT,
    port,
    env: studioServerEnv(),
    logFile: join(outRoot, 'vite.log'),
  });
  base = `http://localhost:${port}`;
}
try {
  for (const suite of SUITES) {
    const script = join(ROOT, 'scripts/studio-perf', suite.script);
    if (!existsSync(script)) {
      results.push({
        name: suite.name,
        pass: false,
        seconds: 0,
        missing: true,
      });
      continue;
    }
    run(suite.name, process.execPath, [
      script,
      ...(suite.server === false ? [] : [`--reuse=${base}`]),
      `--out=${join(outRoot, suite.name)}`,
      ...suite.args,
    ]);
  }
} finally {
  if (server) {
    server.stop();
    await waitClosed(port);
  }
}

const table = [
  '| Suite | Result | Time |',
  '| --- | --- | --- |',
  ...results.map(
    (r) =>
      `| ${r.name} | ${r.missing ? 'missing' : r.pass ? 'pass' : 'FAIL'} | ${r.seconds} s |`,
  ),
].join('\n');
console.log(`\n${table}`);

// Gather each suite's own summary.md under one file, so a baseline reads in
// one place.
const sections = results
  .map((r) => join(outRoot, r.name, 'summary.md'))
  .filter(existsSync)
  .map((file) => readFileSync(file, 'utf8'));
writeFileSync(
  join(outRoot, 'summary.md'),
  [
    `# Studio checks (${full ? 'full' : 'fast'} tier)`,
    '',
    table,
    '',
    ...sections,
  ].join('\n'),
);
// Format it the way the repo's Prettier check expects, so a baseline can be
// committed as written.
spawnSync('npx', ['prettier', '--write', join(outRoot, 'summary.md')], {
  cwd: ROOT,
  stdio: 'ignore',
});
process.exit(results.every((r) => r.pass) ? 0 : 1);
