/* eslint-env node */
/**
 * R14 an old tab, and R15 a revert (milestone 1.4, E6: the legacy keys are
 * frozen, imported by content hash at every boot and Projects open, never
 * written or deleted by 1.4).
 *
 * R14:simulated (fast). Tab A runs 1.4 with a riff. Page B, a tab of the
 * same browser that boots no app, writes what a pre-1.4 tab writes: the
 * device-wide autosave 'musicAtlas:daw:autosave' (a v2 session from the
 * frozen fixtures) and a kept slot ('musicAtlas:daw:kept:<user>:<iso>').
 * - liveTabUnaffected: A keeps its project, draft and draft body, and an
 *   edit in A writes A's draft, never the legacy key.
 * - ownDraftWinsOnReload: A reloads into its own draft, not the legacy one.
 * - B then writes a newer autosave (a v3-in-v2 envelope, as 1.3 writes);
 *   opening Projects imports it: both the first and the newer one are
 *   drafts now (legacyMigratedAgain), the kept slot is a kept draft
 *   (legacyKeptSlotMigrated), and every one of them is listed with Open
 *   and opens (bothSessionsRecoverable).
 * - B rewrites the same project twice more (a track added each time, as a
 *   long-lived old tab does), with Projects opened after each: the one
 *   'recovered' draft is updated in place and holds the last write, no
 *   near-duplicates pile up (oldTabRewritesDoNotPileUp).
 * - legacyKeyUntouched: the autosave and the kept slot hold, byte for
 *   byte, what B last wrote.
 *
 * R14:firstBoot (fast): deploy day for an existing student. A fresh device
 * holds only pre-1.4 keys: the autosave L ('Last Session', 5 min ago) and
 * three of the student's kept slots, each kept more recently than L. Plain
 * /studio/editor resumes L's one imported draft (opened, it is the
 * session's own: origin 'session'), not the newest kept slot
 * (firstBootResumesLastSession), and the three slots are kept drafts
 * with their names, no copy, no fork, every legacy key unchanged
 * (firstBootKeptSlotsImported).
 *
 * R14:real (full) and R15 (full) run a previous build (a pre-1.4 commit
 * served on its own port, --prev-base). Its tab is served on THIS origin
 * (page.route fetches every request of that page from the previous
 * server), so it shares localStorage, IndexedDB and locks with the 1.4
 * tabs, as an old tab left open across a deploy does.
 * - R14:real: the old tab and a 1.4 tab edit side by side; the old tab
 *   cannot clobber the 1.4 draft (oldTabCannotClobberDraft), and the old
 *   tab's work comes into 1.4 as a draft.
 * - R15 revert: 1.4 made drafts; the old build then opens the editor
 *   (oldBuildOpens) and leaves the drafts exactly as they were: every
 *   draft's writeSeq and body read straight from IndexedDB by a tab that
 *   boots no app, before and after the old build ran
 *   (draftsUntouchedByOldBuild); rolled forward, 1.4 has every draft and
 *   the old build's own work, which the student is told of or finds in
 *   Projects (rollForwardRecoversAll), with at most one draft per legacy
 *   content (noDuplicateBeyondOne).
 * Both report skipped without --prev-base.
 */
import { DEV_USER_KEY } from '../fixtures/drafts.mjs';
import {
  closeProjects,
  LEGACY_AUTOSAVE_KEY,
  legacyKeptSlot,
  legacyV2,
  openCustomContext,
  openProjects,
  openRow,
  originTab,
  prevBaseOrSkip,
  projectRows,
  readKeys,
  seedRiff,
  setVolume,
  workHash,
  writeKeys,
} from './_shared.mjs';

export const flags = {
  liveTabUnaffected: {
    goal: true,
    text: 'a pre-1.4 tab writing the legacy keys left the 1.4 tab’s project and draft alone',
  },
  ownDraftWinsOnReload: {
    goal: true,
    text: 'the 1.4 tab reloaded into its own draft, not the legacy autosave',
  },
  legacyMigratedAgain: {
    goal: true,
    text: 'a newer legacy autosave was imported again, next to the first',
  },
  legacyKeptSlotMigrated: {
    goal: true,
    text: 'a legacy kept slot became a kept draft',
  },
  bothSessionsRecoverable: {
    goal: true,
    text: 'the 1.4 work and every legacy session are listed in Projects and open',
  },
  oldTabRewritesDoNotPileUp: {
    goal: true,
    text: 'an old tab rewriting the same project updated its one recovered draft in place',
  },
  firstBootResumesLastSession: {
    goal: true,
    text: 'the first 1.4 boot resumed the legacy autosave, not a newer kept slot',
  },
  firstBootKeptSlotsImported: {
    goal: true,
    text: 'the first 1.4 boot made every legacy kept slot a kept draft, with no copy and the keys unchanged',
  },
  legacyKeyUntouched: {
    goal: true,
    text: '1.4 never wrote or deleted a legacy key',
  },
  oldTabCannotClobberDraft: {
    goal: true,
    text: 'a real pre-1.4 tab could not overwrite the 1.4 draft, and its own work came in as a draft',
  },
  oldBuildOpens: {
    goal: true,
    text: 'after 1.4 ran, the previous build still opened the editor',
  },
  draftsUntouchedByOldBuild: {
    goal: true,
    text: 'the previous build left the 1.4 drafts as they were',
  },
  rollForwardRecoversAll: {
    goal: true,
    text: 'rolled forward, 1.4 had every draft and the previous build’s work',
  },
  noDuplicateBeyondOne: {
    goal: true,
    text: 'each legacy content became at most one draft',
  },
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * A v3-in-v2 envelope, as 1.3 writes it: the 1.4 tab's own draft body
 * (1.4 stores 1.3's text verbatim) under another name and track names.
 */
function legacyV3(text, name, at) {
  const session = JSON.parse(text);
  session.timestamp = at;
  session.data.projectName = name;
  session.data.projectId = null;
  session.data.tracks = (session.data.tracks ?? []).map((t) => ({
    ...t,
    name: `${name} ${t.name}`,
  }));
  return session;
}

async function simulated(kit, run) {
  return kit.withSession(run, '?new=1', async (session) => {
    const tabA = session.page;
    const track = await seedRiff(tabA, 'Live Tab Tune');
    const draftA = await kit.waitForDraft(tabA);

    // Page B: a pre-1.4 tab of the same browser writes the legacy keys.
    const tabB = await originTab(session.context, run.base);
    const now = Date.now();
    const iso = new Date(now - 60_000).toISOString();
    const keptKey = `musicAtlas:daw:kept:${DEV_USER_KEY}:${iso}`;
    const v2 = JSON.stringify(legacyV2('Old Tab v2', now - 30_000));
    const kept = JSON.stringify({
      keptAt: iso,
      projectName: 'Old Tab Kept',
      session: legacyV2('Old Tab Kept', now - 60_000),
    });
    await writeKeys(tabB, [
      [LEGACY_AUTOSAVE_KEY, v2],
      [keptKey, kept],
    ]);

    // A carries on: an edit, written to A's draft.
    await setVolume(tabA, track, 0.41);
    const editedA = await kit.waitForDraft(tabA);
    const liveA = await tabA.evaluate(() => ({
      name: window.__MA_STORE__.getState().projectName,
      draftId: window.__MA_SESSION__.getState().draftId,
    }));
    const legacyAfterEdit = await readKeys(tabB, [LEGACY_AUTOSAVE_KEY]);
    const liveTabUnaffected =
      liveA.name === 'Live Tab Tune' &&
      liveA.draftId === draftA.draftId &&
      editedA.draftId === draftA.draftId &&
      editedA.text.includes('0.41') &&
      legacyAfterEdit[LEGACY_AUTOSAVE_KEY] === v2;

    // A reloads: its own draft, not L.
    await tabA.reload({ waitUntil: 'domcontentloaded' });
    const reloaded = await kit.waitForEditor(tabA);
    if (reloaded !== 'ready') return kit.crashed(reloaded);
    await kit.settle(tabA, 'after the reload');
    const afterReload = await tabA.evaluate(() => ({
      name: window.__MA_STORE__.getState().projectName,
      draftId: window.__MA_SESSION__.getState().draftId,
    }));
    const ownDraftWinsOnReload =
      afterReload.draftId === draftA.draftId &&
      afterReload.name === 'Live Tab Tune';

    // B writes a newer autosave (1.3's envelope); Projects imports it.
    const v3 = JSON.stringify(
      legacyV3(editedA.text, 'Old Tab v3', Date.now() - 10_000),
    );
    await writeKeys(tabB, [[LEGACY_AUTOSAVE_KEY, v3]]);
    await openProjects(tabA, kit);
    const metas = await kit.listDrafts(tabA);
    const byName = (name) => metas.filter((m) => m.name === name);
    const rows = await projectRows(tabA);
    const rowOf = (meta) => rows.find((r) => r.draftId === meta?.draftId);
    const v2Draft = byName('Old Tab v2')[0] ?? null;
    const v3Draft = byName('Old Tab v3')[0] ?? null;
    const keptDraft = byName('Old Tab Kept')[0] ?? null;
    const listed = [
      draftA.draftId,
      v2Draft?.draftId,
      v3Draft?.draftId,
      keptDraft?.draftId,
    ];
    const allListed =
      listed.every(Boolean) &&
      listed.every((id) => rows.some((r) => r.draftId === id)) &&
      [v2Draft, v3Draft, keptDraft].every((m) => rowOf(m)?.canOpen);
    // B rewrites the same project twice more, a track added each time;
    // Projects (which imports again) is opened after each write.
    let latest = v3;
    for (const extra of ['Second', 'Third']) {
      const next = JSON.parse(latest);
      const base = next.data.tracks[0];
      next.timestamp = Date.now();
      next.data.tracks.push({
        ...base,
        id: `rt-old-tab-${extra.toLowerCase()}`,
        name: `Old Tab v3 ${extra} Keys`,
        midiClips: [],
        audioClips: [],
      });
      latest = JSON.stringify(next);
      await closeProjects(tabA);
      await writeKeys(tabB, [[LEGACY_AUTOSAVE_KEY, latest]]);
      await openProjects(tabA, kit);
    }
    const metasRewritten = await kit.listDrafts(tabA);
    const v3s = metasRewritten.filter((m) => m.name === 'Old Tab v3');
    const v3Now = v3s[0] ?? null;
    const v3Body = v3Now ? await kit.readDraftBody(tabA, v3Now.draftId) : null;
    const rewrites = {
      drafts: v3s.map((m) => `${m.draftId} (${m.origin})`),
      sameDraft: v3Now?.draftId === v3Draft?.draftId,
      holdsLast: workHash(v3Body) === workHash(latest),
      tracks: v3Now?.trackCount ?? null,
    };
    const rowsNow = await projectRows(tabA);
    // Open the newest legacy session from Projects: it loads, and A's riff
    // is kept.
    const generation = await kit.generationNow(tabA);
    let opened = null;
    if (v3Now && rowsNow.find((r) => r.draftId === v3Now.draftId)?.canOpen) {
      await openRow(tabA, { draftId: v3Now.draftId });
      const state = await kit.waitForOpenAfter(tabA, generation);
      if (state === 'ready') {
        await kit.settle(tabA, 'after opening the legacy session');
        opened = await tabA.evaluate(() => ({
          name: window.__MA_STORE__.getState().projectName,
          tracks: window.__MA_STORE__.getState().tracks.length,
        }));
      }
    }
    const metasAfter = await kit.listDrafts(tabA);
    const aKept = metasAfter.find((m) => m.draftId === draftA.draftId);
    const legacyAtEnd = await readKeys(tabB, [LEGACY_AUTOSAVE_KEY, keptKey]);
    const after = await kit.fingerprint(tabA);
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        liveTabUnaffected,
        ownDraftWinsOnReload,
        legacyMigratedAgain:
          Boolean(v2Draft && v3Draft) &&
          ['migrated', 'recovered'].includes(v2Draft.origin) &&
          v3Draft.origin === 'recovered' &&
          v2Draft.draftId !== v3Draft.draftId,
        legacyKeptSlotMigrated: keptDraft?.origin === 'kept',
        oldTabRewritesDoNotPileUp:
          v3s.length === 1 &&
          v3Now.origin === 'recovered' &&
          rewrites.holdsLast,
        bothSessionsRecoverable:
          allListed &&
          opened?.name === 'Old Tab v3' &&
          opened.tracks === JSON.parse(latest).data.tracks.length &&
          Boolean(aKept) &&
          workHash(await kit.readDraftBody(tabA, draftA.draftId)) ===
            workHash(editedA.text),
        legacyKeyUntouched:
          legacyAtEnd[LEGACY_AUTOSAVE_KEY] === latest &&
          legacyAtEnd[keptKey] === kept,
      },
      checks: {
        legacyDrafts: [v2Draft, v3Draft, keptDraft].map((m) =>
          m ? { name: m.name, origin: m.origin, draftId: m.draftId } : null,
        ),
        liveA,
        afterReload,
        openedLegacy: opened,
        rewrites,
        rowsListed: rows.length,
      },
      after,
    };
  });
}

/**
 * Deploy day: a device with only pre-1.4 keys (the autosave and three kept
 * slots kept after it) boots plain /studio/editor.
 */
async function firstBoot(kit, run) {
  const now = Date.now();
  const autosave = JSON.stringify(legacyV2('Last Session', now - 5 * 60_000));
  const slots = [1, 2, 3].map((i) =>
    legacyKeptSlot(DEV_USER_KEY, `Kept ${i}`, now - 4 * 60_000 + i * 30_000),
  );
  const entries = [[LEGACY_AUTOSAVE_KEY, autosave], ...slots];
  const s = await openCustomContext(run, kit, {
    query: '',
    beforeOpen: async (context) => {
      const tab = await originTab(context, run.base);
      await writeKeys(tab, entries);
      await tab.close();
    },
  });
  try {
    if (s.state !== 'ready') return kit.crashed(s.state);
    const { page } = s;
    const settle = await kit.settle(page, 'the first 1.4 boot');
    const live = await page.evaluate(() => ({
      name: window.__MA_STORE__.getState().projectName,
      draftId: window.__MA_SESSION__.getState().draftId,
      tracks: window.__MA_STORE__.getState().tracks.length,
    }));
    const metas = await kit.listDrafts(page);
    const own = metas.find((m) => m.draftId === live.draftId) ?? null;
    const kept = metas.filter((m) => m.origin === 'kept');
    const keys = await readKeys(
      page,
      entries.map(([key]) => key),
    );
    const fork = await kit.waitForToast(page, {
      match: kit.FORK_TOAST,
      timeout: 500,
    });
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        // L's one draft, open: an opened draft is the session's own again
        // (autosave.ts adopt: origin 'session'), so 'migrated' is not kept.
        firstBootResumesLastSession:
          live.name === 'Last Session' &&
          live.tracks > 0 &&
          ['migrated', 'session'].includes(own?.origin) &&
          metas.filter((m) => m.name === 'Last Session').length === 1,
        firstBootKeptSlotsImported:
          kept.length === 3 &&
          [1, 2, 3].every((i) => kept.some((m) => m.name === `Kept ${i}`)) &&
          !metas.some(
            (m) => m.origin === 'fork' || /\(copy\)/.test(m.name ?? ''),
          ) &&
          !fork &&
          entries.every(([key, value]) => keys[key] === value),
      },
      checks: {
        live,
        resumedOrigin: own?.origin ?? null,
        drafts: metas.map((m) => `${m.name} (${m.origin})`),
        settle: [settle],
      },
      after: await kit.fingerprint(page),
    };
  } finally {
    await s.context.close();
  }
}

// ── A previous build on this origin ─────────────────────────────────────────

/**
 * Serves every request of `page` from the previous build's server instead
 * (same path and query), so the page runs that build on this origin. The
 * Vite client's WebSocket still dials this origin; HMR traffic is not
 * needed by the check.
 */
async function servePrevious(page, base, prevBase) {
  await page.route(
    (url) => url.origin === new URL(base).origin,
    async (route) => {
      const url = new URL(route.request().url());
      try {
        const response = await route.fetch({
          url: `${prevBase}${url.pathname}${url.search}`,
        });
        await route.fulfill({ response });
      } catch {
        await route.abort('failed').catch(() => {});
      }
    },
  );
}

/** Opens the previous build's editor at `query` in a new tab of `context`. */
async function openPrevious(context, base, prevBase, query) {
  const page = await context.newPage();
  await servePrevious(page, base, prevBase);
  await page.goto(`${base}/studio/editor${query}`, {
    waitUntil: 'domcontentloaded',
    timeout: 180_000,
  });
  const ok = await page
    .waitForFunction(
      () =>
        Boolean(window.__MA_STORE__) &&
        Boolean(document.querySelector('[data-tutorial-id="file-menu"]')),
      null,
      { timeout: 180_000, polling: 200 },
    )
    .then(
      () => true,
      () => false,
    );
  // A pre-1.4 build has no draft autosave: a page that exposes one is
  // this build, and the route did not take.
  if (ok) {
    await sleep(1500);
    const current = await page.evaluate(() => Boolean(window.__MA_DRAFTS__));
    if (current) {
      throw new Error(
        `the page at ${base} ran this build, not ${prevBase}'s (window.__MA_DRAFTS__ is there)`,
      );
    }
  }
  return { page, ok };
}

async function realOldTab(kit, run) {
  const prevBase = prevBaseOrSkip(run);
  return kit.withSession(run, '?new=1', async (session) => {
    const tabA = session.page;
    const track = await seedRiff(tabA, 'New Build Tune');
    const draftA = await kit.waitForDraft(tabA);
    const old = await openPrevious(
      session.context,
      run.base,
      prevBase,
      '?new=1',
    );
    if (!old.ok) return kit.crashed('the previous build did not open');
    await old.page.evaluate(() => {
      const s = window.__MA_STORE__.getState();
      s.setProjectName('Old Build Tune');
      s.addTrack('midi', 'piano-sampler', 'Old Build Keys');
    });
    // The old build's autosave debounce, and a hide to flush it.
    await kit.sleep(4000);
    await old.page.close({ runBeforeUnload: true });
    await setVolume(tabA, track, 0.37);
    const editedA = await kit.waitForDraft(tabA);
    await tabA.reload({ waitUntil: 'domcontentloaded' });
    const state = await kit.waitForEditor(tabA);
    if (state !== 'ready') return kit.crashed(state);
    await kit.settle(tabA, 'after the reload');
    const now = await tabA.evaluate(() => ({
      name: window.__MA_STORE__.getState().projectName,
      draftId: window.__MA_SESSION__.getState().draftId,
    }));
    const body = await kit.readDraftBody(tabA, draftA.draftId);
    const metas = await kit.listDrafts(tabA);
    const imported = metas.find((m) => m.name === 'Old Build Tune');
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        oldTabCannotClobberDraft:
          now.draftId === draftA.draftId &&
          now.name === 'New Build Tune' &&
          workHash(body) === workHash(editedA.text) &&
          Boolean(imported),
      },
      checks: {
        now,
        imported: imported
          ? { name: imported.name, origin: imported.origin }
          : null,
      },
      after: await kit.fingerprint(tabA),
    };
  });
}

/**
 * Every draft as IndexedDB holds it ({ draftId: { writeSeq, name, work } },
 * work = the body's workHash), read by a tab of `context` that boots no app,
 * so nothing writes a draft first. null when the database can't be read.
 */
async function storedDrafts(context, base) {
  const tab = await originTab(context, base);
  try {
    const raw = await tab.evaluate(
      () =>
        new Promise((resolve) => {
          const request = indexedDB.open('ma-studio');
          request.onupgradeneeded = () => request.transaction.abort();
          request.onerror = () => resolve(null);
          request.onsuccess = () => {
            const db = request.result;
            try {
              const tx = db.transaction(['drafts', 'bodies'], 'readonly');
              const out = { drafts: [], bodies: [] };
              tx.objectStore('drafts').getAll().onsuccess = (e) => {
                out.drafts = e.target.result;
              };
              tx.objectStore('bodies').getAll().onsuccess = (e) => {
                out.bodies = e.target.result;
              };
              tx.oncomplete = () => {
                db.close();
                resolve(out);
              };
              tx.onerror = () => {
                db.close();
                resolve(null);
              };
            } catch {
              db.close();
              resolve(null);
            }
          };
        }),
    );
    if (!raw) return null;
    return Object.fromEntries(
      raw.drafts.map((m) => {
        const body = raw.bodies.find((b) => b.draftId === m.draftId);
        return [
          m.draftId,
          {
            writeSeq: m.writeSeq,
            name: m.name,
            work: workHash(body?.text ?? null),
          },
        ];
      }),
    );
  } finally {
    await tab.close();
  }
}

async function revert(kit, run) {
  const prevBase = prevBaseOrSkip(run);
  return kit.withSession(run, '?new=1', async (session) => {
    const tabA = session.page;
    await seedRiff(tabA, 'Before Revert Tune');
    await kit.waitForDraft(tabA);
    const generation = await kit.generationNow(tabA);
    await kit.clickFileItem(tabA, 'New');
    await kit.waitForOpenAfter(tabA, generation);
    await kit.settle(tabA, 'after File ▸ New');
    await seedRiff(tabA, 'Second Tune');
    await kit.waitForDraft(tabA);
    await tabA.close({ runBeforeUnload: true });
    // What 1.4 left, straight from IndexedDB once its tab has gone.
    await kit.sleep(500);
    const storedBefore = await storedDrafts(session.context, run.base);

    // The revert: the previous build opens the editor on this device.
    const old = await openPrevious(session.context, run.base, prevBase, '');
    const oldBuildOpens = old.ok;
    if (old.ok) {
      await old.page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        s.setProjectName('During Revert Tune');
        s.addTrack('midi', 'piano-sampler', 'Revert Keys');
      });
      await kit.sleep(4000);
    }
    await old.page.close({ runBeforeUnload: true });
    // What the previous build left, before 1.4 runs again.
    const storedAfterOld = await storedDrafts(session.context, run.base);
    const untouched =
      Boolean(storedBefore && storedAfterOld) &&
      Object.keys(storedBefore).length >= 2 &&
      Object.entries(storedBefore).every(
        ([id, was]) =>
          storedAfterOld[id]?.writeSeq === was.writeSeq &&
          storedAfterOld[id]?.work === was.work,
      ) &&
      Object.keys(storedAfterOld).length === Object.keys(storedBefore).length;

    // Rolled forward.
    const tab = await kit.openTab(run, session);
    const state = await kit.openAt(tab, run.base, '');
    if (state !== 'ready') return kit.crashed(state, {}, { oldBuildOpens });
    await kit.settle(tab, 'rolled forward');
    const resumed = await tab.evaluate(() => ({
      name: window.__MA_STORE__.getState().projectName,
      draftId: window.__MA_SESSION__.getState().draftId,
    }));
    const bootToasts = (await kit.readToasts(tab)).map((t) => t.text);
    await openProjects(tab, kit);
    const rows = await projectRows(tab);
    const metasAfter = await kit.listDrafts(tab);
    const names = metasAfter.map((m) => m.name);
    const count = (name) => names.filter((n) => n === name).length;
    const revertWork = metasAfter.find((m) => m.name === 'During Revert Tune');
    const toldOfRevertWork =
      resumed.name === 'During Revert Tune' ||
      bootToasts.some((t) => /During Revert Tune|recovered/i.test(t)) ||
      rows.some((r) => r.draftId === revertWork?.draftId && r.canOpen);
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        oldBuildOpens,
        draftsUntouchedByOldBuild: untouched,
        rollForwardRecoversAll:
          count('Before Revert Tune') >= 1 &&
          count('Second Tune') >= 1 &&
          count('During Revert Tune') >= 1 &&
          toldOfRevertWork,
        noDuplicateBeyondOne: count('During Revert Tune') <= 1,
      },
      checks: {
        names,
        storedBefore,
        storedAfterOld,
        resumed,
        bootToasts,
        revertWorkOrigin: revertWork?.origin ?? null,
      },
      after: await kit.fingerprint(tab),
    };
  });
}

export const scenarios = (kit) => [
  {
    group: 'R14',
    key: 'simulated',
    id: 'R14-old-tab:simulated',
    title:
      'A pre-1.4 tab writes the legacy autosave and a kept slot beside a 1.4 tab',
    run: (run) => simulated(kit, run),
  },
  {
    group: 'R14',
    key: 'firstBoot',
    id: 'R14-old-tab:firstBoot',
    title:
      'Deploy day: only the legacy autosave and three newer kept slots; plain /studio/editor resumes the autosave',
    run: (run) => firstBoot(kit, run),
  },
  {
    group: 'R14',
    key: 'real',
    id: 'R14-old-tab:real',
    title: '(full) A real previous build’s tab beside a 1.4 tab (--prev-base)',
    run: (run) => realOldTab(kit, run),
  },
  {
    group: 'R15',
    key: '',
    id: 'R15-revert',
    title:
      '(full) 1.4 makes drafts, the previous build runs, 1.4 rolls forward (--prev-base)',
    run: (run) => revert(kit, run),
  },
];
