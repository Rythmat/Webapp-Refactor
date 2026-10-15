/* eslint-env node */
/**
 * R16 storage quota (milestone 1.4, E7/E8: a draft write that runs out of
 * room is pruned for, retried once, then shown on the chip; the session is
 * never dropped; an open that cannot keep the outgoing work refuses).
 *
 * The cap is CDP Storage.overrideQuotaForOrigin, set before the editor
 * first uses IndexedDB in the context (harness.mjs presetQuota: Chrome
 * keeps the quota IndexedDB found then), at the usage a fresh editor
 * reaches (measured once per run in a context of its own) plus headroom.
 *
 * - session (fast): a riff fits and is written; four 4000-note tracks do
 *   not: the chip reads "Couldn't save" with reason device
 *   (quotaErrorShown), the session stays open with everything in it
 *   (sessionStillOpen), the riff's draft is still there as written
 *   (noDraftDropped), File ▸ New and an in-app template link both refuse
 *   with the KEEP_REFUSED text, since the work can't be kept
 *   (linkRefusedWhenCannotKeep), and once the cap is lifted the chip's
 *   real Retry button writes the draft (recoversWhenRoomFreed).
 * - quotaReload (fast): out of room with an edit small enough for the
 *   mirror (a 7000-note track and the riff's volume to 0.47), the tab is
 *   hidden (the mirror is written) and reloaded with the cap still on;
 *   then the cap is lifted and the tab reloaded once more. The newest work
 *   must never be lost: with room again it is in the draft's IndexedDB
 *   body, or in a 'recovered' copy the student is told of, and the mirror
 *   is gone (quotaReloadKeepsNewestWork). The first reopen, still out of
 *   room, must show the newest edit or say it is held back (the chip's
 *   error or a notice), never the older body as "Saved on this device"
 *   (quotaReopenHonest).
 * - media (full): with room for the draft but not for a clip's bytes, the
 *   chip reads "Audio not saved yet" once the media writes have settled,
 *   with the item counted missing, and keeps reading it
 *   (chipWarnsAudioNotSaved).
 */
import { presetQuota } from '../harness.mjs';
import {
  addPendingAudio,
  fullTierOnly,
  markOutcome,
  mirrorsNow,
  nextOutcome,
  openCustomContext,
  seedRiff,
  setHidden,
  setVolume,
  volumeOf,
  workHash,
} from './_shared.mjs';

/** openErrors.ts KEEP_REFUSED: the work can't be set aside, so it stays. */
const KEEP_REFUSED = /couldn.t be set aside on this device/i;

export const flags = {
  quotaErrorShown: {
    goal: true,
    text: 'a draft write past the quota showed "Couldn’t save" (device) on the chip',
  },
  sessionStillOpen: {
    goal: true,
    text: 'out of room, the session stayed open with all its work',
  },
  noDraftDropped: {
    goal: true,
    text: 'out of room, the draft written before was still there',
  },
  linkRefusedWhenCannotKeep: {
    goal: true,
    text: 'an open that could not keep the work refused, changing nothing',
  },
  recoversWhenRoomFreed: {
    goal: true,
    text: 'with room again, the chip’s Retry button wrote the draft and the chip cleared',
  },
  quotaReloadKeepsNewestWork: {
    goal: true,
    text: 'reloads while out of room never lost the newest edit: it stayed in the draft or a recovered copy the student was told of',
  },
  quotaReopenHonest: {
    goal: true,
    text: 'reloaded while out of room, the tab showed the newest edit, or said it was held back (chip or notice), never the older body as saved',
  },
  chipWarnsAudioNotSaved: {
    goal: true,
    text: 'audio with no room on the device showed "Audio not saved yet"',
  },
};

/** What a fresh editor uses of the origin's storage, once per run. */
async function editorUsage(kit, run) {
  if (run.r16Usage) return run.r16Usage;
  const calib = await openCustomContext(run, kit, { query: '?new=1' });
  try {
    if (calib.state !== 'ready') throw new Error(`calibration: ${calib.state}`);
    await kit.settle(calib.page, 'calibration');
    await seedRiff(calib.page, 'Calibration');
    await kit.waitForDraft(calib.page);
    run.r16Usage = await calib.page.evaluate(
      async () => (await navigator.storage.estimate()).usage ?? 0,
    );
  } finally {
    await calib.context.close();
  }
  return run.r16Usage;
}

/** Waits until the draft status reports `error` (or times out); the status. */
async function draftError(kit, page, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const st = await kit.draftNow(page);
    if (st?.error || Date.now() > deadline) return st;
    await kit.sleep(250);
  }
}

/**
 * `tracks` tracks of `notes` random notes each (four of 4000: more than the
 * session cap leaves room for).
 */
const addBigTracks = (page, { tracks = 4, notes = 4000 } = {}) =>
  page.evaluate(
    ({ count, length }) => {
      const s = window.__MA_STORE__.getState();
      for (let i = 0; i < count; i++) {
        const id = s.addTrack('midi', 'piano-sampler', `Big ${i}`);
        window.__MA_STORE__.getState().addMidiClip(id, {
          id: `big-${i}`,
          name: 'big',
          startTick: 0,
          events: Array.from({ length }, (_, k) => ({
            note: 30 + Math.floor(Math.random() * 60),
            velocity: 1 + Math.floor(Math.random() * 126),
            startTick: k * 30,
            durationTicks: 1 + Math.floor(Math.random() * 900),
            channel: 0,
          })),
        });
      }
    },
    { count: tracks, length: notes },
  );

/** The session's draft, tracks and name, for a nothing-changed check. */
const sessionNow = (page) =>
  page.evaluate(() => ({
    tracks: window.__MA_STORE__.getState().tracks.length,
    name: window.__MA_STORE__.getState().projectName,
    draftId: window.__MA_SESSION__.getState().draftId,
  }));

async function session(kit, run) {
  const usage = await editorUsage(kit, run);
  let cap = null;
  const s = await openCustomContext(run, kit, {
    query: '?new=1',
    beforeOpen: async (context) => {
      cap = await presetQuota(context, run.base, usage + 400_000);
      return cap;
    },
  });
  try {
    if (s.state !== 'ready') return kit.crashed(s.state);
    const { page } = s;
    await kit.settle(page, 'opening');
    await seedRiff(page, 'Quota Tune');
    const riff = await kit.waitForDraft(page);
    await addBigTracks(page);
    const failed = await draftError(kit, page);
    const chip = await page
      .waitForSelector('[data-testid="save-chip"][data-state="error"]', {
        timeout: 15_000,
      })
      .then(
        () => kit.chipNow(page),
        () => kit.chipNow(page),
      );
    const open = await page.evaluate(() => ({
      phase: window.__MA_SESSION__.getState().phase,
      tracks: window.__MA_STORE__.getState().tracks.length,
      name: window.__MA_STORE__.getState().projectName,
      draftId: window.__MA_SESSION__.getState().draftId,
    }));
    const stored = await kit.readDraftBody(page, riff.draftId);
    // File ▸ New: the work can't be kept, so the open must refuse.
    await markOutcome(page);
    const since = await kit.pageNow(page);
    await kit.clickFileItem(page, 'New');
    const newOutcome = await nextOutcome(page, 30_000);
    const refusal = await kit.waitForToast(page, {
      since,
      match: KEEP_REFUSED,
      timeout: 5000,
    });
    const afterNew = await sessionNow(page);
    // An in-app link (a template) is refused the same way.
    await markOutcome(page);
    const sinceLink = await kit.pageNow(page);
    await kit.spaNavigate(page, '/studio/editor?template=project-pop');
    const linkOutcome = await nextOutcome(page, 30_000);
    const linkRefusal = await kit.waitForToast(page, {
      since: sinceLink,
      match: KEEP_REFUSED,
      timeout: 5000,
    });
    const afterLink = await sessionNow(page);
    // Room again: the chip's Retry, a real button.
    await cap.reset();
    cap = null;
    const retry = page.locator(
      '[data-testid="save-chip"] button[aria-label="Retry save"]',
    );
    const hadRetry = (await retry.count()) > 0;
    if (hadRetry) await retry.click();
    const recovered = await kit.waitForDraft(page, {
      allowMissing: true,
      timeout: 30_000,
    });
    const finalChip = await kit.settledChip(page);
    const status = await kit.draftNow(page);
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        quotaErrorShown:
          failed?.error === 'quota' &&
          chip?.state === 'error' &&
          chip?.reason === 'device',
        sessionStillOpen:
          open.phase === 'ready' &&
          open.tracks === 5 &&
          open.name === 'Quota Tune',
        noDraftDropped:
          Boolean(stored) &&
          workHash(stored) === workHash(riff.text) &&
          open.draftId === riff.draftId,
        linkRefusedWhenCannotKeep: [
          [newOutcome, refusal, afterNew],
          [linkOutcome, linkRefusal, afterLink],
        ].every(
          ([outcome, toast, now]) =>
            outcome?.status === 'refused' &&
            Boolean(toast) &&
            now.tracks === 5 &&
            now.name === 'Quota Tune' &&
            now.draftId === riff.draftId,
        ),
        recoversWhenRoomFreed:
          hadRetry &&
          Boolean(recovered) &&
          status.error === null &&
          finalChip?.state !== 'error' &&
          (recovered?.text ?? '').includes('Big 3'),
      },
      checks: {
        quota: { usage, cap: usage + 400_000 },
        draftError: failed?.error ?? null,
        chip,
        open,
        refusal: refusal ? `${refusal.type}: ${refusal.text}` : null,
        newOutcome,
        afterNew,
        linkOutcome,
        linkRefusal: linkRefusal?.text ?? null,
        afterLink,
        retryButton: hadRetry,
        finalChip,
      },
      after: await kit.fingerprint(page),
    };
  } finally {
    await cap?.reset();
    await s.context.close();
  }
}

/**
 * Out of room with an edit the mirror can hold, hidden, then reloaded
 * twice: first with the cap still on, then with room again.
 */
async function quotaReload(kit, run) {
  const usage = await editorUsage(kit, run);
  let cap = null;
  const s = await openCustomContext(run, kit, {
    query: '?new=1',
    beforeOpen: async (context) => {
      cap = await presetQuota(context, run.base, usage + 100_000);
      return cap;
    },
  });
  try {
    if (s.state !== 'ready') return kit.crashed(s.state);
    const { page } = s;
    await kit.settle(page, 'opening');
    const track = await seedRiff(page, 'Quota Reload Tune');
    const riff = await kit.waitForDraft(page);
    await addBigTracks(page, { tracks: 1, notes: 7000 });
    await setVolume(page, track, 0.47);
    const failed = await draftError(kit, page);
    await setHidden(page, true);
    await kit.sleep(500);
    const mirrors = (await mirrorsNow(page)).filter(
      (m) => m.draftId === riff.draftId,
    );
    const statusHidden = await kit.draftNow(page);

    // 1. Reload with the cap still on.
    await page.reload({ waitUntil: 'domcontentloaded' });
    const first = await kit.waitForEditor(page);
    await kit.waitForOpen(page, 30_000);
    // A notice of the work the mirror still holds can come a few seconds
    // after the open (the reconcile's write is tried first).
    await kit.waitForToast(page, { timeout: 10_000 });
    const reopened = {
      state: first,
      draftId: await page.evaluate(
        () => window.__MA_SESSION__?.getState().draftId ?? null,
      ),
      volume: await volumeOf(page, { id: track }),
      bigTrack: await page.evaluate(() =>
        window.__MA_STORE__.getState().tracks.some((t) => t.name === 'Big 0'),
      ),
      mirrorKept: (await mirrorsNow(page)).some(
        (m) => m.draftId === riff.draftId,
      ),
      chip: await kit.chipNow(page),
      status: await kit.draftNow(page),
      toasts: (await kit.readToasts(page)).map((t) => t.text),
    };
    const firstOk =
      reopened.draftId === riff.draftId &&
      (reopened.volume === 0.47 ||
        (reopened.mirrorKept &&
          (reopened.chip?.state === 'error' ||
            reopened.chip?.state === 'unsaved' ||
            reopened.toasts.length > 0)));

    // 2. Room again; let any retry run, then reload.
    await cap.reset();
    cap = null;
    await kit.sleep(4000);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const second = await kit.waitForEditor(page);
    if (second !== 'ready') return kit.crashed(second, { reopened });
    await kit.settle(page, 'after the reload with room');
    const written = await kit.waitForDraft(page, {
      allowMissing: true,
      timeout: 30_000,
    });
    const body =
      written?.draftId === riff.draftId
        ? written.text
        : await kit.readDraftBody(page, riff.draftId);
    const volumeIn = (text) => {
      try {
        return (
          JSON.parse(text).data.tracks.find((t) => t.id === track)?.volume ??
          null
        );
      } catch {
        return null;
      }
    };
    const bodyVolume = volumeIn(body);
    const copies = [];
    for (const m of await kit.listDrafts(page)) {
      if (m.draftId === riff.draftId) continue;
      if (m.origin !== 'recovered' && m.origin !== 'fork') continue;
      const text = await kit.readDraftBody(page, m.draftId);
      copies.push({
        draftId: m.draftId,
        origin: m.origin,
        name: m.name,
        volume: volumeIn(text),
        bigTrack: (text ?? '').includes('Big 0'),
      });
    }
    const toldOfCopy = (await kit.readToasts(page)).map((t) => t.text);
    const final = {
      draftId: await page.evaluate(
        () => window.__MA_SESSION__.getState().draftId,
      ),
      volume: await volumeOf(page, { id: track }),
      bodyVolume,
      bodyHasBigTrack: (body ?? '').includes('Big 0'),
      mirrorLeft: (await mirrorsNow(page)).some(
        (m) => m.draftId === riff.draftId,
      ),
      copies,
      toasts: toldOfCopy,
    };
    const inDraft =
      final.draftId === riff.draftId &&
      final.volume === 0.47 &&
      final.bodyVolume === 0.47 &&
      final.bodyHasBigTrack;
    const inCopy = copies.some(
      (c) => c.origin === 'recovered' && c.volume === 0.47 && c.bigTrack,
    );
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        quotaReloadKeepsNewestWork:
          failed?.error === 'quota' &&
          mirrors.length === 1 &&
          !final.mirrorLeft &&
          (inDraft ||
            (inCopy &&
              (reopened.toasts.length > 0 || final.toasts.length > 0))),
        quotaReopenHonest: failed?.error === 'quota' && firstOk,
      },
      checks: {
        quota: { usage, cap: usage + 100_000 },
        draftError: failed?.error ?? null,
        mirrorOnHide: mirrors,
        statusHidden: {
          pendingSeq: statusHidden?.pendingSeq,
          committedSeq: statusHidden?.committedSeq,
          mirror: statusHidden?.mirror,
        },
        reopened: {
          ...reopened,
          status: reopened.status
            ? {
                error: reopened.status.error,
                pendingSeq: reopened.status.pendingSeq,
                committedSeq: reopened.status.committedSeq,
              }
            : null,
        },
        final,
      },
      after: await kit.fingerprint(page),
    };
  } finally {
    await cap?.reset();
    await s.context.close();
  }
}

async function media(kit, run) {
  fullTierOnly(run);
  const usage = await editorUsage(kit, run);
  let cap = null;
  const s = await openCustomContext(run, kit, {
    query: '?new=1',
    beforeOpen: async (context) => {
      cap = await presetQuota(context, run.base, usage + 150_000);
      return cap;
    },
  });
  try {
    if (s.state !== 'ready') return kit.crashed(s.state);
    const { page } = s;
    await kit.settle(page, 'opening');
    await seedRiff(page, 'Quota Audio Tune');
    await kit.waitForDraft(page);
    // About 530 KB of bytes: more than the room left.
    await addPendingAudio(page, { sampler: false, seconds: 6, tag: 'r16' });
    const chip = await page
      .waitForSelector(
        '[data-testid="save-chip"][data-state="audio-pending"]',
        {
          timeout: 30_000,
        },
      )
      .then(
        () => kit.chipNow(page),
        () => kit.chipNow(page),
      );
    // Not merely slow (pendingInMemory over 1 s also reads audio-pending):
    // once every media write has settled the item must count as missing,
    // and the chip must still say so.
    const settledMedia = await page
      .waitForFunction(
        () => {
          const m = window.__MA_DRAFTS__.status().media;
          return m.writing === 0 && m.pendingInMemory === 0 ? m : null;
        },
        null,
        { timeout: 30_000, polling: 200 },
      )
      .then(
        (handle) => handle.jsonValue(),
        () => null,
      );
    await kit.sleep(2000);
    const chipLater = await kit.chipNow(page);
    const status = await kit.draftNow(page);
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        chipWarnsAudioNotSaved:
          chip?.state === 'audio-pending' &&
          (settledMedia?.missing ?? 0) > 0 &&
          chipLater?.state === 'audio-pending',
      },
      checks: {
        chip,
        chipLater,
        settledMedia,
        media: status?.media ?? null,
        quota: { usage },
      },
      after: await kit.fingerprint(page),
    };
  } finally {
    await cap?.reset();
    await s.context.close();
  }
}

export const scenarios = (kit) => [
  {
    group: 'R16',
    key: 'session',
    id: 'R16-quota:session',
    title:
      'Out of room for the draft: the chip, the session, the old draft, a refused open, Retry',
    run: (run) => session(kit, run),
  },
  {
    group: 'R16',
    key: 'quotaReload',
    id: 'R16-quota:quotaReload',
    title:
      'Out of room, hidden and reloaded twice (cap on, then off): the newest edit is never lost',
    run: (run) => quotaReload(kit, run),
  },
  {
    group: 'R16',
    key: 'media',
    id: 'R16-quota:media',
    title: '(full) Out of room for a clip’s bytes: "Audio not saved yet"',
    run: (run) => media(kit, run),
  },
];
