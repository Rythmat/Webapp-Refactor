/* eslint-env node */
/**
 * What the milestone 1.4 scenario plug-ins (R11–R25, the files beside this
 * one) share: the tier switch, a skip that the ratchet reports as skipped,
 * small in-page fixtures (a student's riff, audio that lives only in
 * memory), the Projects dialog and toast drivers, and a context of our own
 * for the scenarios that must touch the browser before the editor loads
 * (a storage quota, a second build).
 *
 * roundtrip.mjs loads every scripts/studio-perf/scenarios/*.mjs as a
 * plug-in; this one exports neither `scenarios` nor `flags`, so it adds
 * nothing to the run by itself.
 *
 * Tiers (spec §8): a scenario of the full tier runs only with --tier=full
 * (or --full) on roundtrip.mjs's command line; in the fast tier it reports
 * skipped, so the ratchet keeps its known entry. A scenario that needs a
 * previous build (R14 real, R15) also needs --prev-base=<url> and reports
 * skipped without it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bootDraftSnapshot } from '../fixtures/drafts.mjs';
import {
  FIELD_CLASSES,
  ID_KINDS,
  installDevModules,
} from '../fixtures/fingerprint.mjs';
import { guardPartyKit, PROFILES, ROOT } from '../harness.mjs';
import { MockModeNotImplemented } from '../mockStudioApi.mjs';

/**
 * A scenario that does not run in this tier or setup. It extends the one
 * error runProfile reports as skipped (MockModeNotImplemented); its message
 * is the reason. (roundtrip.mjs appends "(milestone 1.5)" to that reason
 * until runProfile also honours `error.skipped`, see the integrator notes.)
 */
export class ScenarioSkipped extends MockModeNotImplemented {
  constructor(reason) {
    super('skipped');
    this.name = 'ScenarioSkipped';
    this.message = reason;
    this.skipped = true;
  }
}

/** Whether this run is the full tier (--tier=full or --full). */
export const isFullTier = (run) =>
  run.args?.tier === 'full' || run.args?.full === 'true';

/** Throws ScenarioSkipped unless this run is the full tier. */
export function fullTierOnly(run) {
  if (!isFullTier(run)) {
    throw new ScenarioSkipped('full tier only (roundtrip.mjs --tier=full)');
  }
}

/** The previous build's base URL (--prev-base), or a skip. */
export function prevBaseOrSkip(run) {
  fullTierOnly(run);
  const base = run.args?.['prev-base'];
  if (!base) {
    throw new ScenarioSkipped(
      'needs a previous build: provision one and pass --prev-base=http://localhost:5264',
    );
  }
  if (base.includes(':5179')) throw new Error('never port 5179');
  return base.replace(/\/$/, '');
}

/**
 * What R11–R25 compare when the same work comes back (spec: the classes
 * doc and view, and the ids, which compareFingerprints always compares),
 * plus the decoded audio and its bytes (runtime, media) where the class
 * exists: the media proof. Not the lesson or practice context (1.15), and
 * not this person's track inputs (track-local: a selected track re-arms as
 * the editor loads, see the report).
 */
export const REOPEN_CLASSES = ['doc', 'view', 'runtime', 'media'].filter(
  (cls) => cls in FIELD_CLASSES,
);

/** The raw id fields a new project mints afresh (never a leak). */
export const ID_FIELDS = ID_KINDS.map((kind) => `ids.${kind}`);

/** The editor modules the scenarios reach through __RT_DEV_MODULE__. */
export const MODULES = {
  projectsDialog: '/src/daw/shell/projects/useProjectsDialogStore.ts',
  undo: '/src/daw/store/undoMiddleware.ts',
  buffers: '/src/daw/audio/AudioBufferStore.ts',
  samplerChops: '/src/daw/instruments/samplerChops.ts',
  pendingMedia: '/src/daw/persistence/drafts/pendingMedia.ts',
  tutorialProgress: '/src/features/tutorials/useTutorialProgressStore.ts',
  synthStore: '/src/daw/oracle-synth/store/index.ts',
  fingerprintHash: '/src/lib/studio-projects/drafts/fingerprintHash.ts',
  saveStatus: '/src/daw/persistence/saveStatusStore.ts',
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// ── In-page fixtures ────────────────────────────────────────────────────────

/**
 * A student's riff: a named project with one piano track and a two-bar
 * clip, and nothing only the 1.5 document carries (no chords, ionian, 4/4),
 * so a cloud save of it is complete. Resolves to the track id.
 */
export function seedRiff(page, name, { notes = 8, volume = 0.6 } = {}) {
  return page.evaluate(
    ({ projectName, count, vol }) => {
      const s = window.__MA_STORE__.getState();
      s.setProjectName(projectName);
      const trackId = s.addTrack(
        'midi',
        'piano-sampler',
        `${projectName} Keys`,
      );
      window.__MA_STORE__.getState().addMidiClip(trackId, {
        id: `riff-${projectName.replace(/\W/g, '').toLowerCase()}`,
        name: 'Riff',
        startTick: 0,
        events: Array.from({ length: count }, (_, i) => ({
          note: 60 + ((i * 5) % 12),
          velocity: 80 + (i % 4) * 10,
          startTick: i * 240,
          durationTicks: 240,
          channel: 0,
        })),
      });
      window.__MA_STORE__.getState().updateTrack(trackId, { volume: vol });
      return trackId;
    },
    { projectName: name, count: notes, vol: volume },
  );
}

/** Sets a track's volume (an undoable project edit). */
export const setVolume = (page, trackId, volume) =>
  page.evaluate(
    ({ id, v }) =>
      window.__MA_STORE__.getState().updateTrack(id, { volume: v }),
    { id: trackId, v: volume },
  );

/** A track's volume, by id or by name; null when there is none. */
export const volumeOf = (page, { id = null, name = null }) =>
  page.evaluate(
    ({ trackId, trackName }) =>
      window.__MA_STORE__
        .getState()
        .tracks.find((t) => t.id === trackId || t.name === trackName)?.volume ??
      null,
    { trackId: id, trackName: name },
  );

/**
 * Audio that lives only in memory, as a Library sample drop (an imported
 * clip: decoded buffer and original bytes in AudioBufferStore, no asset) and
 * a file dropped on the Chops sampler leave it (kitchenSink.mjs does the
 * same). `seconds` sizes the imported clip's bytes (a generated WAV), so a
 * scenario can make it large. Resolves to { trackId, clipId, samplerTrackId,
 * sampleId, bytes } for what it made.
 */
export function addPendingAudio(
  page,
  { imported = true, sampler = true, seconds = 0.5, tag = 'rt' } = {},
) {
  return page.evaluate(
    async ({ modules, wantImported, wantSampler, length, prefix }) => {
      const dev = window.__RT_DEV_MODULE__;
      const store = window.__MA_STORE__;
      const act = () => store.getState();
      const buffers = await dev(modules.buffers);
      const chops = await dev(modules.samplerChops);
      const wav = (rate, secs, hz) => {
        const frames = Math.round(rate * secs);
        const view = new DataView(new ArrayBuffer(44 + frames * 2));
        const text = (at, value) =>
          [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
        text(0, 'RIFF');
        view.setUint32(4, 36 + frames * 2, true);
        text(8, 'WAVE');
        text(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, rate, true);
        view.setUint32(28, rate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        text(36, 'data');
        view.setUint32(40, frames * 2, true);
        for (let i = 0; i < frames; i++) {
          const fade = Math.min(1, i / 200, (frames - i) / 200);
          // A little noise, so no two generated files share bytes.
          const v =
            Math.sin((2 * Math.PI * hz * i) / rate) * 0.4 * fade +
            (Math.random() - 0.5) * 0.02;
          view.setInt16(44 + i * 2, Math.round(v * 32_767), true);
        }
        return view.buffer;
      };
      const decode = (bytes) =>
        new OfflineAudioContext(1, 1, 44_100).decodeAudioData(bytes);
      const made = { bytes: 0 };
      if (wantImported) {
        const trackId = act().addTrack('audio', 'vocal-fx', `${prefix} Vocals`);
        const bytes = wav(44_100, length, 330);
        const original = bytes.slice(0);
        const decoded = await decode(bytes);
        const clipId = `${prefix}-clip-imported`;
        buffers.setAudioBuffer(clipId, decoded);
        buffers.setOriginalAudio(clipId, original, 'audio/wav');
        act().addAudioClip(trackId, {
          id: clipId,
          startTick: 0,
          duration: Math.max(
            1,
            Math.round((decoded.duration / 60) * act().bpm * 480),
          ),
          fadeInTicks: 0,
          fadeOutTicks: 0,
        });
        Object.assign(made, {
          trackId,
          clipId,
          clipLength: decoded.length,
          bytes: made.bytes + original.byteLength,
        });
      }
      if (wantSampler) {
        const samplerTrackId = act().addTrack(
          'midi',
          'sampler',
          `${prefix} Chops Drop`,
        );
        const bytes = wav(22_050, 0.4, 440);
        const original = bytes.slice(0);
        const decoded = await decode(bytes);
        const sampleId = chops.mintSamplerSampleId();
        const key = chops.samplerBufferKey(sampleId);
        buffers.setAudioBuffer(key, decoded);
        buffers.setOriginalAudio(key, original, 'audio/wav');
        act().setSamplerSample(samplerTrackId, {
          sampleId,
          assetId: null,
          rootNote: 'A4',
          attack: 0.02,
          release: 0.3,
          name: `${prefix} Tone`,
          durationSeconds: decoded.duration,
        });
        Object.assign(made, {
          samplerTrackId,
          sampleId,
          sampleLength: decoded.length,
          bytes: made.bytes + original.byteLength,
        });
      }
      return made;
    },
    {
      modules: MODULES,
      wantImported: imported,
      wantSampler: sampler,
      length: seconds,
      prefix: tag,
    },
  );
}

/**
 * Whether the page holds decoded audio for a clip and a sampler sample
 * (AudioBufferStore), with their lengths in frames.
 */
export const audioLoaded = (page, { clipId = null, sampleId = null }) =>
  page.evaluate(
    async ({ modules, clip, sample }) => {
      const dev = window.__RT_DEV_MODULE__;
      const buffers = await dev(modules.buffers);
      const chops = await dev(modules.samplerChops);
      const clipBuffer = clip ? buffers.getAudioBuffer(clip) : null;
      const sampleBuffer = sample
        ? buffers.getAudioBuffer(chops.samplerBufferKey(sample))
        : null;
      return {
        clip: clipBuffer ? clipBuffer.length : null,
        sample: sampleBuffer ? sampleBuffer.length : null,
      };
    },
    { modules: MODULES, clip: clipId, sample: sampleId },
  );

// ── Legacy keys (what a pre-1.4 tab writes) ─────────────────────────────────

/** The device-wide autosave of builds before 1.4. */
export const LEGACY_AUTOSAVE_KEY = 'musicAtlas:daw:autosave';

const LEGACY_FIXTURE = join(
  ROOT,
  'src/daw/persistence/__tests__/fixtures/v2/demo-sunset-keys.json',
);

/**
 * A v2 session (the frozen fixture) under another project name and
 * timestamp, as a pre-1.3 tab writes it to the autosave or a kept slot.
 */
export function legacyV2(name, at) {
  const session = JSON.parse(readFileSync(LEGACY_FIXTURE, 'utf8'));
  session.timestamp = at;
  session.data.projectName = name;
  session.data.projectId = null;
  return session;
}

/** A legacy kept slot of `userKey`: [key, value]. */
export function legacyKeptSlot(userKey, name, at) {
  const iso = new Date(at).toISOString();
  return [
    `musicAtlas:daw:kept:${userKey}:${iso}`,
    JSON.stringify({
      keptAt: iso,
      projectName: name,
      session: legacyV2(name, at),
    }),
  ];
}

/** Writes localStorage entries ([key, value] pairs) from `tab`. */
export const writeKeys = (tab, entries) =>
  tab.evaluate((pairs) => {
    for (const [key, value] of pairs) localStorage.setItem(key, value);
  }, entries);

/** Reads localStorage keys from `tab`: { key: value | null }. */
export const readKeys = (tab, keys) =>
  tab.evaluate(
    (list) => Object.fromEntries(list.map((k) => [k, localStorage.getItem(k)])),
    keys,
  );

// ── Drafts and bodies ───────────────────────────────────────────────────────

/** FNV-1a (32-bit) of `text`, as 8 hex digits. */
function fnv(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Canonical JSON (sorted keys, undefined dropped). */
function canon(value) {
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * A track's inputs on this device (record arm, monitoring, the input
 * devices): this person's, not the work (registry class track-local).
 */
const TRACK_INPUT_KEYS = [
  'recordArmed',
  'monitoring',
  'midiInputId',
  'audioInputId',
  'audioInputChannel',
];

/**
 * A hash of a draft body's work without the view, the stamp, the tracks'
 * inputs (TRACK_INPUT_KEYS) and the given top-level data keys (a copy's
 * name and cloud link): two drafts of the same work under another name hash
 * the same.
 */
export function workHash(text, without = []) {
  if (!text) return null;
  try {
    const data = { ...(JSON.parse(text).data ?? {}) };
    for (const key of ['view', 'timestamp', ...without]) delete data[key];
    if (Array.isArray(data.tracks)) {
      data.tracks = data.tracks.map((track) => {
        const work = { ...track };
        for (const key of TRACK_INPUT_KEYS) delete work[key];
        return work;
      });
    }
    return fnv(canon(data));
  } catch {
    return null;
  }
}

/**
 * The top-level data keys (and, for tracks, `tracks[i].key`) where two draft
 * bodies differ, view and stamp left out: what a workHash mismatch is made
 * of, for the report.
 */
export function bodyDiffKeys(textA, textB, without = []) {
  let a;
  let b;
  try {
    a = { ...(JSON.parse(textA).data ?? {}) };
    b = { ...(JSON.parse(textB).data ?? {}) };
  } catch {
    return ['<unreadable>'];
  }
  const out = [];
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (['view', 'timestamp', ...without].includes(key)) continue;
    if (canon(a[key]) === canon(b[key])) continue;
    if (
      key === 'tracks' &&
      Array.isArray(a.tracks) &&
      Array.isArray(b.tracks)
    ) {
      a.tracks.forEach((t, i) => {
        const u = b.tracks[i] ?? {};
        for (const k of new Set([...Object.keys(t), ...Object.keys(u)])) {
          if (TRACK_INPUT_KEYS.includes(k)) continue;
          if (canon(t[k]) !== canon(u[k])) out.push(`tracks[${i}].${k}`);
        }
      });
      if (a.tracks.length !== b.tracks.length) out.push('tracks.length');
      continue;
    }
    out.push(key);
  }
  return out;
}

/** Drafts that turned 'kept' between `before` and `after`. */
export const newlyKept = (before, after) =>
  after.filter(
    (m) =>
      m.origin === 'kept' &&
      !before.some((b) => b.draftId === m.draftId && b.origin === 'kept'),
  );

/** Every mirror key in the page's localStorage, with its envelope. */
export const mirrorsNow = (page) =>
  page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith('musicAtlas:daw:mirror:'))
      .map((key) => {
        const raw = localStorage.getItem(key) ?? '';
        const cut = raw.indexOf(',"session":');
        try {
          const head = JSON.parse(`${raw.slice(0, cut)}}`);
          return {
            key,
            draftId: head.draftId,
            userKey: head.userKey,
            writeSeq: head.writeSeq,
            chars: raw.length,
          };
        } catch {
          return { key, unreadable: true, chars: raw.length };
        }
      }),
  );

/**
 * Hides the page as a tab switch does (visibilityState 'hidden' and a
 * visibilitychange), which runs the autosave's hidden flush (the mirror,
 * then a strict write). `visible` brings it back.
 */
export const setHidden = (page, hidden) =>
  page.evaluate((hide) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (hide ? 'hidden' : 'visible'),
    });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hide,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);

/**
 * Records every change of the save chip's state and reason as it happens
 * (a MutationObserver, so a state shorter than the watch's 100 ms poll is
 * still seen) on window.__rtChipLog: [{ state: 'saved/none', at }], at in
 * Date.now() (pageNow's clock). Idempotent per document.
 */
export const recordChip = (page) =>
  page.evaluate(() => {
    if (window.__rtChipLog) return;
    const log = [];
    window.__rtChipLog = log;
    const read = () => {
      const chip = document.querySelector('[data-testid="save-chip"]');
      const state = chip
        ? `${chip.getAttribute('data-state')}/${chip.getAttribute('data-reason')}`
        : null;
      if (state && log[log.length - 1]?.state !== state) {
        log.push({ state, at: Date.now() });
      }
    };
    read();
    new MutationObserver(read).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state', 'data-reason'],
    });
  });

/** The chip states recordChip saw since `since` (Date.now() in the page). */
export const chipLog = (page, since = 0) =>
  page.evaluate(
    (from) =>
      (window.__rtChipLog ?? [])
        .filter((c) => c.at >= from)
        .map((c) => c.state),
    since,
  );

// ── Toasts and dialogs ──────────────────────────────────────────────────────

/** Clicks `action` on the newest toast whose text matches; false if none. */
export async function clickToastAction(page, match, action, timeout = 8000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const toast = page
      .locator('[data-sonner-toast]', { hasText: match })
      .last();
    if (await toast.count()) {
      const button = toast.locator('button:not([data-close-button])', {
        hasText: new RegExp(`^\\s*${action}\\s*$`),
      });
      if (await button.count()) {
        await button.first().click();
        return true;
      }
    }
    if (Date.now() > deadline) return false;
    await sleep(150);
  }
}

/**
 * Closes the "Analyze chords?" prompt a project or jam open may offer
 * (offerChordAnalysis, a modal), as the student's "Not now" does.
 */
export const dismissChordPrompt = (page) =>
  page.evaluate(() => {
    const s = window.__MA_STORE__?.getState();
    if (s?.chordAnalysisPromptOpen) s.closeChordAnalysisPrompt();
  });

/**
 * Fields a resumed lesson rewrites as its overlay mounts (TutorialLayer
 * applies its step's preconditions again, here the channel strip tab):
 * the kitchen sink holds a lesson, and how a resumed lesson meets the
 * restored view is lesson persistence's (milestone 1.15, roundtrip.mjs
 * LOSS_OWNERS has R2's and R5's). Reported as diffs, left out of the
 * yes/no flags of the scenarios here.
 */
export const LESSON_RESUME_FIELDS = ['view.channelStripTab'];

/** `diffs` without the lesson-resume fields (LESSON_RESUME_FIELDS). */
export const withoutLessonResume = (diffs) =>
  (diffs ?? []).filter((d) => !LESSON_RESUME_FIELDS.includes(d.field));

/**
 * The lesson the store runs and the channel strip tab, for the report: a
 * replaced session's lesson that outlives the switch would rewrite the
 * view of what opens next (a 1.4 session-boundary leak), unlike a lesson
 * that comes back with its own draft (1.15).
 */
export const lessonNow = (page) =>
  page.evaluate(() => {
    const s = window.__MA_STORE__?.getState();
    return s
      ? {
          lesson: s.activeTutorialId ?? null,
          step: s.tutorialStepIndex ?? null,
          channelStripTab: s.channelStripTab ?? null,
        }
      : null;
  });

/**
 * Marks the session's last outcome, so nextOutcome waits for the one after
 * it (an open that ends on a refusal never moves the generation).
 */
export const markOutcome = (page) =>
  page.evaluate(() => {
    window.__rtOutcomeMark = window.__MA_SESSION__.getState().lastOutcome;
  });

/**
 * Waits for the session's next outcome after markOutcome's, once the open
 * has ended (phase ready, failed or idle): { status, kind } (the error's
 * kind), or null after `timeout`.
 */
export async function nextOutcome(page, timeout = 30_000) {
  return page
    .waitForFunction(
      () => {
        const s = window.__MA_SESSION__.getState();
        return s.lastOutcome &&
          s.lastOutcome !== window.__rtOutcomeMark &&
          ['ready', 'failed', 'idle'].includes(s.phase)
          ? {
              status: s.lastOutcome.status,
              kind: s.lastOutcome.error?.kind ?? null,
              restored: s.lastOutcome.restored ?? null,
            }
          : null;
      },
      null,
      { timeout, polling: 100 },
    )
    .then(
      (handle) => handle.jsonValue(),
      () => null,
    );
}

/** The Projects dialog, when it is open. */
export const projectsDialog = (page) =>
  page.getByRole('dialog', { name: 'Projects' });

/**
 * Opens the Projects dialog with File ▸ Open… and waits until its lists
 * have loaded (no 'Loading…'). Resolves to the dialog locator.
 */
export async function openProjectsFromMenu(page, kit) {
  await kit.clickFileItem(page, 'Open');
  return waitProjectsLoaded(page);
}

/** Waits until the open Projects dialog has listed this device's drafts. */
export async function waitProjectsLoaded(page, timeout = 20_000) {
  const dialog = projectsDialog(page);
  await dialog.waitFor({ state: 'visible', timeout });
  await page.waitForFunction(
    () => {
      const root = document.querySelector('[data-testid="projects-dialog"]');
      return root && !/Loading…/.test(root.textContent ?? '');
    },
    null,
    { timeout, polling: 100 },
  );
  return dialog;
}

/** The Projects dialog's rows as data. */
export const projectRows = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="projects-row"]')].map(
      (row) => ({
        draftId: row.getAttribute('data-draft-id'),
        projectId: row.getAttribute('data-project-id'),
        section: row.getAttribute('data-section'),
        origin: row.getAttribute('data-origin'),
        tags: (row.getAttribute('data-tags') ?? '').split(' ').filter(Boolean),
        name: row.querySelector('span[title]')?.getAttribute('title') ?? null,
        canOpen: [...row.querySelectorAll('button')].some(
          (b) => b.textContent.trim() === 'Open' && !b.disabled,
        ),
        canDelete: [...row.querySelectorAll('button')].some(
          (b) =>
            (b.getAttribute('aria-label') ?? b.getAttribute('title')) ===
              'Delete from this device' && !b.disabled,
        ),
      }),
    ),
  );

/** Clicks Open on the row of `draftId` (or of `projectId`). */
export async function openRow(page, { draftId = null, projectId = null }) {
  const selector = draftId
    ? `[data-testid="projects-row"][data-draft-id="${draftId}"]`
    : `[data-testid="projects-row"][data-project-id="${projectId}"]`;
  await page
    .locator(selector)
    .first()
    .locator('button', { hasText: /^\s*Open\s*$/ })
    .click();
}

/** Closes the Projects dialog with Escape and waits until it is gone. */
export async function closeProjects(page) {
  await page.keyboard.press('Escape');
  await projectsDialog(page)
    .waitFor({ state: 'detached', timeout: 10_000 })
    .catch(() => {});
}

/**
 * An in-app link from inside the editor, the way R4 opens one: to /studio
 * and back to /studio/editor<query>. Resolves like waitForEditor.
 */
export async function inAppLink(kit, page, query) {
  await kit.leaveEditor(page);
  await kit.spaNavigate(page, `/studio/editor${query}`);
  return kit.waitForEditor(page);
}

/** The platform's Mod key for a shortcut (Meta on a Mac). */
export const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

// ── A context of our own ────────────────────────────────────────────────────

/**
 * A fresh context set up as roundtrip.mjs's openEditorContext sets one up
 * (the mock, the PartyKit guard, the dev modules, the watch, the boot draft
 * snapshot, the profile's CPU throttle), with `beforeOpen(context)` run
 * before the editor first loads (a quota cap must come before the origin
 * first uses IndexedDB), then the editor opened at `base + query`
 * (`base` defaults to the run's). `viewport` overrides the profile's.
 * Resolves to { context, page, errors, state }: state as waitForEditor.
 * Its pages' requests are not tracked (roundtrip.mjs keeps trackNetwork to
 * itself), so settle() there skips the wait for requests in flight; the
 * draft and audio waits still hold. A real need for it: export
 * trackNetwork in ROUNDTRIP_KIT.
 */
export async function openCustomContext(
  run,
  kit,
  {
    query = '?new=1',
    api = run.api,
    base = run.base,
    beforeOpen = null,
    viewport = null,
    initScripts = [],
  } = {},
) {
  const profile = PROFILES[run.profile];
  const context = await run.browser.newContext({
    viewport: viewport ?? profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
  });
  await guardPartyKit(context);
  await api.install(context);
  await context.addInitScript(installDevModules);
  await context.addInitScript(kit.installWatch);
  await context.addInitScript(bootDraftSnapshot);
  for (const script of initScripts) await context.addInitScript(script);
  const extra = beforeOpen ? await beforeOpen(context) : null;
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error).slice(0, 500)));
  run.pageErrors?.push(errors);
  if (profile.cpuThrottle > 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', {
      rate: profile.cpuThrottle,
    });
  }
  const state = await kit.openAt(page, base, query);
  return { context, page, errors, state, extra };
}

/**
 * A plain tab of `context` on the dev server that boots no app (the Vite
 * client module), for code that needs the origin without the editor:
 * another build's tab writing storage, a lock holder, a quota holder.
 */
export async function originTab(context, base) {
  const tab = await context.newPage();
  await tab.goto(`${base}/@vite/client`, { waitUntil: 'domcontentloaded' });
  return tab;
}

// ── The Song page ───────────────────────────────────────────────────────────

const NOTE_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** The semitone (0–11) of a key label such as 'Key of F#m. Transpose'. */
export function keySemitone(label) {
  const m = /Key of ([A-G])([#♯b♭]?)/.exec(label ?? '');
  if (!m) return null;
  const shift = m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? -1 : 0;
  return (NOTE_SEMITONES[m[1]] + shift + 12) % 12;
}

/**
 * The Song page's Open in Studio, as a student uses it: to /songs/<id>
 * (in-app from the editor when `inApp`, else a full page load of `base`),
 * the key picker moved `transpose` semitones up when asked, then the Open
 * in Studio button. Resolves to { state, keyBefore, keyAfter, root,
 * editorUrl }: `root` is the semitone of the key the page showed before
 * transposing, `editorUrl` the first editor URL the click navigated to.
 */
export async function openSongInStudio(
  kit,
  page,
  { songId, transpose = 0, inApp = true, base },
) {
  if (inApp) {
    await kit.leaveEditor(page);
    await kit.spaNavigate(page, `/songs/${songId}`);
  } else {
    await page.goto(`${base}/songs/${songId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 180_000,
    });
  }
  const trigger = page.locator('button[aria-label$=". Transpose"]').first();
  await trigger.waitFor({ timeout: 120_000 });
  const keyBefore = await trigger.getAttribute('aria-label');
  if (transpose !== 0) {
    await trigger.click();
    const radios = page.locator(
      '[role="radiogroup"][aria-label="Choose a key"] [role="radio"]',
    );
    await radios.first().waitFor({ timeout: 10_000 });
    const n = await radios.count();
    const want = new RegExp(
      `${transpose > 0 ? '\\+' : '-'}${Math.abs(transpose)}\\s*$`,
    );
    for (let i = 0; i < n; i++) {
      await radios.nth(i).click();
      if (want.test((await trigger.innerText()).trim())) break;
    }
    await page.keyboard.press('Escape');
  }
  const keyAfter = await trigger.getAttribute('aria-label');
  const urls = [];
  const onNav = (frame) => {
    if (frame === page.mainFrame()) urls.push(frame.url());
  };
  page.on('framenavigated', onNav);
  await page.locator('button[aria-label="Open in Studio"]').first().click();
  const state = await kit.waitForEditor(page, 180_000);
  page.off('framenavigated', onNav);
  const editorUrl =
    urls.map((u) => new URL(u)).find((u) => u.pathname === '/studio/editor') ??
    null;
  return {
    state,
    keyBefore,
    keyAfter,
    root: keySemitone(keyBefore),
    editorUrl: editorUrl ? `${editorUrl.pathname}${editorUrl.search}` : null,
  };
}

/**
 * Opens the Projects dialog: File ▸ Open… when the editor shows its File
 * menu, else (the Practice screen has none) the dialog's own store.
 */
export async function openProjects(page, kit) {
  await dismissChordPrompt(page);
  const hasMenu = await page
    .locator('[data-tutorial-id="file-menu"]')
    .count()
    .catch(() => 0);
  if (hasMenu) return openProjectsFromMenu(page, kit);
  await page.evaluate(async (path) => {
    const { useProjectsDialogStore } = await window.__RT_DEV_MODULE__(path);
    useProjectsDialogStore.getState().openDialog();
  }, MODULES.projectsDialog);
  return waitProjectsLoaded(page);
}
