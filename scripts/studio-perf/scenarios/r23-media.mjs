/* eslint-env node */
/**
 * R23 audio that lives only in memory (milestone 1.4, E8: the bytes of an
 * audio clip or a Chops sample with no asset go into the draft's media
 * store as they appear, and come back on open).
 *
 * Fast:
 * - imported: an imported clip (a Library drop: decoded buffer and the
 *   original bytes, no asset), written, then a reload: the clip has its
 *   audio again, the same length (pendingMediaRestored), and nothing else
 *   differs.
 * - sampler: a file dropped on the Chops sampler, the same way
 *   (samplerBufferRestored; the fingerprint's samplerSample.bufferLoaded).
 * - editDuringRestore: an imported clip, written; reloaded with that clip's
 *   decode held (BaseAudioContext.decodeAudioData waits), so the draft's
 *   media is still being restored when an edit is made and written. The
 *   committed meta must still list the clip's media, none missing, and the
 *   chip must not read "Audio not saved yet"; the renderer then crashes and
 *   a new tab brings the clip's audio back (mediaRefsSurviveEditDuringRestore).
 * - dropNoProject: a WAV dropped on the Chops sampler through its real file
 *   input, in a project never saved: no project and no asset is created
 *   (E8: the bytes wait in the draft until the first Save), and the
 *   draft's meta lists the sample's media (noProjectMintedByDrop).
 *
 * Full:
 * - failedUpload: File ▸ Save with every asset upload failing: the save
 *   leaves the audio out, and a reload still brings the clip's bytes back
 *   from the draft (mediaKeptAfterFailedUpload).
 * - keptDraftMedia: the clip's project is kept by File ▸ New and brought
 *   back with the toast's Restore, then reloaded: its audio both times
 *   (keptDraftMediaRestored).
 * - mediaWrittenOnce: a second clip on the very same decoded buffer (a
 *   paste): the draft lists one media item for both clips, and further
 *   edits never store it again (mediaWrittenOnce).
 */
import { crash } from '../harness.mjs';
import {
  addPendingAudio,
  audioLoaded,
  clickToastAction,
  fullTierOnly,
  MODULES,
  REOPEN_CLASSES,
  setVolume,
  volumeOf,
} from './_shared.mjs';

export const flags = {
  pendingMediaRestored: {
    goal: true,
    text: 'an imported clip’s audio came back from the draft after a reload',
  },
  samplerBufferRestored: {
    goal: true,
    text: 'a dropped Chops sample’s audio came back from the draft after a reload',
  },
  mediaKeptAfterFailedUpload: {
    goal: true,
    text: 'after a save whose uploads failed, the audio still came back from the draft',
  },
  keptDraftMediaRestored: {
    goal: true,
    text: 'kept work brought back by Restore had its audio, and kept it over a reload',
  },
  mediaRefsSurviveEditDuringRestore: {
    goal: true,
    text: 'an edit written while the draft’s media was restoring kept its media listed, and the audio survived a crash',
  },
  noProjectMintedByDrop: {
    goal: true,
    text: 'a sample dropped on the Chops sampler in a never-saved project created no project or asset, and its bytes went to the draft',
  },
  mediaWrittenOnce: {
    goal: true,
    text: 'one buffer shared by two clips was stored once and never again',
  },
};

/** Reloads, waits for the editor and settles; the state. */
async function reload(kit, page, label) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  const state = await kit.waitForEditor(page);
  if (state === 'ready') await kit.settle(page, label);
  return state;
}

async function restoredAfterReload(kit, run, kind) {
  return kit.withSession(run, '?new=1', async ({ page }) => {
    const made = await addPendingAudio(page, {
      imported: kind === 'imported',
      sampler: kind === 'sampler',
      tag: `r23-${kind}`,
    });
    const draft = await kit.waitForDraft(page);
    const before = await kit.fingerprint(page);
    const state = await reload(kit, page, 'after the reload');
    if (state !== 'ready') return kit.crashed(state);
    const after = await kit.fingerprint(page);
    const loaded = await audioLoaded(page, {
      clipId: made.clipId ?? null,
      sampleId: made.sampleId ?? null,
    });
    const diffs = kit.compareFingerprints(before, after, {
      classes: REOPEN_CLASSES,
      defaults: run.defaults,
    });
    const flag =
      kind === 'imported'
        ? {
            pendingMediaRestored:
              loaded.clip === made.clipLength && diffs.length === 0,
          }
        : {
            samplerBufferRestored:
              loaded.sample === made.sampleLength && diffs.length === 0,
          };
    return {
      diffs,
      extraLosses: [],
      flags: flag,
      checks: {
        media: draft.meta?.media?.map((m) => ({
          size: m.size,
          clips: m.clipIds.length,
          samples: m.samplerSampleIds.length,
        })),
        mediaMissing: draft.meta?.mediaMissing ?? null,
        loaded,
        expected: {
          clip: made.clipLength ?? null,
          sample: made.sampleLength ?? null,
        },
      },
      after,
    };
  });
}

async function failedUpload(kit, run) {
  fullTierOnly(run);
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      const made = await addPendingAudio(page, {
        sampler: false,
        tag: 'r23-upload',
      });
      await kit.waitForDraft(page);
      const fail = api.fault({
        method: 'POST',
        path: /^\/api\/studio\/assets$/,
        status: 500,
      });
      let save = null;
      try {
        await kit.clickFileItem(page, 'Save');
        await page.waitForFunction(
          () => {
            const s = window.__MA_CLOUD_SAVE__.getState();
            return (
              s.inFlight === 0 &&
              s.phase !== 'saving' &&
              s.savedCount + (s.error ? 1 : 0) > 0
            );
          },
          null,
          { timeout: 60_000, polling: 100 },
        );
        save = await page.evaluate(() => {
          const s = window.__MA_CLOUD_SAVE__.getState();
          return { phase: s.phase, error: s.error?.kind ?? null };
        });
      } finally {
        fail();
      }
      await kit.waitForDraft(page);
      const state = await reload(kit, page, 'after the reload');
      if (state !== 'ready') return kit.crashed(state, { save });
      const loaded = await audioLoaded(page, { clipId: made.clipId });
      return {
        diffs: [],
        extraLosses: [],
        flags: { mediaKeptAfterFailedUpload: loaded.clip === made.clipLength },
        checks: { save, loaded, expected: made.clipLength },
        after: await kit.fingerprint(page),
      };
    },
    api,
  );
}

async function keptDraftMedia(kit, run) {
  fullTierOnly(run);
  return kit.withSession(run, '?new=1', async ({ page }) => {
    const made = await addPendingAudio(page, { tag: 'r23-kept' });
    await page.evaluate(() =>
      window.__MA_STORE__.getState().setProjectName('Kept Media Tune'),
    );
    const draft = await kit.waitForDraft(page);
    const generation = await kit.generationNow(page);
    await kit.clickFileItem(page, 'New');
    const opened = await kit.waitForOpenAfter(page, generation);
    if (opened !== 'ready') return kit.crashed(opened);
    await kit.settle(page, 'after File ▸ New');
    const generation2 = await kit.generationNow(page);
    const restored = await clickToastAction(page, kit.KEPT_TOAST, 'Restore');
    if (!restored) {
      // The toast has gone: what its Restore runs.
      await page.evaluate(kit.restoreKept, {
        path: kit.OPEN_SESSION_MODULE,
        draftId: draft.draftId,
      });
    }
    const back = await kit.waitForOpenAfter(page, generation2);
    if (back !== 'ready') return kit.crashed(back);
    await kit.settle(page, 'after Restore');
    const inPage = await audioLoaded(page, {
      clipId: made.clipId,
      sampleId: made.sampleId,
    });
    const state = await reload(kit, page, 'after the reload');
    if (state !== 'ready') return kit.crashed(state);
    const reloaded = await audioLoaded(page, {
      clipId: made.clipId,
      sampleId: made.sampleId,
    });
    const now = await kit.draftNow(page);
    const ok = (l) =>
      l.clip === made.clipLength && l.sample === made.sampleLength;
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        keptDraftMediaRestored:
          ok(inPage) && ok(reloaded) && now.draftId === draft.draftId,
      },
      checks: { viaToast: restored, inPage, reloaded },
      after: await kit.fingerprint(page),
    };
  });
}

async function mediaWrittenOnce(kit, run) {
  fullTierOnly(run);
  return kit.withSession(run, '?new=1', async ({ page }) => {
    // Count every write into the draft store's media store from here on.
    await page.evaluate(() => {
      window.__rtMediaPuts = 0;
      for (const method of ['put', 'add']) {
        const original = IDBObjectStore.prototype[method];
        IDBObjectStore.prototype[method] = function (...args) {
          if (this.name === 'media') window.__rtMediaPuts += 1;
          return original.apply(this, args);
        };
      }
    });
    const made = await addPendingAudio(page, {
      sampler: false,
      tag: 'r23-once',
    });
    // A paste: another clip on the very same decoded buffer, no bytes of
    // its own.
    await page.evaluate(
      async ({ path, clipId, trackId }) => {
        const buffers = await window.__RT_DEV_MODULE__(path);
        const buffer = buffers.getAudioBuffer(clipId);
        const s = window.__MA_STORE__.getState();
        const clip = s.tracks
          .find((t) => t.id === trackId)
          .audioClips.find((c) => c.id === clipId);
        buffers.setAudioBuffer(`${clipId}-pasted`, buffer);
        s.addAudioClip(trackId, {
          ...clip,
          id: `${clipId}-pasted`,
          startTick: clip.startTick + clip.duration + 480,
        });
      },
      { path: MODULES.buffers, clipId: made.clipId, trackId: made.trackId },
    );
    const first = await kit.waitForDraft(page);
    const puts = () => page.evaluate(() => window.__rtMediaPuts ?? 0);
    const putsBefore = await puts();
    for (const bpm of [101, 102, 103]) {
      await page.evaluate((v) => window.__MA_STORE__.getState().setBpm(v), bpm);
      await kit.waitForDraft(page);
    }
    const last = await kit.waitForDraft(page);
    const refs = (m) =>
      (m?.media ?? []).map((r) => ({ id: r.mediaId, clips: r.clipIds.length }));
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        mediaWrittenOnce:
          first.meta?.media?.length === 1 &&
          first.meta.media[0].clipIds.length === 2 &&
          last.meta?.media?.length === 1 &&
          last.meta.media[0].mediaId === first.meta.media[0].mediaId &&
          putsBefore === 1 &&
          (await puts()) === putsBefore,
      },
      checks: {
        first: refs(first.meta),
        last: refs(last.meta),
        mediaPuts: { first: putsBefore, last: await puts() },
      },
      after: await kit.fingerprint(page),
    };
  });
}

/**
 * Init script: holds every decodeAudioData of exactly `size` bytes (the one
 * clip whose restore is under test) until window.__rtDecodeReleased is set
 * or 30 s pass; window.__rtDecodeHeld counts them.
 */
function holdDecodeOfSize(size) {
  if (window !== window.top || window.__rtDecodeHold) return;
  window.__rtDecodeHold = true;
  window.__rtDecodeHeld = 0;
  const original = BaseAudioContext.prototype.decodeAudioData;
  BaseAudioContext.prototype.decodeAudioData = function (data, ...rest) {
    if (data?.byteLength !== size || window.__rtDecodeReleased) {
      return original.call(this, data, ...rest);
    }
    window.__rtDecodeHeld += 1;
    const started = performance.now();
    return new Promise((resolve) => {
      const poll = () =>
        window.__rtDecodeReleased || performance.now() - started > 30_000
          ? resolve()
          : setTimeout(poll, 50);
      poll();
    }).then(() => original.call(this, data, ...rest));
  };
}

async function editDuringRestore(kit, run) {
  return kit.withSession(run, '?new=1', async (session) => {
    const { page } = session;
    const made = await addPendingAudio(page, {
      sampler: false,
      seconds: 1.5,
      tag: 'r23-restore',
    });
    const draft = await kit.waitForDraft(page);
    const mediaId = draft.meta?.media?.[0]?.mediaId ?? null;
    await page.addInitScript(holdDecodeOfSize, made.bytes);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const state = await kit.waitForEditor(page);
    if (state !== 'ready') return kit.crashed(state);
    const restoring = await page
      .waitForFunction(
        () =>
          window.__MA_SESSION__?.getState().phase === 'ready' &&
          window.__MA_DRAFTS__?.mediaRestoring() === true,
        null,
        { timeout: 30_000, polling: 50 },
      )
      .then(
        () => true,
        () => false,
      );
    const seq = (await kit.draftNow(page)).committedSeq;
    await setVolume(page, made.trackId, 0.66);
    const written = await page
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
        { timeout: 15_000, polling: 50 },
      )
      .then(
        () => true,
        () => false,
      );
    const during = await page.evaluate(async (id) => {
      const drafts = window.__MA_DRAFTS__;
      const active = drafts.status().draftId;
      const meta = (await drafts.list()).find((m) => m.draftId === active);
      const chip = document.querySelector('[data-testid="save-chip"]');
      return {
        draftId: active,
        stillRestoring: drafts.mediaRestoring(),
        held: window.__rtDecodeHeld ?? 0,
        listed: (meta?.media ?? []).some((r) => r.mediaId === id),
        missing: meta?.mediaMissing ?? null,
        chip: chip?.getAttribute('data-state') ?? null,
      };
    }, mediaId);
    // The page dies before the restore finishes; a new tab resumes.
    await crash(page);
    const next = await kit.openTab(run, session);
    const reopened = await kit.openAt(next, run.base, '');
    if (reopened !== 'ready') return kit.crashed(reopened, { during });
    await kit.settle(next, 'after the crash');
    const loaded = await audioLoaded(next, { clipId: made.clipId });
    const volume = await volumeOf(next, { id: made.trackId });
    const now = await kit.draftNow(next);
    return {
      diffs: [],
      extraLosses: [],
      flags: {
        mediaRefsSurviveEditDuringRestore:
          Boolean(mediaId) &&
          restoring &&
          written &&
          during.stillRestoring &&
          during.listed &&
          during.missing === 0 &&
          during.chip !== 'audio-pending' &&
          loaded.clip === made.clipLength &&
          volume === 0.66 &&
          now.draftId === draft.draftId,
      },
      checks: {
        mediaId,
        restoringAtEdit: restoring,
        editWritten: written,
        during,
        afterCrash: { loaded, volume, draftId: now.draftId },
        expected: made.clipLength,
      },
      after: await kit.fingerprint(next),
    };
  });
}

/** A mono 16-bit WAV of a sine, as a file a student would drop. */
function wavFile(rate, seconds, hz) {
  const frames = Math.round(rate * seconds);
  const buffer = Buffer.alloc(44 + frames * 2);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + frames * 2, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) {
    const fade = Math.min(1, i / 200, (frames - i) / 200);
    const v = Math.sin((2 * Math.PI * hz * i) / rate) * 0.4 * fade;
    buffer.writeInt16LE(Math.round(v * 32_767), 44 + i * 2);
  }
  return buffer;
}

async function dropNoProject(kit, run) {
  const api = kit.createMockStudioApi({ mode: 'legacy' });
  return kit.withSession(
    run,
    '?new=1',
    async ({ page }) => {
      const trackId = await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        const id = s.addTrack('midi', 'sampler', 'Drop Chops');
        s.setCurrentView('arrange');
        s.setSelectedTrackId(id);
        s.setChannelStripTab('controls');
        return id;
      });
      const input = page.locator(
        '[data-tutorial-id="sampler-view"] input[type="file"]',
      );
      await input.waitFor({ state: 'attached', timeout: 30_000 });
      await kit.waitForDraft(page);
      const from = api.log.length;
      await input.setInputFiles({
        name: 'rt-drop.wav',
        mimeType: 'audio/wav',
        buffer: wavFile(22_050, 0.5, 440),
      });
      await page.waitForFunction(
        (id) =>
          Boolean(
            window.__MA_STORE__.getState().tracks.find((t) => t.id === id)
              ?.samplerSample?.sampleId,
          ),
        trackId,
        { timeout: 30_000 },
      );
      const draft = await kit.waitForDraft(page);
      // Room for an eager upload that should not happen.
      await kit.sleep(1500);
      const writes = api
        .requestsSince(from)
        .filter(
          (l) =>
            l.method !== 'GET' &&
            /^\/api\/studio\/(projects|assets)/.test(l.path),
        )
        .map((l) => `${l.method} ${l.path}`);
      const live = await page.evaluate((id) => {
        const s = window.__MA_STORE__.getState();
        const sample = s.tracks.find((t) => t.id === id)?.samplerSample;
        return {
          projectId: s.projectId,
          sampleId: sample?.sampleId ?? null,
          assetId: sample?.assetId ?? null,
        };
      }, trackId);
      const listed = (draft.meta?.media ?? []).some((r) =>
        r.samplerSampleIds.includes(live.sampleId),
      );
      return {
        diffs: [],
        extraLosses: [],
        flags: {
          noProjectMintedByDrop:
            Boolean(live.sampleId) &&
            writes.length === 0 &&
            live.projectId === null &&
            !live.assetId &&
            listed,
        },
        checks: { writes, live, listedInDraft: listed },
        after: await kit.fingerprint(page),
      };
    },
    api,
  );
}

export const scenarios = (kit) => [
  {
    group: 'R23',
    key: 'imported',
    id: 'R23-media:imported',
    title: 'An imported clip held only in memory comes back after a reload',
    run: (run) => restoredAfterReload(kit, run, 'imported'),
  },
  {
    group: 'R23',
    key: 'sampler',
    id: 'R23-media:sampler',
    title:
      'A dropped Chops sample held only in memory comes back after a reload',
    run: (run) => restoredAfterReload(kit, run, 'sampler'),
  },
  {
    group: 'R23',
    key: 'editDuringRestore',
    id: 'R23-media:editDuringRestore',
    title:
      'An edit written while draft media is restoring keeps the media listed; a crash then loses no audio',
    run: (run) => editDuringRestore(kit, run),
  },
  {
    group: 'R23',
    key: 'dropNoProject',
    id: 'R23-media:dropNoProject',
    title:
      'A WAV dropped on the Chops sampler of a never-saved project creates no project or asset',
    run: (run) => dropNoProject(kit, run),
  },
  {
    group: 'R23',
    key: 'failedUpload',
    id: 'R23-media:failedUpload',
    title: '(full) A save whose uploads fail keeps the audio in the draft',
    run: (run) => failedUpload(kit, run),
  },
  {
    group: 'R23',
    key: 'keptDraftMedia',
    id: 'R23-media:keptDraftMedia',
    title: '(full) Kept work brought back by Restore has its audio',
    run: (run) => keptDraftMedia(kit, run),
  },
  {
    group: 'R23',
    key: 'mediaWrittenOnce',
    id: 'R23-media:mediaWrittenOnce',
    title: '(full) One buffer on two clips is stored once',
    run: (run) => mediaWrittenOnce(kit, run),
  },
];
