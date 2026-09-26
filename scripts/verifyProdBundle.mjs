#!/usr/bin/env node
/**
 * Production-safety scan over `dist/`.
 *
 * The DEV auth+premium bypass (`src/auth/devBypass.ts`) is guarded on
 * `import.meta.env.DEV`, which Vite statically replaces with `false` in a
 * production build, so its mock user and token should be dead-code-eliminated.
 * "Should be" is the reason this script exists: a future refactor that reads
 * the flag through a variable, or an accidental `import.meta.env.MODE` check,
 * would silently ship a hard-coded authenticated premium user.
 *
 * WHAT IS AND IS NOT A MARKER
 *
 * Only strings that exist *solely* inside a DEV-guarded branch belong here.
 * `local-sess-` and "practice mode" deliberately DO ship: the local session
 * store is a real, user-facing offline mode, and P0 made it announce itself
 * with a visible badge instead of impersonating a server session. Banning
 * those would fail the build forever and, worse, create pressure to remove the
 * very badge that makes the degraded path honest.
 *
 * Exit 0 = clean, exit 1 = a forbidden marker shipped.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

/** Strings that must never appear in a production bundle. */
const FORBIDDEN = [
  { marker: 'dev-bypass-token', why: 'DEV auth bypass token (devBypass.ts)' },
  { marker: 'dev@localhost', why: 'DEV bypass mock user email (devBypass.ts)' },
  { marker: 'dev-bypass-user', why: 'DEV bypass mock user id (devBypass.ts)' },
  {
    marker: 'dev-bypass-session',
    why: 'DEV bypass app session id (devBypass.ts)',
  },
  { marker: 'VITE_DEV_AUTH_BYPASS', why: 'DEV bypass env flag name' },
];

/** Text-ish files worth scanning; images and fonts cannot carry a marker. */
const SCANNABLE = /\.(js|mjs|cjs|css|html|json|map|txt|svg)$/i;

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (SCANNABLE.test(full)) out.push(full);
  }
  return out;
};

let files;
try {
  files = walk(DIST);
} catch {
  console.error(
    `verify:prod — no ${DIST}/ directory. Run \`npm run build\` first (\`npm run verify:prod\` does both).`,
  );
  process.exit(1);
}

if (files.length === 0) {
  console.error(`verify:prod — ${DIST}/ contains no scannable files.`);
  process.exit(1);
}

const hits = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const { marker, why } of FORBIDDEN) {
    if (text.includes(marker)) hits.push({ file, marker, why });
  }
}

if (hits.length > 0) {
  console.error(
    `\nverify:prod FAILED — ${hits.length} forbidden marker(s) in ${DIST}/:\n`,
  );
  for (const { file, marker, why } of hits) {
    console.error(`  ${file}\n    "${marker}" — ${why}`);
  }
  console.error(
    '\nThe DEV bypass must fold out of production builds. Check that every\n' +
      'export in src/auth/devBypass.ts is still guarded by a literal\n' +
      '`import.meta.env.DEV` that Vite can statically replace.\n',
  );
  process.exit(1);
}

console.log(
  `verify:prod OK — scanned ${files.length} file(s) in ${DIST}/, no DEV-bypass markers shipped.`,
);
