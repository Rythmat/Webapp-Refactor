/* eslint-env node */
/**
 * R20 the Song page's Open in Studio (milestone 1.4: the Song page links to
 * /studio/editor?song=<id>&transpose=<n>, which openSession opens, keeping
 * the work it replaces; ?seeded=1, the link it used before, reads as a
 * resume for a release).
 *
 * - inApp (fast): after the kitchen sink, in-app to the Song page, the key
 *   two semitones up, Open in Studio. The song opens in that key
 *   (songTransposed: two semitones above the key the page showed, its
 *   draft's baseline names the song and the transpose), the sink is kept
 *   once as its own draft (keptPriorWork) and said once (keptToastOnce),
 *   and a refresh reopens the song, keeping nothing more (refreshKeepsSong).
 * - coldPage (full): the same from a full page load of the Song page in
 *   the sink's tab. A cold page has no live session to keep: the sink's
 *   draft stays whole where it is (priorWorkStaysCold) and the boot says
 *   once where it is (priorWorkNoticedOnce: 'Unsaved work from … is in
 *   Projects').
 * - seededLink (full): /studio/editor?seeded=1 after the sink resumes the
 *   tab's draft, keeps nothing, and leaves the address bar
 *   (seededResumes).
 */
import {
  fullTierOnly,
  newlyKept,
  openSongInStudio,
  workHash,
} from './_shared.mjs';

export const flags = {
  songTransposed: {
    goal: true,
    text: 'the song opened two semitones above the key the Song page showed',
  },
  keptPriorWork: {
    goal: true,
    text: 'the work the song replaced was kept once, whole, as its own draft',
  },
  keptToastOnce: {
    goal: true,
    text: '"Your previous work was kept" was said exactly once',
  },
  refreshKeepsSong: {
    goal: true,
    text: 'a refresh reopened the song and kept nothing more',
  },
  priorWorkStaysCold: {
    goal: true,
    text: 'from a cold page, the work the song displaced stayed whole in its own draft',
  },
  priorWorkNoticedOnce: {
    goal: true,
    text: 'from a cold page, the student was told once where that work is',
  },
  seededResumes: {
    goal: true,
    text: '?seeded=1 resumed the tab’s draft, kept nothing and left the address bar',
  },
};

const SONG = 'africa';
const TRANSPOSE = 2;

async function songPage(kit, run, how) {
  if (how !== 'inApp') fullTierOnly(run);
  return kit.withSession(run, '?new=1', async ({ page }) => {
    const { draft } = await kit.applySink(page, run);
    const draftsBefore = await kit.listDrafts(page);
    const since = await kit.pageNow(page);
    const opened = await openSongInStudio(kit, page, {
      songId: SONG,
      transpose: TRANSPOSE,
      inApp: how === 'inApp',
      base: run.base,
    });
    if (opened.state !== 'ready') return kit.crashed(opened.state);
    const settle = await kit.settle(page, 'after Open in Studio');
    const song = await page.evaluate(() => ({
      rootNote: window.__MA_STORE__.getState().rootNote,
      draftId: window.__MA_SESSION__.getState().draftId,
      tracks: window.__MA_STORE__.getState().tracks.length,
      search: location.search,
    }));
    const draftsAfter = await kit.listDrafts(page);
    const songMeta = draftsAfter.find((m) => m.draftId === song.draftId);
    const kept = newlyKept(draftsBefore, draftsAfter);
    const keptText =
      kept.length === 1 ? await kit.readDraftBody(page, kept[0].draftId) : null;
    // The toast may come once the page has settled; give it time, then count.
    await kit.sleep(1500);
    const keptToasts = (
      await kit.readToasts(page, how === 'inApp' ? since : 0)
    ).filter((t) => kit.KEPT_TOAST.test(t.text));

    const elsewhere = (
      await kit.readToasts(page, how === 'inApp' ? since : 0)
    ).filter((t) => /is in Projects/.test(t.text));

    // A refresh.
    await page.reload({ waitUntil: 'domcontentloaded' });
    const state = await kit.waitForEditor(page);
    if (state !== 'ready') return kit.crashed(state);
    const settleRefresh = await kit.settle(page, 'after the refresh');
    const refreshed = await page.evaluate(() => ({
      rootNote: window.__MA_STORE__.getState().rootNote,
      draftId: window.__MA_SESSION__.getState().draftId,
    }));
    const draftsRefreshed = await kit.listDrafts(page);
    const after = await kit.fingerprint(page);
    const expectedRoot =
      opened.root === null ? null : (opened.root + TRANSPOSE) % 12;
    const songTransposed =
      expectedRoot !== null &&
      song.rootNote === expectedRoot &&
      song.tracks > 0 &&
      songMeta?.baseline?.source === 'song' &&
      songMeta?.baseline?.ref === `${SONG}@${TRANSPOSE}`;
    const refreshKeepsSong =
      refreshed.draftId === song.draftId &&
      refreshed.rootNote === song.rootNote &&
      newlyKept(draftsAfter, draftsRefreshed).length === 0;
    // A cold page has no live session to replace: the sink's draft stays as
    // it was (listed in Projects) and the boot says so once ('Unsaved work
    // from … is in Projects'), instead of keeping it.
    const sinkAfter = draftsAfter.find((m) => m.draftId === draft.draftId);
    const sinkText = sinkAfter
      ? await kit.readDraftBody(page, draft.draftId)
      : null;
    const flagsOut =
      how === 'inApp'
        ? {
            songTransposed,
            keptPriorWork:
              kept.length === 1 &&
              kept[0].draftId === draft.draftId &&
              workHash(keptText) === workHash(draft.text),
            keptToastOnce: keptToasts.length === 1,
            refreshKeepsSong,
          }
        : {
            songTransposed,
            priorWorkStaysCold:
              Boolean(sinkAfter) &&
              workHash(sinkText) === workHash(draft.text) &&
              kept.length === 0,
            priorWorkNoticedOnce: elsewhere.length + keptToasts.length === 1,
            refreshKeepsSong,
          };
    return {
      diffs: [],
      extraLosses: [],
      flags: flagsOut,
      checks: {
        songPage: {
          keyBefore: opened.keyBefore,
          keyAfter: opened.keyAfter,
          editorUrl: opened.editorUrl,
          rootNote: song.rootNote,
          expectedRoot,
          baseline: songMeta?.baseline ?? null,
          search: song.search,
        },
        keptDrafts: kept.map((m) => `${m.draftId} (${m.name})`),
        keptToasts: keptToasts.length,
        refreshed,
        settle: [settle, settleRefresh],
      },
      after,
    };
  });
}

async function seededLink(kit, run) {
  fullTierOnly(run);
  return kit.withSession(run, '?new=1', async ({ page }) => {
    const { draft } = await kit.applySink(page, run);
    const draftsBefore = await kit.listDrafts(page);
    const state = await kit.openAt(page, run.base, '?seeded=1');
    if (state !== 'ready') return kit.crashed(state);
    const settle = await kit.settle(page, 'after ?seeded=1');
    const now = await kit.draftNow(page);
    const search = await page.evaluate(() => location.search);
    const kept = newlyKept(draftsBefore, await kit.listDrafts(page));
    const keptToast = await kit.waitForToast(page, {
      match: kit.KEPT_TOAST,
      timeout: 1500,
    });
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        seededResumes:
          now.draftId === draft.draftId &&
          kept.length === 0 &&
          !keptToast &&
          !new URLSearchParams(search).has('seeded'),
      },
      checks: {
        search,
        draft: { before: draft.draftId, after: now.draftId },
        settle: [settle],
      },
      after: await kit.fingerprint(page),
    };
  });
}

export const scenarios = (kit) => [
  {
    group: 'R20',
    key: 'inApp',
    id: 'R20-song-page:inApp',
    title:
      'After the kitchen sink, in-app to the Song page, +2, Open in Studio, then a refresh',
    run: (run) => songPage(kit, run, 'inApp'),
  },
  {
    group: 'R20',
    key: 'coldPage',
    id: 'R20-song-page:coldPage',
    title: '(full) The same from a full page load of the Song page',
    run: (run) => songPage(kit, run, 'coldPage'),
  },
  {
    group: 'R20',
    key: 'seededLink',
    id: 'R20-song-page:seededLink',
    title: '(full) ?seeded=1, the Song page’s old link, resumes',
    run: (run) => seededLink(kit, run),
  },
];
