#!/usr/bin/env node
/* eslint-env node */
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
 * CORTEX'S GRAPH STAYS LAZY
 *
 * The console's graph (Cortex, Amendment 7) brings a WebGL renderer and a
 * force layout that only the console needs. Its shader source carries the
 * uniform `u_atlasNodePositions`, which no other code uses, so finding it in
 * a chunk means the renderer is in that chunk. The scan reads the entry
 * chunk(s) `index.html` loads, the module script and every chunk it
 * preloads, and fails if the marker is in any of them: every student would
 * then download the renderer. It also fails if the marker is nowhere in the
 * build at all, because then the check would be looking for a name that no
 * longer exists and would pass whatever happened.
 *
 * The folder scanned is `dist/`, or the one named as the first argument
 * (`node scripts/verifyProdBundle.mjs /tmp/build`), so a build made into a
 * scratch folder can be checked without touching the repo's own `dist/`.
 *
 * Exit 0 = clean, exit 1 = a forbidden marker shipped.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist';

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
  // The offline content mock (src/features/admin/content/mock) is DEV-only in
  // the same way: its switch folds to false and its chunk must not be emitted.
  {
    marker: 'ma-console-mock-v1',
    why: 'offline content mock storage key (mock/persist.ts)',
  },
  {
    marker: 'ma-console-mock-db',
    why: 'offline content mock IndexedDB database (mock/persist.ts)',
  },
  { marker: 'VITE_CONTENT_MOCK', why: 'offline content mock env flag name' },
  {
    marker: 'mock://cdn',
    why: 'offline content mock CDN base (mockSwitch.ts)',
  },
  // Repo mode (the dev server saves the console's edits into the repo's
  // files): its switch folds to false, its URL base to undefined, and its
  // sync hook is loaded only behind a literal DEV guard.
  {
    marker: '__repo-content',
    why: 'repo mode server path (mockSwitch.ts REPO_CONTENT_BASE)',
  },
  { marker: 'VITE_CONTENT_REPO', why: 'repo mode env flag name' },
  {
    marker: 'repo-content:changed',
    why: 'repo mode reload event (repo/useRepoContentSync.ts)',
  },
  // Its console UI: every repo branch is gated on a literal DEV at the use
  // site (repo/useRepoMode.ts), so these words fold away with it. One left
  // in the build is a branch that lost its gate.
  {
    marker: 'Commit and deploy',
    why: 'repo mode Publishing (PublishingLayout, ChangesButton, RepoCommitSection)',
  },
  {
    marker: '/repo/status',
    why: 'repo mode git status client (hooks/data/admin/useRepoContent.ts)',
  },
  // Cortex's browser-script hook: installed behind a literal DEV guard in
  // GraphCanvas.tsx, so the function and the name fold away with it.
  {
    marker: '__atlasGraphDebug',
    why: "Cortex's dev-only graph hook (map/GraphCanvas.tsx installDebugHook)",
  },
  // The Studio UI gallery (src/daw/ui/__gallery__): its route and its lazy
  // import sit behind a literal DEV guard in App.tsx, so neither the route
  // nor the page's chunk may ship.
  {
    marker: 'daw-ui-gallery',
    why: 'Studio UI gallery page (src/daw/ui/__gallery__/DawUiGallery.tsx)',
  },
  {
    marker: '/dev/studio/ui-gallery',
    why: 'Studio UI gallery route (App.tsx)',
  },
];

/**
 * The shader uniform only Cortex's WebGL renderer declares
 * (map/render/shaders.ts). It may ship, but only in a lazy chunk.
 */
const LAZY_ONLY_MARKER = 'u_atlasNodePositions';

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

/**
 * The chunks `index.html` loads before any route runs: its module scripts
 * and the chunks it preloads, as paths inside `DIST`.
 */
const entryChunks = () => {
  let html;
  try {
    html = readFileSync(join(DIST, 'index.html'), 'utf8');
  } catch {
    return null;
  }
  const refs = new Set();
  for (const tag of html.match(/<(script|link)\b[^>]*>/gi) ?? []) {
    const isModule = /^<script/i.test(tag) && /type=["']module["']/i.test(tag);
    const isPreload =
      /^<link/i.test(tag) && /rel=["']modulepreload["']/i.test(tag);
    if (!isModule && !isPreload) continue;
    const ref = /(?:src|href)=["']([^"']+)["']/i.exec(tag)?.[1];
    if (ref && !/^[a-z]+:\/\//i.test(ref)) refs.add(ref.replace(/^\//, ''));
  }
  return [...refs];
};

const entries = entryChunks();
if (entries === null || entries.length === 0) {
  hits.push({
    file: join(DIST, 'index.html'),
    marker: '(entry chunks)',
    why: 'no module script found in index.html, so the entry chunks cannot be checked',
  });
} else {
  for (const entry of entries) {
    let text = '';
    try {
      text = readFileSync(join(DIST, entry), 'utf8');
    } catch {
      hits.push({
        file: join(DIST, entry),
        marker: '(missing entry chunk)',
        why: 'index.html names a chunk that is not in the build',
      });
      continue;
    }
    if (text.includes(LAZY_ONLY_MARKER)) {
      hits.push({
        file: join(DIST, entry),
        marker: LAZY_ONLY_MARKER,
        why: "Cortex's WebGL renderer is in an entry chunk; it must load only with the Cortex page (lazy)",
      });
    }
  }
}
const lazyHome = files.filter((file) =>
  readFileSync(file, 'utf8').includes(LAZY_ONLY_MARKER),
);
if (lazyHome.length === 0) {
  hits.push({
    file: DIST,
    marker: LAZY_ONLY_MARKER,
    why: "the renderer's shader marker is nowhere in the build, so the entry-chunk check above proves nothing (renamed in shaders.ts?)",
  });
}

if (hits.length > 0) {
  console.error(
    `\nverify:prod FAILED — ${hits.length} forbidden marker(s) in ${DIST}/:\n`,
  );
  for (const { file, marker, why } of hits) {
    console.error(`  ${file}\n    "${marker}" — ${why}`);
  }
  console.error(
    '\nThe DEV bypass, the offline content mock and repo mode must fold out\n' +
      'of production builds. Check that every export in src/auth/devBypass.ts\n' +
      'and src/features/admin/content/mock/mockSwitch.ts is still guarded by\n' +
      'a literal `import.meta.env.DEV` that Vite can statically replace, and\n' +
      "that every import of repo mode code is guarded the same way. Cortex's\n" +
      'graph (its renderer and its dev hook) must load only through the\n' +
      'lazy Cortex page.\n',
  );
  process.exit(1);
}

console.log(
  `verify:prod OK — scanned ${files.length} file(s) in ${DIST}/, no DEV-bypass, content-mock, repo-mode or graph-debug markers shipped; Cortex's renderer is in ${lazyHome.length} lazy chunk(s) and none of the ${entries.length} entry chunk(s).`,
);
