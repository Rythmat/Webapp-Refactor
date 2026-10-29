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
 * THE GLOBE STAYS LAZY, AND WITHIN ITS BUDGET
 *
 * The Globe page (/globe) draws with MapLibre GL over a
 * Protomaps basemap (maplibre-gl, pmtiles, @protomaps/basemaps), together
 * well over a megabyte. Every one of them gets the same lazy-only rule as
 * Cortex, one marker string each (see LAZY_ONLY). The page's own code has a
 * size budget measured
 * from the Globe UI plan's baseline (docs/globe-ui/BASELINE.md): the atlas
 * route chunk
 * (`assets/atlas-*.js`) and everything it imports statically beyond the
 * entry chunks may each grow at most 5% over the baseline. When a change
 * shrinks the page on purpose, lower the numbers in GLOBE_BUDGET to the new
 * sizes; when one grows it on purpose, raise them in the same commit and say
 * why in BASELINE.md.
 *
 * The data the Globe's first frame doesn't need (the state outlines, the
 * influence graph, the guided tours) loads on demand through
 * src/components/atlas/data/loaders.ts. GLOBE_ON_DEMAND keeps it out of the
 * entry and out of the route's static imports, one marker each.
 *
 * The folder scanned is `dist/`, or the one named as the first argument
 * (`node scripts/verifyProdBundle.mjs /tmp/build`), so a build made into a
 * scratch folder can be checked without touching the repo's own `dist/`.
 *
 * Exit 0 = clean, exit 1 = a forbidden marker shipped.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

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
  // The Studio editor's test handles (milestone 1.4): set only behind
  // DEV_AUTH_BYPASS (DawApp.tsx, persistence/drafts/devHandle.ts), so the
  // window names fold away with the bypass.
  {
    marker: '__MA_DRAFTS__',
    why: 'Studio draft autosave dev handle (persistence/drafts/devHandle.ts)',
  },
  {
    marker: '__MA_SESSION__',
    why: 'Studio session store dev handle (DawApp.tsx)',
  },
  {
    marker: '__MA_CLOUD_SAVE__',
    why: 'Studio cloud save store dev handle (DawApp.tsx)',
  },
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
  // The redesign's art contact sheet (DEV only, as the Studio gallery).
  {
    marker: 'art-contact-sheet',
    why: 'art contact sheet page (src/components/art/__gallery__/ArtContactSheet.tsx)',
  },
  {
    marker: '/dev/art/contact-sheet',
    why: 'art contact sheet route (App.tsx)',
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
  // The Globe page's measuring hook (scripts/measureGlobe.mjs): installed in
  // MapLibreGlobe.tsx behind a literal DEV guard.
  {
    marker: '__atlasGlobeDebug',
    why: "the Globe page's dev-only measuring hook (Globe/MapLibreGlobe.tsx)",
  },
];

/**
 * Code that may ship, but only in lazy chunks: never in an entry chunk or a
 * chunk index.html preloads. Each marker is a string only that code
 * carries; it must also be somewhere in the build, or the check would pass
 * whatever happened.
 */
const LAZY_ONLY = [
  {
    // The shader uniform only Cortex's renderer declares (map/render/shaders.ts).
    marker: 'u_atlasNodePositions',
    name: "Cortex's WebGL renderer",
    loadsWith: 'the Cortex page',
  },
  {
    // MapLibre's name for its shared worker pool (maplibre-gl.mjs).
    marker: 'maplibre_preloaded_worker_pool',
    name: 'maplibre-gl',
    loadsWith: 'the Atlas Globe page (the MapLibre engine)',
  },
  {
    // The error pmtiles throws on a file that is not an archive.
    marker: 'Wrong magic number for PMTiles archive',
    name: 'pmtiles',
    loadsWith: 'the Atlas Globe page (the MapLibre engine)',
  },
  {
    // A Protomaps basemap layer id (@protomaps/basemaps).
    marker: 'water_label_ocean',
    name: '@protomaps/basemaps',
    loadsWith: 'the Atlas Globe page (the MapLibre engine)',
  },
];

/**
 * Data that must load on demand, never with the Globe page or the entry
 * (src/components/atlas/data/loaders.ts). Each pattern matches a run of that
 * data that nothing else carries, whichever quotes the minifier picks; it
 * must also be somewhere in the build, or the check would pass whatever
 * happened. Regenerated data can change a marker: pick another run.
 */
const GLOBE_ON_DEMAND = [
  {
    // The start of Alabama's outline.
    pattern: /-87\.49,30\.38,-87\.62,30\.26/,
    name: 'the state outlines (data/stateBoundaries.ts)',
  },
  {
    // The first influence edge.
    pattern: /evt-griot-timbuktu-1500.,\s*to:\s*.evt-appalachia-bristol-1830/,
    name: 'the influence graph (data/eventConnections.ts)',
  },
  {
    // A Vienna city-tour stop.
    pattern: /Schoenberg, Berg and Webern/,
    name: 'the guided tours (data/guidedTours.ts)',
  },
  {
    // The timeline's name for itself (components/River/TimeRiver.tsx).
    pattern: /Music around the world, /,
    name: 'the timeline (components/River/TimeRiver.tsx)',
  },
];

/**
 * The Globe page's size budget, in raw (minified) bytes, from the baseline
 * of 12 Oct 2026 (docs/globe-ui/BASELINE.md, docs/globe-ui/baseline.json).
 * `routeChunk` is assets/atlas-*.js; `routeStatic` is it plus every chunk it
 * imports statically that the entry does not already load (data, icons;
 * three.js's WebGL build until prompt 8). The map engine, imported
 * dynamically, is in neither.
 *
 * Raised on purpose by Globe UI prompt 3 (from 70,808 and 1,086,089):
 * @tanstack/react-virtual for the long lists, 26.5 kB of it, and the
 * click-to-play video, timeline clusters and trail window. Raised again by
 * prompt 5 (from 103,658 and 1,120,778): the layout zones, the phone bottom
 * sheet, panel focus and Escape handling, 10 kB minified and 3 kB gzip.
 * Lowered by prompt 7 (from 110,195 and 1,142,358): the state outlines, the
 * influence graph, the tours and the pathways load on demand. Lowered again
 * by prompt 8 (from 111,634 and 885,444): the map engine (MapLibre, or
 * three.js with VITE_ATLAS_ENGINE=three) loads lazily, so three.js's WebGL
 * build left the route's static imports. Raised by the Time River redesign's
 * P2 (from 102,904 and 298,824): the Globe's header (its section tabs, the
 * globe / timeline switch, the trail popover) and the frame and time-window
 * code every view shares; the timeline itself is a lazy chunk. See "Budget
 * changes" in BASELINE.md.
 */
const GLOBE_BUDGET = {
  routeChunk: 110_237,
  routeStatic: 316_812,
  headroom: 1.05,
};

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

/** Static imports between chunks, as Vite (Rolldown) writes them. */
const STATIC_IMPORT =
  /(?:import|export)\s*(?:[^"'();]*?from\s*)?["']\.\/([\w.-]+\.js)["']/g;

/** `files` and every chunk they import statically, as paths in DIST. */
const staticClosure = (files) => {
  const seen = new Set();
  const stack = [...files];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    let text = '';
    try {
      text = readFileSync(join(DIST, file), 'utf8');
    } catch {
      continue;
    }
    const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '';
    for (const match of text.matchAll(STATIC_IMPORT)) {
      stack.push(dir ? `${dir}/${match[1]}` : match[1]);
    }
  }
  return seen;
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
    for (const { marker, name, loadsWith } of LAZY_ONLY) {
      if (text.includes(marker)) {
        hits.push({
          file: join(DIST, entry),
          marker,
          why: `${name} is in an entry chunk; it must load only with ${loadsWith} (lazy)`,
        });
      }
    }
  }
}
const lazyHomes = LAZY_ONLY.map(({ marker, name }) => {
  const home = files.filter((file) =>
    readFileSync(file, 'utf8').includes(marker),
  );
  if (home.length === 0) {
    hits.push({
      file: DIST,
      marker,
      why: `${name}'s marker is nowhere in the build, so the entry-chunk check above proves nothing (renamed or removed?)`,
    });
  }
  return `${name} in ${home.length}`;
});

// The Globe page's budget.
const atlasChunks = readdirSync(join(DIST, 'assets')).filter((file) =>
  /^atlas-[\w-]+\.js$/.test(file),
);
let globeSizes = '';
if (atlasChunks.length !== 1) {
  hits.push({
    file: join(DIST, 'assets'),
    marker: 'assets/atlas-*.js',
    why: `expected one atlas route chunk, found ${atlasChunks.length}, so the Globe page's budget cannot be checked (renamed atlas.tsx?)`,
  });
} else {
  const routeChunk = `assets/${atlasChunks[0]}`;
  const entryClosure = staticClosure(entries ?? []);
  const routeStatic = [...staticClosure([routeChunk])].filter(
    (file) => !entryClosure.has(file),
  );
  const bytes = (file) => statSync(join(DIST, file)).size;
  const sizes = {
    routeChunk: bytes(routeChunk),
    routeStatic: routeStatic.reduce((sum, file) => sum + bytes(file), 0),
  };
  for (const key of ['routeChunk', 'routeStatic']) {
    const limit = Math.round(GLOBE_BUDGET[key] * GLOBE_BUDGET.headroom);
    if (sizes[key] > limit) {
      hits.push({
        file: join(DIST, routeChunk),
        marker: `Globe budget: ${key}`,
        why: `${sizes[key]} bytes, over the limit of ${limit} (baseline ${GLOBE_BUDGET[key]} + 5%; docs/globe-ui/BASELINE.md)`,
      });
    }
  }
  globeSizes = `the Globe route chunk is ${sizes.routeChunk} bytes and its static imports ${sizes.routeStatic} (${routeStatic.length} chunks), within budget`;

  // The on-demand data stays on demand.
  const upFront = new Set([...entryClosure, ...routeStatic]);
  for (const { pattern, name } of GLOBE_ON_DEMAND) {
    let found = false;
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (!pattern.test(text)) continue;
      found = true;
      const chunk = relative(DIST, file);
      if (upFront.has(chunk)) {
        hits.push({
          file,
          marker: String(pattern),
          why: `${name} loads with the Globe page or the entry; it must load on demand (data/loaders.ts)`,
        });
      }
    }
    if (!found) {
      hits.push({
        file: DIST,
        marker: String(pattern),
        why: `${name}'s marker is nowhere in the build, so the on-demand check proves nothing (data changed? pick another marker)`,
      });
    }
  }
  globeSizes += `, and ${GLOBE_ON_DEMAND.length} on-demand data sets load on demand`;
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
      'lazy Cortex page, and the map engine only through the lazy Globe\n' +
      'page.\n',
  );
  process.exit(1);
}

console.log(
  `verify:prod OK — scanned ${files.length} file(s) in ${DIST}/, no DEV-bypass, content-mock, repo-mode or graph-debug markers shipped; lazy-only code (${lazyHomes.join(', ')} chunk(s)) is in none of the ${entries.length} entry chunk(s); ${globeSizes}.`,
);
