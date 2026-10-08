/* eslint-env node */
/**
 * Reload round-trips for the Studio editor: what survives a refresh, an
 * in-app return, a tab close, a cloud save and reopen, a boot of every kind,
 * and a bad link, measured against a mock Studio API. Losses are recorded
 * here, and a ratchet holds each scenario to them (milestone 1.0 built it,
 * milestone 1.3 made it read the project document registry).
 *
 *   node scripts/studio-perf/roundtrip.mjs --reuse=http://localhost:5263
 *        [--profile=laptop|chromebook|small|all]   (default: laptop)
 *        [--scenario=R1,R4,R5:demo,...]             (default: all)
 *        [--api-mode=legacy|document|all]           (default: all)
 *        [--calibrate=2]   cold boots per R4 link, to find volatile fields
 *        [--update-known]  record this run's results in knownLosses.json
 *        [--known=file]    another known-losses file (default: the one here)
 *        [--strict-api]    R3's mock keeps only what api.ts declares, no
 *                          settings or returns (mockStudioApi.mjs): what a
 *                          cloud open loses if the real API keeps no more;
 *                          a diagnostic, never recorded
 *        [--capture-fixtures [--fixtures-dir=dir]]  capture real autosaves
 *        [--fake-audio]    Chrome's fake audio output, for a machine whose
 *                          audio output never renders (R1 can't play there)
 *        [--out=dir] [--headed] [--gpu=metal|swiftshader] [--port=5263]
 *
 * (`npm run studio:roundtrip -- --reuse=…` runs the same.) Without --reuse
 * the shared harness starts its own dev server on --port (never 5179).
 * --scenario takes groups (R4) or single links (R4:song, R5:demo,
 * R5:demo:cold).
 *
 * Every scenario applies the kitchen sink (fixtures/kitchenSink.mjs: a
 * non-default value for every field the draft or the prefs keep), takes a
 * fingerprint (fixtures/fingerprint.mjs), crosses a boundary, takes another
 * and lists the fields that were lost or came back wrong:
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
 *   import), plus a template opened from the Library panel; each must match
 *   a cold boot of the same link. The sink is linked to a cloud project
 *   first (one the mock holds), so a link that keeps that link, and whose
 *   next Save would write over the project, shows. Fields that differ
 *   between cold boots, and the ones a link seeds at random, are left out
 *   and listed. The Library's click must also keep the work it replaces
 *   (flag workKept: the newest kept slot holds it) and give it back as it
 *   was through the toast's Restore (workRestored). The collab boot needs a
 *   PartyKit server: not covered.
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
 * What each scenario compares comes from the project document registry
 * (src/daw/persistence/projectDocument/fields.ts), through each fingerprint
 * field's class (COMPARE): a reload must keep the project, its view on this
 * device, the student's prefs and this person's track inputs; the cloud copy
 * only the project; a link opened in-app must start every project field
 * over and carry the prefs (flag prefsCarried). Session state is never
 * compared after a reload. R1 also leaves out the view fields that move
 * while the transport plays (HOT_VIEW_FIELDS), which R5 and R7, with the
 * transport stopped, still compare; selfCheck holds that before any page
 * opens. Losses a later milestone owns are labelled with it (LOSS_OWNERS),
 * so what is left for the milestone at hand reads as unowned.
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
 * crash copy survive, does every note have an id of its own afterwards
 * (decision D2, every scenario). After R1, R2 and R5 a chord is written
 * past the lane, and a new chord id equal to an existing one is a loss
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
 * --capture-fixtures records the real autosaves the codec's migration tests
 * start from: the empty project, every demo
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
 * re-checks every folder). A folder holds one schema: a draft's is its
 * "schema" (codec v3 keeps "version": 2, decision D1) or else its version,
 * and the folder's is its manifest's sessionSchemaVersion or the v<N> of
 * its name. Since milestone 1.3 the editor writes schema 3, so a capture
 * into a v2 folder (the default) refuses before it writes anything; capture
 * v3 drafts with --fixtures-dir=src/daw/persistence/__tests__/fixtures/v3.
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
import { basename, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as prettier from 'prettier';
import {
  compareFingerprints,
  FIELD_CLASSES,
  fingerprintPage,
  ID_FLAGS,
  ID_KINDS,
  installDevModules,
  probeChordIdCollision,
  sameValue,
} from './fixtures/fingerprint.mjs';
import {
  applyKitchenSink,
  sinkFieldsAtDefault,
} from './fixtures/kitchenSink.mjs';
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
const LOCAL_SESSION_MODULE = '/src/lib/studio-projects/localSession.ts';
/** The dev auth bypass's user (src/auth/devBypass.ts): kept work is per user. */
const DEV_USER = 'dev-bypass-user';

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
 * `library` opens the template from the Library panel instead, by its label:
 * a click that replaces the project in place (decision D10), compared with a
 * cold boot of the template's link.
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
  {
    kind: 'libraryTemplate',
    query: '?template=project-pop',
    library: 'Pop',
    volatile: ['harmony.rhythmName'],
    expectTracks: true,
  },
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
  prefsCarried: {
    goal: true,
    text: 'the student’s prefs carried into the new project',
  },
  workKept: {
    goal: true,
    text: 'the replaced work was kept (the newest kept slot holds it) and announced with a Restore',
  },
  workRestored: {
    goal: true,
    text: 'the Restore brought the replaced work back as it was',
  },
  noteIdsWhole: {
    goal: true,
    text: 'every note has an id of its own afterwards',
  },
};

/**
 * The fingerprint classes (fingerprint.mjs FIELD_CLASSES) a reload of the
 * same project must keep: everything the draft and the prefs hold, and what
 * a load works out from them. Session state never survives a reload.
 */
const RELOAD_CLASSES = [
  'doc',
  'view',
  'pref',
  'track-local',
  'derived',
  'context',
  'runtime',
];

/**
 * View fields that move by themselves while the transport plays. R1 reloads
 * mid-playback, so where the playhead happened to be is no loss; R5 and R7
 * reload with the transport stopped and still compare them.
 */
const HOT_VIEW_FIELDS = ['transport.position'];

/** What each kind of scenario compares (compareFingerprints options). */
const COMPARE = {
  // R2, R5, R7: the same project, reloaded or returned to.
  reload: { classes: RELOAD_CLASSES },
  // R1: the same, refreshed while playing.
  reloadWhilePlaying: { classes: RELOAD_CLASSES, ignore: HOT_VIEW_FIELDS },
  // R3: another device opens the cloud copy, which holds the project alone:
  // the view, the prefs and the inputs belong to the device that saved it.
  cloud: { classes: ['doc', 'derived', 'runtime'] },
  // R4: a link opened in-app must start every project field over, session
  // state included, as a cold boot of it does. The prefs follow the student
  // (flag prefsCarried).
  leak: {
    classes: [
      'doc',
      'view',
      'track-local',
      'derived',
      'context',
      'runtime',
      'session',
    ],
    resetOnNewOnly: true,
  },
};

/**
 * What a Restore of kept work must give back (R4's Library click), ids
 * included: what a reload keeps, but the lesson and practice context, which
 * a kept slot, being a draft, holds no more than a draft does until
 * milestone 1.15.
 */
const RESTORE_CLASSES = RELOAD_CLASSES.filter((cls) => cls !== 'context');

/**
 * Losses a later milestone owns: field (or `group:field`, for one scenario
 * group) → milestone. In R3 every field only the milestone 1.5 document
 * carries (registry cloud 'document') is 1.5's as well, and so are the R3
 * losses that follow from one (CLOUD_DOCUMENT_FOLLOWERS). A leak (R4) is
 * never a later milestone's (ownerOf). Whatever is left unowned is the open
 * milestone's to fix.
 */
const LOSS_OWNERS = {
  'context.tutorial': '1.15',
  'context.practiceSession': '1.15',
  // The bytes of a clip never uploaded live only in memory until drafts
  // hold media.
  'tracks[].audioClips[].bufferLoaded': '1.4',
  // A cloud open mints audio-clip ids until audio is keyed by asset.
  'ids.audioClips': '1.10',
  // An in-app return, and an in-app bad link that changes nothing, resume
  // the kitchen sink's lesson, whose overlay applies its step's
  // preconditions again as it mounts (TutorialLayer), here the Prism tab
  // over the restored one: how a resumed lesson and the restored view meet
  // is lesson persistence's.
  'R2:view.channelStripTab': '1.15',
  'R5:view.channelStripTab': '1.15',
};

/**
 * R3 losses that follow from a field only the 1.5 document carries. (An
 * Oracle patch that follows the project's key takes the default mode along
 * too, but the fingerprint leaves that copy of the key out of the patch, so
 * any change to a patch is unowned.)
 */
const CLOUD_DOCUMENT_FOLLOWERS = {
  // The legacy payload carries no note ids, so a cloud open derives them.
  'ids.notes': '1.5',
  // Worked out from the mode, which only the document carries.
  'harmony.keyColour': '1.5',
};

/** Who owns a loss of scenario group `group`, or null. */
function ownerOf(group, unit) {
  // A new project starts every field it compares over, so whatever a link
  // carries over is a reset the open milestone owes, even in a field a later
  // milestone persists (the lesson context, decoded audio).
  if (group === 'R4') return null;
  const owner =
    LOSS_OWNERS[`${group}:${unit.field}`] ?? LOSS_OWNERS[unit.field];
  if (owner) return owner;
  if (group === 'R3') {
    if (unit.cloud === 'document') return '1.5';
    if (CLOUD_DOCUMENT_FOLLOWERS[unit.field]) {
      return CLOUD_DOCUMENT_FOLLOWERS[unit.field];
    }
  }
  return null;
}

/**
 * Checks the comparison rules themselves before any page opens: R1 must
 * never list a hot view field, and the reloads with the transport stopped
 * must. (R1 also checks its own result, refreshWhilePlaying.)
 */
function selfCheck() {
  const snapshot = (position) => ({
    fields: Object.fromEntries(
      HOT_VIEW_FIELDS.map((field) => [
        field,
        { class: 'view', cloud: false, resetOnNew: true, value: position },
      ]),
    ),
    ids: {},
  });
  const lists = (options) =>
    compareFingerprints(snapshot(0), snapshot(960), options).some((d) =>
      HOT_VIEW_FIELDS.includes(d.field),
    );
  if (lists(COMPARE.reloadWhilePlaying)) {
    throw new Error('harness self-check: R1 compares the playhead');
  }
  if (!lists(COMPARE.reload)) {
    throw new Error(
      'harness self-check: the reloads with the transport stopped (R2, R5, R7) no longer compare the playhead',
    );
  }
  // A class misspelt here would quietly compare nothing.
  for (const [kind, { classes }] of Object.entries(COMPARE)) {
    const unknown = classes.filter((cls) => !(cls in FIELD_CLASSES));
    if (unknown.length > 0) {
      throw new Error(
        `harness self-check: COMPARE.${kind} names no class ${unknown.join(', ')}`,
      );
    }
  }
  // A leak labelled as a later milestone's would drop out of the Unowned
  // column, and so out of sight before --update-known records it.
  const leaked = [
    ...Object.keys(LOSS_OWNERS).map((key) => key.replace(/^R\d+:/, '')),
    ...Object.keys(CLOUD_DOCUMENT_FOLLOWERS),
  ].filter((field) => ownerOf('R4', { field, cloud: 'document' }) !== null);
  if (leaked.length > 0) {
    throw new Error(
      `harness self-check: an R4 leak of ${leaked.join(', ')} is labelled as a later milestone's`,
    );
  }
}

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
  // [data-title], and an action (Restore) as a button beside the close one.
  const seen = new WeakMap();
  const actionsOf = (el) =>
    [...el.querySelectorAll('button:not([data-close-button])')]
      .map((button) => (button.textContent ?? '').trim())
      .filter(Boolean);
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
          actions: actionsOf(el),
          at: Date.now(),
        };
        seen.set(el, added);
        watch.toasts.push(added);
      } else {
        if (!entry.text && text) entry.text = text;
        if (entry.actions.length === 0) entry.actions = actionsOf(el);
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
 * their bytes. It imports the editor's own modules through
 * installDevModules (fixtures/fingerprint.mjs), which every page here runs.
 */
async function pendingAudio() {
  const devModule = window.__RT_DEV_MODULE__;
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

/**
 * In-page: the user's newest kept slot (localSession.ts) with its session as
 * stored, or null when they have none.
 */
async function newestKeptSlot({ path, userId }) {
  const { listKeptSessions, readKeptSession } =
    await window.__RT_DEV_MODULE__(path);
  const [newest] = listKeptSessions(userId);
  const kept = newest ? readKeptSession(newest.key) : null;
  return kept ? { slot: newest, session: JSON.stringify(kept.session) } : null;
}

/**
 * In-page: what the kept-work toast's Restore button does
 * (restoreKeptWork), called directly, since the toast may have gone by the
 * time a scenario has compared what the link opened.
 */
async function restoreKept({ path, slot, userId }) {
  const { restoreKeptWork } = await window.__RT_DEV_MODULE__(path);
  restoreKeptWork(slot, userId);
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
 * Whether the stored autosave already holds the project the editor holds
 * now. sessionFingerprint compares the project's content and its cloud link
 * (since milestone 1.3 the registry's doc fields and the Oracle patches),
 * not the view, the inputs or the prefs. A change to those starts no write
 * (decision D8): it goes with the next write, or with the flush when the
 * page is hidden or closed. So after a trailing write that the autosave
 * doesn't wait on (a view change, a lesson's step status, a selection) its
 * timestamp stays older than the last store write although nothing is
 * waiting to be written; whether the view reached the draft is for the
 * reload after it to show.
 */
async function autosaveIsCurrent(page, raw) {
  return page.evaluate(async (stored) => {
    try {
      const devModule = window.__RT_DEV_MODULE__;
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
  // A key the draft or the prefs keep that no field shows could be lost
  // without any scenario noticing.
  const { missing } = snapshot.meta.coverage;
  if (missing.length > 0) {
    throw new Error(
      `fingerprint.mjs shows no field for the registry's ${missing.join(', ')}: add one`,
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
  // Every page of the context, a second tab included.
  await session.context.addInitScript(installDevModules);
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
// Each resolves to { diffs, extraLosses, flags, checks, after }: the
// fingerprint differences, losses found another way, the FLAGS it measured,
// facts for the report (checks.settle lists every settle after a boundary)
// and the fingerprint taken after the boundary (runProfile reads its note
// ids for every scenario).

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

/**
 * Project-level fields the kitchen sink leaves at their default unless
 * asked: the cloud link, which a save sets (applySink's `cloudLink`).
 */
const SINK_LEAVES_DEFAULT = ['project.id'];

/**
 * The kitchen sink, settled and with its autosave flushed, and its
 * fingerprint. With `cloudLink` the project is also linked to a cloud
 * project the mock holds, as a saved one is (R4; R3 saves to a project of
 * its own). A field still at its default afterwards could be lost without
 * any scenario seeing it, so that is a harness error: a project-level one,
 * judged against a fresh project's fingerprint, or a field of a track, a
 * clip, a note, a chord region or a marker that no entity sets
 * (sinkFieldsAtDefault, against the registry's defaults).
 */
async function applySink(
  page,
  run,
  { assetId = run.assetId, cloudLink = false } = {},
) {
  const sink = await page.evaluate(applyKitchenSink, { assetId });
  if (cloudLink) {
    const projectId = run.api.seedProject({ name: 'Kitchen Sink' });
    await page.evaluate(
      (id) => window.__MA_STORE__.getState().setProjectId(id),
      projectId,
    );
  }
  const s = await settleOrThrow(page, 'after the kitchen sink');
  const raw = await waitForAutosave(page);
  const snapshot = await fingerprint(page);
  const leftAlone = cloudLink ? [] : SINK_LEAVES_DEFAULT;
  const unset = [
    ...Object.keys(snapshot.fields).filter(
      (key) =>
        !key.startsWith('tracks[') &&
        !leftAlone.includes(key) &&
        run.defaults?.fields[key] &&
        sameValue(snapshot.fields[key].value, run.defaults.fields[key].value),
    ),
    ...(await page.evaluate(sinkFieldsAtDefault)),
  ];
  if (unset.length > 0) {
    throw new Error(
      `the kitchen sink leaves ${unset.join(', ')} at the default, so no scenario could see it lost: give it a value in kitchenSink.mjs`,
    );
  }
  return { sink, settle: s, raw, snapshot };
}

/** R1: refresh during playback, right after an edit made while playing. */
async function refreshWhilePlaying(run) {
  return withSession(run, '?new=1', async ({ page }) => {
    const { sink } = await applySink(page, run);
    await startAudio(page);
    const from = await page.evaluate(
      () => window.__MA_STORE__.getState().position,
    );
    await page.evaluate(() => window.__MA_STORE__.getState().play());
    // The sink arms a two-bar count-in, so the playhead moves only after it.
    await page
      .waitForFunction(
        (start) => {
          const s = window.__MA_STORE__.getState();
          return s.isPlaying && s.position > start + 240;
        },
        from,
        { timeout: 30_000, polling: 100 },
      )
      .catch(async () => {
        // A browser whose audio output never renders (headless Chrome on a
        // machine whose output device is stuck) keeps the audio clock, and
        // so the transport, at its start: say so rather than time out.
        const at = await page.evaluate(() => {
          const s = window.__MA_STORE__.getState();
          return { isPlaying: s.isPlaying, position: s.position };
        });
        throw new Error(
          `playback never moved the playhead (isPlaying ${at.isPlaying}, position ${at.position}, from ${from}): if the browser's audio clock does not run on this machine, run with --fake-audio (Chrome's fake audio output)`,
        );
      });
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
    // The playhead moves while playing, so where it lands after a refresh
    // is not a loss (HOT_VIEW_FIELDS).
    const diffs = compareFingerprints(before, snapshot, {
      ...COMPARE.reloadWhilePlaying,
      defaults: run.defaults,
    });
    const hot = diffs.filter((d) => HOT_VIEW_FIELDS.includes(d.field));
    if (hot.length > 0) {
      throw new Error(
        `harness self-check: R1 listed ${hot.map((d) => d.key).join(', ')}`,
      );
    }
    return {
      diffs,
      extraLosses: probe.collides ? ['ids.newChordIdUnique'] : [],
      flags,
      checks: { chordIdProbe: probe, settle: [after] },
      after: snapshot,
    };
  });
}

/** R2: editor → /studio → history.back(), one edit just before leaving. */
async function spaReturn(run) {
  return withSession(run, '?new=1', async ({ page }) => {
    const { sink, snapshot: before } = await applySink(page, run);
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
      diffs: compareFingerprints(before, snapshot, {
        ...COMPARE.reload,
        defaults: run.defaults,
      }),
      extraLosses: probe.collides ? ['ids.newChordIdUnique'] : [],
      flags: {},
      checks: { chordIdProbe: probe, settle: [after] },
      after: snapshot,
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

/**
 * R3: File ▸ Save, then ?project=<id> in a fresh context. The mock keeps
 * what the client sends, settings and returns included, unless the run asks
 * for only what api.ts declares (--strict-api).
 */
async function cloudSaveOpen(run, mode) {
  const strictShape = run.args['strict-api'] === 'true';
  const api = createMockStudioApi({ mode, strictShape });
  const assetId = seedSample(api);
  const saved = await withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await applySink(page, run, { assetId });
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
  const sentClips = (sent.tracks ?? []).flatMap((t) => t.midiClips ?? []);
  const requests = api.log.map((l) => `${l.method} ${l.path} ${l.status}`);
  const flags = {
    savedToast: saved.savedToast,
    uploadedPendingAudio: UPLOAD_STEPS.every((step) =>
      requests.some((r) => step.test(r)),
    ),
  };
  const checks = {
    savePath: 'File ▸ Save',
    apiShape: strictShape ? 'strict' : 'client',
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
      // The local draft's clips carry more (note ids, length, CC); the cloud
      // payload must not, until 1.5 (mockStudioApi.mjs keeps only these).
      midiClip: [...new Set(sentClips.flatMap((c) => Object.keys(c)))].sort(),
      midiClipEvents: [
        ...new Set(sentClips.flatMap((c) => Object.keys(c.events ?? {}))),
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
      // Whose ids the reopened tracks carry: the mock's row ids, or the
      // client's (deserializeCloudProject loads each track under its saved
      // settings.sourceTrackId and mints audio-clip ids until 1.10), so the
      // id results are not an artefact of the mock.
      const rows = api.projects.get(projectId)?.tracks ?? [];
      checks.trackIdsFromServer = {
        rows: rows.length,
        used: snapshot.ids.tracks.filter((id) =>
          rows.some((row) => row.id === id),
        ).length,
        kept: snapshot.ids.tracks.filter((id) =>
          saved.before.ids.tracks.includes(id),
        ).length,
      };
      return {
        diffs: compareFingerprints(saved.before, snapshot, {
          ...COMPARE.cloud,
          defaults: run.defaults,
        }),
        extraLosses: [],
        flags,
        checks: { ...checks, settle: [after] },
        after: snapshot,
      };
    },
    api,
    { allowCrash: true },
  );
}

/**
 * Raw ids: a new project mints its own, and an in-app boot keeps counting
 * chord ids where the last project stopped, so they are no leak. The id
 * facts (ID_FLAGS) are compared: a link opened in-app must give every note
 * and every chord region an id of its own, as its cold boot does.
 */
const ID_FIELDS = ID_KINDS.map((kind) => `ids.${kind}`);

/**
 * Cold boots of a link, each in a fresh context, fingerprinted. A link's
 * boots are the same whichever way R4 then opens it (in-app, or a template
 * from the Library), so they are taken once per run.
 */
async function coldBoots(run, intent) {
  run.coldBoots ??= new Map();
  const key = `${intent.query} ${handoff(intent.kind)?.key ?? ''}`;
  if (!run.coldBoots.has(key)) {
    const boots = [];
    const count = Math.max(1, Number(run.args.calibrate ?? 2));
    for (let i = 0; i < count; i++) {
      if (intent.query === '?new=1' && i === 0 && run.defaults) {
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
    run.coldBoots.set(key, boots);
  }
  return run.coldBoots.get(key);
}

/** Cold boots of the link; fields that differ between them are volatile. */
async function coldBaseline(run, intent) {
  const boots = await coldBoots(run, intent);
  if (intent.expectTracks && boots[0].fields['tracks.count'].value === 0) {
    throw new Error(
      `${intent.query} opened an empty project, so the link no longer loads (LEAK_INTENTS needs another id)`,
    );
  }
  // The cold boots are what the in-app one is held to, so their ids must be
  // whole: a note without an id of its own (decision D2), or two chord
  // regions sharing one (state-reload-05), would pass on both sides, and
  // the Score marks on such a note are lost at the next save.
  for (const boot of boots) {
    const broken = ID_FLAGS.filter((flag) => boot.ids[flag] !== true);
    if (broken.length > 0) {
      throw new Error(
        `a cold boot of ${intent.query} fails ${broken.map((flag) => `ids.${flag}`).join(', ')}: the link's load must give every note and every chord region an id of its own`,
      );
    }
  }
  const volatile = new Set(intent.volatile ?? []);
  for (const other of boots.slice(1)) {
    for (const d of compareFingerprints(boots[0], other, {
      ...COMPARE.leak,
      ignore: ID_FIELDS,
    })) {
      volatile.add(d.field);
    }
  }
  return { expected: boots[0], volatile: [...volatile].sort() };
}

/**
 * Opens a template from the Library panel, as a student does: the panel is
 * in the arrange view, on its Library tab (the top bar's Library button
 * opens a shut panel), and a template is a row there, by its label. Returns
 * the fingerprint of the session the click replaces, taken once the store
 * is still: the work as it is kept, with the view the panel needed.
 */
async function openFromLibrary(page, label) {
  // The arrange view opens the panel by itself (setCurrentView); the store
  // says so before React has drawn it.
  const open = await page.evaluate(() => {
    const store = window.__MA_STORE__;
    store.getState().setCurrentView('arrange');
    return store.getState().libraryOpen;
  });
  if (!open) await page.click('button[title="Library"]');
  // The panel's tab is the one Library button with a label; the top bar's
  // is an icon.
  await page.locator('button:has-text("Library")').first().click();
  await waitForQuiet(page);
  const replaced = await fingerprint(page);
  // A template row is never dragged.
  await page
    .locator('div[draggable="false"]', {
      hasText: new RegExp(`^\\s*${label}\\s*$`),
    })
    .first()
    .click();
  return replaced;
}

/**
 * The Library click's kept work (R4): the toast announced it with a Restore,
 * the newest kept slot holds the work the click replaced (its name, and the
 * same tracks, clips and notes as the sink's autosave), and the Restore
 * gives that work back as the click found it, ids and all (RESTORE_CLASSES).
 * Returns the flags workKept and workRestored and adds what it saw to
 * `checks`.
 */
async function checkKeptWork(page, run, { since, raw, replaced, checks }) {
  const toast = await waitForToast(page, {
    since,
    match: /previous work was kept/i,
  });
  checks.toasts = await readToasts(page, since);
  const name = replaced.fields['project.name'].value;
  const kept = await page.evaluate(newestKeptSlot, {
    path: LOCAL_SESSION_MODULE,
    userId: DEV_USER,
  });
  checks.keptSlot = kept && {
    projectName: kept.slot.projectName,
    sameWork: sameValue(autosaveDigest(kept.session), autosaveDigest(raw)),
  };
  const workKept =
    Boolean(toast?.actions?.includes('Restore')) &&
    kept?.slot.projectName === name &&
    checks.keptSlot.sameWork;
  if (!kept) return { workKept, workRestored: false };
  await page.evaluate(restoreKept, {
    path: LOCAL_SESSION_MODULE,
    slot: kept.slot,
    userId: DEV_USER,
  });
  const back = await page
    .waitForFunction(
      (project) => window.__MA_STORE__.getState().projectName === project,
      name,
      { timeout: 30_000, polling: 100 },
    )
    .then(
      () => true,
      () => false,
    );
  if (!back) {
    checks.restore = 'the Restore never brought the kept work back';
    return { workKept, workRestored: false };
  }
  checks.settle.push(await settle(page, 'after the Restore'));
  const restored = await fingerprint(page);
  const diffs = compareFingerprints(replaced, restored, {
    classes: RESTORE_CLASSES,
    defaults: run.defaults,
  });
  checks.restoreDiffs = diffs.map((d) => `${d.key} (${d.kind})`);
  return { workKept, workRestored: diffs.length === 0 };
}

/** R4: after the kitchen sink, an in-app boot must look like a cold one. */
async function leakCheck(run, intent) {
  const { expected, volatile } = await coldBaseline(run, intent);
  return withSession(run, '?new=1', async ({ page }) => {
    // Linked to a cloud project, so a link that keeps the link shows.
    const { snapshot: sink, raw } = await applySink(page, run, {
      cloudLink: true,
    });
    const since = await pageNow(page);
    let label = `the in-app ${intent.query}`;
    // What the link replaces: the sink, or the sink as the Library click
    // found it (the view the panel needed).
    let replaced = sink;
    if (intent.library) {
      label = `the Library's ${intent.library} template`;
      replaced = await openFromLibrary(page, intent.library);
      // The template is open once its tracks are in (replaceSession keeps
      // the work first, then seeds).
      await page.waitForFunction(
        ({ name, tracks }) => {
          const s = window.__MA_STORE__.getState();
          return s.projectName !== name && s.tracks.length === tracks;
        },
        {
          name: sink.fields['project.name'].value,
          tracks: expected.fields['tracks.count'].value,
        },
        { timeout: 30_000, polling: 100 },
      );
    } else {
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
    }
    const after = await settle(page, `after ${label}`);
    const got = await fingerprint(page);
    const diffs = compareFingerprints(expected, got, {
      ...COMPARE.leak,
      ignore: [...volatile, ...ID_FIELDS],
    });
    for (const d of diffs) {
      // Carried over: the value is the previous project's.
      d.carriedOver = Boolean(
        replaced.fields[d.key] &&
          sameValue(replaced.fields[d.key].value, d.after),
      );
    }
    // The prefs are the student's, not the project's: the new project has
    // the sink's.
    const prefs = Object.keys(sink.fields).filter(
      (key) => sink.fields[key].class === 'pref',
    );
    const prefsLeft = prefs.filter(
      (key) =>
        !got.fields[key] ||
        !sameValue(got.fields[key].value, sink.fields[key].value),
    );
    const flags = { prefsCarried: prefsLeft.length === 0 };
    const checks = { volatile, prefsNotCarried: prefsLeft, settle: [after] };
    if (intent.library) {
      Object.assign(
        flags,
        await checkKeptWork(page, run, { since, raw, replaced, checks }),
      );
    }
    return { diffs, extraLosses: [], flags, checks, after: got };
  });
}

/** R5: a link to something that does not exist, in-app or a full load. */
async function badLink(run, link, how) {
  return withSession(run, '?new=1', async ({ page }) => {
    const { raw, snapshot: before } = await applySink(page, run);
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
      diffs: compareFingerprints(before, snapshot, {
        ...COMPARE.reload,
        defaults: run.defaults,
      }),
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
      after: snapshot,
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
    const { sink } = await applySink(page, run);
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
        const sts = await window.__RT_DEV_MODULE__(
          '/src/daw/oracle-synth/synthTrackState.ts',
        );
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
      after: snapshot,
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
    const { sink, snapshot: before } = await applySink(page, run);
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
      diffs: compareFingerprints(before, snapshot, {
        ...COMPARE.reload,
        defaults: run.defaults,
      }),
      extraLosses: [],
      flags: {
        autosaveFlushedOnClose:
          foundTimestamp !== null && foundTimestamp >= editedAt,
      },
      checks: { closeMs, settle: [after] },
      after: snapshot,
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
      title: intent.library
        ? `The Library panel's ${intent.library} template after the kitchen sink vs a cold boot of ${intent.query}`
        : `In-app ${intent.query} after the kitchen sink vs a cold boot`,
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
 * it was. Losses found another way (`extraLosses`) count once each. Each
 * unit names the milestone that owns it, if a later one does (ownerOf).
 */
function lossUnits(diffs, extraLosses, group) {
  const units = [];
  const entities = new Map();
  for (const d of diffs) {
    if (!d.entity) {
      units.push({
        field: d.field,
        class: d.class,
        cloud: d.cloud,
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
        class: 'doc',
        cloud: false,
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
      class: field.startsWith('ids.') ? 'ids' : 'editor',
      cloud: false,
      kind: 'changed',
      key: field,
    });
  }
  for (const unit of units) unit.owner = ownerOf(group, unit);
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
      class: unit.class,
      owner: unit.owner,
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
        "Today's round-trip results per profile and scenario (scripts/studio-perf/roundtrip.mjs; what each scenario compares comes from the project document registry since milestone 1.3). losses: field -> number of keys lost per kind (a tracks[] or clips[] field counts one key per track or clip, and a track or clip that is gone altogether counts once, as 'tracks[] (whole track)' or '... (whole clip)'); flags: the scenario's yes/no checks; pageErrors: uncaught page errors. A run fails on more keys of a kind than listed, a flag moving away from its goal, or more page errors. Rewrite with --update-known once a fix lands.",
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
      const { getTutorial } = await window.__RT_DEV_MODULE__(path);
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

/**
 * The schema a fixture folder holds: its manifest's sessionSchemaVersion,
 * else the N of a folder named vN (v2, v2-1.2), else null (a new folder of
 * any other name takes the first draft's).
 */
function folderSchema(dir) {
  const manifest = join(dir, 'manifest.json');
  if (existsSync(manifest)) {
    const { sessionSchemaVersion } = JSON.parse(readFileSync(manifest, 'utf8'));
    if (Number.isInteger(sessionSchemaVersion)) return sessionSchemaVersion;
  }
  const named = /^v(\d+)(?:\D|$)/.exec(basename(dir));
  return named ? Number(named[1]) : null;
}

/** `dir` from the repo root when it is in the repo, else as it is. */
const shortPath = (dir) =>
  dir.startsWith(`${ROOT}/`) ? relative(ROOT, dir) : dir;

/** A draft's schema: its "schema" since codec v3, else its version. */
const draftSchema = (parsed) => parsed.schema ?? parsed.version;

async function captureFixtures(run) {
  const dir = resolve(run.args['fixtures-dir'] ?? FIXTURE_DIR);
  mkdirSync(dir, { recursive: true });
  let schema = folderSchema(dir);
  // The boots come from the app's own catalogues, so a new demo, template
  // or lesson is captured without editing this script.
  const catalogue = await withSession(run, '?new=1', ({ page }) =>
    page.evaluate(async (tutorials) => {
      const devModule = window.__RT_DEV_MODULE__;
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
        // A change to the view alone starts no write (decision D8): it waits
        // for the next one, or for the flush a page runs as it is hidden or
        // closed. Run that flush, so the draft holds the view on screen even
        // when a lesson's last step only moved it (the editor's only other
        // pagehide listener is the prefs', which writes the prefs).
        await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
        return { raw: await waitForAutosave(page), steps: passed };
      },
      run.api,
      { handoff: target.handoff ?? null },
    );
    const parsed = JSON.parse(raw);
    // Checked before anything is written, so a folder of older drafts is
    // never overwritten with newer ones.
    const found = draftSchema(parsed);
    schema ??= found;
    if (found !== schema) {
      throw new Error(
        `${target.name}: the editor writes schema ${found} drafts and ${shortPath(dir)} holds schema ${schema}: capture into fixtures/v${found} (--fixtures-dir) instead`,
      );
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
      about: `Real schema ${schema} Studio autosaves (localStorage '${AUTOSAVE_KEY}') captured by scripts/studio-perf/roundtrip.mjs --capture-fixtures, for the codec's migration tests. Each file is the stored string pretty-printed; JSON.stringify(JSON.parse(file)) reproduces it byte for byte, and sha256 is the hash of that string (manifest.test.ts checks both). sessionSchemaVersion is each draft's "schema", or its "version" when it has none (codec v3 keeps "version": 2, decision D1). A lesson's steps say how each step was passed: by its walkthrough driver, its fallback, by itself, or forced on as Next would.`,
      storageKey: AUTOSAVE_KEY,
      sessionSchemaVersion: schema,
      capturedAt: new Date().toISOString(),
      commit: gitInfo().commit,
      fixtures,
    }),
  );
  console.log(
    `${fixtures.length} fixtures in ${shortPath(dir)} (+ manifest.json)`,
  );
  return 0;
}

// ── Summary ─────────────────────────────────────────────────────────────────

/** Report groups (fingerprint classes), in the order the summary lists them. */
const CLASS_NAMES = {
  editor: 'editor',
  doc: 'project',
  view: 'view of the project',
  pref: 'per-user prefs',
  'track-local': 'this person’s track inputs',
  derived: 'worked out on load',
  context: 'lesson/practice context',
  runtime: 'decoded audio',
  session: 'session',
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
    ? toasts
        .map(
          (t) =>
            `${t.type} "${t.text}"${t.actions?.length ? ` [${t.actions.join(', ')}]` : ''}`,
        )
        .join(', ')
    : 'none';

/** A scenario's other facts, in words. */
function checksText(checks = {}) {
  const parts = [];
  if (checks.sentFields) {
    parts.push(
      `saved through ${checks.savePath}; prism sent as {${checks.sentFields.prism.join(', ')}}; requests: ${checks.requests.join(', ')}`,
    );
  }
  if (checks.sentFields?.midiClip) {
    const { midiClip, midiClipEvents } = checks.sentFields;
    parts.push(
      `MIDI clips sent as {${midiClip.join(', ')}} with columns {${midiClipEvents.join(', ')}}`,
    );
  }
  if (checks.trackIdsFromServer) {
    const { rows, used, kept } = checks.trackIdsFromServer;
    parts.push(
      `${used} of ${rows} track ids after the open are the server's row ids and ${kept ?? '?'} are the ones saved: the client loads each track under its saved id (settings.sourceTrackId) and still mints audio-clip ids (until 1.10); the save sends no row ids, so the id results do not depend on how the mock keys rows`,
    );
  }
  if (checks.apiShape === 'strict') {
    parts.push(
      'the mock kept only what api.ts declares (--strict-api): no track settings and no returns, so this is what a cloud open loses if music-atlas-api keeps no more; a diagnostic, not a baseline',
    );
  } else if (checks.apiShape) {
    parts.push(
      "the mock stored each track's settings and the returns as sent; the saved track ids, effects, instrument state and Oracle patches ride in settings, so what this shows as kept holds only if music-atlas-api stores settings as sent, which no one has checked (--strict-api shows the open without them)",
    );
  }
  if (checks.prefsNotCarried?.length) {
    parts.push(
      `prefs the new project did not keep: ${checks.prefsNotCarried.join(', ')}`,
    );
  }
  if (checks.toasts) parts.push(`toasts: ${toastText(checks.toasts)}`);
  if ('keptSlot' in checks) {
    const slot = checks.keptSlot;
    parts.push(
      slot
        ? `the newest kept slot is "${slot.projectName}", ${slot.sameWork ? 'with the tracks, clips and notes the sink saved' : 'NOT holding the tracks, clips and notes the sink saved'}`
        : 'no kept slot',
    );
  }
  if (checks.restore) parts.push(checks.restore);
  if (checks.restoreDiffs) {
    parts.push(
      checks.restoreDiffs.length
        ? `the Restore gave back all but ${checks.restoreDiffs.join(', ')}`
        : 'the Restore gave back everything compared, ids included',
    );
  }
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

/**
 * `field` with its kinds and key counts and its owner, e.g.
 * `tracks[].trackRole` (lost ×9) or `markers` [1.5].
 */
function lossLabel(loss) {
  const kinds = Object.entries(loss.kinds);
  const owner = loss.owner ? ` [${loss.owner}]` : '';
  const plain = kinds.length === 1 && kinds[0][0] === 'lost' && kinds[0][1] < 2;
  if (plain) return `\`${loss.field}\`${owner}`;
  const parts = kinds.map(([kind, n]) => (n > 1 ? `${kind} ×${n}` : kind));
  return `\`${loss.field}\` (${parts.join(', ')})${owner}`;
}

/** How many of a scenario's lost fields no later milestone owns. */
const unownedCount = (losses) => losses.filter((l) => !l.owner).length;

async function writeSummary(outDir, reports, knownFile) {
  const { commit, branch, dirty } = gitInfo();
  const all = reports.flatMap((r) => r.scenarios);
  const regressions = all.flatMap((r) => r.regressions ?? []).length;
  const fixes = all.flatMap((r) => r.fixes ?? []).length;
  const lines = [
    '# Studio reload round-trips',
    '',
    `What survives a refresh, an in-app return, a tab close, a cloud save and reopen, a boot of every kind and a bad link in the editor. Written by \`scripts/studio-perf/roundtrip.mjs\` on ${new Date().toISOString().slice(0, 10)} at commit \`${commit}\` (${branch}${dirty ? ', with uncommitted changes under src' : ''}) against ${reports[0]?.base}. Every scenario starts from the kitchen sink (\`scripts/studio-perf/fixtures/kitchenSink.mjs\`), a value that is not the default for every field the draft or the prefs keep, and the Studio API is the in-memory mock (\`mockStudioApi.mjs\`). What a scenario compares comes from the project document registry: a reload keeps the project, its view, the prefs and this person's inputs; the cloud copy the project alone; a link opened in-app starts every project field over and keeps the prefs. The JSON report beside this file has every difference with its values before and after.`,
    '',
    `Against \`${relative(ROOT, knownFile)}\`: ${regressions} regression(s), ${fixes} improvement(s). Keys count one per track or clip, so \`tracks[].trackRole\` (lost ×9) is nine tracks' roles, and a track or clip that is gone altogether counts once, as \`tracks[] (whole track)\` or \`tracks[].midiClips[] (whole clip)\`. A loss a later milestone owns is marked with it, e.g. [1.5]; the Unowned column counts the rest.`,
    '',
  ];
  for (const report of reports) {
    lines.push(
      `## ${report.profile}`,
      '',
      '| Scenario | Result | Fields lost | Unowned | Keys lost | Page errors | New | Fixed | Time |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    );
    for (const r of report.scenarios) {
      const ok = r.status === 'ok';
      lines.push(
        `| ${r.id} | ${r.status} | ${ok ? r.losses.length : '–'} | ${ok ? unownedCount(r.losses) : '–'} | ${ok ? keyTotal(r.lossCounts) : '–'} | ${r.pageErrors.length} | ${r.regressions?.length ?? '–'} | ${r.fixes?.length ?? '–'} | ${r.seconds} s |`,
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
      const byClass = new Map();
      for (const loss of r.losses) {
        const list = byClass.get(loss.class) ?? [];
        list.push(lossLabel(loss));
        byClass.set(loss.class, list);
      }
      for (const cls of Object.keys(CLASS_NAMES)) {
        const list = byClass.get(cls);
        if (list) lines.push(`- ${CLASS_NAMES[cls]}: ${list.join(', ')}`);
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
    `${head} ${String(r.losses.length).padStart(3)} fields (${unownedCount(r.losses)} unowned) / ${String(keyTotal(r.lossCounts)).padStart(3)} keys lost, ${r.pageErrors.length} page errors (${delta})`,
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
  // HOT_VIEW_FIELDS must name view fields the fingerprint has, or R1 would
  // leave out something else (or nothing).
  for (const field of HOT_VIEW_FIELDS) {
    if (run.defaults.fields[field]?.class !== 'view') {
      throw new Error(
        `harness self-check: HOT_VIEW_FIELDS names ${field}, which is no view field`,
      );
    }
  }
  const results = [];
  for (const scenario of plannedScenarios(run.args)) {
    const startedAt = Date.now();
    const result = { id: scenario.id, title: scenario.title };
    run.pageErrors = [];
    try {
      const outcome = await scenario.run(run);
      const units = lossUnits(
        outcome.diffs,
        outcome.extraLosses,
        scenario.group,
      );
      const flags = { ...outcome.flags };
      // Whatever the boundary, every note leaves it with an id of its own
      // (decision D2); a note without one loses its Score marks at the next
      // save. An editor that never came back has no snapshot to read.
      if (outcome.after) {
        flags.noteIdsWhole = outcome.after.ids.noteIdsUnique === true;
      }
      Object.assign(result, {
        status: 'ok',
        lossCounts: lossCounts(units),
        losses: summarizeLosses(units),
        flags,
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
  selfCheck();
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
      if (updating && args['strict-api'] === 'true') {
        throw new Error(
          '--strict-api models an API no one has confirmed: its results are never recorded (drop --update-known)',
        );
      }
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
