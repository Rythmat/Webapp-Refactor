/* eslint-env node */
/**
 * R21 File ▸ New in place (milestone 1.4, E10, fast): after the kitchen
 * sink, File ▸ New opens a new project without a reload and without a
 * confirm, keeps the sink once (as its own draft), starts a fresh undo
 * history and a new draft, and a refresh then reopens that new project.
 * What it opens must match a cold ?new=1 (run.defaults), every project and
 * session field compared as R4 compares a link (0 diffs; the prefs follow
 * the student and are not compared).
 *
 * noReload: a sentinel on window survives and the main frame never
 * navigates (File ▸ New may change the address bar by history.replaceState
 * only). noConfirm: no native dialog was raised.
 */
import { ID_FIELDS, newlyKept, workHash } from './_shared.mjs';

export const flags = {
  noReload: {
    goal: true,
    text: 'File ▸ New opened in place: no reload, no main-frame navigation',
  },
  noConfirm: { goal: true, text: 'File ▸ New asked for no confirm' },
  undoEmpty: {
    goal: true,
    text: 'the new project starts with nothing to undo',
  },
  newDraftId: {
    goal: true,
    text: 'the new project got a draft of its own',
  },
  refreshOpensNewProject: {
    goal: true,
    text: 'a refresh after File ▸ New reopened the new project (same draft, empty)',
  },
};

async function fileNew(kit, run) {
  return kit.withSession(run, '?new=1', async ({ page }) => {
    const { draft } = await kit.applySink(page, run);
    const draftsBefore = await kit.listDrafts(page);
    // A new document (a reload or a navigation) fires DOMContentLoaded; a
    // history.replaceState does not.
    let navigations = 0;
    let dialogs = 0;
    page.on('domcontentloaded', () => {
      navigations += 1;
    });
    page.on('dialog', (dialog) => {
      dialogs += 1;
      dialog.dismiss().catch(() => {});
    });
    await page.evaluate(() => {
      window.__rtSentinel = 'file-new';
    });
    const since = await kit.pageNow(page);
    const generation = await kit.generationNow(page);
    await kit.clickFileItem(page, 'New');
    const state = await kit.waitForOpenAfter(page, generation);
    if (state !== 'ready') return kit.crashed(state);
    const settle = await kit.settle(page, 'after File ▸ New');
    const got = await kit.fingerprint(page);
    const sentinel = await page.evaluate(() => window.__rtSentinel ?? null);
    const navigationsBeforeRefresh = navigations;
    const now = await kit.draftNow(page);
    const draftsAfter = await kit.listDrafts(page);
    const kept = newlyKept(draftsBefore, draftsAfter);
    const keptText =
      kept.length === 1 ? await kit.readDraftBody(page, kept[0].draftId) : null;
    const keptToast = await kit.waitForToast(page, {
      since,
      match: kit.KEPT_TOAST,
      timeout: 5000,
    });
    const undoEmpty = !(await kit.canUndo(page));
    const diffs = kit.compareFingerprints(run.defaults, got, {
      ...kit.COMPARE.leak,
      ignore: ID_FIELDS,
    });
    // The refresh.
    await page.reload({ waitUntil: 'domcontentloaded' });
    const reloaded = await kit.waitForEditor(page);
    let refresh = { state: reloaded };
    if (reloaded === 'ready') {
      const settleAfter = await kit.settle(page, 'after the refresh');
      settle.after = settleAfter;
      refresh = {
        state: reloaded,
        ...(await page.evaluate(() => {
          const s = window.__MA_STORE__.getState();
          return {
            draftId: window.__MA_SESSION__.getState().draftId,
            tracks: s.tracks.length,
            name: s.projectName,
          };
        })),
      };
    }
    return {
      diffs,
      extraLosses: [],
      flags: {
        noReload: sentinel === 'file-new' && navigationsBeforeRefresh === 0,
        noConfirm: dialogs === 0,
        keptOnce:
          kept.length === 1 &&
          kept[0].draftId === draft.draftId &&
          workHash(keptText) === workHash(draft.text),
        keptToastWithView: Boolean(keptToast?.actions?.includes('View')),
        undoEmpty,
        newDraftId: Boolean(now.draftId) && now.draftId !== draft.draftId,
        refreshOpensNewProject:
          refresh.state === 'ready' &&
          refresh.draftId === now.draftId &&
          refresh.tracks === run.defaults.fields['tracks.count'].value &&
          refresh.name === run.defaults.fields['project.name'].value,
      },
      checks: {
        navigations: navigationsBeforeRefresh,
        dialogs,
        keptDrafts: kept.map((m) => `${m.draftId} (${m.name})`),
        keptToast: keptToast
          ? `${keptToast.text} [${keptToast.actions.join(', ')}]`
          : null,
        draft: { before: draft.draftId, after: now.draftId },
        refresh,
        settle: [settle],
      },
      after: got,
    };
  });
}

export const scenarios = (kit) => [
  {
    group: 'R21',
    key: '',
    id: 'R21-file-new',
    title:
      'File ▸ New after the kitchen sink: in place, no confirm, kept once, a fresh undo and draft, vs a cold ?new=1',
    run: (run) => fileNew(kit, run),
  },
];
