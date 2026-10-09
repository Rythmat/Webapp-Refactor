/* eslint-env node */
/**
 * R12 every replaced session is kept once and reopens identically, in the
 * page AND after a reload (milestone 1.4, E3/E10, the Stage A exit "every
 * replaced session kept and reopened identically").
 *
 * For each path: the kitchen sink (snapshot S, its draft written), then the
 * path taken in-app. The sink must be kept once, as its own draft holding
 * it (keptOnce), and announced with a View (keptToastWithView). Projects
 * (File ▸ Open…) then reopens the kept draft, which must give S back
 * (reopenedIdenticallyInPage), and so must a reload of it
 * (reopenedIdenticallyAfterReload: the sink's in-memory audio, an imported
 * clip and a dropped Chops sample, comes back from the draft's media). The
 * session the path opened, untouched, must not be kept when it is replaced
 * in turn (pristineNotKept; a jam import opens as the only copy of the jam,
 * so it is kept).
 *
 * Compared: REOPEN_CLASSES (the project, its view, the ids and the audio;
 * no lesson context: 1.15).
 * The reported diffs are the reload's; the flags leave out what the sink's
 * resumed lesson rewrites as it mounts (LESSON_RESUME_FIELDS, 1.15).
 *
 * Fast: File ▸ New, a template link, a lesson link, a cloud project link,
 * the Song page's Open in Studio. Full: every other path (a demo, a Theory
 * and a genre practice track, a jam import, the Library's template, a
 * ?draft= link) and sameIdReopen: a project and its Save As copy share
 * their track ids, and each must reopen with its own Oracle patch.
 *
 * The sink's lesson must end at the switch (lessonEndsAtSwitch: the store
 * runs the path's own lesson, or none). Where a path leaves the editor and
 * comes back, the sink's lesson overlay mounts again over the outgoing
 * session before the open keeps it and re-applies its step's precondition
 * (TutorialLayer: the Prism tab), so the kept body already holds that tab
 * (checks.keptView): the same mechanism as R2 and R5 (LOSS_OWNERS, 1.15),
 * not a session-boundary leak.
 *
 * whileRecording (fast, E10): File ▸ New while a take is being recorded.
 * The open stops the transport and waits for the take's commit (a recorder
 * that commits 1.5 s after the stop) before keeping, so the kept draft
 * holds the take (takeCommittedBeforeKeep) and the overlay said
 * "Finishing your recording…". A take that never settles refuses the open
 * as busy after the 10 s wait, with nothing changed (stuckTakeRefusesOpen).
 */
import { startAudio } from '../harness.mjs';
import {
  fullTierOnly,
  inAppLink,
  lessonNow,
  markOutcome,
  newlyKept,
  nextOutcome,
  openProjects,
  openRow,
  openSongInStudio,
  projectRows,
  seedRiff,
  withoutLessonResume,
  workHash,
  REOPEN_CLASSES,
} from './_shared.mjs';

export const flags = {
  reopenedIdenticallyInPage: {
    goal: true,
    text: 'the kept work reopened from Projects as it was',
  },
  reopenedIdenticallyAfterReload: {
    goal: true,
    text: 'the reopened kept work survived a reload as it was (its audio included)',
  },
  pristineNotKept: {
    goal: true,
    text: 'the untouched session the path opened was not kept when replaced',
  },
  lessonEndsAtSwitch: {
    goal: true,
    text: 'the replaced session’s lesson ended at the switch (only the path’s own lesson runs)',
  },
  takeCommittedBeforeKeep: {
    goal: true,
    text: 'opening while recording stopped and committed the take before keeping the work',
  },
  stuckTakeRefusesOpen: {
    goal: true,
    text: 'a take that never settled refused the open as busy, changing nothing',
  },
  sameIdReopen: {
    goal: true,
    text: 'a project and its Save As copy (the same track ids) each reopened with its own Oracle patch',
  },
};

/** A recorded jam, as the jam room leaves it (roundtrip.mjs JAM_HANDOFF). */
const JAM = {
  version: 1,
  roomId: 'r12-jam',
  recordedAt: 1_760_000_000_000,
  bpm: 92,
  localUserId: 'player-a',
  participants: [{ userId: 'player-a', userName: 'Ada', color: '#e4572e' }],
  notes: [60, 64, 67, 72].map((midi, i) => ({
    userId: 'player-a',
    color: '#e4572e',
    instrument: 'piano',
    gmProgram: 0,
    midi,
    velocity: 90,
    startMs: i * 625,
    endMs: i * 625 + 500,
  })),
};

/**
 * The paths: how each is taken from inside the editor. `full` paths run in
 * the full tier only; `dirty` opens as work (kept when replaced).
 */
const PATHS = [
  { key: 'fileNew', title: 'File ▸ New', menu: 'New' },
  { key: 'template', title: 'a template link', query: '?template=project-pop' },
  {
    key: 'tutorial',
    title: 'a lesson link',
    query: '?tutorial=jazz-color-your-chords',
    lesson: 'jazz-color-your-chords',
  },
  { key: 'project', title: 'a cloud project link', project: true },
  { key: 'song', title: "the Song page's Open in Studio", song: 'africa' },
  {
    key: 'demo',
    title: 'a demo link',
    query: '?demo=demo-sunset-keys',
    full: true,
  },
  {
    key: 'practiceMode',
    title: 'a Theory practice link',
    query: '?practiceMode=dorian&practiceRoot=d',
    full: true,
  },
  {
    key: 'practiceGenre',
    title: 'a genre practice link',
    query: '?practiceGenre=funk&practiceLevel=1&practiceSection=A',
    full: true,
  },
  {
    key: 'jam',
    title: 'a jam import',
    query: '?jam=1',
    jam: true,
    dirty: true,
    full: true,
  },
  {
    key: 'libraryTemplate',
    title: "the Library's template",
    library: 'Pop',
    full: true,
  },
  {
    key: 'draft',
    title: 'a ?draft= link to other work',
    otherDraft: true,
    // The other work is work: replaced in turn, it is kept.
    dirty: true,
    full: true,
  },
];

/**
 * Opens a template from the Library panel (roundtrip.mjs openFromLibrary).
 * Resolves to the fingerprint of the work the click replaces, taken once
 * the panel is open: the work as it is kept, with the view the panel
 * needed.
 */
async function openFromLibrary(kit, page, label) {
  const open = await page.evaluate(() => {
    const store = window.__MA_STORE__;
    store.getState().setCurrentView('arrange');
    return store.getState().libraryOpen;
  });
  if (!open) await page.click('button[title="Library"]');
  await page.locator('button:has-text("Library")').first().click();
  await kit.waitForQuiet(page);
  await kit.waitForDraft(page);
  const replaced = await kit.fingerprint(page);
  await page
    .locator('div[draggable="false"]', {
      hasText: new RegExp(`^\\s*${label}\\s*$`),
    })
    .first()
    .click();
  return replaced;
}

/**
 * Takes `path` from inside the editor. Resolves like waitForEditor; a
 * Library click also leaves the fingerprint of what it replaced on
 * `out.replaced`.
 */
async function takePath(
  kit,
  run,
  page,
  path,
  { generation, otherDraftId, out },
) {
  if (path.menu) {
    await kit.clickFileItem(page, path.menu);
    return kit.waitForOpenAfter(page, generation);
  }
  if (path.library) {
    out.replaced = await openFromLibrary(kit, page, path.library);
    return kit.waitForOpenAfter(page, generation);
  }
  if (path.song) {
    const opened = await openSongInStudio(kit, page, {
      songId: path.song,
      inApp: true,
    });
    return opened.state;
  }
  if (path.jam) {
    await kit.leaveEditor(page);
    await page.evaluate(
      (value) => localStorage.setItem('musicatlas:pending-jam-import', value),
      JSON.stringify(JAM),
    );
    await kit.spaNavigate(page, '/studio/editor?jam=1');
    return kit.waitForEditor(page);
  }
  const query = path.project
    ? `?project=${encodeURIComponent(run.leakProjectId)}`
    : path.otherDraft
      ? `?draft=${encodeURIComponent(otherDraftId)}`
      : path.query;
  return inAppLink(kit, page, query);
}

async function keptReopen(kit, run, path) {
  if (path.full) fullTierOnly(run);
  return kit.withSession(run, '?new=1', async ({ page }) => {
    let otherDraftId = null;
    if (path.otherDraft) {
      // Other work of this user's, kept, to open by its id.
      await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        s.setProjectName('Other Work');
        s.addTrack('midi', 'piano-sampler', 'Other Keys');
      });
      const other = await kit.waitForDraft(page);
      otherDraftId = other.draftId;
      const generation = await kit.generationNow(page);
      await kit.clickFileItem(page, 'New');
      const state = await kit.waitForOpenAfter(page, generation);
      if (state !== 'ready') return kit.crashed(state);
      await kit.settle(page, 'after making the other draft');
    }
    const sink = await kit.applySink(page, run);
    const { draft } = sink;
    const lessons = { sink: await lessonNow(page) };
    const draftsBefore = await kit.listDrafts(page);
    const since = await kit.pageNow(page);
    const generation = await kit.generationNow(page);
    const out = {};
    const state = await takePath(kit, run, page, path, {
      generation,
      otherDraftId,
      out,
    });
    if (state !== 'ready') return kit.crashed(state);
    // What the path replaced: the sink, or the sink as the Library click
    // found it.
    const before = out.replaced ?? sink.snapshot;
    const settlePath = await kit.settle(page, `after ${path.title}`);
    lessons.afterPath = await lessonNow(page);
    const opened = await kit.draftNow(page);
    const draftsAfter = await kit.listDrafts(page);
    const kept = newlyKept(draftsBefore, draftsAfter);
    const keptText =
      kept.length === 1 ? await kit.readDraftBody(page, kept[0].draftId) : null;
    const keptToast = await kit.waitForToast(page, {
      since,
      match: kit.KEPT_TOAST,
      timeout: 5000,
    });

    // Reopen the kept draft from Projects.
    await openProjects(page, kit);
    const rows = await projectRows(page);
    const row = rows.find((r) => r.draftId === draft.draftId) ?? null;
    const generation2 = await kit.generationNow(page);
    let inPage = { state: 'no row' };
    let diffsInPage = null;
    if (row) {
      await openRow(page, { draftId: draft.draftId });
      const reopened = await kit.waitForOpenAfter(page, generation2);
      inPage = { state: reopened };
      if (reopened === 'ready') {
        inPage.settle = await kit.settle(page, 'after reopening from Projects');
        lessons.reopened = await lessonNow(page);
        const got = await kit.fingerprint(page);
        diffsInPage = kit.compareFingerprints(before, got, {
          classes: REOPEN_CLASSES,
          defaults: run.defaults,
        });
      }
    }
    const draftsReopened = await kit.listDrafts(page);
    const pathDraft = draftsReopened.find((m) => m.draftId === opened.draftId);
    const keptAgain = newlyKept(draftsAfter, draftsReopened);

    // And after a reload.
    await page.reload({ waitUntil: 'domcontentloaded' });
    const reloaded = await kit.waitForEditor(page);
    if (reloaded !== 'ready') return kit.crashed(reloaded);
    const settleReload = await kit.settle(page, 'after the reload');
    lessons.reloaded = await lessonNow(page);
    const after = await kit.fingerprint(page);
    const now = await kit.draftNow(page);
    const diffs = kit.compareFingerprints(before, after, {
      classes: REOPEN_CLASSES,
      defaults: run.defaults,
    });
    return {
      diffs,
      extraLosses: [],
      flags: {
        keptOnce:
          kept.length === 1 &&
          kept[0].draftId === draft.draftId &&
          workHash(keptText) === workHash(draft.text),
        keptToastWithView: Boolean(keptToast?.actions?.includes('View')),
        reopenedIdenticallyInPage:
          inPage.state === 'ready' &&
          diffsInPage !== null &&
          withoutLessonResume(diffsInPage).length === 0,
        reopenedIdenticallyAfterReload:
          withoutLessonResume(diffs).length === 0 &&
          now.draftId === draft.draftId,
        lessonEndsAtSwitch:
          lessons.sink?.lesson != null &&
          lessons.afterPath?.lesson === (path.lesson ?? null),
        pristineNotKept: path.dirty
          ? keptAgain.some((m) => m.draftId === opened.draftId)
          : keptAgain.length === 0 && pathDraft?.origin !== 'kept',
      },
      checks: {
        path: path.title,
        keptDrafts: kept.map((m) => `${m.draftId} (${m.name})`),
        keptToast: keptToast
          ? `${keptToast.text} [${keptToast.actions.join(', ')}]`
          : null,
        projectsRow: row,
        reopenedInPage: {
          state: inPage.state,
          diffs: diffsInPage?.map((d) => `${d.key} (${d.kind})`) ?? null,
        },
        pathDraft: {
          draftId: opened.draftId,
          after: pathDraft
            ? { origin: pathDraft.origin, name: pathDraft.name }
            : 'removed',
        },
        lessons,
        keptView: viewTab(keptText),
        keptByTheReopen: keptAgain.map((m) => `${m.draftId} (${m.name})`),
        draft: { before: draft.draftId, after: now.draftId },
        settle: [
          settlePath,
          ...(inPage.settle ? [inPage.settle] : []),
          settleReload,
        ],
      },
      after,
    };
  });
}

/** A draft body's channel strip tab (its view), for the report. */
function viewTab(text) {
  try {
    return JSON.parse(text).data?.view?.channelStripTab ?? null;
  } catch {
    return null;
  }
}

// ── whileRecording ──────────────────────────────────────────────────────────

const TAKES_MODULE = '/src/daw/session/takesInFlight.ts';

async function whileRecording(kit, run) {
  return kit.withSession(run, '?new=1', async ({ page }) => {
    // 1. A take that commits 1.5 s after the stop.
    const track = await seedRiff(page, 'Take Tune');
    await page.evaluate((id) => {
      const s = window.__MA_STORE__.getState();
      s.setCountInBars(0);
      if (!s.tracks.find((t) => t.id === id)?.recordArmed) {
        s.toggleRecordArm(id);
      }
    }, track);
    const draft = await kit.waitForDraft(page);
    const draftsBefore = await kit.listDrafts(page);
    await startAudio(page);
    await page.evaluate(
      async ({ path, id }) => {
        const takes = await window.__RT_DEV_MODULE__(path);
        const store = window.__MA_STORE__;
        const session = window.__MA_SESSION__;
        const log = { waiting: [], overlay: [], clipAt: null, stopAt: null };
        window.__rtTakeLog = log;
        session.subscribe((s) => {
          if (log.waiting[log.waiting.length - 1] !== s.waitingFor) {
            log.waiting.push(s.waitingFor);
          }
        });
        window.__rtOverlayPoll = setInterval(() => {
          const el = document.querySelector('[data-testid="opening-overlay"]');
          const text = el ? (el.textContent ?? '').trim() : null;
          if (text && log.overlay[log.overlay.length - 1] !== text) {
            log.overlay.push(text);
          }
        }, 50);
        store.getState().record();
        const settle = takes.beginTake('midi');
        const unsubscribe = store.subscribe((s, prev) => {
          if (!prev.isRecording || s.isRecording) return;
          unsubscribe();
          log.stopAt = Date.now();
          setTimeout(() => {
            try {
              store.getState().addMidiClip(id, {
                id: 'rt-take-clip',
                name: 'Take',
                startTick: 1920,
                events: [72, 76, 79].map((note, i) => ({
                  note,
                  velocity: 100,
                  startTick: i * 240,
                  durationTicks: 240,
                  channel: 1,
                })),
              });
              log.clipAt = Date.now();
            } finally {
              settle();
            }
          }, 1500);
        });
      },
      { path: TAKES_MODULE, id: track },
    );
    await page.waitForFunction(
      () => window.__MA_STORE__.getState().isRecording,
      null,
      { timeout: 10_000 },
    );
    await kit.sleep(500);
    const since = await kit.pageNow(page);
    const generation = await kit.generationNow(page);
    await kit.clickFileItem(page, 'New');
    const state = await kit.waitForOpenAfter(page, generation);
    if (state !== 'ready') return kit.crashed(state);
    await kit.settle(page, 'after File ▸ New while recording');
    const log = await page.evaluate(() => {
      clearInterval(window.__rtOverlayPoll);
      return window.__rtTakeLog;
    });
    const draftsAfter = await kit.listDrafts(page);
    const kept = newlyKept(draftsBefore, draftsAfter);
    const keptText =
      kept.length === 1 ? await kit.readDraftBody(page, kept[0].draftId) : null;
    let keptTake = false;
    try {
      keptTake = (JSON.parse(keptText).data?.tracks ?? []).some((t) =>
        (t.midiClips ?? []).some((c) => c.id === 'rt-take-clip'),
      );
    } catch {
      keptTake = false;
    }

    // 2. A take that never settles: the open is refused as busy.
    await seedRiff(page, 'Stuck Tune');
    const stuckDraft = await kit.waitForDraft(page);
    const beforeStuck = await page.evaluate(() => ({
      tracks: window.__MA_STORE__.getState().tracks.length,
      name: window.__MA_STORE__.getState().projectName,
      draftId: window.__MA_SESSION__.getState().draftId,
    }));
    await page.evaluate(async (path) => {
      const takes = await window.__RT_DEV_MODULE__(path);
      window.__rtStuckTake = takes.beginTake('midi');
    }, TAKES_MODULE);
    await markOutcome(page);
    const sinceStuck = await kit.pageNow(page);
    await kit.clickFileItem(page, 'New');
    const stuck = await nextOutcome(page, 30_000);
    const busyToast = await kit.waitForToast(page, {
      since: sinceStuck,
      match: /Finishing your recording, try again/,
      timeout: 5000,
    });
    const afterStuck = await page.evaluate(() => ({
      tracks: window.__MA_STORE__.getState().tracks.length,
      name: window.__MA_STORE__.getState().projectName,
      draftId: window.__MA_SESSION__.getState().draftId,
    }));
    await page.evaluate(() => window.__rtStuckTake?.());
    const stuckMetas = await kit.listDrafts(page);
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        takeCommittedBeforeKeep:
          kept.length === 1 &&
          kept[0].draftId === draft.draftId &&
          keptTake &&
          log.waiting.includes('take') &&
          log.overlay.some((t) => /Finishing your recording/.test(t)),
        stuckTakeRefusesOpen:
          stuck?.status === 'refused' &&
          stuck?.kind === 'busy' &&
          Boolean(busyToast) &&
          afterStuck.draftId === beforeStuck.draftId &&
          afterStuck.tracks === beforeStuck.tracks &&
          afterStuck.name === beforeStuck.name &&
          !stuckMetas.some(
            (m) => m.draftId === stuckDraft.draftId && m.origin === 'kept',
          ),
      },
      checks: {
        keptDrafts: kept.map((m) => `${m.draftId} (${m.name})`),
        keptTake,
        takeLog: log,
        toasts: await kit.readToasts(page, since),
        stuck,
        busyToast: busyToast?.text ?? null,
        stuckSession: { before: beforeStuck, after: afterStuck },
      },
      after: await kit.fingerprint(page),
    };
  });
}

// ── sameIdReopen ────────────────────────────────────────────────────────────

/** Turns the Lead's filter cutoff through its open synth panel (R6's way). */
async function setLeadCutoff(kit, page, trackId, cutoff) {
  await page.evaluate((id) => {
    const s = window.__MA_STORE__.getState();
    s.setCurrentView('arrange');
    s.setSelectedTrackId(id);
    s.setChannelStripTab('controls');
  }, trackId);
  await page.waitForFunction(
    async (id) => {
      const sts = await window.__RT_DEV_MODULE__(
        '/src/daw/oracle-synth/synthTrackState.ts',
      );
      return sts.getActiveSynthTrack() === id;
    },
    trackId,
    { timeout: 20_000, polling: 100 },
  );
  await page.evaluate((value) => {
    window.__MA_SYNTH_STORE__.getState().setFilterParam(0, 'cutoff', value);
  }, cutoff);
  await kit.sleep(kit.DRAFT_TIMING.DEBOUNCE_MS + 1500);
}

/** The Lead's saved Oracle patch, as the fingerprint shows it. */
async function leadPatch(kit, page) {
  const snapshot = await kit.fingerprint(page);
  const names = await page.evaluate(() =>
    window.__MA_STORE__.getState().tracks.map((t) => t.name),
  );
  const lead = names.indexOf('Same Id Lead');
  if (lead < 0) return null;
  return JSON.stringify(
    snapshot.fields[`tracks[${lead}].synthPatch`]?.value ?? null,
  );
}

async function sameIdReopen(kit, run) {
  fullTierOnly(run);
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      page.on('dialog', (dialog) => {
        if (dialog.type() === 'prompt') {
          dialog.accept('Same Id Copy').catch(() => {});
        } else {
          dialog.accept().catch(() => {});
        }
      });
      const lead = await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        s.setProjectName('Same Id Original');
        return s.addTrack('midi', 'oracle-synth', 'Same Id Lead');
      });
      await setLeadCutoff(kit, page, lead, 777);
      await kit.saveFromFileMenu(page);
      const original = await page.evaluate(
        () => window.__MA_STORE__.getState().projectId,
      );
      const patchOriginal = await leadPatch(kit, page);
      // Save As: a copy under a new id, the same track ids.
      const savedBefore = await page.evaluate(
        () => window.__MA_CLOUD_SAVE__.getState().savedCount,
      );
      await kit.clickFileItem(page, 'Save As');
      await page.waitForFunction(
        (count) => window.__MA_CLOUD_SAVE__.getState().savedCount > count,
        savedBefore,
        { timeout: 60_000 },
      );
      const copy = await page.evaluate(
        () => window.__MA_STORE__.getState().projectId,
      );
      await setLeadCutoff(kit, page, lead, 333);
      await kit.saveFromFileMenu(page);
      const patchCopy = await leadPatch(kit, page);
      const reopen = async (projectId) => {
        const generation = await kit.generationNow(page);
        await kit.leaveEditor(page);
        await kit.spaNavigate(
          page,
          `/studio/editor?project=${encodeURIComponent(projectId)}`,
        );
        const state = await kit.waitForEditor(page);
        if (state !== 'ready') return { state };
        await kit.settle(page, `after reopening ${projectId}`);
        return {
          state,
          generation,
          projectId: await page.evaluate(
            () => window.__MA_STORE__.getState().projectId,
          ),
          patch: await leadPatch(kit, page),
        };
      };
      const backOriginal = await reopen(original);
      const backCopy = await reopen(copy);
      const after = await kit.fingerprint(page);
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          sameIdReopen:
            original !== copy &&
            patchOriginal !== patchCopy &&
            backOriginal.projectId === original &&
            backOriginal.patch === patchOriginal &&
            backCopy.projectId === copy &&
            backCopy.patch === patchCopy,
        },
        checks: {
          projects: { original, copy },
          reopened: {
            original: backOriginal.state,
            copy: backCopy.state,
            originalPatchSame: backOriginal.patch === patchOriginal,
            copyPatchSame: backCopy.patch === patchCopy,
          },
        },
        after,
      };
    },
    api,
  );
}

export const scenarios = (kit) => [
  ...PATHS.map((path) => ({
    group: 'R12',
    key: path.key,
    id: `R12-kept-reopen:${path.key}`,
    title: `${path.full ? '(full) ' : ''}The kitchen sink, then ${path.title}: kept once, reopened from Projects and after a reload as it was`,
    run: (run) => keptReopen(kit, run, path),
  })),
  {
    group: 'R12',
    key: 'whileRecording',
    id: 'R12-kept-reopen:whileRecording',
    title:
      'File ▸ New while recording: the take is committed before keeping; a stuck take refuses',
    run: (run) => whileRecording(kit, run),
  },
  {
    group: 'R12',
    key: 'sameIdReopen',
    id: 'R12-kept-reopen:sameIdReopen',
    title:
      '(full) A project and its Save As copy each reopen with their own Oracle patch',
    run: (run) => sameIdReopen(kit, run),
  },
];
