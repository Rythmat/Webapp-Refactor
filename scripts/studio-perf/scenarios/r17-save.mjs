/* eslint-env node */
/**
 * R17 the save chip and save failures (milestone 1.4, E12/E13). Each
 * scenario has a mock API of its own, so its faults never reach another.
 * The project is a riff with nothing only the 1.5 document carries (no
 * chords, ionian, 4/4), so a complete save can read plain "Saved".
 *
 * Fast:
 * - offline: saved once, edited, then offline (the mock's abort fault plus
 *   context.setOffline); Ctrl/⌘S fails and the chip reads "Couldn't save"
 *   (reason cloud) and never "Saved" while offline (noFalseSaved: every
 *   chip change, recordChip's MutationObserver, not a poll). Back
 *   online, the one retry on the 'online' event saves: the chip reads
 *   "Saved" after exactly one PUT and no POST (retrySaved).
 * - overlap: every PUT takes 1.5 s; three saves around two edits. No two
 *   PUTs are ever in flight together, the repeats coalesce into one more
 *   PUT, and the cloud ends with the last edit (savesSerialized).
 * - legacyIncomplete: the riff in D dorian (the mode only the 1.5 document
 *   carries): after File ▸ Save the toast names what stays on this device
 *   and the chip reads "Saved on this device" with reason partial, never
 *   plain "Saved" (chipHonestAfterLegacySave).
 *
 * Full:
 * - serverErrors: a PUT answering 500 once is retried once and saves
 *   (serverErrorRetriedOnce); a PUT failing every time shows the chip
 *   error, and its Retry saves once the server is back (retryButtonSaves);
 *   a 401 reads as a plain error without a status code (plainErrorText).
 * - remoteDelete: the project deleted elsewhere (PUT 404) is created again
 *   under the same name, holding the work as it is now (the edit made
 *   after the delete), with a toast (recreatedAfterRemoteDelete).
 * - slowEdit: an edit while the PUT is in flight is not in the cloud, so
 *   the chip never reads "Saved" from the edit on (every change, not a
 *   poll): "Unsaved" until the draft has it, then "Saved on this device";
 *   the edit itself stays in the session and the draft, and the project
 *   reads changed (editDuringSaveStaysUnsaved).
 * - paths: File ▸ Save and Ctrl/⌘S both toast "Project saved" and leave
 *   the chip "Saved" (savedFromEveryPath).
 */
import {
  chipLog,
  fullTierOnly,
  MOD,
  recordChip,
  seedRiff,
  setVolume,
  volumeOf,
} from './_shared.mjs';

export const flags = {
  noFalseSaved: {
    goal: true,
    text: 'offline, the chip never read "Saved"',
  },
  retrySaved: {
    goal: true,
    text: 'back online, one retry (one PUT, no POST) saved and the chip read "Saved"',
  },
  savesSerialized: {
    goal: true,
    text: 'overlapping saves ran one at a time, coalesced, and kept the last edit',
  },
  serverErrorRetriedOnce: {
    goal: true,
    text: 'a PUT answering 500 once was retried once and saved',
  },
  retryButtonSaves: {
    goal: true,
    text: 'after a failed save the chip’s Retry saved',
  },
  plainErrorText: {
    goal: true,
    text: 'a failed save’s chip text names no HTTP status',
  },
  recreatedAfterRemoteDelete: {
    goal: true,
    text: 'a project deleted elsewhere was created again on save, with a toast',
  },
  editDuringSaveStaysUnsaved: {
    goal: true,
    text: 'an edit made during a save never read "Saved" (Unsaved, then Saved on this device)',
  },
  savedFromEveryPath: {
    goal: true,
    text: 'File ▸ Save and Ctrl/⌘S both said "Project saved" and the chip read "Saved"',
  },
};

const PROJECT_PUT = /^\/api\/studio\/projects\/[^/]+$/;

/** The chip's state, reason and visible plus described text. */
const chipFull = (page) =>
  page.evaluate(() => {
    const chip = document.querySelector('[data-testid="save-chip"]');
    if (!chip) return null;
    const button = chip.querySelector('button[aria-label="Retry save"]');
    const described = button?.getAttribute('aria-describedby');
    return {
      state: chip.getAttribute('data-state'),
      reason: chip.getAttribute('data-reason'),
      text: (chip.textContent ?? '').trim(),
      detail: described
        ? (document.getElementById(described)?.textContent ?? '').trim()
        : null,
    };
  });

/** Waits for the chip to read `state` (and `reason`); the chip, or null. */
async function chipReads(page, state, reason = null, timeout = 30_000) {
  try {
    await page.waitForFunction(
      ({ want, why }) => {
        const chip = document.querySelector('[data-testid="save-chip"]');
        return (
          chip?.getAttribute('data-state') === want &&
          (!why || chip.getAttribute('data-reason') === why)
        );
      },
      { want: state, why: reason },
      { timeout, polling: 100 },
    );
    return chipFull(page);
  } catch {
    return null;
  }
}

/** Ctrl/⌘S, with nothing editable focused (the editor's own shortcut). */
async function pressSave(page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.keyboard.press(`${MOD}+KeyS`);
}

/** Waits until no save is in flight; the cloud save store's state. */
async function savesIdle(page, timeout = 60_000) {
  await page.waitForFunction(
    () => {
      const s = window.__MA_CLOUD_SAVE__.getState();
      return s.inFlight === 0 && s.phase !== 'saving';
    },
    null,
    { timeout, polling: 100 },
  );
  return page.evaluate(() => {
    const s = window.__MA_CLOUD_SAVE__.getState();
    return {
      phase: s.phase,
      savedCount: s.savedCount,
      error: s.error?.kind ?? null,
    };
  });
}

/** The API writes to projects logged since `from` (not faulted), as text. */
const projectWrites = (api, from) =>
  api
    .requestsSince(from)
    .filter(
      (l) =>
        l.method !== 'GET' &&
        /^\/api\/studio\/projects(\/[^/]+)?$/.test(l.path),
    )
    .map((l) => `${l.method}${l.fault ? ' (fault)' : ''} ${l.status}`);

/** The riff, written, then saved once (the project exists). */
async function savedRiff(kit, page, name) {
  const track = await seedRiff(page, name);
  await kit.waitForDraft(page);
  await kit.saveFromFileMenu(page);
  const projectId = await page.evaluate(
    () => window.__MA_STORE__.getState().projectId,
  );
  return { track, projectId };
}

async function offline(kit, run) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async (session) => {
      const { page } = session;
      const { track, projectId } = await savedRiff(kit, page, 'Offline Tune');
      const savedFirst = await chipReads(page, 'saved', null, 15_000);
      await recordChip(page);
      await setVolume(page, track, 0.52);
      await kit.waitForDraft(page);
      await kit.setOffline(session, api, true);
      let errorChip = null;
      let chipHistory = [];
      let writes = [];
      let finalChip = null;
      try {
        const since = await kit.pageNow(page);
        await pressSave(page);
        errorChip = await chipReads(page, 'error', null, 20_000);
        await kit.sleep(1000);
        chipHistory = await chipLog(page, since);
      } finally {
        const from = api.log.length;
        await kit.setOffline(session, api, false);
        finalChip = await chipReads(page, 'saved', null, 30_000);
        // Room for a second, unwanted retry.
        await kit.sleep(3000);
        writes = projectWrites(api, from);
      }
      const stored = api.projects.get(projectId);
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          noFalseSaved:
            Boolean(errorChip) &&
            errorChip.reason === 'cloud' &&
            !chipHistory.some((s) => s.startsWith('saved/')),
          retrySaved:
            finalChip?.state === 'saved' &&
            writes.length === 1 &&
            writes[0].startsWith('PUT') &&
            stored?.tracks?.[0]?.volume === 0.52,
        },
        checks: {
          chipFirstSave: savedFirst?.state ?? null,
          chip: errorChip
            ? { state: errorChip.state, reason: errorChip.reason }
            : null,
          errorText: errorChip?.text ?? null,
          chipWhileOffline: chipHistory,
          writesAfterOnline: writes,
          finalChip: finalChip?.state ?? null,
        },
        after: await kit.fingerprint(page),
      };
    },
    api,
  );
}

async function overlap(kit, run) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      const { track, projectId } = await savedRiff(kit, page, 'Overlap Tune');
      const spans = [];
      const open = new Map();
      const isPut = (r) =>
        r.method() === 'PUT' && PROJECT_PUT.test(new URL(r.url()).pathname);
      page.on('request', (r) => {
        if (isPut(r)) open.set(r, { start: Date.now(), end: null });
      });
      const done = (r) => {
        const span = open.get(r);
        if (span) {
          span.end = Date.now();
          spans.push(span);
          open.delete(r);
        }
      };
      page.on('requestfinished', done);
      page.on('requestfailed', done);
      const removeFault = api.fault({
        method: 'PUT',
        path: PROJECT_PUT,
        delayMs: 1500,
      });
      let state;
      try {
        await setVolume(page, track, 0.5);
        await pressSave(page);
        await kit.sleep(250);
        await setVolume(page, track, 0.6);
        await pressSave(page);
        await kit.sleep(100);
        await pressSave(page);
        state = await savesIdle(page);
      } finally {
        removeFault();
      }
      await kit.sleep(500);
      let maxConcurrent = 0;
      for (const a of spans) {
        const overlapping = spans.filter(
          (b) => b.start < a.end && a.start < b.end,
        ).length;
        maxConcurrent = Math.max(maxConcurrent, overlapping);
      }
      const chip = await kit.settledChip(page);
      const stored = api.projects.get(projectId);
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          savesSerialized:
            spans.length >= 1 &&
            spans.length <= 2 &&
            maxConcurrent === 1 &&
            stored?.tracks?.[0]?.volume === 0.6 &&
            chip?.state === 'saved',
        },
        checks: {
          puts: spans.length,
          maxConcurrent,
          cloudVolume: stored?.tracks?.[0]?.volume ?? null,
          saveState: state,
          chip,
        },
        after: await kit.fingerprint(page),
      };
    },
    api,
  );
}

async function legacyIncomplete(kit, run) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      await seedRiff(page, 'Dorian Tune');
      await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        s.setRootNote(2);
        s.setMode('dorian');
      });
      await kit.waitForDraft(page);
      const since = await kit.pageNow(page);
      await kit.saveFromFileMenu(page);
      const toast = await kit.waitForToast(page, {
        since,
        match: /Project saved/,
      });
      const chip = await kit.settledChip(page);
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          savedToast: Boolean(toast),
          chipHonestAfterLegacySave:
            chip?.state === 'local' &&
            chip?.reason === 'partial' &&
            /stays? on this device/.test(toast?.text ?? ''),
        },
        checks: { chip, savedToastText: toast?.text ?? null },
        after: await kit.fingerprint(page),
      };
    },
    api,
  );
}

async function serverErrors(kit, run) {
  fullTierOnly(run);
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      const { track, projectId } = await savedRiff(kit, page, 'Server Tune');
      // 500 once: retried once.
      let from = api.log.length;
      const once = api.fault({
        method: 'PUT',
        path: PROJECT_PUT,
        status: 500,
        times: 1,
      });
      await setVolume(page, track, 0.31);
      await pressSave(page);
      const afterOnce = await savesIdle(page);
      once();
      const chipOnce = await kit.settledChip(page);
      const retried = projectWrites(api, from);
      // 500 every time: the chip error; Retry once it is back.
      const always = api.fault({
        method: 'PUT',
        path: PROJECT_PUT,
        status: 500,
      });
      await setVolume(page, track, 0.32);
      await pressSave(page);
      const errorChip = await chipReads(page, 'error', 'cloud', 20_000);
      always();
      from = api.log.length;
      let retryClicked = false;
      if (errorChip) {
        await page.click(
          '[data-testid="save-chip"] button[aria-label="Retry save"]',
        );
        retryClicked = true;
      }
      const afterRetry = await chipReads(page, 'saved', null, 30_000);
      const retryWrites = projectWrites(api, from);
      // 401: a plain message.
      const denied = api.fault({
        method: 'PUT',
        path: PROJECT_PUT,
        status: 401,
      });
      await setVolume(page, track, 0.33);
      await pressSave(page);
      const deniedChip = await chipReads(page, 'error', null, 20_000);
      denied();
      const stored = api.projects.get(projectId);
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          serverErrorRetriedOnce:
            afterOnce.phase !== 'error' &&
            chipOnce?.state === 'saved' &&
            retried.filter((w) => w.startsWith('PUT')).length === 2,
          retryButtonSaves:
            retryClicked &&
            afterRetry?.state === 'saved' &&
            retryWrites.length >= 1 &&
            stored?.tracks?.[0]?.volume === 0.32,
          plainErrorText:
            Boolean(errorChip && deniedChip) &&
            ![
              errorChip.text,
              errorChip.detail,
              deniedChip.text,
              deniedChip.detail,
            ]
              .join(' ')
              .match(/\b(401|500)\b/),
        },
        checks: {
          retriedWrites: retried,
          errorChip,
          deniedChip,
          retryWrites,
        },
        after: await kit.fingerprint(page),
      };
    },
    api,
  );
}

async function remoteDelete(kit, run) {
  fullTierOnly(run);
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      const { track, projectId } = await savedRiff(kit, page, 'Deleted Tune');
      api.deleteProject(projectId);
      await setVolume(page, track, 0.44);
      await kit.waitForDraft(page);
      const since = await kit.pageNow(page);
      const from = api.log.length;
      await pressSave(page);
      const state = await savesIdle(page);
      const now = await page.evaluate(() => ({
        projectId: window.__MA_STORE__.getState().projectId,
        name: window.__MA_STORE__.getState().projectName,
      }));
      // The toast can land after the save has settled (a slow page).
      const toast = await kit.waitForToast(page, {
        since,
        match: /deleted|new project/i,
        timeout: 8000,
      });
      const toasts = await kit.readToasts(page, since);
      const writes = projectWrites(api, from);
      const recreated = api.projects.get(now.projectId);
      const chip = await kit.settledChip(page);
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          recreatedAfterRemoteDelete:
            state.phase !== 'error' &&
            now.projectId !== projectId &&
            recreated?.name === 'Deleted Tune' &&
            recreated?.tracks?.length === 1 &&
            recreated.tracks[0]?.volume === 0.44 &&
            writes.some((w) => w.startsWith('POST')) &&
            chip?.state === 'saved' &&
            Boolean(toast),
        },
        checks: {
          writes,
          toasts,
          projects: { before: projectId, after: now.projectId },
          recreated: recreated
            ? {
                name: recreated.name,
                tracks: recreated.tracks?.length ?? null,
                volume: recreated.tracks?.[0]?.volume ?? null,
              }
            : null,
          chip,
        },
        after: await kit.fingerprint(page),
      };
    },
    api,
  );
}

async function slowEdit(kit, run) {
  fullTierOnly(run);
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      const { track, projectId } = await savedRiff(kit, page, 'Slow Tune');
      const slow = api.fault({
        method: 'PUT',
        path: PROJECT_PUT,
        delayMs: 2500,
      });
      let saving = null;
      let editAt = 0;
      await recordChip(page);
      try {
        await setVolume(page, track, 0.21);
        await pressSave(page);
        saving = await chipReads(page, 'saving', null, 10_000);
        await kit.sleep(300);
        editAt = await kit.pageNow(page);
        await setVolume(page, track, 0.22);
        await savesIdle(page);
      } finally {
        slow();
      }
      const draft = await kit.waitForDraft(page);
      const chip = await kit.settledChip(page);
      const history = await chipLog(page, editAt);
      const liveVolume = await volumeOf(page, { id: track });
      const draftVolume = (() => {
        try {
          return (
            JSON.parse(draft.text).data.tracks.find((t) => t.id === track)
              ?.volume ?? null
          );
        } catch {
          return null;
        }
      })();
      const status = await page.evaluate(async (path) => {
        const st = await window.__RT_DEV_MODULE__(path);
        const saved = window.__MA_CLOUD_SAVE__.getState().lastSaved;
        return {
          dirty: st.isDocumentDirty(),
          documentVersion: st.useSaveStatusStore.getState().documentVersion,
          lastSavedVersion: saved?.version ?? null,
          complete: saved?.complete ?? null,
        };
      }, '/src/daw/persistence/saveStatusStore.ts');
      const cloudVolume = api.projects.get(projectId)?.tracks?.[0]?.volume;
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          // The edit after the save's snapshot is on this device only: the
          // chip reads 'unsaved' until the draft has it, then 'local'.
          editDuringSaveStaysUnsaved:
            Boolean(saving) &&
            cloudVolume === 0.21 &&
            !history.some((s) => s.startsWith('saved/')) &&
            chip?.state === 'local' &&
            liveVolume === 0.22 &&
            draftVolume === 0.22 &&
            status.dirty === true,
        },
        checks: {
          chip,
          chipSinceEdit: history,
          sawSaving: Boolean(saving),
          cloudVolume,
          liveVolume,
          draftVolume,
          status,
        },
        after: await kit.fingerprint(page),
      };
    },
    api,
  );
}

async function paths(kit, run) {
  fullTierOnly(run);
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      const { track } = await savedRiff(kit, page, 'Paths Tune');
      const results = {};
      for (const [label, save] of [
        ['menu', () => kit.saveFromFileMenu(page)],
        [
          'shortcut',
          async () => {
            await pressSave(page);
            await savesIdle(page);
          },
        ],
      ]) {
        await setVolume(page, track, label === 'menu' ? 0.61 : 0.62);
        await kit.waitForDraft(page);
        const since = await kit.pageNow(page);
        await save();
        const toast = await kit.waitForToast(page, {
          since,
          match: /Project saved/,
          timeout: 8000,
        });
        const chip = await kit.settledChip(page);
        results[label] = {
          toast: toast?.text ?? null,
          chip: chip?.state ?? null,
        };
      }
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          savedFromEveryPath: Object.values(results).every(
            (r) => r.toast && r.chip === 'saved',
          ),
        },
        checks: { savePaths: results },
        after: await kit.fingerprint(page),
      };
    },
    api,
  );
}

const SCENARIOS = [
  [
    'offline',
    'Offline Ctrl/⌘S: the chip errors, then one retry online saves',
    offline,
  ],
  ['overlap', 'Overlapping saves run one at a time and coalesce', overlap],
  [
    'legacyIncomplete',
    'A save of document-only data reads "Saved on this device" (partial)',
    legacyIncomplete,
  ],
  ['serverErrors', '(full) 500 once, 500 always then Retry, 401', serverErrors],
  [
    'remoteDelete',
    '(full) A project deleted elsewhere is created again on save',
    remoteDelete,
  ],
  ['slowEdit', '(full) An edit during a slow save stays unsaved', slowEdit],
  ['paths', '(full) File ▸ Save and Ctrl/⌘S say the same', paths],
];

export const scenarios = (kit) =>
  SCENARIOS.map(([key, title, fn]) => ({
    group: 'R17',
    key,
    id: `R17-save:${key}`,
    title,
    run: (run) => fn(kit, run),
  }));
