/* eslint-env node */
/**
 * R11 crash (milestone 1.4, spec §8): the renderer dies (CDP Page.crash: no
 * pagehide, no visibilitychange, nothing flushed), and a new tab of the
 * same browser opens plain /studio/editor, which resumes the newest unlocked
 * draft. Only what the draft had committed can come back.
 *
 * - settled (fast): the kitchen sink, its draft written, the Lead's volume
 *   to 0.33 and that written too, then the crash. The new tab must open
 *   the same draft with the 0.33 (crashRestoredLatest), no copy and no fork
 *   toast (crashNoFork), and no "previous work was kept" (crashNoKeptToast:
 *   resuming is not replacing).
 * - playing, inDebounce (full): the same with the transport playing, and
 *   with a second edit (0.55) the crash lands inside the debounce of: the
 *   committed 0.33 comes back and the 0.55 is all that is lost
 *   (crashLossOnlyLastEdit: nothing else differs).
 * - reloadAfterCrash (full): as settled, but the next tab carries the
 *   crashed tab's sessionStorage pointer, as Chrome's "Aw, Snap" Reload
 *   keeps it: the same draft, no copy, no kept toast (crashReloadSameDraft).
 *
 * Every mode also checks that no copy appeared (crashNoFork: no fork toast,
 * no new draft of origin 'fork').
 *
 * Compared: REOPEN_CLASSES (the project, its view, the ids and the audio;
 * no lesson context, 1.15), with the playhead left out while playing.
 */
import { crash, startAudio } from '../harness.mjs';
import { fullTierOnly, REOPEN_CLASSES } from './_shared.mjs';

export const flags = {
  crashRestoredLatest: {
    goal: true,
    text: 'after a crash the new tab reopened the draft with the last committed edit',
  },
  crashNoFork: {
    goal: true,
    text: 'after a crash the new tab took the same draft (no copy, no fork toast)',
  },
  crashNoKeptToast: {
    goal: true,
    text: 'reopening after a crash told no "previous work was kept"',
  },
  crashReloadSameDraft: {
    goal: true,
    text: 'reloading the crashed tab (its pointer kept) reopened the same draft, with no copy and no kept toast',
  },
  crashLossOnlyLastEdit: {
    goal: true,
    text: 'a crash inside the debounce lost the last edit and nothing else',
  },
};

/** Waits until the draft has committed a change past `seq` (while playing too). */
async function committedPast(page, seq, timeout) {
  return page
    .waitForFunction(
      (from) => {
        const st = window.__MA_DRAFTS__.status();
        return (
          st.committedSeq > from &&
          st.committedSeq === st.pendingSeq &&
          !st.writing
        );
      },
      seq,
      { timeout, polling: 100 },
    )
    .then(
      () => true,
      () => false,
    );
}

/** The tab's draft pointer (src/lib/studio-projects/drafts/activeDraft.ts). */
const ACTIVE_DRAFT_KEY = 'musicAtlas:daw:activeDraft';

async function crashScenario(kit, run, mode) {
  if (mode !== 'settled') fullTierOnly(run);
  const session = await kit.openEditorContext(run, '?new=1');
  try {
    const { page } = session;
    const { sink, draft } = await kit.applySink(page, run);
    const lead = sink.trackIds.lead;
    const playing = mode === 'playing';
    if (playing) {
      await startAudio(page);
      await page.evaluate(() => window.__MA_STORE__.getState().play());
      await page.waitForFunction(
        () => window.__MA_STORE__.getState().isPlaying,
        null,
        { timeout: 30_000 },
      );
    }
    const seq = (await kit.draftNow(page)).committedSeq;
    await page.evaluate(
      (id) => window.__MA_STORE__.getState().updateTrack(id, { volume: 0.33 }),
      lead,
    );
    const wait =
      kit.DRAFT_TIMING.MAX_WAIT_MS + kit.DRAFT_TIMING.DEBOUNCE_MS + 5000;
    const committed = playing
      ? await committedPast(page, seq, wait)
      : Boolean(await kit.waitForDraft(page, { allowMissing: true }));
    if (!committed) throw new Error('the 0.33 edit was never written');
    const before = await kit.fingerprint(page);
    const draftsBefore = await kit.listDrafts(page);
    const pointer = await page.evaluate(
      (key) => sessionStorage.getItem(key),
      ACTIVE_DRAFT_KEY,
    );
    if (mode === 'playing' || mode === 'inDebounce') {
      // The edit the crash lands on, well inside the debounce.
      await page.evaluate(
        (id) =>
          window.__MA_STORE__.getState().updateTrack(id, { volume: 0.55 }),
        lead,
      );
    }
    await crash(page);
    const next = await kit.openTab(run, session);
    if (mode === 'reloadAfterCrash') {
      // The crashed tab reloaded: its sessionStorage (the pointer) survives.
      await next.addInitScript(
        ({ key, value }) => {
          try {
            if (value && !sessionStorage.getItem('rt:reload')) {
              sessionStorage.setItem('rt:reload', '1');
              sessionStorage.setItem(key, value);
            }
          } catch {
            // No storage on an opaque origin.
          }
        },
        { key: ACTIVE_DRAFT_KEY, value: pointer },
      );
    }
    const state = await kit.openAt(next, run.base, '');
    if (state !== 'ready') return kit.crashed(state);
    const settle = await kit.settle(next, 'after the crash');
    const after = await kit.fingerprint(next);
    const now = await kit.draftNow(next);
    const volume = await next.evaluate(
      (id) =>
        window.__MA_STORE__.getState().tracks.find((t) => t.id === id)
          ?.volume ?? null,
      lead,
    );
    const fork = await kit.waitForToast(next, {
      match: kit.FORK_TOAST,
      timeout: 500,
    });
    const kept = await kit.waitForToast(next, {
      match: kit.KEPT_TOAST,
      timeout: 500,
    });
    const draftsAfter = await kit.listDrafts(next);
    const created = draftsAfter.filter(
      (m) => !draftsBefore.some((b) => b.draftId === m.draftId),
    );
    const diffs = kit.compareFingerprints(before, after, {
      classes: REOPEN_CLASSES,
      defaults: run.defaults,
      ...(playing ? { ignore: ['transport.position'] } : {}),
    });
    const noFork =
      now.draftId === draft.draftId &&
      !fork &&
      !created.some((m) => m.origin === 'fork');
    const flagsOut =
      mode === 'settled'
        ? {
            crashRestoredLatest:
              volume === 0.33 && now.draftId === draft.draftId,
            crashNoFork: noFork,
            crashNoKeptToast: !kept,
          }
        : mode === 'reloadAfterCrash'
          ? {
              crashReloadSameDraft:
                Boolean(pointer) &&
                volume === 0.33 &&
                noFork &&
                !kept &&
                created.length === 0,
              crashNoFork: noFork,
            }
          : {
              crashLossOnlyLastEdit:
                volume === 0.33 &&
                diffs.length === 0 &&
                now.draftId === draft.draftId,
              crashNoFork: noFork,
            };
    return {
      diffs,
      extraLosses: [],
      flags: flagsOut,
      checks: {
        draft: { before: draft.draftId, after: now.draftId },
        pointerCarried: mode === 'reloadAfterCrash' ? Boolean(pointer) : null,
        leadVolume: volume,
        created: created.map((m) => `${m.draftId} (${m.origin})`),
        toasts: await kit.readToasts(next),
        settle: [settle],
      },
      after,
    };
  } finally {
    await session.context.close();
  }
}

export const scenarios = (kit) =>
  ['settled', 'playing', 'inDebounce', 'reloadAfterCrash'].map((mode) => ({
    group: 'R11',
    key: mode,
    id: `R11-crash:${mode}`,
    title:
      mode === 'settled'
        ? 'Kitchen sink, an edit written, the renderer crashes, a new tab opens'
        : mode === 'playing'
          ? '(full) As settled while playing, a second edit inside the debounce'
          : mode === 'inDebounce'
            ? '(full) A second edit, the crash inside its debounce'
            : '(full) As settled, then the crashed tab reloads (its pointer kept)',
    run: (run) => crashScenario(kit, run, mode),
  }));
