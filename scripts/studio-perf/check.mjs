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
 * and exits 1 if any suite failed. `--only=roundtrip,lessons` runs a subset;
 * `--fake-audio` gives every browser suite Chrome's fake audio output
 * (harness.mjs), for a machine whose audio output never renders.
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

/**
 * Vitest files: the persistence and autosave ratchets, the anchor inventory,
 * and the project document's guards (milestone 1.3): the registry's coverage,
 * the codec, its migrations and format, the quarantine, cloud opens, the
 * per-user prefs, the save status and new-project state, and the contracts
 * under them (note ids, cloud track ids, new-track defaults, the session
 * generation, link seeds, chord identity, boot links).
 */
const UNIT_TESTS = [
  'src/daw/persistence/__tests__/persistenceMatrix.test.ts',
  'src/daw/hooks/__tests__/autosaveStarvation.test.ts',
  'src/daw/components/Tutorial/__tests__/tutorialAnchors.test.ts',
  'src/daw/persistence/__tests__/fixtures/manifest.test.ts',
  'src/daw/persistence/__tests__/fieldCoverage.test.ts',
  'src/daw/persistence/__tests__/codecV3.test.ts',
  'src/daw/persistence/__tests__/v3Shape.test.ts',
  'src/daw/persistence/__tests__/migrations.test.ts',
  'src/daw/persistence/__tests__/quarantine.test.ts',
  'src/daw/persistence/__tests__/cloudOpen.test.ts',
  'src/daw/persistence/__tests__/sessionSize.test.ts',
  'src/daw/persistence/__tests__/sessionFingerprint.test.ts',
  'src/daw/persistence/__tests__/legacyPrefs.test.ts',
  'src/daw/persistence/__tests__/prefsStore.test.ts',
  'src/daw/persistence/__tests__/saveStatusStore.test.ts',
  'src/daw/persistence/__tests__/projectReset.test.ts',
  'src/daw/persistence/projectDocument/__tests__/initialState.test.ts',
  'src/daw/persistence/projectDocument/__tests__/notationCodec.test.ts',
  'src/daw/persistence/projectDocument/__tests__/cloudIds.test.ts',
  'src/daw/persistence/projectDocument/__tests__/trackDefaults.test.ts',
  'src/daw/model/__tests__/noteIds.test.ts',
  'src/daw/session/__tests__/sessionGeneration.test.ts',
  'src/daw/session/__tests__/linkSeeds.test.ts',
  'src/daw/harmony/__tests__/chordIdentity.test.ts',
  'src/daw/__tests__/DawApp.bootLinks.test.tsx',
  'src/daw/components/ChannelStrip/__tests__/ChannelStrip.restoredTab.test.tsx',
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

// A name that is no suite of this tier would run nothing and pass.
const unknown = [...(only ?? [])].filter(
  (name) => name !== 'unit' && !SUITES.some((suite) => suite.name === name),
);
if (unknown.length > 0) {
  throw new Error(
    `--only=${unknown.join(',')} names no suite of the ${full ? 'full' : 'fast'} tier`,
  );
}
mkdirSync(outRoot, { recursive: true });

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
  // A test that moved or was renamed must fail the tier, not drop out of it.
  const missing = UNIT_TESTS.filter((file) => !existsSync(join(ROOT, file)));
  if (missing.length > 0) {
    console.log(`\n── unit ─ missing: ${missing.join(', ')}`);
    results.push({ name: 'unit', pass: false, seconds: 0, missing: true });
  } else {
    run('unit', 'npx', ['vitest', 'run', ...UNIT_TESTS]);
  }
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
      ...(args['fake-audio'] === 'true' ? ['--fake-audio'] : []),
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
