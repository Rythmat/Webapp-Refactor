/* eslint-env node */
/**
 * R18 the Projects dialog (milestone 1.4, E16, fast). One session, with a
 * mock API of its own:
 *
 * 1. "Alpha Tune" is saved to the account, then edited on this device only
 *    (a draft with changes the cloud copy lacks); File ▸ New keeps it, and
 *    the kept toast's View opens Projects (openedFromToast) on it.
 * 2. "Beta Tune" (never saved) is kept the same way by File ▸ New. A
 *    second tab makes "Gamma Tune" and stays open (its draft is locked),
 *    and a pre-1.4 entry no build could read is left on the device
 *    ('musicAtlas:daw:unreadable:<user>:<iso>').
 * 3. File ▸ Open… opens Projects (openedFromFileMenu): it lists the drafts
 *    on this device and the account's projects (listsDraftsAndCloud), Alpha
 *    tagged changes-on-device (changesOnDeviceTagged), and one opening
 *    fetches the account's list once (cloudListFetchedOnce). The search
 *    narrows the rows (searchFilters). Escape closes it and gives focus
 *    back to the File menu (escClosesFocusReturns). The open project's row
 *    and Gamma's (open in the other tab) offer no Delete
 *    (deleteRefusedForOpenAndLocked). The unreadable entry shows as
 *    "1 draft couldn't be opened" with a Download that saves a file
 *    (quarantineListed).
 * 4. Beta's Delete asks in the dialog (an alertdialog, no native confirm),
 *    and its draft, and only its draft, is gone once confirmed
 *    (deleteConfirmedInDialog).
 * 5. Alpha's project is deleted elsewhere; its draft still opens from
 *    Projects (deletedProjectDraftOpens), as it was (reopenIdentical).
 * 6. With the account's list failing (500), the drafts are still listed
 *    (draftsListedWhenApiDown).
 */
import { DEV_USER_KEY } from '../fixtures/drafts.mjs';
import {
  closeProjects,
  clickToastAction,
  newlyKept,
  openProjectsFromMenu,
  openRow,
  projectRows,
  projectsDialog,
  seedRiff,
  setVolume,
  waitProjectsLoaded,
  REOPEN_CLASSES,
} from './_shared.mjs';

export const flags = {
  openedFromFileMenu: { goal: true, text: 'File ▸ Open… opened Projects' },
  openedFromToast: {
    goal: true,
    text: 'the kept toast’s View opened Projects on the kept draft',
  },
  listsDraftsAndCloud: {
    goal: true,
    text: 'Projects listed this device’s drafts and the account’s projects',
  },
  changesOnDeviceTagged: {
    goal: true,
    text: 'a saved project with changes on this device was tagged so',
  },
  cloudListFetchedOnce: {
    goal: true,
    text: 'one opening fetched the account’s list once',
  },
  reopenIdentical: {
    goal: true,
    text: 'a draft opened from Projects came back as it was kept',
  },
  deletedProjectDraftOpens: {
    goal: true,
    text: 'the draft of a project deleted elsewhere still opened',
  },
  deleteConfirmedInDialog: {
    goal: true,
    text: 'Delete asked in the dialog (no native confirm) and removed the draft',
  },
  searchFilters: { goal: true, text: 'the search narrowed the rows' },
  deleteRefusedForOpenAndLocked: {
    goal: true,
    text: 'the open project and a draft open in another tab offered no Delete',
  },
  quarantineListed: {
    goal: true,
    text: 'a draft no build could read was listed as couldn’t be opened, with a working Download',
  },
  draftsListedWhenApiDown: {
    goal: true,
    text: 'with the account’s list failing, the drafts were still listed',
  },
  escClosesFocusReturns: {
    goal: true,
    text: 'Escape closed Projects and focus went back to the File menu',
  },
};

const LIST_PATH = /^\/api\/studio\/projects$/;

/** File ▸ New, waited out. */
async function fileNew(kit, page) {
  const generation = await kit.generationNow(page);
  await kit.clickFileItem(page, 'New');
  const state = await kit.waitForOpenAfter(page, generation);
  if (state !== 'ready') throw new Error(`File ▸ New: ${state}`);
  await kit.settle(page, 'after File ▸ New');
}

const listGets = (api, from) =>
  api
    .requestsSince(from)
    .filter((l) => l.method === 'GET' && LIST_PATH.test(l.path));

async function projectsDialogScenario(kit, run) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  api.seedProject({ name: 'Account Only Song' });
  return kit.withSession(
    run,
    '?new=1',
    async (session) => {
      const { page } = session;
      let nativeDialogs = 0;
      page.on('dialog', (dialog) => {
        nativeDialogs += 1;
        dialog.dismiss().catch(() => {});
      });

      // 1. Alpha: saved, then changed on this device; kept by File ▸ New.
      const alphaTrack = await seedRiff(page, 'Alpha Tune');
      await kit.waitForDraft(page);
      await kit.saveFromFileMenu(page);
      await setVolume(page, alphaTrack, 0.23);
      const alpha = await kit.waitForDraft(page);
      const alphaProject = await page.evaluate(
        () => window.__MA_STORE__.getState().projectId,
      );
      const alphaSnapshot = await kit.fingerprint(page);
      const draftsBefore = await kit.listDrafts(page);
      await fileNew(kit, page);
      const keptAlpha = newlyKept(draftsBefore, await kit.listDrafts(page));
      const clickedView = await clickToastAction(page, kit.KEPT_TOAST, 'View');
      let fromToast = false;
      if (clickedView) {
        await waitProjectsLoaded(page).catch(() => {});
        fromToast = await page.evaluate((id) => {
          const row = document.querySelector(
            `[data-testid="projects-row"][data-draft-id="${id}"]`,
          );
          return Boolean(row) && document.activeElement !== document.body;
        }, alpha.draftId);
        await closeProjects(page);
      }

      // 2. Beta: never saved, kept the same way.
      await seedRiff(page, 'Beta Tune');
      const beta = await kit.waitForDraft(page);
      await fileNew(kit, page);

      // Gamma, open in a second tab (its draft locked there).
      const tab2 = await kit.openTab(run, session);
      const state2 = await kit.openAt(tab2, run.base, '?new=1');
      if (state2 !== 'ready') return kit.crashed(state2);
      await kit.settle(tab2, 'the second tab');
      await seedRiff(tab2, 'Gamma Tune');
      const gamma = await kit.waitForDraft(tab2);
      // An entry an earlier build could not read.
      await page.evaluate(
        (key) => localStorage.setItem(key, '{"rt": not a session'),
        `musicAtlas:daw:unreadable:${DEV_USER_KEY}:${new Date(Date.now() - 86_400_000).toISOString()}`,
      );
      const activeDraftId = await page.evaluate(
        () => window.__MA_SESSION__.getState().draftId,
      );

      // 3. File ▸ Open….
      const from = api.log.length;
      const dialog = await openProjectsFromMenu(page, kit).catch(() => null);
      await kit.sleep(1500);
      const gets = listGets(api, from).length;
      const rows = await projectRows(page);
      const openNowRow = rows.find((r) => r.draftId === activeDraftId) ?? null;
      const gammaRow = rows.find((r) => r.draftId === gamma.draftId) ?? null;
      const quarantineLine = await page
        .locator('[data-testid="projects-quarantine"]')
        .textContent({ timeout: 3000 })
        .catch(() => null);
      let downloaded = null;
      if (quarantineLine) {
        const download = page
          .waitForEvent('download', { timeout: 5000 })
          .catch(() => null);
        await page
          .locator('[data-testid="projects-quarantine"]')
          .getByRole('button', { name: 'Download' })
          .click();
        downloaded = (await download)?.suggestedFilename() ?? null;
      }
      const device = rows.filter((r) => r.section === 'device');
      const account = rows.filter((r) => r.section === 'account');
      const alphaRow = rows.find((r) => r.draftId === alpha.draftId);
      // Search.
      const search = page.getByLabel('Search projects');
      await search.fill('Beta');
      await kit.sleep(300);
      const searched = await projectRows(page);
      await search.fill('');
      await kit.sleep(200);
      // Escape, focus back.
      await closeProjects(page);
      const focus = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          fileMenu: Boolean(el?.matches?.('[data-tutorial-id="file-menu"]')),
          tag: el?.tagName ?? null,
          label:
            el?.getAttribute?.('aria-label') ??
            el?.textContent?.slice(0, 30) ??
            null,
        };
      });
      const closed = (await projectsDialog(page).count()) === 0;

      // 4. Delete Beta in the dialog.
      const idsBefore = (await kit.listDrafts(page)).map((m) => m.draftId);
      await openProjectsFromMenu(page, kit);
      await page
        .locator(
          `[data-testid="projects-row"][data-draft-id="${beta.draftId}"]`,
        )
        .getByRole('button', { name: 'Delete from this device' })
        .click();
      const confirm = page.getByRole('alertdialog');
      const asked = await confirm
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(
          () => true,
          () => false,
        );
      if (asked) {
        await confirm
          .getByRole('button', { name: 'Delete from this device' })
          .click();
      }
      await page
        .waitForFunction(
          (id) =>
            !document.querySelector(
              `[data-testid="projects-row"][data-draft-id="${id}"]`,
            ),
          beta.draftId,
          { timeout: 10_000 },
        )
        .catch(() => {});
      const idsAfter = (await kit.listDrafts(page)).map((m) => m.draftId);
      const removed = idsBefore.filter((id) => !idsAfter.includes(id));
      const betaGone = removed.length === 1 && removed[0] === beta.draftId;
      await closeProjects(page);
      const gammaKept = (await kit.listDrafts(tab2)).some(
        (m) => m.draftId === gamma.draftId,
      );
      await tab2.close();

      // 5. Alpha's project deleted elsewhere; its draft opens as it was.
      api.deleteProject(alphaProject);
      await openProjectsFromMenu(page, kit);
      const generation = await kit.generationNow(page);
      let reopened = null;
      if ((await projectRows(page)).some((r) => r.draftId === alpha.draftId)) {
        await openRow(page, { draftId: alpha.draftId });
        const state = await kit.waitForOpenAfter(page, generation);
        if (state === 'ready') {
          await kit.settle(page, 'after reopening Alpha');
          const got = await kit.fingerprint(page);
          reopened = {
            name: await page.evaluate(
              () => window.__MA_STORE__.getState().projectName,
            ),
            diffs: kit
              .compareFingerprints(alphaSnapshot, got, {
                classes: REOPEN_CLASSES,
                defaults: run.defaults,
              })
              .map((d) => `${d.key} (${d.kind})`),
          };
        }
      }

      // 6. The account's list fails; the drafts are still there.
      const down = api.fault({ method: 'GET', path: LIST_PATH, status: 500 });
      let downRows = [];
      try {
        await openProjectsFromMenu(page, kit);
        await kit.sleep(1500);
        downRows = await projectRows(page);
        await closeProjects(page);
      } finally {
        down();
      }
      const after = await kit.fingerprint(page);
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          openedFromFileMenu: Boolean(dialog),
          openedFromToast:
            keptAlpha.some((m) => m.draftId === alpha.draftId) && fromToast,
          listsDraftsAndCloud:
            device.some((r) => r.draftId === alpha.draftId) &&
            device.some((r) => r.draftId === beta.draftId) &&
            account.some((r) => r.name === 'Account Only Song'),
          changesOnDeviceTagged: Boolean(
            alphaRow?.tags.includes('changes-on-device'),
          ),
          cloudListFetchedOnce: gets === 1,
          reopenIdentical: reopened?.diffs.length === 0,
          deletedProjectDraftOpens: reopened?.name === 'Alpha Tune',
          deleteConfirmedInDialog: asked && betaGone && nativeDialogs === 0,
          deleteRefusedForOpenAndLocked:
            Boolean(openNowRow && gammaRow) &&
            !openNowRow.canDelete &&
            !gammaRow.canDelete &&
            gammaKept,
          quarantineListed:
            /couldn.t be opened/.test(quarantineLine ?? '') &&
            Boolean(downloaded),
          searchFilters:
            searched.length > 0 &&
            searched.length < rows.length &&
            searched.every((r) => /beta/i.test(r.name ?? '')),
          draftsListedWhenApiDown: downRows.some(
            (r) => r.draftId === alpha.draftId,
          ),
          escClosesFocusReturns: closed && focus.fileMenu,
        },
        checks: {
          rows: rows.map(
            (r) => `${r.section}: ${r.name} [${r.tags.join(' ')}]`,
          ),
          listGets: gets,
          searched: searched.map((r) => r.name),
          focusAfterEscape: focus,
          reopened,
          nativeDialogs,
          openNowRow,
          gammaRow,
          quarantineLine,
          downloaded,
          removedByDelete: removed,
          downRows: downRows.map((r) => `${r.section}: ${r.name}`),
        },
        after,
      };
    },
    api,
  );
}

export const scenarios = (kit) => [
  {
    group: 'R18',
    key: '',
    id: 'R18-projects-dialog',
    title:
      'Projects: opened from File ▸ Open… and the kept toast, lists, tags, search, delete, a deleted project’s draft, the API down, Escape',
    run: (run) => projectsDialogScenario(kit, run),
  },
];
