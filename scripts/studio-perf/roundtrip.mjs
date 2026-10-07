/* eslint-env node */
/**
 * Reload round-trips for the Studio editor (milestone 1.0 baseline): what
 * survives a refresh, an in-app return, a tab close, a cloud save and
 * reopen, a boot of every kind, and a bad link, measured on today's code
 * against a mock Studio API. Losses are recorded here, not fixed.
 *
 *   node scripts/studio-perf/roundtrip.mjs --reuse=http://localhost:5263
 *        [--profile=laptop|chromebook|small|all]   (default: laptop)
 *        [--scenario=R1,R4,R5:demo,...]             (default: all)
 *        [--api-mode=legacy|document|all]           (default: all)
 *        [--calibrate=2]   cold boots per R4 link, to find volatile fields
 *        [--update-known]  record this run's results in knownLosses.json
 *        [--known=file]    another known-losses file (default: the one here)
 *        [--capture-fixtures [--fixtures-dir=dir]]  capture v2 autosaves
 *        [--out=dir] [--headed] [--gpu=metal|swiftshader] [--port=5263]
 *
 * (`npm run studio:roundtrip -- --reuse=…` runs the same.) Without --reuse
 * the shared harness starts its own dev server on --port (never 5179).
 * --scenario takes groups (R4) or single links (R4:song, R5:demo,
 * R5:demo:cold).
 *
 * Every scenario applies the kitchen sink (fixtures/kitchenSink.mjs: a
 * non-default value for every field of the audit's persistence matrix),
 * takes a fingerprint (fixtures/fingerprint.mjs), crosses a boundary, takes
 * another and lists the fields that were lost or came back wrong:
 *
 * - R1 refresh while playing: play (past the sink's count-in), change a
 *   track's volume, wait out the 1.5 s autosave debounce, reload without
 *   stopping.
 * - R2 in-app return: one edit and, in the same task, in-app to /studio
 *   (well inside the debounce), then history.back().
 * - R3 cloud save → open: File ▸ Save (the editor's real save path) against
 *   the mock, then ?project=<id> in a fresh context (another device). The
 *   sink's imported clip has no asset yet, so the save takes its upload path.
 *   Once per API mode; 'document' is the milestone 1.5 contract and is
 *   reported as skipped until it exists (mockStudioApi.mjs).
 * - R4 leak check: after the sink, in-app to each boot link (LEAK_INTENTS:
 *   new, template, demo, lesson, song, Theory practice, genre practice, jam
 *   import); each must match a cold boot of the same link. Fields that
 *   differ between cold boots, and the ones a link seeds at random, are left
 *   out and listed. The collab boot needs a PartyKit server: not covered.
 * - R5 bad links: every boot link with an id that does not exist
 *   (BAD_LINKS), in-app and as a full page load. plan.md's exit criterion
 *   is "an invalid link changes nothing".
 * - R6 synth edit, then refresh: with the Lead's synth panel open, turn two
 *   knobs, wait out the debounce and reload; only the patch is compared (the
 *   audit's "synth edits do not trigger autosave", state-reload-06).
 * - R7 tab close: one edit and, inside the debounce, the tab closes (unload
 *   handlers run); a new tab of the same browser opens /studio/editor, which
 *   restores the autosave.
 *
 * "Settled" means the store has been still for 1.5 s, the page has no
 * editor request in flight and every asset-backed clip has decoded audio.
 * A snapshot taken before a boundary must be settled, or the scenario
 * errors; a page that never settles after the boundary is reported with the
 * scenario (requests still open, clips still without audio) next to the
 * losses that causes. The autosave counts as flushed once it is newer than
 * the last store write.
 *
 * Scenarios also report flags, yes/no facts with a goal (FLAGS): was the
 * autosave written during playback, did the bad link show an error, did the
 * crash copy survive. After R1, R2 and R5 a chord is written past the lane,
 * and a new chord id equal to an existing one is a loss
 * (`ids.newChordIdUnique`, state-reload-05). An editor that does not come
 * back (an error boundary) is the loss `editor.crashed`. Uncaught page
 * errors are counted.
 *
 * The ratchet. knownLosses.json holds, per profile and scenario, today's
 * lost fields with how many keys each loses per kind (lost, changed, added,
 * carried-over), the flags and the page-error count. A run fails (exit 1)
 * on a regression: a field losing more keys of a kind than listed (so a
 * loss spreading to more tracks counts), a flag moving off its recorded
 * value away from its goal, more page errors than listed, or a scenario
 * that could not run. Improvements are printed as FIXED and recorded by
 * --update-known, which rewrites only the profiles and scenarios that ran.
 * A skipped scenario (document mode) passes.
 *
 * --capture-fixtures records the real v2 autosaves the codec v3 migration
 * tests start from: the empty project, every demo
 * (src/daw/data/demoProjects.ts), every template
 * (src/daw/data/projectTemplates.ts), a song, a Theory and a genre practice
 * track, a jam import, the end state of every lesson
 * (src/daw/components/Tutorial/tutorials.ts, driven to its last step by the
 * walkthrough's own step drivers, lessonDrivers.mjs) and the kitchen sink.
 * Each is booted in a fresh context, the autosave ('musicAtlas:daw:autosave',
 * src/lib/studio-projects/localSession.ts) is left to flush, and its raw
 * value is written to src/daw/persistence/__tests__/fixtures/v2/<name>.json
 * (or --fixtures-dir: fixtures/v2-1.2/ holds the dialect milestones 1.1 and
 * 1.2 write), formatted by Prettier (so the repo's lint passes) and checked
 * lossless: JSON.stringify(JSON.parse(file)) is the stored string byte for
 * byte, whose SHA-256 manifest.json records (fixtures/manifest.test.ts
 * re-checks every folder). Once codec v3 (milestone 1.3) makes the editor
 * write another version, capture refuses rather than overwrite a v2 set.
 *
 * Reports go to docs/studio-perf/runs/roundtrip/ (or --out): every difference
 * with its values in roundtrip-<profile>.json, and summary.md, which
 * check.mjs gathers with the other suites' summaries.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as prettier from 'prettier';
import {
  compareFingerprints,
  fingerprintPage,
  probeChordIdCollision,
  sameValue,
} from './fixtures/fingerprint.mjs';
import { applyKitchenSink } from './fixtures/kitchenSink.mjs';
import {
  newPage,
  PROFILES,
  profilesFrom,
  ROOT,
  startAudio,
  withStudio,
  writeJson,
} from './harness.mjs';
import {
  API_MODES,
  createMockStudioApi,
  MockModeNotImplemented,
  STORAGE_ORIGIN,
} from './mockStudioApi.mjs';

const CHECK = 'roundtrip';
const AUTOSAVE_KEY = 'musicAtlas:daw:autosave';
/** The jam room's hand-off to the Studio (src/daw/jam-import/jamSession.ts). */
const JAM_HANDOFF_KEY = 'musicatlas:pending-jam-import';
const KNOWN_LOSSES = join(ROOT, 'scripts/studio-perf/knownLosses.json');
/** knownLosses.json layout: { profiles: { <profile>: { <scenario>: … } } }. */
const KNOWN_FORMAT = 2;
const FIXTURE_DIR = join(ROOT, 'src/daw/persistence/__tests__/fixtures/v2');
const SAMPLE_WAV = join(
  ROOT,
  'public/daw-assets/samples/chops/demo-vox-c4.wav',
);
const TUTORIALS_MODULE = '/src/daw/components/Tutorial/tutorials.ts';

/** The autosave debounce is 1.5 s (useAutosave.ts); wait past it. */
const PAST_DEBOUNCE_MS = 4000;
/** How long the store must be still before a snapshot counts as settled. */
const QUIET_MS = 1500;
/** A tab close tests the debounce only if it lands well inside 1.5 s. */
const CLOSE_WITHIN_MS = 1200;

/** A recorded jam, as the jam room leaves it for the Studio to import. */
const JAM_HANDOFF = {
  version: 1,
  roomId: 'roundtrip-jam',
  recordedAt: 1_760_000_000_000,
  bpm: 96,
  localUserId: 'player-a',
  participants: [
    { userId: 'player-a', userName: 'Ada', color: '#e4572e' },
    { userId: 'player-b', userName: 'Ben', color: '#29335c' },
  ],
  notes: [
    ...[60, 64, 67, 72].map((midi, i) => ({
      userId: 'player-a',
      color: '#e4572e',
      instrument: 'piano',
      gmProgram: 0,
      midi,
      velocity: 90,
      startMs: i * 625,
      endMs: i * 625 + 500,
    })),
    ...[36, 43].map((midi, i) => ({
      userId: 'player-b',
      color: '#29335c',
      instrument: 'piano',
      gmProgram: 33,
      midi,
      velocity: 100,
      startMs: i * 1250,
      endMs: i * 1250 + 1000,
    })),
    ...[36, 38, 36, 38].map((midi, i) => ({
      userId: 'player-a',
      color: '#e4572e',
      instrument: 'drums',
      gmProgram: 0,
      midi,
      velocity: 110,
      startMs: i * 625,
      endMs: i * 625 + 100,
    })),
  ],
};

const handoff = (kind) =>
  kind === 'jam'
    ? { key: JAM_HANDOFF_KEY, value: JSON.stringify(JAM_HANDOFF) }
    : null;

/**
 * The R4 boot links (DawApp.tsx's boot intents), each compared with a cold
 * boot of the same link. `volatile` lists fields the link seeds at random;
 * `expectTracks` makes the check refuse a link that no longer loads.
 */
const LEAK_INTENTS = [
  { kind: 'new', query: '?new=1' },
  {
    kind: 'template',
    query: '?template=project-pop',
    // loadProjectTemplate → selectGenre picks a random rhythm for the genre.
    volatile: ['harmony.rhythmName'],
    expectTracks: true,
  },
  { kind: 'demo', query: '?demo=demo-sunset-keys', expectTracks: true },
  { kind: 'tutorial', query: '?tutorial=jazz-color-your-chords' },
  { kind: 'song', query: '?song=a_thousand_years', expectTracks: true },
  {
    kind: 'practiceMode',
    query: '?practiceMode=dorian&practiceRoot=d',
    expectTracks: true,
  },
  {
    kind: 'practiceGenre',
    query: '?practiceGenre=funk&practiceLevel=1&practiceSection=A',
    // The genre backing engine is deliberately not reproducible: it varies
    // the drums and the micro-timing (buildGenrePracticeTrack.ts).
    volatile: ['tracks[].midiClips[].events'],
    expectTracks: true,
  },
  { kind: 'jam', query: '?jam=1', expectTracks: true },
];

/** No project has this id (the mock answers 404, as the API would). */
const UNKNOWN_PROJECT_ID = '00000000-0000-4000-8000-00000000dead';

/** The R5 links: every boot intent with an id that does not exist. */
const BAD_LINKS = [
  { kind: 'tutorial', query: '?tutorial=bogus-id' },
  { kind: 'demo', query: '?demo=bogus-id' },
  { kind: 'song', query: '?song=bogus-id' },
  { kind: 'template', query: '?template=bogus-id' },
  { kind: 'project', query: `?project=${UNKNOWN_PROJECT_ID}` },
  { kind: 'practiceMode', query: '?practiceMode=bogus-id&practiceRoot=d' },
  {
    kind: 'practiceGenre',
    query: '?practiceGenre=bogus-id&practiceLevel=1&practiceSection=A',
  },
];

/**
 * The yes/no facts scenarios report, each with the value the overhaul is
 * after (plan.md, Stage A exit criteria). The ratchet fails a run when a
 * flag leaves its recorded value in the wrong direction.
 */
const FLAGS = {
  autosaveWrittenDuringPlayback: {
    goal: true,
    text: 'autosave written during playback',
  },
  autosaveWrittenAfterSynthEdit: {
    goal: true,
    text: 'autosave written after the synth edit',
  },
  autosaveFlushedOnClose: {
    goal: true,
    text: 'autosave written as the tab closed',
  },
  autosaveKept: { goal: true, text: 'crash copy (the autosave) kept' },
  errorToast: { goal: true, text: 'an error was shown' },
  savedToast: { goal: true, text: '"Project saved" shown' },
  uploadedPendingAudio: {
    goal: true,
    text: 'the save uploaded the in-memory clip (POST /assets, signed PUT, finalize)',
  },
};

// ── In-page helpers ─────────────────────────────────────────────────────────

/**
 * Init script, re-run on every page load. It remembers when the editor's
 * store was last written (so the suite can tell when the editor has settled
 * and when the autosave, written 1.5 s after the last write, has flushed),
 * keeps the autosave as the document found it (before the editor read or
 * rewrote it), and collects every toast, which disappears within seconds.
 */
function installWatch({ autosaveKey }) {
  if (window !== window.top || window.__RT_WATCH__) return;
  const watch = { lastWrite: 0, writes: 0, toasts: [] };
  window.__RT_WATCH__ = watch;
  try {
    window.__RT_BOOT_AUTOSAVE__ = localStorage.getItem(autosaveKey);
  } catch {
    window.__RT_BOOT_AUTOSAVE__ = null;
  }
  const attach = () => {
    const store = window.__MA_STORE__;
    if (!store) {
      setTimeout(attach, 50);
      return;
    }
    watch.lastWrite = Date.now();
    store.subscribe(() => {
      watch.lastWrite = Date.now();
      watch.writes += 1;
    });
  };
  attach();
  // Sonner toasts: <li data-sonner-toast data-type="error"> with the title in
  // [data-title].
  const seen = new WeakMap();
  setInterval(() => {
    for (const el of document.querySelectorAll('[data-sonner-toast]')) {
      const text = (
        el.querySelector('[data-title]')?.textContent ??
        el.textContent ??
        ''
      ).trim();
      const entry = seen.get(el);
      if (!entry) {
        const added = {
          type: el.getAttribute('data-type') || 'default',
          text,
          at: Date.now(),
        };
        seen.set(el, added);
        watch.toasts.push(added);
      } else if (!entry.text && text) {
        entry.text = text;
      }
    }
  }, 100);
}

/** Init script: leaves a hand-off (a recorded jam) once per tab. */
function seedHandoffOnce({ key, value }) {
  try {
    if (window !== window.top || sessionStorage.getItem('rt:handoff')) return;
    sessionStorage.setItem('rt:handoff', '1');
    localStorage.setItem(key, value);
  } catch {
    // An opaque origin (about:blank) has no storage; the editor page does.
  }
}

/**
 * In-page: how many asset-backed audio clips and samples still wait for
 * their bytes. It imports the editor's own modules by their dev-server URL
 * (the browser resolves it, not node, so the linter is handed a variable).
 */
async function pendingAudio() {
  const devModule = (url) => import(url);
  const [buffers, chops] = await Promise.all([
    devModule('/src/daw/audio/AudioBufferStore.ts'),
    devModule('/src/daw/instruments/samplerChops.ts'),
  ]);
  let pending = 0;
  for (const track of window.__MA_STORE__.getState().tracks) {
    for (const clip of track.audioClips) {
      if (clip.assetId && !buffers.getAudioBuffer(clip.id)) pending += 1;
    }
    const sample = track.samplerSample;
    if (
      sample &&
      (sample.sourceUrl || sample.assetId) &&
      !buffers.getAudioBuffer(chops.samplerBufferKey(sample.sampleId))
    ) {
      pending += 1;
    }
  }
  return pending;
}

// ── Node-side page helpers ──────────────────────────────────────────────────

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** Requests in flight per page (trackNetwork), for settle. */
const inflight = new WeakMap();

/**
 * Counts the page's requests in flight. Some writes land only after a fetch
 * (a demo's drum groove, a practice track's .mid, a clip's audio), so a
 * still store alone does not mean the editor has settled. Only requests that
 * can feed the editor are counted: the dev server's own files and the mocked
 * Studio API. Others never settle anything, and some never report an end
 * (the telemetry beacon a page sends as it unloads).
 */
function trackNetwork(page, base) {
  const open = new Set();
  inflight.set(page, open);
  const feedsEditor = (url) =>
    url.startsWith(base) ||
    url.startsWith(STORAGE_ORIGIN) ||
    /\/api\/studio\/(projects|assets)(\/|$|\?)/.test(url);
  page.on('request', (request) => {
    if (feedsEditor(request.url())) open.add(request);
  });
  const done = (request) => open.delete(request);
  page.on('requestfinished', done);
  page.on('requestfailed', done);
}

/**
 * Waits until no request has been in flight for `idleMs`. Gives up after
 * `timeout` and says so: { idle: false, open: [urls] }.
 */
async function waitForNetworkIdle(page, idleMs = 500, timeout = 15_000) {
  const open = inflight.get(page);
  if (!open) return { idle: true, open: [] };
  const start = Date.now();
  let idleSince = 0;
  while (Date.now() - start < timeout) {
    if (open.size > 0) idleSince = 0;
    else if (!idleSince) idleSince = Date.now();
    else if (Date.now() - idleSince >= idleMs) return { idle: true, open: [] };
    await sleep(50);
  }
  return {
    idle: false,
    open: [...open].map((r) => `${r.method()} ${r.url()}`.slice(0, 200)),
  };
}

/** Polls an async page function until it returns something truthy. */
async function pollPage(page, fn, arg, what, timeout = 20_000) {
  const start = Date.now();
  for (;;) {
    const value = await page.evaluate(fn, arg);
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error(`timed out: ${what}`);
    await sleep(100);
  }
}

/** Waits until the store has been still for `quietMs` (throws on timeout). */
async function waitForQuiet(page, quietMs = QUIET_MS, timeout = 30_000) {
  await page.waitForFunction(
    (quiet) => {
      const watch = window.__RT_WATCH__;
      return watch?.lastWrite > 0 && Date.now() - watch.lastWrite >= quiet;
    },
    quietMs,
    { timeout, polling: 100 },
  );
}

/** Waits until every asset-backed clip and sample has decoded audio. */
async function waitForAudio(page, timeout = 20_000) {
  const start = Date.now();
  let pending = await page.evaluate(pendingAudio);
  while (pending > 0 && Date.now() - start < timeout) {
    await sleep(200);
    pending = await page.evaluate(pendingAudio);
  }
  return pending;
}

/**
 * Store still, fetches done and audio decoded: the moment a fingerprint
 * means something. The second quiet wait catches writes a fetch triggered.
 * Returns what it saw, so a page that never settled is reported, not hidden.
 */
async function settle(page, label) {
  const started = Date.now();
  await waitForQuiet(page);
  const network = await waitForNetworkIdle(page);
  const pending = await waitForAudio(page);
  await waitForQuiet(page);
  return {
    label,
    ms: Date.now() - started,
    networkIdle: network.idle,
    openRequests: network.open,
    pendingAudio: pending,
  };
}

const settled = (s) => s.networkIdle && s.pendingAudio === 0;

function describeSettle(s) {
  const parts = [];
  if (s.pendingAudio > 0) {
    parts.push(`${s.pendingAudio} clip(s) still without audio after 20 s`);
  }
  if (!s.networkIdle) {
    parts.push(`requests still open after 15 s: ${s.openRequests.join(', ')}`);
  }
  return `${s.label}: ${parts.join('; ')}`;
}

/**
 * settle() for a snapshot taken before a boundary: comparing against a page
 * that never settled would hide losses (both sides missing the same audio)
 * or invent them, so the scenario errors instead.
 */
async function settleOrThrow(page, label) {
  const s = await settle(page, label);
  if (!settled(s)) {
    throw new Error(`the editor never settled ${describeSettle(s)}`);
  }
  return s;
}

/** Date.now() in the page (the same clock as the watch's timestamps). */
const pageNow = (page) => page.evaluate(() => Date.now());

async function autosaveTimestamp(page) {
  return page.evaluate((key) => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null')?.timestamp ?? null;
    } catch {
      return null;
    }
  }, AUTOSAVE_KEY);
}

/**
 * Whether the stored autosave already holds what the editor would write now,
 * its playhead aside. The autosave is written only when a field it saves
 * changes, so after a trailing write to a field it doesn't save (a lesson's
 * step status, a selection) its timestamp stays older than the last store
 * write although nothing is left to flush.
 */
async function autosaveIsCurrent(page, raw) {
  return page.evaluate(async (stored) => {
    try {
      const devModule = (url) => import(url);
      const { serializeSession, sessionFingerprint } = await devModule(
        '/src/daw/persistence/SessionSerializer.ts',
      );
      return (
        sessionFingerprint(JSON.parse(stored)) ===
        sessionFingerprint(serializeSession())
      );
    } catch {
      return false;
    }
  }, raw);
}

/**
 * Waits until the autosave has been written after the last store write (or
 * already matches the store, see autosaveIsCurrent) and the store has stayed
 * still since; returns the raw stored string. With `allowMissing`, an
 * autosave that never comes back is returned as null.
 */
async function waitForAutosave(
  page,
  { quietMs = 2000, timeout = 30_000, allowMissing = false } = {},
) {
  const start = Date.now();
  for (;;) {
    const state = await page.evaluate((key) => {
      const watch = window.__RT_WATCH__;
      const raw = localStorage.getItem(key);
      let timestamp = null;
      try {
        timestamp = raw ? JSON.parse(raw).timestamp : null;
      } catch {
        timestamp = null;
      }
      return {
        lastWrite: watch?.lastWrite ?? 0,
        now: Date.now(),
        raw,
        timestamp,
      };
    }, AUTOSAVE_KEY);
    if (
      state.raw &&
      state.lastWrite > 0 &&
      state.now - state.lastWrite >= quietMs &&
      (state.timestamp >= state.lastWrite ||
        (await autosaveIsCurrent(page, state.raw)))
    ) {
      return state.raw;
    }
    if (Date.now() - start > timeout) {
      if (allowMissing) return state.raw;
      throw new Error('the autosave did not flush');
    }
    await sleep(200);
  }
}

/**
 * What a crash copy holds of the student's work: the project name and, per
 * track, its name, clip counts and note count. A restore re-serialises the
 * session, so the raw strings may differ while the work is all there.
 */
function autosaveDigest(raw) {
  if (!raw) return null;
  try {
    const { data } = JSON.parse(raw);
    return {
      name: data.projectName ?? null,
      chordRegions: data.chordRegions?.length ?? 0,
      tracks: (data.tracks ?? []).map((t) => [
        t.name,
        t.midiClips?.length ?? 0,
        t.audioClips?.length ?? 0,
        (t.midiClips ?? []).reduce(
          (n, c) => n + (c.events?.notes?.length ?? 0),
          0,
        ),
      ]),
    };
  } catch {
    return { unreadable: true };
  }
}

/** Every toast the page has shown since `since` (its own clock). */
const readToasts = (page, since = 0) =>
  page.evaluate(
    (from) => (window.__RT_WATCH__?.toasts ?? []).filter((t) => t.at >= from),
    since,
  );

/** The first toast since `since` that matches, or null after `timeout`. */
async function waitForToast(
  page,
  { since = 0, type = null, match = null, timeout = 10_000 } = {},
) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const found = (await readToasts(page, since)).find(
      (t) => (!type || t.type === type) && (!match || match.test(t.text)),
    );
    if (found || Date.now() > deadline) return found ?? null;
    await sleep(200);
  }
}

/**
 * Waits for the editor after a navigation: 'ready' once the store is out and
 * the editor (or the Practice Track screen, which has no File menu) is on
 * screen, or 'crashed: <message>' when the route's error boundary rendered.
 */
async function waitForEditor(page, timeout = 60_000) {
  const handle = await page.waitForFunction(
    () => {
      if (
        window.__MA_STORE__ &&
        document.querySelector(
          '[data-tutorial-id="file-menu"], [data-testid="practice-track-view"]',
        )
      ) {
        return 'ready';
      }
      const heading = [...document.querySelectorAll('h2')].find((h) =>
        /Unexpected Application Error/.test(h.textContent ?? ''),
      );
      return heading
        ? `crashed: ${heading.nextElementSibling?.textContent ?? ''}`.slice(
            0,
            300,
          )
        : false;
    },
    null,
    { timeout, polling: 100 },
  );
  return handle.jsonValue();
}

/** A full page load of the editor at `query`; resolves like waitForEditor. */
async function openAt(page, base, query) {
  await page.goto(`${base}/studio/editor${query}`, {
    waitUntil: 'domcontentloaded',
    timeout: 180_000,
  });
  return waitForEditor(page, 180_000);
}

/**
 * An in-app navigation, as a <Link> or navigate() makes it: push the entry
 * the way React Router does and let the router hear a popstate.
 */
async function spaNavigate(page, to) {
  await page.evaluate((url) => {
    const idx = (window.history.state?.idx ?? 0) + 1;
    const key = Math.random().toString(36).slice(2, 10);
    window.history.pushState({ usr: null, key, idx }, '', url);
    window.dispatchEvent(
      new PopStateEvent('popstate', { state: window.history.state }),
    );
  }, to);
}

/** In-app from the editor to the Studio Dashboard (the editor unmounts). */
async function leaveEditor(page) {
  await spaNavigate(page, '/studio');
  await page.waitForSelector('[data-tutorial-id="file-menu"]', {
    state: 'detached',
    timeout: 30_000,
  });
  await page.waitForFunction(() => location.pathname === '/studio');
}

async function fingerprint(page) {
  const snapshot = await page.evaluate(fingerprintPage);
  if (snapshot.meta.moduleAccess !== 'ok') {
    throw new Error(
      `fingerprint could not reach the editor's modules (${snapshot.meta.moduleAccess})`,
    );
  }
  return snapshot;
}

/**
 * A fresh context with the mock and the watch installed and the editor
 * open at `query`, settled. With `allowCrash`, an editor that renders its
 * error boundary instead is handed back as `session.crashed` (a loss to
 * report, not a harness error). `handoff` is left in localStorage before
 * the first load (a recorded jam).
 */
async function openSession(
  run,
  query,
  api = run.api,
  { allowCrash = false, handoff: seed = null } = {},
) {
  const session = await newPage(run.browser, run.profile, { probes: false });
  await api.install(session.context);
  await session.context.addInitScript(installWatch, {
    autosaveKey: AUTOSAVE_KEY,
  });
  if (seed) await session.context.addInitScript(seedHandoffOnce, seed);
  trackNetwork(session.page, run.base);
  // Uncaught page errors, reported with the scenario that opened the page.
  run.pageErrors?.push(session.errors);
  const state = await openAt(session.page, run.base, query);
  if (state !== 'ready') {
    if (!allowCrash) throw new Error(`the editor did not open (${state})`);
    session.crashed = state;
    return session;
  }
  session.settled = await settle(session.page, `opening ${query}`);
  return session;
}

async function withSession(run, query, fn, api, options) {
  const session = await openSession(run, query, api, options);
  try {
    return await fn(session);
  } finally {
    await session.context.close();
  }
}

/**
 * Another tab of the session's browser (same context, so the same
 * localStorage), set up like the first: CPU throttle, page errors, network.
 */
async function openTab(run, session) {
  const page = await session.context.newPage();
  page.on('pageerror', (error) =>
    session.errors.push(String(error).slice(0, 500)),
  );
  const { cpuThrottle } = PROFILES[run.profile];
  if (cpuThrottle > 1) {
    const cdp = await session.context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
  }
  trackNetwork(page, run.base);
  return page;
}

// ── Scenarios ───────────────────────────────────────────────────────────────
// Each resolves to { diffs, extraLosses, flags, checks }: the fingerprint
// differences, losses found another way, the FLAGS it measured, and facts
// for the report (checks.settle lists every settle after a boundary).

/**
 * What a scenario hands back when the editor did not come back, with the
 * flags it measured before the boundary.
 */
function crashed(state, checks = {}, flags = {}) {
  return {
    diffs: [],
    extraLosses: ['editor.crashed'],
    flags,
    checks: { ...checks, editor: state },
  };
}

/** The kitchen sink, settled and with its autosave flushed. */
async function applySink(page, assetId) {
  const sink = await page.evaluate(applyKitchenSink, { assetId });
  const s = await settleOrThrow(page, 'after the kitchen sink');
  const raw = await waitForAutosave(page);
  return { sink, settle: s, raw };
}

/** R1: refresh during playback, right after an edit made while playing. */
async function refreshWhilePlaying(run) {
  return withSession(run, '?new=1', async ({ page }) => {
    const { sink } = await applySink(page, run.assetId);
    await startAudio(page);
    const from = await page.evaluate(
      () => window.__MA_STORE__.getState().position,
    );
    await page.evaluate(() => window.__MA_STORE__.getState().play());
    // The sink arms a two-bar count-in, so the playhead moves only after it.
    await page.waitForFunction(
      (start) => {
        const s = window.__MA_STORE__.getState();
        return s.isPlaying && s.position > start + 240;
      },
      from,
      { timeout: 30_000, polling: 100 },
    );
    const savedBeforeEdit = await autosaveTimestamp(page);
    await page.evaluate(
      (id) => window.__MA_STORE__.getState().updateTrack(id, { volume: 0.33 }),
      sink.trackIds.lead,
    );
    await sleep(PAST_DEBOUNCE_MS);
    // The store never goes quiet while playing, so this snapshot is the
    // settled one above plus playback: the audio was decoded before Play.
    const before = await fingerprint(page);
    if (!before.meta.isPlaying) {
      throw new Error('playback stopped before the reload');
    }
    const flags = {
      autosaveWrittenDuringPlayback:
        (await autosaveTimestamp(page)) !== savedBeforeEdit,
    };
    await page.reload({ waitUntil: 'domcontentloaded' });
    const state = await waitForEditor(page);
    if (state !== 'ready') return crashed(state, {}, flags);
    const after = await settle(page, 'after the reload');
    const snapshot = await fingerprint(page);
    const probe = await page.evaluate(probeChordIdCollision);
    return {
      // The playhead moves while playing and is session state in the audit's
      // proposal; where it lands after a refresh is not a loss.
      diffs: compareFingerprints(before, snapshot, {
        defaults: run.defaults,
        ignore: ['transport.position'],
      }),
      extraLosses: probe.collides ? ['ids.newChordIdUnique'] : [],
      flags,
      checks: { chordIdProbe: probe, settle: [after] },
    };
  });
}

/** R2: editor → /studio → history.back(), one edit just before leaving. */
async function spaReturn(run) {
  return withSession(run, '?new=1', async ({ page }) => {
    const { sink } = await applySink(page, run.assetId);
    const before = await fingerprint(page);
    // The last edit before leaving, in the same task as the navigation, so
    // it always falls inside the 1.5 s autosave debounce however loaded the
    // machine is (a person changes a fader and clicks away). The snapshot
    // is the settled state plus that one edit.
    const lead = before.ids.tracks.indexOf(sink.trackIds.lead);
    before.fields[`tracks[${lead}].volume`].value = 0.44;
    await page.evaluate((id) => {
      window.__MA_STORE__.getState().updateTrack(id, { volume: 0.44 });
      const idx = (window.history.state?.idx ?? 0) + 1;
      window.history.pushState(
        { usr: null, key: 'rt-leave', idx },
        '',
        '/studio',
      );
      window.dispatchEvent(
        new PopStateEvent('popstate', { state: window.history.state }),
      );
    }, sink.trackIds.lead);
    await page.waitForSelector('[data-tutorial-id="file-menu"]', {
      state: 'detached',
      timeout: 30_000,
    });
    await page.evaluate(() => window.history.back());
    const state = await waitForEditor(page);
    if (state !== 'ready') return crashed(state);
    const after = await settle(page, 'after the return');
    const snapshot = await fingerprint(page);
    const probe = await page.evaluate(probeChordIdCollision);
    return {
      diffs: compareFingerprints(before, snapshot, { defaults: run.defaults }),
      extraLosses: probe.collides ? ['ids.newChordIdUnique'] : [],
      flags: {},
      checks: { chordIdProbe: probe, settle: [after] },
    };
  });
}

/** Clicks File ▸ Save and waits until the save has sent its PUT. */
async function saveFromFileMenu(page, api) {
  const writesBefore = api.writes.length;
  await page.click('[data-tutorial-id="file-menu"]');
  await page
    .getByRole('menuitem', { name: /^Save\b/ })
    .filter({ hasNotText: 'As' })
    .first()
    .click();
  await page.waitForFunction(
    () => Boolean(window.__MA_STORE__.getState().projectId),
    null,
    { timeout: 30_000 },
  );
  const deadline = Date.now() + 60_000;
  while (
    !api.writes
      .slice(writesBefore)
      .some((w) => w.method === 'PUT' && /\/projects\/[^/]+$/.test(w.path))
  ) {
    if (Date.now() > deadline) throw new Error('File ▸ Save never sent PUT');
    await sleep(100);
  }
}

/**
 * The upload path a save takes for audio held only in memory
 * (uploadAndFinalizeAsset): reserve, the bytes to the signed URL, finalize.
 */
const UPLOAD_STEPS = [
  /^POST \/api\/studio\/assets 200$/,
  /^PUT \/upload\/\S+ 200$/,
  /^POST \/api\/studio\/assets\/[^/\s]+\/finalize 200$/,
];

/** R3: File ▸ Save, then ?project=<id> in a fresh context. */
async function cloudSaveOpen(run, mode) {
  const api = createMockStudioApi({ mode });
  const assetId = seedSample(api);
  const saved = await withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await applySink(page, assetId);
      const since = await pageNow(page);
      await saveFromFileMenu(page, api);
      const toast = await waitForToast(page, {
        since,
        match: /Project saved/,
      });
      await settleOrThrow(page, 'after the save');
      return {
        before: await fingerprint(page),
        savedToast: Boolean(toast),
        toasts: await readToasts(page, since),
      };
    },
    api,
  );
  const projectId = saved.before.fields['project.id'].value;
  const put = api.writes.findLast(
    (w) => w.method === 'PUT' && /\/projects\/[^/]+$/.test(w.path),
  );
  const sent = put?.body ?? {};
  const requests = api.log.map((l) => `${l.method} ${l.path} ${l.status}`);
  const flags = {
    savedToast: saved.savedToast,
    uploadedPendingAudio: UPLOAD_STEPS.every((step) =>
      requests.some((r) => step.test(r)),
    ),
  };
  const checks = {
    savePath: 'File ▸ Save',
    toasts: saved.toasts,
    requests,
    sentFields: {
      project: Object.keys(sent).sort(),
      prism: Object.keys(sent.prism ?? {}).sort(),
      track: Object.keys(sent.tracks?.[0] ?? {}).sort(),
      settings: [
        ...new Set(
          (sent.tracks ?? []).flatMap((t) => Object.keys(t.settings ?? {})),
        ),
      ].sort(),
    },
  };
  return withSession(
    run,
    `?project=${encodeURIComponent(projectId)}`,
    async ({ page, crashed: state }) => {
      if (state) return crashed(state, checks, flags);
      await page.waitForFunction(
        (id) => window.__MA_STORE__.getState().projectId === id,
        projectId,
        { timeout: 30_000 },
      );
      const after = await settle(page, 'after the open');
      const snapshot = await fingerprint(page);
      // Whose ids the reopened tracks carry: the mock's row ids, or ids the
      // client minted (deserializeCloudProject does, for every track and
      // audio clip), so the id losses are not an artefact of the mock.
      const rows = api.projects.get(projectId)?.tracks ?? [];
      checks.trackIdsFromServer = {
        rows: rows.length,
        used: snapshot.ids.tracks.filter((id) =>
          rows.some((row) => row.id === id),
        ).length,
      };
      return {
        diffs: compareFingerprints(saved.before, snapshot, {
          defaults: run.defaults,
        }),
        extraLosses: [],
        flags,
        checks: { ...checks, settle: [after] },
      };
    },
    api,
    { allowCrash: true },
  );
}

/**
 * Raw ids: a new project mints its own, and an in-app boot keeps counting
 * chord ids where the last project stopped, so they are no leak.
 */
const ID_FIELDS = [
  'ids.tracks',
  'ids.midiClips',
  'ids.audioClips',
  'ids.chordRegions',
  'ids.chordRegionIdsUnique',
];

/** Cold boots of the link; fields that differ between them are volatile. */
async function coldBaseline(run, intent) {
  const boots = [];
  const count = Math.max(1, Number(run.args.calibrate ?? 2));
  for (let i = 0; i < count; i++) {
    if (intent.kind === 'new' && i === 0 && run.defaults) {
      boots.push(run.defaults);
      continue;
    }
    boots.push(
      await withSession(
        run,
        intent.query,
        (session) => {
          if (!settled(session.settled)) {
            throw new Error(
              `the cold boot never settled ${describeSettle(session.settled)}`,
            );
          }
          return fingerprint(session.page);
        },
        run.api,
        { handoff: handoff(intent.kind) },
      ),
    );
  }
  if (intent.expectTracks && boots[0].fields['tracks.count'].value === 0) {
    throw new Error(
      `${intent.query} opened an empty project, so the link no longer loads (LEAK_INTENTS needs another id)`,
    );
  }
  const volatile = new Set(intent.volatile ?? []);
  for (const other of boots.slice(1)) {
    for (const d of compareFingerprints(boots[0], other, {
      ignore: ID_FIELDS,
    })) {
      volatile.add(d.field);
    }
  }
  return { expected: boots[0], volatile: [...volatile].sort() };
}

/** R4: after the kitchen sink, an in-app boot must look like a cold one. */
async function leakCheck(run, intent) {
  const { expected, volatile } = await coldBaseline(run, intent);
  return withSession(run, '?new=1', async ({ page }) => {
    await applySink(page, run.assetId);
    const sink = await fingerprint(page);
    await leaveEditor(page);
    const seed = handoff(intent.kind);
    if (seed) {
      await page.evaluate(
        ({ key, value }) => localStorage.setItem(key, value),
        seed,
      );
    }
    await spaNavigate(page, `/studio/editor${intent.query}`);
    const state = await waitForEditor(page);
    if (state !== 'ready') return crashed(state);
    const after = await settle(page, `after the in-app ${intent.query}`);
    const got = await fingerprint(page);
    const diffs = compareFingerprints(expected, got, {
      ignore: [...volatile, ...ID_FIELDS],
    });
    for (const d of diffs) {
      // Carried over: the value is the previous project's.
      d.carriedOver = Boolean(
        sink.fields[d.key] && sameValue(sink.fields[d.key].value, d.after),
      );
    }
    return {
      diffs,
      extraLosses: [],
      flags: {},
      checks: { volatile, settle: [after] },
    };
  });
}

/** R5: a link to something that does not exist, in-app or a full load. */
async function badLink(run, link, how) {
  return withSession(run, '?new=1', async ({ page }) => {
    const { raw } = await applySink(page, run.assetId);
    const before = await fingerprint(page);
    const since = how === 'spa' ? await pageNow(page) : 0;
    if (how === 'spa') {
      await leaveEditor(page);
      await spaNavigate(page, `/studio/editor${link.query}`);
    } else {
      await page.goto(`${run.base}/studio/editor${link.query}`, {
        waitUntil: 'domcontentloaded',
      });
    }
    const state = await waitForEditor(page);
    if (state !== 'ready') return crashed(state);
    const after = await settle(page, `after ${link.query}`);
    const snapshot = await fingerprint(page);
    // Some links fail only after a fetch (a genre's lesson flows).
    const error = await waitForToast(page, {
      since,
      type: 'error',
      timeout: 5000,
    });
    const kept = await waitForAutosave(page, {
      allowMissing: true,
      timeout: 10_000,
    });
    const probe = await page.evaluate(probeChordIdCollision);
    return {
      diffs: compareFingerprints(before, snapshot, { defaults: run.defaults }),
      extraLosses: probe.collides ? ['ids.newChordIdUnique'] : [],
      flags: {
        errorToast: Boolean(error),
        autosaveKept: sameValue(autosaveDigest(kept), autosaveDigest(raw)),
      },
      checks: {
        toasts: await readToasts(page, since),
        autosave: { before: autosaveDigest(raw), after: autosaveDigest(kept) },
        chordIdProbe: probe,
        settle: [after],
      },
    };
  });
}

/**
 * R6: a synth-only edit, then a refresh. The patch lives in the synth store,
 * which the autosave does not watch (state-reload-06), so only the patch is
 * compared: everything else a refresh loses is R1's business.
 */
async function synthEditRefresh(run) {
  return withSession(run, '?new=1', async ({ page }) => {
    const { sink } = await applySink(page, run.assetId);
    const lead = sink.trackIds.lead;
    // Open the Lead's synth panel, as a student about to shape the sound.
    await page.evaluate((id) => {
      const s = window.__MA_STORE__.getState();
      s.setCurrentView('arrange');
      s.setSelectedTrackId(id);
      s.setChannelStripTab('controls');
    }, lead);
    await pollPage(
      page,
      async (id) => {
        const devModule = (url) => import(url);
        const sts = await devModule('/src/daw/oracle-synth/synthTrackState.ts');
        return sts.getActiveSynthTrack() === id;
      },
      lead,
      'the synth panel bridge',
    );
    await waitForAutosave(page);
    const savedBefore = await autosaveTimestamp(page);
    await page.evaluate(() => {
      const synth = window.__MA_SYNTH_STORE__.getState();
      synth.setFilterParam(0, 'cutoff', 777);
      synth.setFilterParam(0, 'resonance', 0.8);
    });
    await sleep(PAST_DEBOUNCE_MS);
    const before = await fingerprint(page);
    const flags = {
      autosaveWrittenAfterSynthEdit:
        (await autosaveTimestamp(page)) !== savedBefore,
    };
    await page.reload({ waitUntil: 'domcontentloaded' });
    const state = await waitForEditor(page);
    if (state !== 'ready') return crashed(state, {}, flags);
    const after = await settle(page, 'after the reload');
    const snapshot = await fingerprint(page);
    return {
      diffs: compareFingerprints(before, snapshot).filter(
        (d) => d.field === 'tracks[].synthPatch',
      ),
      extraLosses: [],
      flags,
      checks: { settle: [after] },
    };
  });
}

/**
 * R7: one edit, the tab closes inside the debounce, and a new tab opens the
 * editor (which restores the autosave). The close runs the page's unload
 * handlers, as a person closing the tab does.
 */
async function tabClose(run) {
  return withSession(run, '?new=1', async (session) => {
    const { page } = session;
    const { sink } = await applySink(page, run.assetId);
    const before = await fingerprint(page);
    const lead = before.ids.tracks.indexOf(sink.trackIds.lead);
    before.fields[`tracks[${lead}].volume`].value = 0.44;
    // Leave the page if it asks (a beforeunload prompt), as a person would.
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    const closed = new Promise((done) => page.once('close', done));
    const editedAt = await page.evaluate((id) => {
      window.__MA_STORE__.getState().updateTrack(id, { volume: 0.44 });
      return Date.now();
    }, sink.trackIds.lead);
    await page.close({ runBeforeUnload: true });
    await Promise.race([
      closed,
      sleep(15_000).then(() => {
        throw new Error('the tab did not close');
      }),
    ]);
    const closeMs = Date.now() - editedAt;
    if (closeMs > CLOSE_WITHIN_MS) {
      throw new Error(
        `the tab took ${closeMs} ms to close, too long to test the 1.5 s debounce`,
      );
    }
    const next = await openTab(run, session);
    const state = await openAt(next, run.base, '');
    if (state !== 'ready') return crashed(state);
    // The autosave as the new tab found it, before the editor touched it.
    const found = await next.evaluate(() => window.__RT_BOOT_AUTOSAVE__);
    const after = await settle(next, 'after reopening');
    const snapshot = await fingerprint(next);
    let foundTimestamp = null;
    try {
      foundTimestamp = JSON.parse(found ?? 'null')?.timestamp ?? null;
    } catch {
      foundTimestamp = null;
    }
    return {
      diffs: compareFingerprints(before, snapshot, { defaults: run.defaults }),
      extraLosses: [],
      flags: {
        autosaveFlushedOnClose:
          foundTimestamp !== null && foundTimestamp >= editedAt,
      },
      checks: { closeMs, settle: [after] },
    };
  });
}

/** Every scenario, as { group, key, id, title, run }; ids are stable. */
function allScenarios() {
  return [
    {
      group: 'R1',
      key: '',
      id: 'R1-refresh-while-playing',
      title: 'Edit while playing, then refresh',
      run: refreshWhilePlaying,
    },
    {
      group: 'R2',
      key: '',
      id: 'R2-spa-return',
      title: 'Editor → /studio → history.back()',
      run: spaReturn,
    },
    ...API_MODES.map((mode) => ({
      group: 'R3',
      key: mode,
      id: `R3-cloud-save-open:${mode}`,
      title: `File ▸ Save, then ?project= in a fresh context (${mode} API)`,
      run: (r) => cloudSaveOpen(r, mode),
    })),
    ...LEAK_INTENTS.map((intent) => ({
      group: 'R4',
      key: intent.kind,
      id: `R4-leak:${intent.kind}`,
      title: `In-app ${intent.query} after the kitchen sink vs a cold boot`,
      run: (r) => leakCheck(r, intent),
    })),
    ...BAD_LINKS.flatMap((link) =>
      ['spa', 'cold'].map((how) => ({
        group: 'R5',
        key: `${link.kind}:${how}`,
        id: `R5-bad-link:${link.kind}:${how}`,
        title: `${link.query} (${how === 'spa' ? 'in-app' : 'full page load'}) after the kitchen sink`,
        run: (r) => badLink(r, link, how),
      })),
    ),
    {
      group: 'R6',
      key: '',
      id: 'R6-synth-edit-refresh',
      title: 'A synth-only edit, then refresh (the patch alone is compared)',
      run: synthEditRefresh,
    },
    {
      group: 'R7',
      key: '',
      id: 'R7-tab-close',
      title: 'An edit, the tab closes inside the debounce, a new tab opens',
      run: tabClose,
    },
  ];
}

/** The scenarios a run asked for (--scenario, --api-mode). */
function plannedScenarios(args) {
  const tokens = (args.scenario ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const modes =
    !args['api-mode'] || args['api-mode'] === 'all'
      ? API_MODES
      : args['api-mode'].split(',');
  const matches = (scenario, token) => {
    const [group, ...rest] = token.split(':');
    const want = rest.join(':');
    return (
      group === scenario.group &&
      (!want || scenario.key === want || scenario.key.startsWith(`${want}:`))
    );
  };
  const all = allScenarios();
  for (const token of tokens) {
    if (!all.some((s) => matches(s, token))) {
      throw new Error(`--scenario=${token} matches no scenario`);
    }
  }
  return all.filter(
    (s) =>
      (s.group !== 'R3' || modes.includes(s.key)) &&
      (tokens.length === 0 || tokens.some((token) => matches(s, token))),
  );
}

// ── Losses and the ratchet ──────────────────────────────────────────────────

/** A difference's kind as the report and the ratchet count it. */
const kindOf = (d) => (d.carriedOver ? 'carried-over' : d.kind);

/**
 * The countable losses of a scenario: one per differing key, except that a
 * track or clip missing on one side counts once, as a whole (listing each
 * of its fields would only repeat that), and is carried over only if all of
 * it was. Losses found another way (`extraLosses`) count once each.
 */
function lossUnits(diffs, extraLosses) {
  const units = [];
  const entities = new Map();
  for (const d of diffs) {
    if (!d.entity) {
      units.push({
        field: d.field,
        group: d.group,
        kind: kindOf(d),
        key: d.key,
        before: d.before,
        after: d.after,
      });
      continue;
    }
    let unit = entities.get(d.entity.key);
    if (!unit) {
      unit = {
        field: d.entity.field,
        group: 'doc',
        kind: d.kind,
        key: d.entity.key,
      };
      unit.carried = true;
      entities.set(d.entity.key, unit);
      units.push(unit);
    }
    unit.carried &&= Boolean(d.carriedOver);
    // Its name (a track, a MIDI clip) or reference (an audio clip) shows it.
    if (d.key === `${d.entity.key}.name` || d.key === `${d.entity.key}.ref`) {
      unit.before = d.before;
      unit.after = d.after;
    }
  }
  for (const unit of entities.values()) {
    if (unit.carried) unit.kind = 'carried-over';
    delete unit.carried;
  }
  for (const field of extraLosses) {
    units.push({
      field,
      group: field.startsWith('ids.') ? 'ids' : 'editor',
      kind: 'changed',
      key: field,
    });
  }
  return units;
}

/** { field: { kind: number of keys } }, the ratchet's unit, sorted. */
function lossCounts(units) {
  const counts = {};
  for (const { field, kind } of units) {
    counts[field] ??= {};
    counts[field][kind] = (counts[field][kind] ?? 0) + 1;
  }
  return sortKeys(counts, (kinds) => sortKeys(kinds));
}

function sortKeys(object, map = (value) => value) {
  return Object.fromEntries(
    Object.keys(object)
      .sort()
      .map((key) => [key, map(object[key])]),
  );
}

const keyTotal = (counts) =>
  Object.values(counts).reduce(
    (sum, kinds) => sum + Object.values(kinds).reduce((a, b) => a + b, 0),
    0,
  );

/** Groups a scenario's losses by field for the report, with examples. */
function summarizeLosses(units) {
  const byField = new Map();
  for (const unit of units) {
    const entry = byField.get(unit.field) ?? {
      field: unit.field,
      group: unit.group,
      kinds: {},
      keys: [],
      examples: [],
    };
    entry.kinds[unit.kind] = (entry.kinds[unit.kind] ?? 0) + 1;
    entry.keys.push(unit.key);
    if (entry.examples.length < 2 && ('before' in unit || 'after' in unit)) {
      entry.examples.push({
        key: unit.key,
        before: unit.before,
        after: unit.after,
      });
    }
    byField.set(unit.field, entry);
  }
  return [...byField.values()]
    .map((e) => ({ ...e, kinds: sortKeys(e.kinds) }))
    .sort((a, b) => a.field.localeCompare(b.field));
}

/**
 * The known list; a missing file means no baseline yet. A file in an older
 * layout cannot be compared against, except by the run that rewrites it.
 */
function readKnown(file, updating) {
  const empty = { format: KNOWN_FORMAT, profiles: {} };
  if (!existsSync(file)) return empty;
  const known = JSON.parse(readFileSync(file, 'utf8'));
  if (known.format === KNOWN_FORMAT) return known;
  if (updating) return empty;
  throw new Error(
    `${relative(ROOT, file)} is in an older layout; rewrite it with --update-known`,
  );
}

const yesNo = (value) => (value ? 'yes' : 'no');

/**
 * Compares each finished scenario with its known entry: `regressions` fail
 * the run, `fixes` are improvements to record with --update-known.
 */
function applyRatchet(results, entries = {}) {
  for (const r of results) {
    if (r.status !== 'ok') continue;
    const known = entries[r.id];
    r.baselined = Boolean(known);
    r.regressions = [];
    r.fixes = [];
    const fields = new Set([
      ...Object.keys(r.lossCounts),
      ...Object.keys(known?.losses ?? {}),
    ]);
    for (const field of [...fields].sort()) {
      const now = r.lossCounts[field] ?? {};
      const was = known?.losses?.[field] ?? {};
      for (const kind of new Set([...Object.keys(now), ...Object.keys(was)])) {
        const n = now[kind] ?? 0;
        const k = was[kind] ?? 0;
        const line = `${field}: ${n} ${kind} (known ${k})`;
        if (n > k) r.regressions.push(line);
        else if (n < k) r.fixes.push(line);
      }
    }
    for (const [flag, value] of Object.entries(r.flags)) {
      const was = known?.flags?.[flag];
      if (was === value) continue;
      const line = `flag ${flag}: ${yesNo(value)} (known ${was === undefined ? 'none' : yesNo(was)}, goal ${yesNo(FLAGS[flag].goal)})`;
      if (value === FLAGS[flag].goal) {
        if (was !== undefined) r.fixes.push(line);
      } else {
        r.regressions.push(line);
      }
    }
    const errors = r.pageErrors.length;
    const knownErrors = known?.pageErrors ?? 0;
    const line = `page errors: ${errors} (known ${knownErrors})`;
    if (errors > knownErrors) r.regressions.push(line);
    else if (errors < knownErrors) r.fixes.push(line);
  }
}

async function writeFormatted(file, text) {
  const config = (await prettier.resolveConfig(file)) ?? {};
  const formatted = await prettier.format(text, { ...config, filepath: file });
  writeFileSync(file, formatted);
  return formatted;
}

/**
 * Records this run's results: every finished scenario of every profile that
 * ran replaces its entry; other profiles and scenarios keep theirs, and
 * scenarios this suite no longer has are dropped.
 */
async function updateKnown(file, reports, known) {
  const profiles = { ...(known.profiles ?? {}) };
  const current = new Set(allScenarios().map((s) => s.id));
  for (const report of reports) {
    const entries = { ...(profiles[report.profile] ?? {}) };
    for (const r of report.scenarios) {
      if (r.status !== 'ok') continue;
      entries[r.id] = {
        flags: sortKeys(r.flags),
        pageErrors: r.pageErrors.length,
        losses: r.lossCounts,
      };
    }
    for (const id of Object.keys(entries)) {
      if (!current.has(id)) delete entries[id];
    }
    profiles[report.profile] = sortKeys(entries);
  }
  const { commit } = gitInfo();
  await writeFormatted(
    file,
    JSON.stringify({
      about:
        "Today's round-trip results per profile and scenario (scripts/studio-perf/roundtrip.mjs, milestone 1.0 baseline). losses: field -> number of keys lost per kind (a tracks[] or clips[] field counts one key per track or clip, and a track or clip that is gone altogether counts once, as 'tracks[] (whole track)' or '... (whole clip)'); flags: the scenario's yes/no checks; pageErrors: uncaught page errors. A run fails on more keys of a kind than listed, a flag moving away from its goal, or more page errors. Rewrite with --update-known once a fix lands.",
      format: KNOWN_FORMAT,
      updatedAt: new Date().toISOString().slice(0, 10),
      commit,
      profiles: sortKeys(profiles),
    }),
  );
}

// ── Fixture capture ─────────────────────────────────────────────────────────

function seedSample(api) {
  // A real WAV from the repo, as if recorded and uploaded earlier.
  return api.seedAsset({
    bytes: readFileSync(SAMPLE_WAV),
    contentType: 'audio/wav',
    originalName: 'kitchen-sink-take.wav',
  });
}

/** The lesson's step and its status (or null once it has ended). */
const lessonAt = (page) =>
  page.evaluate(() => {
    const s = window.__MA_STORE__.getState();
    return s.activeTutorialId
      ? {
          lesson: s.activeTutorialId,
          step: s.tutorialStepIndex,
          status: s.tutorialStepStatus,
        }
      : null;
  });

/** True once lesson `id` has moved past step `index` (or ended). */
async function waitPastStep(page, id, index, timeout) {
  try {
    await page.waitForFunction(
      ({ lesson, i }) => {
        const s = window.__MA_STORE__.getState();
        return s.activeTutorialId !== lesson || s.tutorialStepIndex > i;
      },
      { lesson: id, i: index },
      { timeout, polling: 100 },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * The driver context lessonDrivers.mjs expects (lessons.mjs makes the full
 * one, which records and measures; capture only needs the actions).
 */
function captureDriverContext(page) {
  const timeout = 10_000;
  const anchor = (id) => page.locator(`[data-tutorial-id="${id}"]`).first();
  const ctx = {
    page,
    click: (locator) => locator.click({ timeout }),
    clickAnchor: (id) => ctx.click(anchor(id)),
    clickAt: async (locator, fx, fy) => {
      const box = await locator.boundingBox({ timeout });
      if (!box) throw new Error('no box to click in');
      await page.mouse.click(box.x + fx * box.width, box.y + fy * box.height);
    },
    select: (locator, value) => locator.selectOption(value, { timeout }),
    press: (key) => page.keyboard.press(key),
    act: (label, fn, arg) => page.evaluate(fn, arg),
    read: (fn, arg) => page.evaluate(fn, arg),
    waitFor: (label, fn, arg, ms = timeout) =>
      page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }),
    measure: async () => {},
    next: () =>
      page
        .locator('button[aria-label="Quit tutorial"]')
        .locator('xpath=ancestor::div[contains(@style, "position: fixed")][1]')
        .getByRole('button', { name: /^(Next|Finish)$/ })
        .click({ timeout }),
    note: () => {},
    problem: () => {},
  };
  return ctx;
}

/**
 * One step by its walkthrough driver, else the driver's fallback: 'driver',
 * 'fallback', or null when neither moved the lesson on.
 */
async function driveStep(page, ctx, driver, id, index) {
  if (!driver) return null;
  let how = null;
  const ran = await driver.run(ctx).then(
    () => true,
    () => false,
  );
  if (
    ran &&
    (await waitPastStep(page, id, index, driver.advanceTimeoutMs ?? 15_000))
  ) {
    how = 'driver';
  } else if (driver.fallback) {
    await driver.fallback(ctx).catch(() => {});
    if (await waitPastStep(page, id, index, 15_000)) how = 'fallback';
  }
  if (driver.after) await driver.after(ctx).catch(() => {});
  return how;
}

/**
 * Plays lesson `id` to its end with the walkthrough's step drivers: each
 * step by its driver, else its fallback, else moved on the way Next would,
 * so the end state is always reached. Returns how each step was passed,
 * which the manifest records.
 */
async function finishLesson(page, id) {
  const { driverFor } = await import('./lessonDrivers.mjs');
  const steps = await page.evaluate(
    async ({ path, lesson }) => {
      const { getTutorial } = await import(path);
      return (getTutorial(lesson)?.steps ?? []).map((step) => step.id);
    },
    { path: TUTORIALS_MODULE, lesson: id },
  );
  const ctx = captureDriverContext(page);
  const passed = {};
  for (let i = 0; i < steps.length; i++) {
    // The step's preconditions apply and its coach card arrives first.
    await sleep(300);
    const at = await lessonAt(page);
    if (at?.lesson !== id) break;
    let how = null;
    if (at.step > i) {
      how = 'by itself';
    } else if (at.status === 'done') {
      // Done before anything ran: it advances after its celebration.
      if (await waitPastStep(page, id, i, 15_000)) how = 'by itself';
    } else {
      how = await driveStep(page, ctx, driverFor(id, steps[i]), id, i);
    }
    if (!how) {
      await page.evaluate(
        ({ index, total }) => {
          const s = window.__MA_STORE__.getState();
          if (index + 1 < total) s.goToTutorialStep(index + 1);
          else s.quitTutorial();
        },
        { index: i, total: steps.length },
      );
      how = 'forced';
    }
    passed[steps[i]] = how;
  }
  // The last step's completion ends the lesson after its celebration.
  const ended = await page
    .waitForFunction(
      () => !window.__MA_STORE__.getState().activeTutorialId,
      null,
      { timeout: 15_000 },
    )
    .then(
      () => true,
      () => false,
    );
  if (!ended) {
    await page.evaluate(() => window.__MA_STORE__.getState().quitTutorial());
  }
  return passed;
}

async function captureFixtures(run) {
  const dir = resolve(run.args['fixtures-dir'] ?? FIXTURE_DIR);
  mkdirSync(dir, { recursive: true });
  // The boots come from the app's own catalogues, so a new demo, template
  // or lesson is captured without editing this script.
  const catalogue = await withSession(run, '?new=1', ({ page }) =>
    page.evaluate(async (tutorials) => {
      const devModule = (url) => import(url);
      const [demos, templates, lessons] = await Promise.all([
        devModule('/src/daw/data/demoProjects.ts'),
        devModule('/src/daw/data/projectTemplates.ts'),
        devModule(tutorials),
      ]);
      return {
        demos: demos.DEMO_PROJECTS.map((d) => d.id),
        templates: templates.PROJECT_TEMPLATES.map((t) => t.id),
        lessons: lessons.TUTORIALS.map((t) => t.id),
      };
    }, TUTORIALS_MODULE),
  );
  const intent = (kind) => LEAK_INTENTS.find((i) => i.kind === kind);
  const targets = [
    { name: 'new-project', query: '?new=1' },
    ...catalogue.demos.map((id) => ({ name: id, query: `?demo=${id}` })),
    ...catalogue.templates.map((id) => ({
      name: `template-${id}`,
      query: `?template=${id}`,
    })),
    { name: 'song-a_thousand_years', query: intent('song').query },
    { name: 'practice-dorian-d', query: intent('practiceMode').query },
    { name: 'practice-funk-1-a', query: intent('practiceGenre').query },
    { name: 'jam-import', query: '?jam=1', handoff: handoff('jam') },
    ...catalogue.lessons.map((id) => ({
      name: `lesson-end-${id}`,
      query: `?tutorial=${id}`,
      lesson: id,
    })),
    { name: 'kitchen-sink', query: '?new=1', kitchenSink: true },
  ];
  const fixtures = [];
  for (const target of targets) {
    const { raw, steps } = await withSession(
      run,
      target.query,
      async ({ page }) => {
        let passed = null;
        if (target.kitchenSink) {
          await page.evaluate(applyKitchenSink, { assetId: run.assetId });
        }
        if (target.lesson) passed = await finishLesson(page, target.lesson);
        await settleOrThrow(page, `capturing ${target.name}`);
        return { raw: await waitForAutosave(page), steps: passed };
      },
      run.api,
      { handoff: target.handoff ?? null },
    );
    const parsed = JSON.parse(raw);
    if (parsed.version !== 2) {
      throw new Error(`${target.name}: autosave version ${parsed.version}`);
    }
    const file = join(dir, `${target.name}.json`);
    const written = await writeFormatted(file, raw);
    if (JSON.stringify(JSON.parse(written)) !== raw) {
      throw new Error(`${target.name}: formatting changed the stored value`);
    }
    fixtures.push({
      file: `${target.name}.json`,
      boot: target.kitchenSink
        ? '?new=1 + scripts/studio-perf/fixtures/kitchenSink.mjs'
        : target.lesson
          ? `${target.query}, played to its end by lessonDrivers.mjs`
          : target.query,
      ...(steps ? { steps } : {}),
      tracks: parsed.data.tracks.length,
      bytes: Buffer.byteLength(raw, 'utf8'),
      sha256: createHash('sha256').update(raw).digest('hex'),
    });
    console.log(`  captured ${target.name} (${fixtures.at(-1).bytes} bytes)`);
  }
  // A fixture this capture no longer makes would be stale: remove it.
  const keep = new Set([...fixtures.map((f) => f.file), 'manifest.json']);
  for (const name of readdirSync(dir)) {
    if (name.endsWith('.json') && !keep.has(name)) rmSync(join(dir, name));
  }
  await writeFormatted(
    join(dir, 'manifest.json'),
    JSON.stringify({
      about:
        "Real v2 Studio autosaves (localStorage 'musicAtlas:daw:autosave') captured by scripts/studio-perf/roundtrip.mjs --capture-fixtures, for the codec v3 migration tests. Each file is the stored string pretty-printed; JSON.stringify(JSON.parse(file)) reproduces it byte for byte, and sha256 is the hash of that string (manifest.test.ts checks both). A lesson's steps say how each step was passed: by its walkthrough driver, its fallback, by itself, or forced on as Next would.",
      storageKey: AUTOSAVE_KEY,
      sessionSchemaVersion: 2,
      capturedAt: new Date().toISOString(),
      commit: gitInfo().commit,
      fixtures,
    }),
  );
  console.log(
    `${fixtures.length} fixtures in ${relative(ROOT, dir) || dir} (+ manifest.json)`,
  );
  return 0;
}

// ── Summary ─────────────────────────────────────────────────────────────────

/** Report groups, in the order the summary lists them. */
const GROUP_NAMES = {
  editor: 'editor',
  doc: 'project',
  prefs: 'per-user prefs',
  session: 'session',
  view: 'view',
  context: 'lesson/practice context',
  ids: 'ids',
};

function gitInfo() {
  const git = (...args) => {
    try {
      return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch {
      return null;
    }
  };
  return {
    commit: git('rev-parse', '--short', 'HEAD'),
    branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
    dirty: Boolean(git('status', '--porcelain', '--', 'src')),
  };
}

/** A scenario's flags, in words. */
function flagsText(flags = {}) {
  return Object.entries(flags)
    .map(([flag, value]) => {
      const { goal, text } = FLAGS[flag];
      return `${text}: ${yesNo(value)}${value === goal ? '' : ` (goal: ${yesNo(goal)})`}`;
    })
    .join('; ');
}

const toastText = (toasts) =>
  toasts.length
    ? toasts.map((t) => `${t.type} "${t.text}"`).join(', ')
    : 'none';

/** A scenario's other facts, in words. */
function checksText(checks = {}) {
  const parts = [];
  if (checks.sentFields) {
    parts.push(
      `saved through ${checks.savePath}; prism sent as {${checks.sentFields.prism.join(', ')}}; requests: ${checks.requests.join(', ')}`,
    );
  }
  if (checks.trackIdsFromServer) {
    const { rows, used } = checks.trackIdsFromServer;
    parts.push(
      `${used} of ${rows} track ids after the open are the server's row ids: the client mints its own on open (deserializeCloudProject), and the save sends no track or audio-clip id, so the id losses do not depend on how the mock keys rows`,
    );
  }
  if (checks.toasts) parts.push(`toasts: ${toastText(checks.toasts)}`);
  if (checks.chordIdProbe?.regions) {
    const { newId, collides } = checks.chordIdProbe;
    parts.push(
      `a chord written afterwards got id ${newId}${collides ? ', which an existing chord already has' : ' (unique)'}`,
    );
  }
  if (checks.closeMs !== undefined) {
    parts.push(`the tab closed ${checks.closeMs} ms after the edit`);
  }
  if (checks.volatile?.length) {
    parts.push(`left out as volatile: ${checks.volatile.join(', ')}`);
  }
  if (checks.editor) parts.push(`editor: ${checks.editor}`);
  return parts.join('; ');
}

/** `field` with its kinds and key counts, e.g. `tracks[].trackRole` (lost ×9). */
function lossLabel(loss) {
  const kinds = Object.entries(loss.kinds);
  const plain = kinds.length === 1 && kinds[0][0] === 'lost' && kinds[0][1] < 2;
  if (plain) return `\`${loss.field}\``;
  const parts = kinds.map(([kind, n]) => (n > 1 ? `${kind} ×${n}` : kind));
  return `\`${loss.field}\` (${parts.join(', ')})`;
}

async function writeSummary(outDir, reports, knownFile) {
  const { commit, branch, dirty } = gitInfo();
  const all = reports.flatMap((r) => r.scenarios);
  const regressions = all.flatMap((r) => r.regressions ?? []).length;
  const fixes = all.flatMap((r) => r.fixes ?? []).length;
  const lines = [
    '# Studio reload round-trips',
    '',
    `What survives a refresh, an in-app return, a tab close, a cloud save and reopen, a boot of every kind and a bad link in today's editor (milestone 1.0 baseline: losses are recorded, not fixed). Written by \`scripts/studio-perf/roundtrip.mjs\` on ${new Date().toISOString().slice(0, 10)} at commit \`${commit}\` (${branch}${dirty ? ', with uncommitted changes under src' : ''}) against ${reports[0]?.base}. Every scenario starts from the kitchen sink (\`scripts/studio-perf/fixtures/kitchenSink.mjs\`), a value that is not the default for every field of the audit's persistence matrix, and the Studio API is the in-memory mock (\`mockStudioApi.mjs\`). The JSON report beside this file has every difference with its values before and after.`,
    '',
    `Against \`${relative(ROOT, knownFile)}\`: ${regressions} regression(s), ${fixes} improvement(s). Keys count one per track or clip, so \`tracks[].trackRole\` (lost ×9) is nine tracks' roles, and a track or clip that is gone altogether counts once, as \`tracks[] (whole track)\` or \`tracks[].midiClips[] (whole clip)\`.`,
    '',
  ];
  for (const report of reports) {
    lines.push(
      `## ${report.profile}`,
      '',
      '| Scenario | Result | Fields lost | Keys lost | Page errors | New | Fixed | Time |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
    );
    for (const r of report.scenarios) {
      const ok = r.status === 'ok';
      lines.push(
        `| ${r.id} | ${r.status} | ${ok ? r.losses.length : '–'} | ${ok ? keyTotal(r.lossCounts) : '–'} | ${r.pageErrors.length} | ${r.regressions?.length ?? '–'} | ${r.fixes?.length ?? '–'} | ${r.seconds} s |`,
      );
    }
    lines.push('');
    for (const r of report.scenarios) {
      lines.push(`### ${r.id}: ${r.title}`, '');
      if (r.status !== 'ok') {
        lines.push(
          `${r.status}: ${(r.error ?? r.reason ?? '').split('\n')[0]}`,
          '',
        );
        continue;
      }
      const flags = flagsText(r.flags);
      if (flags) lines.push(`Flags: ${flags}.`, '');
      const checks = checksText(r.checks);
      if (checks) lines.push(`Checks: ${checks}.`, '');
      for (const s of (r.checks?.settle ?? []).filter((x) => !settled(x))) {
        lines.push(`Did not settle ${describeSettle(s)}.`, '');
      }
      if (r.pageErrors.length) {
        lines.push(
          `Page errors: ${r.pageErrors
            .slice(0, 3)
            .map((e) => `\`${e.split('\n')[0].slice(0, 160)}\``)
            .join(', ')}.`,
          '',
        );
      }
      const byGroup = new Map();
      for (const loss of r.losses) {
        const list = byGroup.get(loss.group) ?? [];
        list.push(lossLabel(loss));
        byGroup.set(loss.group, list);
      }
      for (const group of Object.keys(GROUP_NAMES)) {
        const list = byGroup.get(group);
        if (list) lines.push(`- ${GROUP_NAMES[group]}: ${list.join(', ')}`);
      }
      if (!r.baselined) {
        // Everything above is new; listing it twice says nothing more.
        lines.push(
          '- no known entry for this profile yet, so all of the above counts as new (--update-known records it)',
        );
      } else if (r.regressions?.length) {
        lines.push(`- NEW since the known list: ${r.regressions.join('; ')}`);
      }
      if (r.fixes?.length) {
        lines.push(`- fixed since the known list: ${r.fixes.join('; ')}`);
      }
      lines.push('');
    }
  }
  const file = join(outDir, 'summary.md');
  await writeFormatted(file, lines.join('\n'));
  return file;
}

// ── Main ────────────────────────────────────────────────────────────────────

function printScenario(r) {
  const head = `${r.id.padEnd(36)} ${r.status.padEnd(7)}`;
  if (r.status !== 'ok') {
    // The report has the whole stack.
    console.log(`${head} ${(r.error ?? r.reason ?? '').split('\n')[0]}`);
    return;
  }
  const delta = r.baselined
    ? `${r.regressions.length} new, ${r.fixes.length} fixed`
    : `no baseline, ${r.regressions.length} new`;
  console.log(
    `${head} ${String(r.losses.length).padStart(3)} fields / ${String(keyTotal(r.lossCounts)).padStart(3)} keys lost, ${r.pageErrors.length} page errors (${delta})`,
  );
  for (const s of (r.checks?.settle ?? []).filter((x) => !settled(x))) {
    console.log(`    UNSETTLED ${describeSettle(s)}`);
  }
  if (!r.baselined) return;
  for (const line of r.regressions) console.log(`    NEW   ${line}`);
  for (const line of r.fixes) console.log(`    FIXED ${line}`);
}

/**
 * Runs the planned scenarios on one profile, printing each against its
 * known entry as it finishes (a full run takes minutes).
 */
async function runProfile(run, entries) {
  console.log(`\nroundtrip · ${run.profile}`);
  // A cold ?new=1 boot: what "back at default" looks like (and R4's
  // expected state for ?new=1).
  run.defaults = await withSession(run, '?new=1', ({ page }) =>
    fingerprint(page),
  );
  const results = [];
  for (const scenario of plannedScenarios(run.args)) {
    const startedAt = Date.now();
    const result = { id: scenario.id, title: scenario.title };
    run.pageErrors = [];
    try {
      const outcome = await scenario.run(run);
      const units = lossUnits(outcome.diffs, outcome.extraLosses);
      Object.assign(result, {
        status: 'ok',
        lossCounts: lossCounts(units),
        losses: summarizeLosses(units),
        flags: outcome.flags,
        checks: outcome.checks,
      });
    } catch (error) {
      if (error instanceof MockModeNotImplemented) {
        Object.assign(result, {
          status: 'skipped',
          reason: `${error.message} (milestone 1.5)`,
        });
      } else {
        Object.assign(result, {
          status: 'error',
          error: String(error?.stack ?? error).slice(0, 1500),
        });
      }
    }
    result.seconds = Number(((Date.now() - startedAt) / 1000).toFixed(1));
    result.pageErrors = [...new Set(run.pageErrors.flat())];
    applyRatchet([result], entries);
    printScenario(result);
    results.push(result);
  }
  return results;
}

/** Runs the suite (or the capture) and resolves to the exit code. */
export async function runRoundtrip(argv = process.argv.slice(2)) {
  return withStudio(
    CHECK,
    async ({ base, browser, args, outDir }) => {
      const profiles = profilesFrom(args, 'laptop');
      const api = createMockStudioApi({ mode: 'legacy' });
      const shared = { base, browser, args, api, assetId: seedSample(api) };
      if (args['capture-fixtures'] === 'true') {
        return captureFixtures({ ...shared, profile: profiles[0] });
      }
      const knownFile = resolve(args.known ?? KNOWN_LOSSES);
      const updating = args['update-known'] === 'true';
      const known = readKnown(knownFile, updating);
      const all = [];
      const reports = [];
      for (const profile of profiles) {
        const started = Date.now();
        const results = await runProfile(
          { ...shared, profile },
          known.profiles?.[profile],
        );
        const report = {
          check: CHECK,
          profile,
          base,
          startedAt: new Date(started).toISOString(),
          seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
          knownLosses: relative(ROOT, knownFile),
          scenarios: results,
        };
        const file = writeJson(outDir, `${CHECK}-${profile}`, report);
        console.log(`report: ${relative(ROOT, file)}`);
        all.push(...results);
        reports.push(report);
      }
      const summary = await writeSummary(outDir, reports, knownFile);
      console.log(`summary: ${relative(ROOT, summary)}`);
      if (updating) {
        await updateKnown(knownFile, reports, known);
        console.log(`known losses: ${relative(ROOT, knownFile)} rewritten`);
      }
      // A scenario that could not run always fails the run; regressions
      // fail it unless this run is the one recording the new results.
      const errors = all.filter((r) => r.status === 'error').length;
      const regressed = all.filter(
        (r) => r.status === 'ok' && r.regressions.length > 0,
      ).length;
      return errors > 0 || (!updating && regressed > 0) ? 1 : 0;
    },
    argv,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runRoundtrip().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
