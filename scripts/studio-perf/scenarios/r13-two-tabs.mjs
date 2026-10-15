/* eslint-env node */
/**
 * R13 two tabs and the draft lock (milestone 1.4, E4, fast). One browser
 * (one context: the same IndexedDB, localStorage and Web Locks):
 *
 * 1. Tab A opens ?new=1 and makes a riff (its draft written).
 * 2. Tab B opens ?draft=<A's draft>, which A holds: B gets a copy
 *    (secondTabForked: a new id, origin 'fork', named '<name> (copy)'), says
 *    so (forkToastShown) and holds the same work (forkHasSameContent: the
 *    bodies match without the name and the cloud link).
 * 3. Tab C is a duplicate of A (Chrome copies sessionStorage, so C starts
 *    with A's draft pointer) and opens plain /studio/editor: A holds the
 *    lock, so C forks too, after the 1.5 s boot wait (duplicatedTabForks).
 * 4. B makes an edit and is hidden while it is inside the debounce, with
 *    IndexedDB writes stalled, so its mirror is what holds it: the mirror is
 *    keyed and stamped with B's draft only, and neither A nor C picks it up
 *    (mirrorDoesNotCrossDrafts).
 * 5. Each tab reloads and reopens its own draft (eachTabReopensOwnDraft).
 * 6. C and then B close, and A edits nothing more; a new tab D (no
 *    pointer) opens plain /studio/editor and resumes the newest unlocked
 *    draft: B's, the last one edited (newTabPicksNewest).
 */
import {
  bodyDiffKeys,
  mirrorsNow,
  seedRiff,
  setHidden,
  setVolume,
  volumeOf,
  workHash,
} from './_shared.mjs';

export const flags = {
  secondTabForked: {
    goal: true,
    text: 'a second tab opening a draft open in another tab got a copy',
  },
  forkToastShown: {
    goal: true,
    text: 'the copy was announced ("open in another tab — this tab has a copy")',
  },
  forkHasSameContent: {
    goal: true,
    text: 'the copy holds the same work (but its name and cloud link)',
  },
  duplicatedTabForks: {
    goal: true,
    text: 'a duplicated tab (the draft pointer copied) forked instead of sharing the draft',
  },
  eachTabReopensOwnDraft: {
    goal: true,
    text: 'each tab reloaded into its own draft',
  },
  newTabPicksNewest: {
    goal: true,
    text: 'a new tab resumed the newest unlocked draft',
  },
  mirrorDoesNotCrossDrafts: {
    goal: true,
    text: 'a tab’s mirror names its own draft only, and no other tab took it',
  },
};

const ACTIVE_DRAFT_KEY = 'musicAtlas:daw:activeDraft';

async function twoTabs(kit, run) {
  return kit.withSession(
    run,
    '?new=1',
    async (session) => {
      const tabA = session.page;
      const trackA = await seedRiff(tabA, 'Two Tabs Tune');
      const draftA = await kit.waitForDraft(tabA);
      const nameA = 'Two Tabs Tune';

      // 2. Tab B: ?draft=<A's>.
      const tabB = await kit.openTab(run, session);
      const stateB = await kit.openAt(
        tabB,
        run.base,
        `?draft=${encodeURIComponent(draftA.draftId)}`,
      );
      if (stateB !== 'ready') return kit.crashed(stateB);
      await kit.settle(tabB, 'tab B');
      const draftB = await kit.waitForDraft(tabB);
      const forkToast = await kit.waitForToast(tabB, {
        match: kit.FORK_TOAST,
        timeout: 5000,
      });
      const bName = await tabB.evaluate(
        () => window.__MA_STORE__.getState().projectName,
      );

      // 3. Tab C: a duplicate of A (its sessionStorage pointer copied).
      const pointer = await tabA.evaluate(
        (key) => sessionStorage.getItem(key),
        ACTIVE_DRAFT_KEY,
      );
      const tabC = await kit.openTab(run, session);
      await tabC.addInitScript(
        ({ key, value }) => {
          try {
            if (value && !sessionStorage.getItem('rt:dup')) {
              sessionStorage.setItem('rt:dup', '1');
              sessionStorage.setItem(key, value);
            }
          } catch {
            // No storage on an opaque origin.
          }
        },
        { key: ACTIVE_DRAFT_KEY, value: pointer },
      );
      const stateC = await kit.openAt(tabC, run.base, '');
      if (stateC !== 'ready') return kit.crashed(stateC);
      await kit.settle(tabC, 'tab C');
      const draftC = await kit.waitForDraft(tabC);

      // 4. B edits; hidden inside the debounce with IndexedDB stalled.
      const trackB = await tabB.evaluate(
        (name) =>
          window.__MA_STORE__.getState().tracks.find((t) => t.name === name)
            ?.id ?? null,
        `${nameA} Keys`,
      );
      await tabB.evaluate(() => {
        window.__RT_STALL_IDB__ = true;
      });
      await setVolume(tabB, trackB, 0.27);
      await setHidden(tabB, true);
      await kit.sleep(300);
      const mirrors = await mirrorsNow(tabB);
      const mirrorOfB = mirrors.find((m) => m.draftId === draftB.draftId);
      const strayMirrors = mirrors.filter(
        (m) => !m.unreadable && !m.key.endsWith(`:${m.draftId}`),
      );
      await tabB.evaluate(() => {
        window.__RT_STALL_IDB__ = false;
      });
      await setHidden(tabB, false);

      // 5. Every tab reloads into its own draft.
      const reopened = {};
      for (const [label, tab, own] of [
        ['A', tabA, draftA.draftId],
        ['B', tabB, draftB.draftId],
        ['C', tabC, draftC.draftId],
      ]) {
        await tab.reload({ waitUntil: 'domcontentloaded' });
        const state = await kit.waitForEditor(tab);
        if (state !== 'ready') return kit.crashed(state);
        await kit.settle(tab, `tab ${label} reloaded`);
        const now = await kit.draftNow(tab);
        reopened[label] = { own, now: now.draftId, same: now.draftId === own };
      }
      const volumes = {
        A: await volumeOf(tabA, { id: trackA }),
        B: await volumeOf(tabB, { id: trackB }),
        C: await volumeOf(tabC, { name: `${nameA} Keys` }),
      };
      // B's edit is B's (its mirror reconciled into its own draft), not A's
      // or C's.
      await kit.waitForDraft(tabB);
      const bodyA = await kit.readDraftBody(tabA, draftA.draftId);
      const bodyB = await kit.readDraftBody(tabA, draftB.draftId);

      // 6. C, then B close; D opens plain /studio/editor.
      await tabC.close({ runBeforeUnload: true });
      await kit.sleep(300);
      await setVolume(tabB, trackB, 0.29);
      await kit.waitForDraft(tabB);
      await tabB.close({ runBeforeUnload: true });
      await kit.sleep(300);
      const tabD = await kit.openTab(run, session);
      const stateD = await kit.openAt(tabD, run.base, '');
      if (stateD !== 'ready') return kit.crashed(stateD);
      const settleD = await kit.settle(tabD, 'tab D');
      const nowD = await kit.draftNow(tabD);
      const volumeD = await volumeOf(tabD, { name: `${nameA} Keys` });
      const after = await kit.fingerprint(tabD);

      const metas = await kit.listDrafts(tabD);
      const metaB = metas.find((m) => m.draftId === draftB.draftId);
      const metaC = metas.find((m) => m.draftId === draftC.draftId);
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          secondTabForked:
            draftB.draftId !== draftA.draftId &&
            draftB.meta?.origin === 'fork' &&
            /\(copy\)\s*$/.test(bName ?? ''),
          forkToastShown: Boolean(forkToast),
          forkHasSameContent:
            workHash(draftB.text, ['projectName', 'projectId']) ===
            workHash(draftA.text, ['projectName', 'projectId']),
          duplicatedTabForks:
            draftC.draftId !== draftA.draftId &&
            draftC.draftId !== draftB.draftId &&
            draftC.meta?.origin === 'fork',
          eachTabReopensOwnDraft: Object.values(reopened).every((r) => r.same),
          mirrorDoesNotCrossDrafts:
            Boolean(mirrorOfB) &&
            strayMirrors.length === 0 &&
            volumes.B === 0.27 &&
            volumes.A !== 0.27 &&
            volumes.C !== 0.27 &&
            workHash(bodyA) === workHash(draftA.text),
          newTabPicksNewest:
            nowD.draftId === draftB.draftId && volumeD === 0.29,
        },
        checks: {
          drafts: {
            A: draftA.draftId,
            B: draftB.draftId,
            C: draftC.draftId,
            D: nowD.draftId,
          },
          origins: {
            BAtOpen: draftB.meta?.origin ?? null,
            B: metaB?.origin ?? null,
            CAtOpen: draftC.meta?.origin ?? null,
            C: metaC?.origin ?? null,
          },
          forkDiff: bodyDiffKeys(draftA.text, draftB.text, [
            'projectName',
            'projectId',
          ]),
          aAfterReloadDiff: bodyDiffKeys(draftA.text, bodyA),
          names: { B: bName },
          forkToast: forkToast?.text ?? null,
          mirrors,
          reopened,
          volumes: { ...volumes, D: volumeD },
          bodyBHasEdit: bodyB?.includes('0.27') ?? null,
          settle: [settleD],
        },
        after,
      };
    },
    run.api,
    // The IndexedDB stall (roundtrip.mjs installIdbStall) on every page,
    // inactive until a page sets window.__RT_STALL_IDB__.
    { stallIdb: true },
  );
}

export const scenarios = (kit) => [
  {
    group: 'R13',
    key: '',
    id: 'R13-two-tabs',
    title:
      'Two tabs on one draft: the second forks, a duplicated tab forks, mirrors stay apart, each reloads into its own, a new tab resumes the newest',
    run: (run) => twoTabs(kit, run),
  },
];
