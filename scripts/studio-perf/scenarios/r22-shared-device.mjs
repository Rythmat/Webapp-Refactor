/* eslint-env node */
/**
 * R22 a shared device (milestone 1.4, E2: drafts, mirrors, tutorial
 * progress, Oracle presets and prefs are per user; fast). One browser
 * context, so one localStorage, IndexedDB and set of locks:
 *
 * 1. User A (the dev bypass user) makes a riff, turns the metronome on (a
 *    pref), finishes a lesson (tutorial progress) and saves an Oracle
 *    preset. Then, with IndexedDB writes stalled, A edits and the tab is
 *    hidden, so A's last edit lives only in A's mirror.
 * 2. The same tab reloads signed in as user B (harness.mjs asUser). B sees
 *    none of A's drafts (draftIsolatedByUser) or Projects rows
 *    (projectsListIsolated); A's mirror is neither taken nor removed by
 *    B's boot (mirrorIsolatedByUser); B has no lesson completed
 *    (progressIsolatedByUser), none of A's presets (presetsIsolatedByUser)
 *    and the default metronome (prefsIsolatedByUser). B makes work of
 *    their own.
 * 3. The tab reloads as A again: A's draft comes back with the mirrored
 *    edit, and A's progress, preset and pref are as A left them
 *    (userAIntact).
 *
 * R22:legacyOwner (fast, E6 and the owner default for the device-wide
 * autosave L, which names nobody):
 * - a device with only pre-1.4 keys and 1.3's 'musicAtlas:daw:prefs:anon'
 *   ('anon' is nobody else): A's first boot takes L as A's own
 *   (legacyOwnerSingleUser);
 * - an old tab then writes a new L and a kept slot of A's. B boots: with
 *   A's Studio data on the device, L goes to '~device', and both B and A
 *   see it under "Found on this device" (deviceDraftFoundByBoth); A's kept
 *   slot is A's kept draft, never shown to B (keptSlotsStayWithOwner);
 *   B opening it from Projects claims it (userKey B, claimedFrom
 *   '~device'), and A no longer sees it (deviceDraftClaimedOnOpen).
 *
 * R22:signOut (fast, E17, pending owner sign-off): A has an unsaved kept
 * draft with a mirror IndexedDB already holds, a cloud-equal draft of a
 * closed tab, a cloud-equal draft open in another tab, and an edit inside
 * the debounce; B has a draft. runBeforeSignOut(1000), as AuthContext
 * runs it: A's unsaved drafts stay and the live edit is flushed
 * (signOutKeepsUnsaved), the other tab's draft stays (signOutProtectsLocked),
 * the closed tab's cloud-equal draft and the held mirror go
 * (signOutRemovesCloudEqual), and B's draft is as it was
 * (signOutLeavesOtherUsers).
 */
import { DEV_USER_KEY } from '../fixtures/drafts.mjs';
import { asUser, DEV_BYPASS_USER_ID } from '../harness.mjs';
import {
  LEGACY_AUTOSAVE_KEY,
  legacyKeptSlot,
  legacyV2,
  MODULES,
  mirrorsNow,
  openCustomContext,
  openProjects,
  openRow,
  originTab,
  closeProjects,
  projectRows,
  seedRiff,
  setHidden,
  setVolume,
  volumeOf,
  workHash,
  writeKeys,
} from './_shared.mjs';

export const flags = {
  draftIsolatedByUser: {
    goal: true,
    text: 'another user on the device saw none of the first user’s drafts',
  },
  projectsListIsolated: {
    goal: true,
    text: 'another user’s Projects listed none of the first user’s work',
  },
  mirrorIsolatedByUser: {
    goal: true,
    text: 'another user’s boot neither took nor removed the first user’s mirror',
  },
  progressIsolatedByUser: {
    goal: true,
    text: 'lesson progress was the user’s own',
  },
  presetsIsolatedByUser: {
    goal: true,
    text: 'Oracle presets were the user’s own',
  },
  prefsIsolatedByUser: { goal: true, text: 'prefs were the user’s own' },
  userAIntact: {
    goal: true,
    text: 'back as the first user, their draft (with the mirrored edit), progress, preset and pref were all there',
  },
  legacyOwnerSingleUser: {
    goal: true,
    text: 'with no one else’s Studio data on the device (prefs:anon is nobody), the legacy autosave went to the booting user',
  },
  deviceDraftFoundByBoth: {
    goal: true,
    text: 'with two students on the device, the legacy autosave went to "Found on this device" for both',
  },
  keptSlotsStayWithOwner: {
    goal: true,
    text: 'a student’s legacy kept slot became their kept draft and was never shown to another student',
  },
  deviceDraftClaimedOnOpen: {
    goal: true,
    text: 'opening a found draft claimed it, and the other student no longer saw it',
  },
  signOutKeepsUnsaved: {
    goal: true,
    text: 'sign-out kept the unsaved drafts and flushed the live edit',
  },
  signOutProtectsLocked: {
    goal: true,
    text: 'sign-out left a draft open in another tab alone',
  },
  signOutRemovesCloudEqual: {
    goal: true,
    text: 'sign-out removed the cloud-equal draft and the mirror IndexedDB already held',
  },
  signOutLeavesOtherUsers: {
    goal: true,
    text: 'sign-out left another student’s drafts as they were',
  },
};

const USER_B = 'student-b';
const LESSON = 'make-first-track';
const PRESET = 'Shared Device A Preset';

/** What the page's user has of their own: progress, presets, the pref. */
const personal = (page) =>
  page.evaluate(
    async ({ path, lesson, preset }) => {
      const progress = await window.__RT_DEV_MODULE__(path);
      const synth = window.__MA_SYNTH_STORE__.getState();
      return {
        lessonDone: progress.useTutorialProgressStore
          .getState()
          .isComplete(lesson),
        hasPreset: (synth.userPresets ?? []).some((p) => p.name === preset),
        metronome: window.__MA_STORE__.getState().metronomeEnabled,
        user: window.__MA_DRAFTS__.status().userKey,
      };
    },
    { path: MODULES.tutorialProgress, lesson: LESSON, preset: PRESET },
  );

async function reloadAs(kit, context, page, userId) {
  await asUser(context, userId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const state = await kit.waitForEditor(page);
  if (state !== 'ready') return state;
  await kit.settle(page, `as ${userId ?? DEV_BYPASS_USER_ID}`);
  return 'ready';
}

async function sharedDevice(kit, run) {
  return kit.withSession(
    run,
    '?new=1',
    async (session) => {
      const { page, context } = session;
      // 1. User A.
      const track = await seedRiff(page, 'User A Tune');
      await page.evaluate(
        async ({ path, lesson, preset }) => {
          const s = window.__MA_STORE__.getState();
          if (!s.metronomeEnabled) s.toggleMetronome();
          const progress = await window.__RT_DEV_MODULE__(path);
          progress.useTutorialProgressStore.getState().markComplete(lesson);
          window.__MA_SYNTH_STORE__.getState().savePreset(preset);
        },
        { path: MODULES.tutorialProgress, lesson: LESSON, preset: PRESET },
      );
      const draftA = await kit.waitForDraft(page);
      const mineA = await personal(page);
      await page.evaluate(() => {
        window.__RT_STALL_IDB__ = true;
      });
      await setVolume(page, track, 0.45);
      await setHidden(page, true);
      await kit.sleep(300);
      const mirrorsA = (await mirrorsNow(page)).filter(
        (m) => m.draftId === draftA.draftId,
      );

      // 2. User B on the same tab.
      const asB = await reloadAs(kit, context, page, USER_B);
      if (asB !== 'ready') return kit.crashed(asB);
      const draftsB = await kit.listDrafts(page);
      const sessionB = await page.evaluate(() => ({
        draftId: window.__MA_SESSION__.getState().draftId,
        name: window.__MA_STORE__.getState().projectName,
      }));
      const mineB = await personal(page);
      const mirrorsAfterB = await mirrorsNow(page);
      await openProjects(page, kit);
      const rowsB = await projectRows(page);
      await closeProjects(page);
      await seedRiff(page, 'User B Tune');
      await kit.waitForDraft(page);

      // 3. Back to user A.
      const asA = await reloadAs(kit, context, page, null);
      if (asA !== 'ready') return kit.crashed(asA);
      await kit.waitForDraft(page);
      const backA = await page.evaluate(() => ({
        draftId: window.__MA_SESSION__.getState().draftId,
        name: window.__MA_STORE__.getState().projectName,
      }));
      const volumeA = await volumeOf(page, { name: 'User A Tune Keys' });
      const mineAgain = await personal(page);
      const draftsA = await kit.listDrafts(page);
      const after = await kit.fingerprint(page);
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          draftIsolatedByUser:
            mineB.user === encodeURIComponent(USER_B) &&
            !draftsB.some((m) => m.draftId === draftA.draftId) &&
            sessionB.draftId !== draftA.draftId &&
            sessionB.name !== 'User A Tune',
          projectsListIsolated: !rowsB.some(
            (r) => r.draftId === draftA.draftId || r.name === 'User A Tune',
          ),
          mirrorIsolatedByUser:
            mirrorsA.length === 1 &&
            mirrorsAfterB.some((m) => m.key === mirrorsA[0].key) &&
            mirrorsAfterB
              .filter((m) => m.userKey === encodeURIComponent(USER_B))
              .every((m) => m.draftId !== draftA.draftId),
          progressIsolatedByUser: mineA.lessonDone && !mineB.lessonDone,
          presetsIsolatedByUser: mineA.hasPreset && !mineB.hasPreset,
          prefsIsolatedByUser:
            mineA.metronome === true && mineB.metronome === false,
          userAIntact:
            backA.draftId === draftA.draftId &&
            backA.name === 'User A Tune' &&
            volumeA === 0.45 &&
            mineAgain.lessonDone &&
            mineAgain.hasPreset &&
            mineAgain.metronome === true &&
            !draftsA.some((m) => m.name === 'User B Tune'),
        },
        checks: {
          userA: {
            ...mineA,
            draftId: draftA.draftId,
            mirrors: mirrorsA.length,
          },
          userB: {
            ...mineB,
            session: sessionB,
            drafts: draftsB.map((m) => m.name),
            rows: rowsB.map((r) => `${r.section}: ${r.name}`),
            mirrors: mirrorsAfterB.map((m) => `${m.userKey}:${m.draftId}`),
          },
          userAAgain: { ...mineAgain, ...backA, volume: volumeA },
        },
        after,
      };
    },
    run.api,
    // The IndexedDB stall on every page (inactive until a page asks).
    { stallIdb: true },
  );
}

/** Loads the editor at `query` in `page` as `userId` (null: user A). */
async function gotoAs(kit, run, context, page, userId, query = '?new=1') {
  await asUser(context, userId);
  const state = await kit.openAt(page, run.base, query);
  if (state === 'ready') {
    await kit.settle(page, `as ${userId ?? DEV_BYPASS_USER_ID}`);
  }
  return state;
}

/** The open Projects dialog's rows named `name`, then closes it. */
async function rowsNamed(kit, page, name) {
  await openProjects(page, kit);
  const rows = (await projectRows(page)).filter((r) => r.name === name);
  await closeProjects(page);
  return rows;
}

async function legacyOwner(kit, run) {
  const now = Date.now();
  const soloL = JSON.stringify(legacyV2('Solo Legacy Tune', now - 120_000));
  const s = await openCustomContext(run, kit, {
    query: '',
    beforeOpen: async (context) => {
      const tab = await originTab(context, run.base);
      await writeKeys(tab, [
        ['musicAtlas:daw:prefs:anon', JSON.stringify({ v: 1 })],
        [LEGACY_AUTOSAVE_KEY, soloL],
      ]);
      await tab.close();
    },
  });
  const { context, page } = s;
  try {
    if (s.state !== 'ready') return kit.crashed(s.state);
    await kit.settle(page, 'A’s first boot');
    const soloMine = (await kit.listDrafts(page)).find(
      (m) => m.name === 'Solo Legacy Tune',
    );
    const soloDevice = (await kit.listDrafts(page, '~device')).find(
      (m) => m.name === 'Solo Legacy Tune',
    );

    // An old tab writes a new autosave and a kept slot of A's.
    const tab = await originTab(context, run.base);
    const [slotKey, slotValue] = legacyKeptSlot(
      DEV_USER_KEY,
      'A Kept Slot',
      Date.now() - 30_000,
    );
    await writeKeys(tab, [
      [
        LEGACY_AUTOSAVE_KEY,
        JSON.stringify(legacyV2('Shared Legacy Tune', Date.now() - 60_000)),
      ],
      [slotKey, slotValue],
    ]);
    await tab.close();

    // B boots.
    const b1 = await gotoAs(kit, run, context, page, USER_B);
    if (b1 !== 'ready') return kit.crashed(b1);
    const sharedDevice = (await kit.listDrafts(page, '~device')).find(
      (m) => m.name === 'Shared Legacy Tune',
    );
    const bFound = await rowsNamed(kit, page, 'Shared Legacy Tune');
    const bSlotRows = await rowsNamed(kit, page, 'A Kept Slot');
    const bDrafts = (await kit.listDrafts(page)).map((m) => m.name);

    // A boots.
    const a1 = await gotoAs(kit, run, context, page, null);
    if (a1 !== 'ready') return kit.crashed(a1);
    const aFound = await rowsNamed(kit, page, 'Shared Legacy Tune');
    const aSlot = (await kit.listDrafts(page)).find(
      (m) => m.name === 'A Kept Slot',
    );

    // B opens the found draft: claimed.
    const b2 = await gotoAs(kit, run, context, page, USER_B);
    if (b2 !== 'ready') return kit.crashed(b2);
    await openProjects(page, kit);
    const generation = await kit.generationNow(page);
    let claimed = null;
    if (sharedDevice) {
      await openRow(page, { draftId: sharedDevice.draftId });
      const opened = await kit.waitForOpenAfter(page, generation);
      if (opened === 'ready') {
        await kit.settle(page, 'after B opened the found draft');
        const meta = (await kit.listDrafts(page)).find(
          (m) => m.draftId === sharedDevice.draftId,
        );
        claimed = {
          name: await page.evaluate(
            () => window.__MA_STORE__.getState().projectName,
          ),
          userKey: meta?.userKey ?? null,
          claimedFrom: meta?.claimedFrom ?? null,
        };
      }
    }

    // A again: it is B's now.
    const a2 = await gotoAs(kit, run, context, page, null);
    if (a2 !== 'ready') return kit.crashed(a2);
    const aAfter = await rowsNamed(kit, page, 'Shared Legacy Tune');
    const userB = encodeURIComponent(USER_B);
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        legacyOwnerSingleUser:
          soloMine?.userKey === DEV_USER_KEY && !soloDevice,
        deviceDraftFoundByBoth:
          sharedDevice?.userKey === '~device' &&
          bFound.some(
            (r) => r.section === 'found' && r.draftId === sharedDevice.draftId,
          ) &&
          aFound.some(
            (r) => r.section === 'found' && r.draftId === sharedDevice.draftId,
          ),
        keptSlotsStayWithOwner:
          bSlotRows.length === 0 &&
          !bDrafts.includes('A Kept Slot') &&
          aSlot?.origin === 'kept' &&
          aSlot?.userKey === DEV_USER_KEY,
        deviceDraftClaimedOnOpen:
          claimed?.name === 'Shared Legacy Tune' &&
          claimed?.userKey === userB &&
          claimed?.claimedFrom === '~device' &&
          !aAfter.some((r) => r.draftId === sharedDevice?.draftId),
      },
      checks: {
        solo: soloMine
          ? { userKey: soloMine.userKey, origin: soloMine.origin }
          : soloDevice
            ? { userKey: soloDevice.userKey, origin: soloDevice.origin }
            : null,
        shared: sharedDevice
          ? { userKey: sharedDevice.userKey, origin: sharedDevice.origin }
          : null,
        rowsB: bFound.map((r) => `${r.section}: ${r.name}`),
        rowsA: aFound.map((r) => `${r.section}: ${r.name}`),
        slotForB: bSlotRows.length,
        slotForA: aSlot
          ? { origin: aSlot.origin, userKey: aSlot.userKey }
          : null,
        claimed,
        rowsAAfterClaim: aAfter.map((r) => `${r.section}: ${r.name}`),
      },
      after: await kit.fingerprint(page),
    };
  } finally {
    await asUser(context, null);
    await context.close();
  }
}

/** A tab of the session's context at ?new=1, settled. */
async function newTab(kit, run, session) {
  const tab = await kit.openTab(run, session);
  const state = await kit.openAt(tab, run.base, '?new=1');
  if (state !== 'ready') throw new Error(`a new tab did not open (${state})`);
  await kit.settle(tab, 'a new tab');
  return tab;
}

async function signOut(kit, run) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async (session) => {
      const { page, context } = session;
      const userB = encodeURIComponent(USER_B);
      // B's draft.
      await asUser(context, USER_B);
      const tabB = await newTab(kit, run, session);
      await seedRiff(tabB, 'B Tune');
      const draftB = await kit.waitForDraft(tabB);
      await tabB.close();
      await asUser(context, null);

      // A: unsaved work, kept by File ▸ New.
      await seedRiff(page, 'Unsaved Kept Tune');
      const kept = await kit.waitForDraft(page);
      const generation = await kit.generationNow(page);
      await kit.clickFileItem(page, 'New');
      const state = await kit.waitForOpenAfter(page, generation);
      if (state !== 'ready') return kit.crashed(state);
      await kit.settle(page, 'after File ▸ New');

      // A: a saved draft open in another tab (locked).
      const tabLocked = await newTab(kit, run, session);
      await seedRiff(tabLocked, 'Locked Tune');
      await kit.waitForDraft(tabLocked);
      await kit.saveFromFileMenu(tabLocked);
      const locked = await kit.waitForDraft(tabLocked);
      const lockedClean = await kit.cleanliness(tabLocked);

      // A: a saved draft whose tab has closed (cloud-equal, unlocked).
      const tabSaved = await newTab(kit, run, session);
      await seedRiff(tabSaved, 'Cloud Equal Tune');
      await kit.waitForDraft(tabSaved);
      await kit.saveFromFileMenu(tabSaved);
      const saved = await kit.waitForDraft(tabSaved);
      const savedClean = await kit.cleanliness(tabSaved);
      await tabSaved.close();

      // A mirror of the kept draft that IndexedDB already holds.
      const keptMeta = (await kit.listDrafts(page)).find(
        (m) => m.draftId === kept.draftId,
      );
      const keptText = await kit.readDraftBody(page, kept.draftId);
      const mirrorWritten = await page.evaluate(
        async ({ meta, text }) => {
          const mirror = await window.__RT_DEV_MODULE__(
            '/src/lib/studio-projects/drafts/draftMirror.ts',
          );
          const { v, writeSeq, updatedAt, writer, ...rest } = meta;
          void v;
          void updatedAt;
          void writer;
          return mirror.writeMirror({
            v: 1,
            draftId: meta.draftId,
            userKey: meta.userKey,
            baseSeq: writeSeq - 1,
            writeSeq,
            at: Date.now(),
            meta: rest,
            text,
          });
        },
        { meta: keptMeta, text: keptText },
      );

      // A's live edit, inside the debounce, then sign-out's tasks.
      const active = await seedRiff(page, 'Active Tune');
      const activeDraft = await kit.waitForDraft(page);
      const before = await kit.listDrafts(page);
      const bBefore = await kit.listDrafts(page, userB);
      await setVolume(page, active, 0.71);
      const ran = await page.evaluate(async () => {
        const started = Date.now();
        const { runBeforeSignOut } = await window.__RT_DEV_MODULE__(
          '/src/auth/beforeSignOut.ts',
        );
        await runBeforeSignOut(1000);
        return Date.now() - started;
      });
      const after = await kit.listDrafts(page);
      const bAfter = await kit.listDrafts(page, userB);
      const mirrors = await mirrorsNow(page);
      const activeBody = await kit.readDraftBody(page, activeDraft.draftId);
      const activeVolume = (() => {
        try {
          return (
            JSON.parse(activeBody).data.tracks.find((t) => t.id === active)
              ?.volume ?? null
          );
        } catch {
          return null;
        }
      })();
      const has = (list, id) => list.some((m) => m.draftId === id);
      const bWas = bBefore.find((m) => m.draftId === draftB.draftId);
      const bNow = bAfter.find((m) => m.draftId === draftB.draftId);
      const bBody = await kit.readDraftBody(page, draftB.draftId);
      await tabLocked.close();
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          signOutKeepsUnsaved:
            has(before, kept.draftId) &&
            has(after, kept.draftId) &&
            has(after, activeDraft.draftId) &&
            activeVolume === 0.71,
          signOutProtectsLocked:
            lockedClean.cloudEqual === true &&
            has(before, locked.draftId) &&
            has(after, locked.draftId),
          signOutRemovesCloudEqual:
            savedClean.cloudEqual === true &&
            has(before, saved.draftId) &&
            !has(after, saved.draftId) &&
            mirrorWritten === 'written' &&
            !mirrors.some((m) => m.draftId === kept.draftId),
          signOutLeavesOtherUsers:
            Boolean(bWas && bNow) &&
            bNow.writeSeq === bWas.writeSeq &&
            workHash(bBody) === workHash(draftB.text),
        },
        checks: {
          ranMs: ran,
          before: before.map((m) => `${m.name} (${m.origin})`),
          after: after.map((m) => `${m.name} (${m.origin})`),
          cloudEqual: {
            locked: lockedClean.cloudEqual,
            saved: savedClean.cloudEqual,
          },
          mirrorWritten,
          mirrorsAfter: mirrors.map((m) => `${m.userKey}:${m.draftId}`),
          activeVolume,
          userB: bNow ? { writeSeq: bNow.writeSeq } : 'gone',
        },
        after: await kit.fingerprint(page),
      };
    },
    api,
  );
}

export const scenarios = (kit) => [
  {
    group: 'R22',
    key: '',
    id: 'R22-shared-device',
    title:
      'Two students on one device: drafts, Projects, mirrors, lesson progress, presets and prefs stay each one’s own',
    run: (run) => sharedDevice(kit, run),
  },
  {
    group: 'R22',
    key: 'legacyOwner',
    id: 'R22-shared-device:legacyOwner',
    title:
      'The legacy autosave’s owner: the only student, or “Found on this device” for both, claimed by opening',
    run: (run) => legacyOwner(kit, run),
  },
  {
    group: 'R22',
    key: 'signOut',
    id: 'R22-shared-device:signOut',
    title:
      'Sign-out keeps unsaved and locked drafts, removes cloud-equal ones and held mirrors, leaves other students alone',
    run: (run) => signOut(kit, run),
  },
];
