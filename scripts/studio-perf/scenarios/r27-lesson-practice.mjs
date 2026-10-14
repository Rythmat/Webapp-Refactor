/* eslint-env node */
/**
 * R27 lesson and practice persistence (milestone 1.15; fast), in a real
 * browser:
 *
 * - lessonRefreshResumes: a lesson at step 4 (index 3), with a track built
 *   in it, refreshed: the lesson is back at the same step, the coach card
 *   on screen, the tracks and the channel strip tab as they were, and the
 *   student is told ("Lesson resumed at step 4 of …").
 * - otherOpenEndsLesson: File ▸ New ends the lesson (none runs), and the
 *   lesson's draft is kept.
 * - restoreResumesLesson: Restore of that kept draft brings the lesson back
 *   at its step.
 * - twoTabsOwnLessons: two tabs of one browser, each running another
 *   lesson at another step, both refreshed: each comes back to its own.
 * - practiceKeysRecordTake: on a Theory practice track's screen, Record
 *   take, three keys pressed with the mouse, Stop: the take is on the
 *   student's track (the session's studentTrackId) and holds the three
 *   notes; each key lit while held, and nothing went into another track.
 * - practiceRefreshRestores: the practice screen refreshed comes back: the
 *   screen, its session (key and mode as well), and the take.
 */
import { startAudio } from '../harness.mjs';

export const flags = {
  lessonRefreshResumes: {
    goal: true,
    text: 'a refresh mid-lesson came back at the same step, tracks and view intact',
  },
  lessonResumedToast: {
    goal: true,
    text: 'the refreshed lesson said at which step it resumed',
  },
  otherOpenEndsLesson: {
    goal: true,
    text: 'opening something else ended the lesson and kept its draft',
  },
  restoreResumesLesson: {
    goal: true,
    text: 'Restore of the kept lesson draft brought the lesson back at its step',
  },
  twoTabsOwnLessons: {
    goal: true,
    text: 'two tabs running different lessons each came back to their own',
  },
  practiceKeysRecordTake: {
    goal: true,
    text: 'practice keys pressed while recording made a take on the student’s track',
  },
  practiceRefreshRestores: {
    goal: true,
    text: 'a refresh on the practice screen came back to it, its session and take',
  },
};

const LESSON = 'make-first-track';
const OTHER_LESSON = 'jazz-color-your-chords';
const RESUME_TOAST = /Lesson resumed at step (\d+) of \d+/;
const COACH_CARD = 'button[aria-label="Quit tutorial"]';
const PRACTICE = '[data-testid="practice-track-view"]';

/** The lesson the store runs, its step and what the student sees of it. */
const lessonState = (page) =>
  page.evaluate((card) => {
    const s = window.__MA_STORE__.getState();
    return {
      lesson: s.activeTutorialId,
      step: s.tutorialStepIndex,
      tab: s.channelStripTab,
      tracks: s.tracks.map((t) => ({
        name: t.name,
        notes: t.midiClips.reduce((n, c) => n + c.events.length, 0),
      })),
      card: Boolean(document.querySelector(card)),
    };
  }, COACH_CARD);

/**
 * In a lesson session: a track with a riff (work to keep), the lesson
 * moved on to `step`, and the student's own panel. A free-form or
 * still-waiting step keeps the lesson put (no check passes on its own).
 */
async function buildLesson(kit, page, { name, step, tab }) {
  await page.evaluate(
    ({ name, step }) => {
      const s = window.__MA_STORE__.getState();
      const id = s.addTrack('midi', 'piano-sampler', name);
      s.addMidiClip(id, {
        id: `${name}-riff`,
        startTick: 0,
        durationTicks: 1920,
        events: [60, 64, 67].map((note, i) => ({
          id: `${name}-n${i}`,
          note,
          velocity: 90,
          startTick: i * 480,
          durationTicks: 480,
          channel: 0,
        })),
      });
      s.goToTutorialStep(step);
    },
    { name, step },
  );
  await kit.sleep(600);
  // The student's panel, after the step's own (Prism) went up.
  await page.evaluate(
    (tab) => window.__MA_STORE__.getState().setChannelStripTab(tab),
    tab,
  );
  // The context goes out on the debounce; the refresh flushes it anyway.
  await kit.sleep(1500);
  await kit.waitForDraft(page);
}

const sameLesson = (a, b) =>
  a.lesson === b.lesson &&
  a.step === b.step &&
  a.tab === b.tab &&
  JSON.stringify(a.tracks) === JSON.stringify(b.tracks);

async function lessons(kit, run) {
  return kit.withSession(run, `?tutorial=${LESSON}`, async (session) => {
    const { page } = session;
    const checks = {};
    await buildLesson(kit, page, { name: 'Lesson Keys', step: 3, tab: 'fx' });
    const before = await lessonState(page);
    const draftBefore = (await kit.draftNow(page)).draftId;

    // Refresh mid-lesson.
    await page.reload({ waitUntil: 'domcontentloaded' });
    const reloaded = await kit.waitForEditor(page);
    if (reloaded !== 'ready') return kit.crashed(reloaded);
    await kit.settle(page, 'after the refresh');
    await page
      .waitForSelector(COACH_CARD, { timeout: 15_000 })
      .catch(() => null);
    const after = await lessonState(page);
    const toast = await kit.waitForToast(page, {
      match: RESUME_TOAST,
      timeout: 8000,
    });
    checks.refresh = {
      before,
      after,
      sameDraft: (await kit.draftNow(page)).draftId === draftBefore,
      toast: toast?.text ?? null,
    };

    // Something else opens: the lesson ends, its draft is kept.
    const since = await kit.pageNow(page);
    const generation = await kit.generationNow(page);
    await kit.clickFileItem(page, 'New');
    const opened = await kit.waitForOpenAfter(page, generation);
    if (opened !== 'ready') return kit.crashed(opened);
    await kit.settle(page, 'after File ▸ New');
    const afterNew = await lessonState(page);
    const kept = await kit.waitForToast(page, {
      since,
      match: kit.KEPT_TOAST,
      timeout: 8000,
    });
    const keptDraft = (await kit.listDrafts(page)).find(
      (m) => m.draftId === draftBefore,
    );
    checks.otherOpen = {
      afterNew,
      kept: kept?.text ?? null,
      keptOrigin: keptDraft?.origin ?? null,
    };

    // Restore it.
    const generation2 = await kit.generationNow(page);
    checks.restoreOutcome = await page.evaluate(kit.restoreKept, {
      path: kit.OPEN_SESSION_MODULE,
      draftId: draftBefore,
    });
    await kit.waitForOpenAfter(page, generation2);
    await kit.settle(page, 'after the Restore');
    checks.restored = await lessonState(page);

    // A second tab, another lesson.
    const tabB = await kit.openTab(run, session);
    const stateB = await kit.openAt(
      tabB,
      run.base,
      `?tutorial=${OTHER_LESSON}`,
    );
    if (stateB !== 'ready') return kit.crashed(stateB);
    await kit.settle(tabB, 'tab B opening its lesson');
    await buildLesson(kit, tabB, { name: 'Tab B Keys', step: 2, tab: 'fx' });
    const beforeB = await lessonState(tabB);
    const beforeA = await lessonState(page);
    for (const tab of [page, tabB]) {
      await tab.reload({ waitUntil: 'domcontentloaded' });
      const state = await kit.waitForEditor(tab);
      if (state !== 'ready') return kit.crashed(state);
      await kit.settle(tab, 'after a tab’s refresh');
    }
    checks.twoTabs = {
      a: { before: beforeA, after: await lessonState(page) },
      b: { before: beforeB, after: await lessonState(tabB) },
    };
    return checks;
  });
}

/** In-page: the centres of the practice keyboard's first white keys. */
function whiteKeyCentres(count) {
  const keys = [
    ...document.querySelectorAll('[data-practice-keyboard] div'),
  ].filter(
    (el) =>
      el.className.includes('bg-white') &&
      el.className.includes('cursor-pointer'),
  );
  return keys.slice(0, count).map((el) => {
    const r = el.getBoundingClientRect();
    // Low on the key: under the black keys, on the white key alone.
    return { x: r.left + r.width / 2, y: r.bottom - 12 };
  });
}

const practiceState = (page) =>
  page.evaluate((selector) => {
    const s = window.__MA_STORE__.getState();
    const session = s.practiceSession;
    const student = s.tracks.find((t) => t.id === session?.studentTrackId);
    return {
      screen: Boolean(document.querySelector(selector)),
      view: s.currentView,
      session,
      rootNote: s.rootNote,
      mode: s.mode,
      studentTrack: student?.name ?? null,
      takeNotes:
        student?.midiClips.reduce((n, c) => n + c.events.length, 0) ?? 0,
      otherNotes: s.tracks
        .filter((t) => t.id !== student?.id)
        .reduce(
          (n, t) => n + t.midiClips.reduce((m, c) => m + c.events.length, 0),
          0,
        ),
      lit: [...s.hwActiveNotes],
    };
  }, PRACTICE);

async function practice(kit, run) {
  return kit.withSession(
    run,
    '?practiceMode=dorian&practiceRoot=d',
    async ({ page }) => {
      const checks = {};
      await page.waitForSelector(PRACTICE, { timeout: 30_000 });
      await page.setViewportSize({ width: 1366, height: 655 });
      await kit.sleep(500);
      const opened = await practiceState(page);

      // Record a take on the keys.
      await page.getByRole('button', { name: /Record take/ }).click();
      await startAudio(page).catch(() => null);
      await page
        .waitForFunction(() => window.__MA_STORE__.getState().isRecording, {
          timeout: 15_000,
        })
        .catch(() => null);
      await kit.sleep(400);
      const keys = await page.evaluate(whiteKeyCentres, 3);
      const lit = [];
      for (const key of keys) {
        await page.mouse.move(key.x, key.y);
        await page.mouse.down();
        await kit.sleep(250);
        lit.push((await practiceState(page)).lit.length);
        await page.mouse.up();
        await kit.sleep(150);
      }
      await page.getByRole('button', { name: /Stop recording/ }).click();
      await kit.sleep(800);
      await kit.waitForDraft(page);
      const recorded = await practiceState(page);
      checks.take = { opened, keys: keys.length, lit, recorded };

      // Refresh on the practice screen.
      await page.reload({ waitUntil: 'domcontentloaded' });
      const reloaded = await kit.waitForEditor(page);
      if (reloaded !== 'ready') return kit.crashed(reloaded);
      await kit.settle(page, 'after the practice refresh');
      await page
        .waitForSelector(PRACTICE, { timeout: 15_000 })
        .catch(() => null);
      checks.refresh = { before: recorded, after: await practiceState(page) };
      return checks;
    },
  );
}

async function lessonAndPractice(kit, run) {
  const l = await lessons(kit, run);
  if (l.diffs) return l; // crashed
  const p = await practice(kit, run);
  if (p.diffs) return p;
  const { refresh, otherOpen, restored, twoTabs } = l;
  const resumedStep = Number(RESUME_TOAST.exec(refresh.toast ?? '')?.[1]);
  const t = p.take;
  const pr = p.refresh;
  return {
    diffs: [],
    extraLosses: [],
    flags: {
      lessonRefreshResumes:
        refresh.before.lesson === LESSON &&
        refresh.before.step === 3 &&
        sameLesson(refresh.before, refresh.after) &&
        refresh.after.card &&
        refresh.sameDraft,
      lessonResumedToast: resumedStep === 4,
      otherOpenEndsLesson:
        otherOpen.afterNew.lesson === null && otherOpen.keptOrigin === 'kept',
      restoreResumesLesson:
        restored.lesson === LESSON &&
        restored.step === 3 &&
        restored.card &&
        JSON.stringify(restored.tracks) ===
          JSON.stringify(refresh.before.tracks),
      twoTabsOwnLessons:
        twoTabs.a.before.lesson === LESSON &&
        twoTabs.b.before.lesson === OTHER_LESSON &&
        sameLesson(twoTabs.a.before, twoTabs.a.after) &&
        sameLesson(twoTabs.b.before, twoTabs.b.after),
      practiceKeysRecordTake:
        t.keys === 3 &&
        t.lit.every((n) => n === 1) &&
        t.opened.session?.studentTrackId !== undefined &&
        t.recorded.takeNotes === 3 &&
        t.recorded.otherNotes === t.opened.otherNotes,
      practiceRefreshRestores:
        pr.after.screen &&
        pr.after.view === 'practice' &&
        JSON.stringify(pr.after.session) ===
          JSON.stringify(pr.before.session) &&
        pr.after.rootNote === pr.before.rootNote &&
        pr.after.mode === pr.before.mode &&
        pr.after.takeNotes === pr.before.takeNotes,
    },
    checks: { lessons: l, practice: p },
  };
}

export const scenarios = (kit) => [
  {
    group: 'R27',
    key: '',
    id: 'R27-lesson-practice',
    title:
      'Lessons and the practice screen survive a refresh, end with another open, and practice keys record',
    run: (run) => lessonAndPractice(kit, run),
  },
];
